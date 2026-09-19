import "server-only"

export type GroqToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export type GroqMessage = {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  /** Ustawiane na wiadomości `assistant`, gdy model prosi o wywołanie narzędzi. */
  tool_calls?: GroqToolCall[]
  /** Ustawiane na wiadomości `tool` — wiąże wynik narzędzia z konkretnym wywołaniem. */
  tool_call_id?: string
  /** Nazwa narzędzia dla wiadomości `tool` (pomaga modelowi). */
  name?: string
}

/** Definicja narzędzia w formacie OpenAI/Groq (function calling). */
export type GroqTool = {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export type GroqChatResult = {
  content: string
  toolCalls: GroqToolCall[]
  model: string
}

/**
 * Błąd Groqa niosący kontekst potrzebny wyżej (route) do sensownej reakcji:
 * - `status` — ostatni kod HTTP (429 = limit zapytań/tokenów, 5xx = błąd serwera,
 *   0 = wyłącznie timeouty/wyjątki sieciowe),
 * - `rateLimited` — czy przyczyną był limit (429),
 * - `retryAfterMs` — ile realnie czekać, zanim modele znów będą dostępne
 *   (z nagłówków Groqa `retry-after` / `x-ratelimit-reset-*`).
 * Dzięki temu route nie pokazuje ślepo „Przerwy technicznej", tylko może
 * odczekać krótkie okno albo szczerze poinformować o limicie.
 */
export class GroqError extends Error {
  readonly status: number
  readonly rateLimited: boolean
  readonly retryAfterMs: number
  constructor(message: string, status: number, retryAfterMs: number) {
    super(message)
    this.name = "GroqError"
    this.status = status
    this.rateLimited = status === 429
    this.retryAfterMs = retryAfterMs
  }
}

/**
 * Kolejka modeli Groq: pierwszy to model główny, kolejne to fallbacki
 * uruchamiane, gdy poprzedni zwróci błąd/429. Można nadpisać przez
 * `GROQ_MODEL` i `GROQ_FALLBACK_MODEL`.
 */
/** Parsuje listę modeli z ENV (rozdzielone przecinkami). Zwraca null, gdy pusto. */
function envList(value: string | undefined): string[] | null {
  if (!value) return null
  const list = value.split(",").map((s) => s.trim()).filter(Boolean)
  return list.length ? list : null
}

// Kolejkę modeli budujemy od nowa przy KAŻDYM żądaniu, a pętla zawsze startuje
// od modelu głównego. Dzięki temu, gdy model główny „odzyska" limity (mija 429),
// następna wiadomość znów trafia najpierw do niego — fallback nigdy nie
// „przykleja się" na stałe do słabszego modelu.
//
// MODELE Z NARZĘDZIAMI (function calling). Świadomie MIESZAMY rodziny
// (gpt-oss ↔ qwen): każdy model ma OSOBNY limit tokenów (TPM/ITPM/TPD), więc gdy
// jeden wpadnie w 429, następny z INNEJ rodziny zwykle wciąż ma budżet — jedno
// wyczerpanie limitu nie wywraca całego czatu. Wszystkie cztery mają POTWIERDZONE
// (w logach 429, nie 404) działające tool calling na Groqu. Qwen ma bardzo niski
// limit wejścia (ITPM 7000/min), więc trzymamy prompt + wyniki krótko (patrz
// route.ts), inaczej pojedyncze zapytanie z wynikami wyszukiwania go przekracza.
const TOOL_MODELS = envList(process.env.GROQ_MODELS) ?? [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
]

// MODELE DO FINALNEJ ODPOWIEDZI (bez narzędzi). Na czele qwen, bo gpt-oss przy
// tool_choice="none" potrafi MIMO TO „wypluć" token narzędzia w formacie harmony,
// a Groq odrzuca to twardym 400 — qwen tego nie robi, więc czysty tekst jest
// pewniejszy. `groq/compound-mini` to OSTATNIA deska ratunku: nie wspiera naszego
// schematu narzędzi, ale zawsze odda zwykły tekst (ma własne wbudowane
// wyszukiwanie), więc mieszkaniec dostanie odpowiedź nawet gdy WSZYSTKIE
// pozostałe modele mają limit albo padło Tavily.
const FINAL_MODELS = envList(process.env.GROQ_FINAL_MODELS) ?? [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-20b",
  "groq/compound-mini",
]

/** Domyślna lista, gdy wywołanie nie poda własnej (np. streaming). */
const DEFAULT_MODELS = TOOL_MODELS

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

/** Czy model wspiera parametr `reasoning_format` (ukrywanie łańcucha myśli po
 *  stronie Groqa). Wspierają go rodziny rozumujące (gpt-oss, qwen). Modele
 *  NIErozumujące (llama-3.3) i rodzina groq/compound odrzucają go twardym 400. */
function supportsReasoningFormat(model: string): boolean {
  return model.includes("gpt-oss") || model.includes("qwen")
}

/**
 * Cooldown modeli. Gdy model zwróci 429 (przekroczony limit zapytań/tokenów),
 * zapamiętujemy DO KIEDY jest wyczerpany — na podstawie nagłówków Groqa
 * (`retry-after` albo `x-ratelimit-reset-*`). Dzięki temu kolejne żądania nie
 * tracą czasu na ponowne uderzanie w model, o którym już wiemy, że ma limit —
 * od razu przechodzą do następnego w kolejce.
 *
 * To realizuje „naturalny" fallback, o który chodzi: dopóki model główny ma
 * limity, jedzie model zapasowy; gdy okno limitu modelu głównego się odnowi
 * (cooldown minie), następne żądanie znów trafia najpierw do niego. Mapa żyje
 * w module (współdzielona między żądaniami w tej samej instancji serwera).
 */
const modelCooldownUntil = new Map<string, number>()

/** Domyślny cooldown, gdy Groq nie poda w nagłówkach kiedy limit się odnowi. */
const DEFAULT_COOLDOWN_MS = 12_000
/** Górny bezpiecznik — nie „chowamy" modelu na dłużej niż minutę. */
const MAX_COOLDOWN_MS = 60_000

/** Parsuje format czasu Groqa, np. "1m2.5s", "2.5s", "500ms" → milisekundy. */
function parseGroqDuration(value: string): number {
  const m = value.trim().match(/^(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?(?:(\d+(?:\.\d+)?)ms)?$/)
  if (!m) return 0
  const [, min, sec, ms] = m
  return (Number(min || 0) * 60_000) + (Number(sec || 0) * 1000) + Number(ms || 0)
}

/** Ustala długość cooldownu z nagłówków odpowiedzi 429. */
function cooldownFromHeaders(response: Response): number {
  const retryAfter = response.headers.get("retry-after")
  if (retryAfter) {
    const secs = Number(retryAfter)
    if (Number.isFinite(secs) && secs > 0) return Math.min(secs * 1000, MAX_COOLDOWN_MS)
  }
  const reset =
    response.headers.get("x-ratelimit-reset-requests") || response.headers.get("x-ratelimit-reset-tokens")
  if (reset) {
    const ms = parseGroqDuration(reset)
    if (ms > 0) return Math.min(ms, MAX_COOLDOWN_MS)
  }
  return DEFAULT_COOLDOWN_MS
}

/**
 * Kolejność prób dla bieżącego żądania: najpierw modele dostępne (bez aktywnego
 * cooldownu) w ich pierwotnym priorytecie, a na końcu — jako ostatnia deska
 * ratunku — modele w cooldownie, posortowane od najszybciej wracającego. Dzięki
 * temu nigdy nie zostajemy bez żadnego modelu do spróbowania, ale w normalnej
 * sytuacji nie marnujemy czasu na te, które na pewno odrzucą zapytanie.
 */
function orderedModels(base: string[]): string[] {
  const now = Date.now()
  const available: string[] = []
  const cooling: string[] = []
  for (const model of base) {
    if ((modelCooldownUntil.get(model) ?? 0) <= now) available.push(model)
    else cooling.push(model)
  }
  cooling.sort((a, b) => (modelCooldownUntil.get(a) ?? 0) - (modelCooldownUntil.get(b) ?? 0))
  return [...available, ...cooling]
}

/** Reakcja na wynik jednej próby: 429 → cooldown, sukces → wyczyść cooldown. */
function noteRateLimit(model: string, status: number, response?: Response) {
  if (status === 429 && response) {
    modelCooldownUntil.set(model, Date.now() + cooldownFromHeaders(response))
  }
}

/** Za ile ms najwcześniej DOWOLNY model wróci do gry (0 = już teraz). Służy do
 *  ustalenia, jak długo warto poczekać przed ponowieniem po serii 429. */
function soonestCooldownMs(base: string[]): number {
  const now = Date.now()
  let soonest = Number.POSITIVE_INFINITY
  for (const model of base) {
    const until = modelCooldownUntil.get(model) ?? 0
    soonest = Math.min(soonest, Math.max(0, until - now))
  }
  return Number.isFinite(soonest) ? soonest : 0
}

/** Limit czasu na NAWIĄZANIE odpowiedzi z jednego modelu Groq. Bez tego zawieszone
 *  połączenie blokowało cały route aż do maxDuration=30 i kończyło się błędem 500
 *  („Przerwa techniczna"). Po przekroczeniu przerywamy i próbujemy kolejny model.
 *
 *  WAŻNE: mamy 2 modele w kolejce, a cały route ma maxDuration=30 s. Gdyby każdy
 *  model wisiał po 18 s, dwa nieudane podejścia (36 s) już przekraczały limit
 *  route → route był zabijany → 500 („Przerwa techniczna"). Dlatego limit jest
 *  krótki: 2 × 8 s = 16 s < 30 s, więc fallback ZDĄŻY zadziałać. */
const GROQ_REQUEST_TIMEOUT_MS = 8000

/** Górny limit czasu na jedną PEŁNĄ (nie-strumieniową) odpowiedź z modelu Groq.
 *  To tylko bezpiecznik na wiszące połączenie — zdrowe wywołania wracają w
 *  kilka sekund. Faktyczny limit każdej próby dodatkowo przycinamy do tego, ile
 *  zostało z budżetu żądania (opts.deadlineMs), żeby wolny model nigdy nie
 *  przeciągnął route poza limit funkcji i nie zamienił odpowiedzi w „Przerwę
 *  techniczną". */
const GROQ_CHAT_TIMEOUT_MS = 12000

/** Dozwolone nazwy narzędzi — do oczyszczenia zepsutych nazw od gpt-oss. */
const KNOWN_TOOL_NAMES = ["szukaj_oficjalne_strony_gminy", "szukaj_w_internecie", "pobierz_dokument"]

/**
 * Modele gpt-oss na Groqu potrafią „przekleić" tokeny formatu harmony do nazwy
 * funkcji, np. `szukaj_oficjalne_strony_gminy<|channel|>commentary`. Groq odrzuca
 * takie wywołanie twardym 400 `tool_use_failed`, choć intencja modelu jest jasna
 * (widać ją w polu `failed_generation`). Zamiast wywracać całe żądanie,
 * odzyskujemy tu poprawne wywołanie: parsujemy `failed_generation` i czyścimy
 * nazwę narzędzia do znanej wartości. Zwraca `null`, gdy nie da się odzyskać.
 */
function salvageToolUseFailure(detail: string): GroqToolCall[] | null {
  try {
    const parsed = JSON.parse(detail) as { error?: { code?: string; failed_generation?: string } }
    const err = parsed.error
    if (err?.code !== "tool_use_failed" || !err.failed_generation) return null

    const gen = JSON.parse(err.failed_generation) as { name?: string; arguments?: unknown }
    const rawName = String(gen.name ?? "")
    // Nazwa = najdłuższy znany prefiks (odcina doklejone tokeny harmony/komentarze).
    const cleanName =
      KNOWN_TOOL_NAMES.find((n) => rawName.startsWith(n)) ??
      KNOWN_TOOL_NAMES.find((n) => rawName.includes(n))
    if (!cleanName) return null

    const args =
      typeof gen.arguments === "string" ? gen.arguments : JSON.stringify(gen.arguments ?? {})
    console.log(`[v0] Odzyskano zepsute wywołanie narzędzia: "${rawName}" → "${cleanName}"`)
    return [
      {
        id: `salvaged_${Date.now()}`,
        type: "function",
        function: { name: cleanName, arguments: args },
      },
    ]
  } catch {
    return null
  }
}

/**
 * Nie-strumieniowe zapytanie do Groq z obsługą narzędzi (function calling).
 * To serce trybu „agenta": model dostaje listę narzędzi i sam decyduje, czy
 * najpierw czegoś poszukać (zwraca `toolCalls`), czy od razu odpowiedzieć
 * (zwraca `content`). Próbuje kolejnych modeli z listy przy błędzie/429.
 */
export async function groqChat(
  messages: GroqMessage[],
  opts: {
    tools?: GroqTool[]
    toolChoice?: "auto" | "none"
    temperature?: number
    maxTokens?: number
    /** Twardy termin całego żądania (Date.now() + budżet). Gdy podany, każda
     *  próba modelu mieści się w tym, co zostało — a przy braku budżetu w ogóle
     *  nie próbujemy kolejnego modelu. */
    deadlineMs?: number
    /** Jawna lista modeli. Gdy pominięta: przy narzędziach używamy TOOL_MODELS,
     *  a bez narzędzi (finalna odpowiedź) — pewniejszej listy FINAL_MODELS. */
    models?: string[]
  } = {},
): Promise<GroqChatResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("Brak GROQ_API_KEY")

  // Wywołanie z narzędziami → modele z tool callingiem; bez narzędzi (finalna
  // odpowiedź) → pewniejsza lista, na czele z modelami bez wycieku harmony.
  const base = opts.models ?? (opts.tools?.length ? TOOL_MODELS : FINAL_MODELS)

  let lastStatus = 0

  for (const model of orderedModels(base)) {
    // Ile czasu realnie zostało na tę próbę. Bez tego wisząca próba potrafiła
    // przeciągnąć route poza limit funkcji → 500 „Przerwa techniczna".
    const remaining = opts.deadlineMs ? opts.deadlineMs - Date.now() : Number.POSITIVE_INFINITY
    if (remaining <= 500) break
    const attemptTimeout = Math.min(GROQ_CHAT_TIMEOUT_MS, remaining)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), attemptTimeout)
    try {
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 1024,
        stream: false,
      }
      // Modele rozumujące (gpt-oss, qwen) potrafią wstrzyknąć łańcuch myśli
      // (<think>…</think>) wprost do treści. „hidden" chowa go po stronie Groqa,
      // więc do nas trafia sama odpowiedź. Modele NIErozumujące (np. llama-3.3)
      // oraz rodzina groq/compound tego parametru NIE wspierają (twardy 400) —
      // wysyłamy go WYŁĄCZNIE do rodzin, które go rozumieją.
      if (supportsReasoningFormat(model)) body.reasoning_format = "hidden"
      if (opts.tools?.length) {
        body.tools = opts.tools
        body.tool_choice = opts.toolChoice ?? "auto"
      }

      const response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (response.ok) {
        // Model odpowiedział — jeśli był w cooldownie, znaczy że już się odnowił.
        modelCooldownUntil.delete(model)
        const data = (await response.json()) as {
          choices?: Array<{
            message?: { content?: string | null; tool_calls?: GroqToolCall[] }
          }>
        }
        const msg = data.choices?.[0]?.message
        return {
          content: (msg?.content ?? "").trim(),
          toolCalls: Array.isArray(msg?.tool_calls) ? msg!.tool_calls! : [],
          model,
        }
      }

      lastStatus = response.status
      noteRateLimit(model, response.status, response)
      const detail = await response.text().catch(() => "")

      // Ratunek dla gpt-oss: 400 „tool_use_failed" z zepsutą nazwą narzędzia.
      // Jeśli w żądaniu były narzędzia i da się odczytać intencję modelu —
      // odzyskujemy wywołanie i zwracamy je normalnie, zamiast lecieć w fallback.
      if (response.status === 400 && opts.tools?.length) {
        const salvaged = salvageToolUseFailure(detail)
        if (salvaged) {
          modelCooldownUntil.delete(model)
          return { content: "", toolCalls: salvaged, model }
        }
      }

      console.log(`[v0] Groq (chat) model ${model} zwrócił ${response.status} — próbuję fallback`, detail.slice(0, 300))
    } catch (error) {
      console.log(`[v0] Groq (chat) model ${model} wyjątek:`, error instanceof Error ? error.message : error)
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new GroqError(
    `Wszystkie modele Groq zawiodły (ostatni status: ${lastStatus})`,
    lastStatus,
    soonestCooldownMs(base),
  )
}

/**
 * Otwiera strumień odpowiedzi z Groq. Próbuje kolejnych modeli z listy, gdy
 * odpowiedź HTTP jest błędna (np. 429 rate limit lub 5xx). Zwraca surową
 * odpowiedź `fetch` ze streamem SSE dopiero gdy status jest OK — dzięki temu
 * fallback zdąży zadziałać zanim cokolwiek trafi do użytkownika.
 */
export async function openGroqStream(messages: GroqMessage[]): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error("Brak GROQ_API_KEY")
  }

  const base = DEFAULT_MODELS
  let lastStatus = 0

  for (const model of orderedModels(base)) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GROQ_REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          // Niska temperatura = mniej „twórczego" dopowiadania (halucynacji
          // lokalnych faktów). Trzymamy blisko determinizmu, bo asystent ma
          // trzymać się DANYCH SERWISU i ponumerowanych źródeł, a nie fantazjować.
          temperature: 0.1,
          max_tokens: 1024,
          stream: true,
          // Chowamy łańcuch myśli modeli rozumujących, by nie przeciekał do treści.
          // Tylko dla rodzin, które wspierają ten parametr (llama/compound → 400).
          ...(supportsReasoningFormat(model) ? { reasoning_format: "hidden" } : {}),
        }),
        signal: controller.signal,
      })

      if (response.ok && response.body) {
        // Strumień otwarty — model działa, więc czyścimy ewentualny cooldown.
        modelCooldownUntil.delete(model)
        // Zatrzymujemy licznik przerwania — strumień jest już otwarty, nie chcemy
        // go przerwać w trakcie czytania właściwej odpowiedzi.
        clearTimeout(timeout)
        return response
      }

      lastStatus = response.status
      noteRateLimit(model, response.status, response)
      // Zaloguj treść błędu (np. 429 rate limit / 413 za duże zapytanie) — to
      // pomaga diagnozować losowe „Przerwy techniczne".
      const detail = await response.text().catch(() => "")
      console.log(`[v0] Groq model ${model} zwrócił ${response.status} — próbuję fallback`, detail.slice(0, 300))
    } catch (error) {
      console.log(`[v0] Groq model ${model} wyjątek:`, error instanceof Error ? error.message : error)
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new GroqError(
    `Wszystkie modele Groq zawiodły (ostatni status: ${lastStatus})`,
    lastStatus,
    soonestCooldownMs(base),
  )
}

/**
 * Zamienia strumień SSE z Groq na czysty strumień tekstu (delty treści),
 * gotowy do przekazania klientowi.
 */
export function groqSseToText(response: Response): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ""

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith("data:")) continue
            const payload = trimmed.slice(5).trim()
            if (payload === "[DONE]") continue
            try {
              const json = JSON.parse(payload)
              const delta: string | undefined = json?.choices?.[0]?.delta?.content
              if (delta) controller.enqueue(encoder.encode(delta))
            } catch {
              // Niepełna linia SSE — pomijamy, dołączy do kolejnego chunku.
            }
          }
        }
      } catch (error) {
        console.log("[v0] Groq stream error:", error instanceof Error ? error.message : error)
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
  })
}
