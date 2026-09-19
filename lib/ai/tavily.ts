import "server-only"

/** Pojedynczy wynik z Tavily przekazywany do modelu i pokazywany użytkownikowi. */
export type TavilySource = {
  title: string
  url: string
  content: string
}

/**
 * Wynik wyszukiwania z rozróżnieniem, CZY wyszukiwarka w ogóle zadziałała:
 * - `ok: true`  — Tavily odpowiedziało poprawnie; `sources` może być puste
 *   (po prostu nic nie znaleziono dla tego zapytania),
 * - `ok: false` — Tavily jest NIEDOSTĘPNE (brak klucza, błąd HTTP, timeout,
 *   wyjątek sieciowy). To sygnał dla warstwy wyżej, by NIE kazać modelowi szukać
 *   w kółko, tylko odpowiedzieć z tego, co już ma.
 * Dzięki temu awaria wyszukiwarki nie zamienia się w „myśli wiecznie i wywala błąd".
 */
export type TavilySearchResult = {
  ok: boolean
  sources: TavilySource[]
}

/**
 * Twardy limit długości fragmentu (content) JEDNEGO wyniku Tavily — nałożony JUŻ
 * PRZY ODCZYCIE odpowiedzi z Tavily, zanim cokolwiek trafi do route/modelu.
 *
 * PO CO: Tavily potrafi zwrócić bardzo długie fragmenty (szczególnie przy
 * „advanced" i złożonych pytaniach). Groq na darmowym planie ma tylko ~8000
 * tokenów/min, a wyniki są RE-WYSYŁANE w każdej rundzie agenta — pojedynczy
 * rozdęty fragment wystarczał, by przekroczyć limit i zamienić trudniejsze
 * pytanie w błąd („nie potrafi odpowiedzieć"). Ucinamy więc na źródle: ~700
 * znaków (~180-200 tokenów) na wynik to dość na sensowny kontekst, a route i
 * tak dodatkowo przycina do 500 znaków i 3 źródeł. Dzięki temu nawet złożone
 * pytanie mieści się w limicie i model odpowiada z mniejszego kontekstu,
 * zamiast wywalać się na przekroczonym budżecie tokenów.
 */
const TAVILY_SOURCE_CONTENT_CAP = 700

/** Ucina i normalizuje fragment pojedynczego wyniku Tavily do bezpiecznej długości. */
function capSourceContent(content: string): string {
  const clean = content.trim()
  return clean.length > TAVILY_SOURCE_CONTENT_CAP ? clean.slice(0, TAVILY_SOURCE_CONTENT_CAP) : clean
}

/**
 * Reguły tematyczne: dla typowych pytań mieszkańców dokładamy słowa kluczowe
 * charakterystyczne dla konkretnego rodzaju dokumentu urzędowego (uchwała,
 * zarządzenie, harmonogram, statut...). Dzięki temu Tavily trafia w właściwy
 * dokument w BIP zamiast w przypadkowe protokoły czy podstrony.
 */
const TOPIC_RULES: Array<{ test: RegExp; keywords: string[] }> = [
  { test: /budżet|budzet|wydatk|dochod/i, keywords: ["uchwała budżetowa", "budżet gminy"] },
  { test: /podatek|podatk|opłat[ay]|stawk/i, keywords: ["uchwała", "stawki podatku"] },
  { test: /odpad|śmieci|smieci|wywóz|wywoz|odbiór odpad/i, keywords: ["harmonogram odbioru odpadów"] },
  { test: /zarządzeni|zarzadzeni|wójt|wojt/i, keywords: ["zarządzenie wójta"] },
  { test: /sesj|rad[ay] gminy|obrad/i, keywords: ["uchwała rada gminy", "porządek obrad"] },
  { test: /plan zagospodar|zagospodarow|działk|dzialk|przestrzenn/i, keywords: ["uchwała plan zagospodarowania przestrzennego"] },
  { test: /statut/i, keywords: ["statut"] },
  { test: /konsultacj|ogłoszeni|ogloszeni/i, keywords: ["ogłoszenie"] },
  { test: /program|strateg|fundusz sołeck|solmeck/i, keywords: ["uchwała program"] },
]

/**
 * Rdzenie występujące PRAKTYCZNIE na każdej stronie gminnej: „Jejkowice",
 * „gmina", „BIP". Nie różnicują trafności (zawiera je każdy wynik z domen
 * gminy), więc nie liczą się przy ocenie, czy źródło pasuje do pytania.
 */
function isUbiquitousStem(stem: string): boolean {
  return stem.startsWith("jejkow") || stem.startsWith("gmin") || stem === "bip"
}

/** Polskie słowa-wypełniacze usuwane z zapytania, by liczyły się słowa kluczowe. */
const STOPWORDS = new Set([
  "jaki", "jaka", "jakie", "jak", "co", "czy", "gdzie", "kiedy", "ile", "kto", "który", "która", "które",
  "jest", "są", "sa", "był", "była", "było", "będzie", "bedzie", "na", "w", "we", "do", "dla", "o", "u",
  "z", "ze", "i", "oraz", "a", "the", "mi", "mnie", "proszę", "prosze", "podaj", "powiedz", "chcę", "chce",
  "wiedzieć", "wiedziec", "gminy", "gmina", "gminie",
])

/**
 * Buduje precyzyjne zapytanie do Tavily na podstawie pytania użytkownika.
 * Usuwa wypełniacze/interpunkcję, zawsze dopina kontekst gminy, wykryty rok
 * oraz — jeśli rozpoznano temat — słowa kluczowe typu dokumentu (np.
 * „uchwała budżetowa"). Efekt jest bliski zapytaniu w stylu słów kluczowych,
 * np. „budżet Jejkowice 2026 uchwała budżetowa".
 */
export function buildTavilyQuery(question: string, opts: { web?: boolean } = {}): string {
  const q = question.trim()
  const year = q.match(/\b(20\d{2})\b/)?.[1]

  const keywords = q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^20\d{2}$/.test(w))

  const parts: string[] = [...keywords]

  if (!/jejkowic/i.test(q)) parts.push("Jejkowice")

  // Słowa kluczowe typu dokumentu urzędowego (np. „uchwała budżetowa") mają sens
  // TYLKO przy wyszukiwaniu w BIP/na stronach gminy. Dla ogólnego wyszukiwania w
  // internecie (np. „co ciekawego robić w okolicy") pogorszyłyby wyniki, więc je
  // pomijamy.
  if (!opts.web) {
    const rule = TOPIC_RULES.find((r) => r.test.test(q))
    if (rule) parts.push(...rule.keywords)
  }

  if (year) parts.push(year)

  const result = parts.join(" ").replace(/\s+/g, " ").trim()
  // Zabezpieczenie: jeśli po odfiltrowaniu nic nie zostało, użyj oryginału.
  return result || q
}

/** Jawne sygnały „to sprawa urzędowa/BIP" — dla nich ZAWSZE sprawdzamy oficjalne
 *  strony gminy, niezależnie od reszty heurystyki. */
const OFFICIAL_HINTS =
  /oficjaln|urz[ąa]d|urzed|bip|przepis|wniosek|formularz|dokument|uchwał|zarządzeni|zarzadzeni|regulamin|rozporządz|dofinansow|dotacj|stypendi|deklaracj|zaświadcz|zaswiadcz|meldun|dowód osobist|dowod osobist|ewidencj|nieruchomo|pozwoleni|zezwoleni|rejestr|kadencj|wójt|wojt|rad[ay] gminy|referat|kasa gminy|sołtys|soltys|inwestycj|remont|budow|drog[ai]|ulic|oświetl|oswietl|wodociąg|wodociag|kanaliz|szkoł|szkol|przedszkol|świetlic|swietlic|gops|opieka społeczn|opieka spoleczn|numer telefon|kontakt|godziny (pracy|otwarcia)|adres urz/i

/** Tematy obsługiwane z NASZYCH danych (Supabase): aktualności, wydarzenia,
 *  ankiety, galeria, pomysły, zgłoszenia. Dla nich nie idziemy do sieci — nasza
 *  baza jest źródłem prawdy, a Tavily tylko dokładałby zbędne źródła. */
const INTERNAL_ONLY =
  /aktualnośc|aktualnosc|wiadomośc|wiadomosc|\bnews\b|newsy|wydarze|imprez|koncert|festyn|ankiet|sondaż|sondaz|głosowani|glosowani|galeri|zdjęci|zdjeci|\bfotk|pomysł|pomysl|zgłoś|zglos|zgłoszeni|zgloszeni|zgłasz|zglasz/i

/** Zwykła rozmowa / pytania „o samego asystenta" — bez sieci. */
const SMALL_TALK =
  /^(cześć|czesc|hej|witaj|witam|siema|siemano|dzień dobry|dzien dobry|dobry wieczór|dobry wieczor|hello|hi|elo|yo|dzięki|dzieki|dziękuję|dziekuje|ok|okej|spoko|pa|nara|test)\b|kim jesteś|kim jestes|kto cię|kto cie|kto ci[ęe] stworzył|kto was stworzył|kto was zrobił|co potrafisz|co umiesz|jak działasz|jak dzialasz|kim ty jesteś|kim ty jestes/i

/**
 * Decyduje, czy dla danego pytania warto odpytać oficjalne strony gminy.
 *
 * Zasada (zgodnie z architekturą „najpierw nasze dane, a gdy brakuje — sieć"):
 * domyślnie SZUKAMY dla każdego rzeczowego pytania o gminę. Web pomijamy tylko,
 * gdy pytanie należy do tematów obsługiwanych z naszej bazy (aktualności,
 * wydarzenia, ankiety, galeria, pomysły, zgłoszenia) albo to zwykła rozmowa.
 *
 * To celowa zmiana z wąskiej „białej listy" słów kluczowych na „czarną listę":
 * wcześniej drobna zmiana sformułowania decydowała, czy asystent w ogóle sięgnie
 * do sieci („raz szuka, raz nie"). Nasze dane i tak mają pierwszeństwo w prompcie,
 * więc dodatkowe sprawdzenie oficjalnych stron nie psuje odpowiedzi z bazy.
 */
export function shouldSearchTavily(question: string): boolean {
  const q = question.trim()
  if (q.length < 5) return false

  // 1. Jawne sygnały urzędowe/BIP wygrywają ze wszystkim — zawsze szukamy.
  if (TOPIC_RULES.some((r) => r.test.test(q))) return true
  if (OFFICIAL_HINTS.test(q)) return true

  // 2. Tematy z naszej bazy oraz small-talk — bez sieci.
  if (INTERNAL_ONLY.test(q)) return false
  if (SMALL_TALK.test(q)) return false

  // 3. Pytanie musi nieść „treść" (rzeczownik/temat poza wypełniaczami). Jeśli po
  //    odfiltrowaniu stopwords nic nie zostaje (np. „a co tam?"), nie szukamy.
  const hasContentWord = q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .some((w) => w.length > 2 && !STOPWORDS.has(w))
  if (!hasContentWord) return false

  // 4. Pozostałe rzeczowe pytania o gminę: sprawdzamy też oficjalne źródła.
  return true
}

/**
 * Czy dany wynik z sieci FAKTYCZNIE dotyczy pytania mieszkańca?
 *
 * Tavily (nawet zawężony do domen gminy) potrafi zwrócić ogólne strony spisu
 * („Jejkowice – BIP �� Gmina Jejkowice"), które nie mają nic wspólnego z pytaniem.
 * Gdy taki wynik przejdzie dalej, model bywa kuszony, by dokleić go jako „źródło"
 * pod odpowiedzią „nie znalazłem" — co wygląda na sprzeczność. Dlatego ZANIM
 * przekażemy wyniki do modelu i do stopki źródeł, odrzucamy te bez realnego
 * związku z pytaniem.
 *
 * Sygnał trafności (bez RAG/embeddings): pokrycie słów kluczowych pytania
 * (sprowadzonych do rdzenia, odporne na polską fleksję) w tytule/fragmencie/URL,
 * albo wyraźny sygnał „to konkretny dokument urzędowy" z documentRelevanceScore.
 */
export function isRelevantSource(source: TavilySource, question: string): boolean {
  const haystack = `${source.title} ${source.content} ${source.url}`.toLowerCase()

  const stems = [
    ...new Set(
      question
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^20\d{2}$/.test(w))
        .map((w) => stemPl(w)),
    ),
  ]
    .filter((s) => s.length >= 3)
    // Wyrzucamy rdzenie występujące PRAKTYCZNIE na każdej stronie gminnej
    // („Jejkowice", „gmina", „BIP"). NIE różnicują trafności — każdy wynik z
    // jejkowice.pl/bip.jejkowice.pl je zawiera — więc bez tego ogólna strona
    // spisu „udawała" trafne źródło i model dopowiadał na jej podstawie.
    .filter((s) => !isUbiquitousStem(s))

  // Pytanie bez słów treściowych (samo „a co tam?") — nie mamy jak ocenić
  // trafności, więc nie pokazujemy przypadkowego źródła.
  if (stems.length === 0) return false

  const overlap = stems.filter((s) => haystack.includes(s)).length
  const docScore = documentRelevanceScore(source, question)

  // Wymagamy REALNEGO związku z pytaniem, a nie jednego słabego trafienia:
  //  - pokrycie ≥ 2 różnych słów kluczowych (mocny sygnał tematyczny), albo
  //  - pokrycie ≥ 1 słowa ORAZ wyraźny sygnał „to konkretny dokument urzędowy",
  //  - albo bardzo wysoki wynik dokumentowości (trafna uchwała/PDF mimo fleksji).
  // To celowo bardziej rygorystyczne niż wcześniejsze „overlap > 0", które
  // przepuszczało ogólne strony spisu jako rzekome źródła.
  if (overlap >= 2) return true
  if (overlap >= 1 && docScore >= 6) return true
  return docScore >= 10
}

/**
 * Zawęża listę wyników z sieci do tych realnie związanych z pytaniem. Jeśli po
 * filtrze nic nie zostaje, zwracamy pustą listę — model dostanie wtedy jasny
 * sygnał „brak wyników" i pójdzie ścieżką szczerego „nie znalazłem”, bez
 * doklejania niepasujących linków.
 */
export function filterRelevantSources(sources: TavilySource[], question: string): TavilySource[] {
  return sources.filter((s) => isRelevantSource(s, question))
}

/**
 * Wyszukiwanie aktualnych informacji o Jejkowicach przez Tavily Search API.
 *
 * Zgodnie z wymaganiami zawężone do oficjalnych domen gminy i maksymalnie
 * oszczędne (basic, 3 wyniki, 1 fragment na źródło, bez obrazów, raw_content
 * i include_answer). Klucz `TAVILY_API_KEY` używany wyłącznie po stronie serwera.
 */
export async function searchTavily(query: string): Promise<TavilySearchResult> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    console.log("[v0] Tavily: brak TAVILY_API_KEY — pomijam wyszukiwanie")
    return { ok: false, sources: [] }
  }

  const trimmed = buildTavilyQuery(query)
  if (!trimmed) return { ok: true, sources: [] }

  console.log("[v0] Tavily zapytanie:", trimmed)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: trimmed,
        // „advanced" lepiej rankuje konkretne dokumenty (uchwały/PDF) niż strony
        // spisu, więc właściwy dokument częściej trafia do wyników.
        search_depth: "advanced",
        // Mniej kandydatów i jeden fragment na źródło — Groq ma tylko 8000
        // tokenów/min, a wyniki są res-wysyłane w każdej rundzie. Ranking Tavily
        // i tak zwraca najtrafniejsze na górze, a route i tak przycina do 3 źródeł
        // (MAX_SOURCES_TO_MODEL) — pobieranie większej liczby tylko rozdyma payload.
        max_results: 3,
        chunks_per_source: 1,
        include_images: false,
        include_raw_content: false,
        include_answer: false,
        include_domains: ["jejkowice.pl", "bip.jejkowice.pl"],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.log("[v0] Tavily: błąd HTTP", response.status)
      return { ok: false, sources: [] }
    }

    const data = (await response.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>
    }

    const sources = (data.results ?? [])
      .filter((r) => typeof r.url === "string" && r.url.length > 0)
      .map((r) => ({
        title: (r.title ?? r.url ?? "").trim(),
        url: r.url as string,
        // Twardy cap długości JUŻ tutaj — pojedynczy długi fragment nie może
        // rozdąć payloadu i przekroczyć limitu tokenów/min Groqa.
        content: capSourceContent(r.content ?? ""),
      }))
    return { ok: true, sources }
  } catch (error) {
    console.log("[v0] Tavily: wyjątek", error instanceof Error ? error.message : error)
    return { ok: false, sources: [] }
  }
}

/**
 * Ogólne wyszukiwanie w internecie — BEZ zawężania do domen gminy. Używane jako
 * OSTATNIA deska ratunku: gdy ani nasze dane (Supabase), ani oficjalne strony
 * gminy nie mają odpowiedzi (np. „co ciekawego robić w Jejkowicach i okolicy",
 * „gdzie zjeść w pobliżu"). Dzięki temu asystent podaje realną odpowiedź z sieci,
 * zamiast zbywać mieszkańca albo — co gorsza — recytować bieżące newsy z
 * aktualności (remont szkoły, spotkanie klubu) jako rzekome „atrakcje".
 */
export async function searchTavilyWeb(query: string): Promise<TavilySearchResult> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    console.log("[v0] Tavily (web): brak TAVILY_API_KEY — pomijam wyszukiwanie")
    return { ok: false, sources: [] }
  }

  const trimmed = buildTavilyQuery(query, { web: true })
  if (!trimmed) return { ok: true, sources: [] }

  console.log("[v0] Tavily (web) zapytanie:", trimmed)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: trimmed,
        // Ogólny fallback nie musi kopać w dokumentach — „basic" jest szybsze
        // i tańsze, a to i tak tylko wzbogacenie odpowiedzi.
        search_depth: "basic",
        // Trzymamy tyle, ile realnie trafia do modelu (MAX_SOURCES_TO_MODEL=3) —
        // większa liczba wyników tylko rozdyma odpowiedź Tavily i budżet tokenów.
        max_results: 3,
        chunks_per_source: 1,
        include_images: false,
        include_raw_content: false,
        include_answer: false,
        // BEZ include_domains — celowo przeszukujemy cały internet.
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.log("[v0] Tavily (web): błąd HTTP", response.status)
      return { ok: false, sources: [] }
    }

    const data = (await response.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>
    }

    const sources = (data.results ?? [])
      .filter((r) => typeof r.url === "string" && r.url.length > 0)
      .map((r) => ({
        title: (r.title ?? r.url ?? "").trim(),
        url: r.url as string,
        // Ten sam twardy cap co wyżej — chroni budżet tokenów Groqa.
        content: capSourceContent(r.content ?? ""),
      }))
    return { ok: true, sources }
  } catch (error) {
    console.log("[v0] Tavily (web): wyjątek", error instanceof Error ? error.message : error)
    return { ok: false, sources: [] }
  }
}

/** Górny limit długości SUROWEJ treści pobranej z jednego URL (znaki) — zanim
 *  jeszcze zawęzimy j�� do fragmentów istotnych dla pytania. */
const EXTRACT_MAX_CHARS = 20000

/**
 * Cache wyekstrahowanej treści w pamięci procesu (URL -> treść + znacznik czasu).
 * Powód: dokumenty BIP (np. uchwała budżetowa) to PDF-y ~7 MB — ich ekstrakcja
 * przez Tavily „advanced" trwa kilkanaście sekund i BYWA niestabilna (czasem
 * przekracza limit czasu). Skoro treść uchwały jest stała, po pierwszym pobraniu
 * trzymamy ją w cache, dzięki czemu kolejne pytania (np. wielokrotne „jaki budżet")
 * odpowiadają NATYCHMIAST i NIEZAWODNIE, bez ponownego wolnego pobierania PDF.
 * TTL 6 h wystarcza dla dokumentów urzędowych, które zmieniają się rzadko.
 */
const EXTRACT_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const extractCache = new Map<string, { content: string; at: number }>()

function getCachedExtract(url: string): string | null {
  const hit = extractCache.get(url)
  if (!hit) return null
  if (Date.now() - hit.at > EXTRACT_CACHE_TTL_MS) {
    extractCache.delete(url)
    return null
  }
  return hit.content
}

function setCachedExtract(url: string, content: string): void {
  extractCache.set(url, { content, at: Date.now() })
  // Prosty limit rozmiaru cache — usuwamy najstarszy wpis, gdy przekroczymy 50.
  if (extractCache.size > 50) {
    const oldest = [...extractCache.entries()].sort((a, b) => a[1].at - b[1].at)[0]
    if (oldest) extractCache.delete(oldest[0])
  }
}

/** Ile znaków istotnej treści (po zawężeniu) przekazujemy do modelu na jeden
 *  dokument. Trzymamy nisko, bo Groq ma limit rozmiaru zapytania (błąd 413). */
const FOCUS_MAX_CHARS = 2200

/** Ile znaków POCZĄTKU dokumentu zwracamy w OSTATECZNOŚCI — tylko gdy pytanie
 *  nie trafiło w żaden fragment treści (np. bardzo og��lne). W normalnym trybie
 *  NIE zakładamy, że odpowiedź jest na początku PDF-a. */
const HEAD_FALLBACK_CHARS = 1500

/** Promień okna kontekstu wycinanego wokół pojedynczego trafienia (znaki po
 *  każdej stronie). Kilka takich fragmentów mieści się w budżecie FOCUS_MAX_CHARS
 *  i daje modelowi treść WOKÓŁ znalezionego słowa/kwoty, a nie samą linię. */
const CONTEXT_RADIUS = 260

/**
 * Rozszerzenia zapytania wg INTENCJI pytania — dają ogólność (nie tylko budżet).
 * Gdy pytanie dotyczy np. kosztu remontu, szukamy w dokumencie także słów
 * „koszt/wartość/umowa/wynagrodzenie…", nawet jeśli użytkownik ich nie napisał.
 * Przykład: „Ile kosztował remont ulicy Świerkowej?" → oprócz „świerkow"/„remont"
 * dokładamy „koszt", „wartość", „umowa", „wynagrodzenie", „łącznie", „brutto".
 */
const INTENT_EXPANSIONS: Array<{ test: RegExp; terms: string[] }> = [
  {
    test: /koszt|kosztowa|cena|cenie|wydatk|remont|budow|inwestycj|modernizacj|przebud|wynagrodz|zapłac|zaplac|wartość|wartosc|umow|przetarg|dofinansow|dotacj|zadani|zakup/i,
    terms: ["koszt", "wartość", "wartosc", "kwota", "cena", "wynagrodzenie", "umowa", "łącznie", "lacznie", "brutto", "netto"],
  },
  {
    test: /budżet|budzet|dochod|wydatk|deficyt|nadwyżk|nadwyzk/i,
    terms: ["dochody", "wydatki", "deficyt", "nadwyżka", "ustala się", "ogółem", "ogolem", "łącznie", "w wysokości", "w wysokosci"],
  },
  {
    test: /stawk|podatek|podatk|opłat|oplat/i,
    terms: ["stawka", "opłata", "oplata", "wynosi", "podatek"],
  },
  {
    test: /termin|kiedy|data|harmonogram|odbiór|odbior|do kiedy|od kiedy/i,
    terms: ["termin", "data", "dnia", "obowiązuje", "obowiazuje"],
  },
]

/** Lekki „stem" dla polskiej fleksji BEZ bibliotek: dla dłuższych słów obcinamy
 *  końcówkę, aby „Świerkowej" trafiło w „Świerkowa", a „remontu" w „remont".
 *  To wystarcza jako proste dopasowanie po rdzeniu, bez RAG/embeddings. */
function stemPl(word: string): string {
  if (word.length > 7) return word.slice(0, word.length - 3)
  if (word.length > 5) return word.slice(0, word.length - 2)
  return word
}

// Regexy „konkretów", które zwykle SĄ odpowiedzią: kwoty, duże liczby, daty,
// numery uchwał/umów. Trafienie w nie podbija wartość fragmentu.
const AMOUNT_RX = /\d[\d .\u00a0]*(?:,\d+)?\s*(?:zł|zl|pln|złot)/i
const BIG_NUMBER_RX = /\b\d{1,3}(?:[ .\u00a0]\d{3})+(?:,\d+)?\b/
const DATE_RX =
  /\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\b|\b\d{1,2}\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|wrzesnia|października|pazdziernika|listopada|grudnia)\b/i
const DOC_NUMBER_RX = /\b[IVXLC]+\/\d+\/\d{2,4}\b|\b(?:nr|umow[ay])\s?[\w./-]*\d/i

/**
 * Zawęża długą treść dokumentu do fragmentów najbardziej istotnych dla pytania.
 * Dzięki temu do modelu trafia konkret (np. kwota remontu konkretnej ulicy), a
 * nie cała wielostronicowa uchwała — co i tak przekroczyłoby limit zapytania Groq.
 *
 * Działa OGÓLNIE (nie tylko dla budżetu) i NIE zakłada, że odpowiedź jest na
 * początku PDF-a. Strategia (bez RAG/embeddings/vector DB), odporna na to, że
 * PDF-y z Tavily przychodzą jako jeden wielki blok tekstu (brak akapitów):
 *  1. Z pytania budujemy terminy szukane w CAŁYM dokumencie: słowa kluczowe
 *     (nazwa ulicy/miejsca, sprawy, inwestycji) sprowadzone do rdzenia + synonimy
 *     wg intencji (koszt/wartość/umowa…, dochody/wydatki/deficyt…, stawka/opłata…).
 *  2. Znajdujemy WSZYSTKIE pozycje trafień w treści i wycinamy wokół nich okna
 *     kontekstu (± CONTEXT_RADIUS), scalając te, które się nakładają.
 *  3. Okna zawierające konkrety (kwoty, daty, numery uchwał/umów) dostają bonus.
 *  4. Wybieramy najlepiej punktowane okna do wypełnienia budżetu znaków, a potem
 *     układamy je w KOLEJNOŚCI występowania w dokumencie.
 *  5. Dopiero gdy pytanie nie trafi w nic — awaryjnie zwracamy początek dokumentu.
 */
export function focusDocumentContent(content: string, question: string, maxChars = FOCUS_MAX_CHARS): string {
  const clean = content.replace(/\r/g, "").trim()
  if (clean.length <= maxChars) return clean

  // 1. Terminy z pytania (nazwy własne, słowa sprawy) + rok + synonimy intencji.
  const rawKeywords = question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^20\d{2}$/.test(w))

  const expansions: string[] = []
  for (const rule of INTENT_EXPANSIONS) if (rule.test.test(question)) expansions.push(...rule.terms)

  const year = question.match(/\b(20\d{2})\b/)?.[1]

  // Dopasowujemy po „rdzeniu" (odporność na polską fleksję), odrzucając zbyt
  // krótkie stemy, które psułyby trafność.
  const stems = [...new Set([...rawKeywords, ...expansions].map((w) => stemPl(w.toLowerCase())))].filter(
    (s) => s.length >= 3,
  )
  if (year) stems.push(year)

  const haystack = clean.toLowerCase()

  // 2. Wszystkie pozycje trafień w CAŁYM dokumencie (nie tylko na początku).
  type Hit = { pos: number; weight: number }
  const hits: Hit[] = []
  for (const stem of stems) {
    let from = 0
    while (true) {
      const idx = haystack.indexOf(stem, from)
      if (idx === -1) break
      // Rok to słabszy sygnał niż nazwa własna/słowo sprawy.
      hits.push({ pos: idx, weight: /^\d{4}$/.test(stem) ? 1 : 2 })
      from = idx + stem.length
    }
  }

  // Pytanie nie trafiło w nic konkretnego → awaryjnie początek dokumentu.
  if (hits.length === 0) return clean.slice(0, Math.min(maxChars, HEAD_FALLBACK_CHARS)).trim()

  // 3. Okna kontekstu wokół trafień, scalanie nakładających się.
  hits.sort((a, b) => a.pos - b.pos)
  type Win = { start: number; end: number; score: number }
  const windows: Win[] = []
  for (const h of hits) {
    const start = Math.max(0, h.pos - CONTEXT_RADIUS)
    const end = Math.min(clean.length, h.pos + CONTEXT_RADIUS)
    const last = windows[windows.length - 1]
    if (last && start <= last.end) {
      last.end = Math.max(last.end, end)
      last.score += h.weight
    } else {
      windows.push({ start, end, score: h.weight })
    }
  }

  // 4. Bonus za konkrety (kwoty/daty/numery) w oknie — to zwykle jest odpowiedź.
  for (const w of windows) {
    const frag = clean.slice(w.start, w.end)
    if (AMOUNT_RX.test(frag)) w.score += 4
    if (BIG_NUMBER_RX.test(frag)) w.score += 2
    if (DATE_RX.test(frag)) w.score += 2
    if (DOC_NUMBER_RX.test(frag)) w.score += 2
  }

  // 5. Najlepsze okna do wypełnienia budżetu, potem kolejność jak w dokumencie.
  const picked: Win[] = []
  let used = 0
  for (const w of [...windows].sort((a, b) => b.score - a.score || a.start - b.start)) {
    const len = w.end - w.start
    if (used + len > maxChars) continue
    picked.push(w)
    used += len
    if (used >= maxChars) break
  }
  picked.sort((a, b) => a.start - b.start)

  // 6. Złożenie fragmentów: przycięcie do granic słów + znacznik wycięcia.
  const snap = (w: Win) => {
    let s = w.start
    let e = w.end
    if (s > 0) {
      const sp = haystack.indexOf(" ", s)
      if (sp !== -1 && sp < s + 40) s = sp + 1
    }
    if (e < clean.length) {
      const sp = haystack.lastIndexOf(" ", e)
      if (sp !== -1 && sp > e - 40) e = sp
    }
    return clean.slice(s, e).replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim()
  }

  const parts = picked.map(snap).filter(Boolean)
  return parts.length ? parts.join("\n[...]\n") : clean.slice(0, Math.min(maxChars, HEAD_FALLBACK_CHARS)).trim()
}

/**
 * Czy dany wynik wyszukiwania to dokument, dla którego warto pobrać PEŁNĄ treść
 * przez Tavily Extract? Kwalifikujemy:
 *  - pliki PDF (uchwały, harmonogramy, załączniki),
 *  - podstrony BIP prowadzące do treści dokumentu (bip.jejkowice.pl),
 *  - strony, których fragment ze Search wygląda na urwany opis dokumentu
 *    (uchwała/zarządzenie/budżet), a nie samą treść.
 * To pozwala pobrać treść także ze strony BIP, która prowadzi do dokumentu (pkt 5).
 */
export function isExtractableDocument(source: TavilySource): boolean {
  const url = source.url.toLowerCase()
  if (url.endsWith(".pdf") || url.includes(".pdf")) return true
  if (url.includes("bip.jejkowice.pl")) return true
  // Strona z jejkowice.pl, której fragment sugeruje dokument urzędowy.
  return /uchwał|zarządzeni|zarzadzeni|budżet|budzet|harmonogram|statut|regulamin/i.test(
    `${source.title} ${source.content}`,
  )
}

/**
 * Punktuje, jak bardzo dany wynik wygląda na KONKRETNY dokument (a nie stronę
 * spisu/indeksu). Dzięki temu do Extract trafia właściwa uchwała, a nie ogólne
 * podstrony typu „/najnowsze/4" czy „/lista/kadencja-...". Uwzględnia też
 * pokrycie słów kluczowych z pytania.
 */
export function documentRelevanceScore(source: TavilySource, question: string): number {
  const url = source.url.toLowerCase()
  const haystack = `${source.title} ${source.content}`.toLowerCase()
  let score = 0

  // Konkretny plik / dokument.
  if (url.includes(".pdf")) score += 6
  if (/uchwal|zarzadzeni|budzet|budżet|harmonogram|statut|regulamin/.test(url)) score += 5
  // Długa, „mówiąca" ścieżka to zwykle konkretny dokument, nie indeks.
  const lastSegment = url.replace(/\/+$/, "").split("/").pop() ?? ""
  if (lastSegment.length > 25) score += 3

  // Strony spisu/indeksu — degradujemy.
  if (/\/(najnowsze|lista|kategoria|archiwum|aktualnosci)(\/|$)/.test(url)) score -= 4
  if (/^\d+$/.test(lastSegment)) score -= 3

  // Pokrycie słów kluczowych pytania (w tytule/fragmencie).
  const keywords = question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  for (const k of keywords) if (haystack.includes(k)) score += 1

  // Rok z pytania to silny sygnał — dokument DOTYCZĄCY właśnie tego roku (np.
  // „...budżetu na rok 2026") ma wygrać z dokumentem o INNYM roku, który tylko
  // wspomina o pytanym roku (np. „sprawozdanie za 2025" opublikowane w 2026).
  const year = question.match(/\b(20\d{2})\b/)?.[1]
  if (year) {
    if (url.includes(year) || haystack.includes(year)) score += 2
    // Człon „na rok YYYY" / „na YYYY rok" = dokument właśnie o tym roku.
    const rx = new RegExp(`na[-\\s]rok[-\\s]${year}|na[-\\s]${year}[-\\s]rok|budzetu[-\\s].*${year}`)
    if (rx.test(url) || rx.test(haystack)) score += 6
    // „sprawozdanie z wykonania" dotyczy roku UBIEGŁEGO — dla pytania o budżet
    // „na rok" jest to zwykle zły dokument, więc lekko degradujemy.
    if (/uchwalenia budżetu|uchwalenia budzetu|uchwała budżetowa/i.test(haystack)) score += 4
    if (/sprawozdani[ae].*wykonani/i.test(haystack)) score -= 3
  }

  return score
}

/**
 * Kluczowa poprawka „Tavily nie czyta PDF": strony uchwał/zarządzeń w BIP
 * Jejkowice to tylko METADANE + link do załącznika PDF (np. „Pliki do pobrania:
 * BR.0007...pdf 7 MB"). Cała treść z kwotami jest w tym PDF. Tavily Extract
 * potrafi czytać PDF-y świetnie, ale trzeba mu podać URL PLIKU, a nie stronę HTML.
 *
 * Ta funkcja pobiera HTML strony BIP i wyłuskuje bezwzględny adres pierwszego
 * realnego załącznika (`/zalacznik/NNNN` lub link do `.pdf`), pomijając stały
 * link do instrukcji BIP (`/pdf/instrukcja.pdf`). Zwraca null, gdy strona nie
 * prowadzi do żadnego załącznika (albo sama jest już plikiem PDF).
 */
async function resolveBipAttachmentUrl(pageUrl: string): Promise<string | null> {
  const lower = pageUrl.toLowerCase()
  // Sam plik PDF — nic nie rozwiązujemy, ekstrahujemy go wprost.
  if (lower.endsWith(".pdf")) return null
  // Rozwiązujemy tylko strony BIP (tam żyją załączniki uchwał/zarządzeń).
  if (!lower.includes("bip.jejkowice.pl")) return null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NaszeJejkowiceBot/1.0)" },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const html = await res.text()

    const origin = new URL(pageUrl).origin
    const hrefs = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1])
    const candidate = hrefs.find((h) => {
      const hl = h.toLowerCase()
      if (hl.includes("instrukcja.pdf")) return false // stały link BIP — nie dokument
      return /\/zalacznik\/\d+/.test(hl) || (hl.includes(".pdf") && !hl.includes("/pdf/instrukcja"))
    })
    if (!candidate) return null
    return candidate.startsWith("http") ? candidate : `${origin}${candidate.startsWith("/") ? "" : "/"}${candidate}`
  } catch {
    return null
  }
}

/** Minimalna liczba znaków, przy której uznajemy bezpośrednią ekstrakcję PDF za
 *  udaną. PDF-y skanowane (same obrazy, bez warstwy tekstowej) zwracają ~0 znaków
 *  — wtedy fallback nic nie daje i zostawiamy pipeline bez zmian. */
const DIRECT_PDF_MIN_CHARS = 200

/**
 * Awaryjna ekstrakcja tekstu PROSTO z pliku PDF, gdy Tavily Extract zwróci pustą
 * treść (Tavily bywa niestabilny przy pobieraniu dużych załączników BIP i zwraca
 * „Failed to fetch url"). Pobieramy plik z serwera i czytamy jego warstwę tekstową
 * biblioteką `unpdf` (pdf.js). To NIE jest crawler, RAG, embeddings ani usługa —
 * to zwykłe czytanie jednego pliku, którego adres już mamy z rankingu.
 *
 * Zwraca "" dla PDF-ów skanowanych (bez tekstu) oraz plików innych niż PDF —
 * wtedy pipeline działa jak dotąd (model powie szczerze, że nie zna kwoty).
 */
async function extractPdfTextDirectly(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NaszeJejkowiceBot/1.0)" },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return ""

    const buf = new Uint8Array(await res.arrayBuffer())
    // Rozpoznajemy PDF po nagłówku pliku (%PDF) lub typie MIME — adres BIP typu
    // /zalacznik/NNNN nie ma rozszerzenia, więc nie ufamy samej końcówce URL.
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase()
    const isPdf =
      contentType.includes("pdf") ||
      (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)
    if (!isPdf) return ""

    const { extractText, getDocumentProxy } = await import("unpdf")
    const pdf = await getDocumentProxy(buf)
    const { text } = await extractText(pdf, { mergePages: true })
    const full = (Array.isArray(text) ? text.join("\n") : text)
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
    return full.length >= DIRECT_PDF_MIN_CHARS ? full.slice(0, EXTRACT_MAX_CHARS) : ""
  } catch (error) {
    console.log("[v0] Bezpośrednia ekstrakcja PDF: wyjątek", error instanceof Error ? error.message : error)
    return ""
  }
}

/**
 * Tavily Extract — pobiera pełną treść z podanych adresów URL (max 1-2 na
 * zapytanie, zgodnie z wymaganiem). Używane, gdy Search trafił we właściwy
 * dokument BIP/PDF, ale zwrócony fragment jest zbyt krótki, by odpowiedzieć
 * konkretnie (np. podać kwotę budżetu). Treść jest przycinana do
 * EXTRACT_MAX_CHARS, żeby nie rozdmuchać promptu / kosztów.
 *
 * WAŻNE: dla stron BIP, które są tylko „opakowaniem" na załącznik PDF, najpierw
 * rozwiązujemy adres załącznika (resolveBipAttachmentUrl) i ekstrahujemy PDF,
 * bo to w nim są konkretne dane (kwoty, terminy). Treść mapujemy na URL, który
 * podał wywołujący (adres strony/wyniku), żeby dalsza logika i źródła pasowały.
 *
 * Zwraca mapę url -> wyciągnięta treść. Bez crawl, RAG, embeddings — czysty
 * jeden request do istniejącego API Tavily.
 */
/** Ile razy ponawiamy Tavily Extract dla celów, które zwróciły „Failed to fetch
 *  url". Ekstrakcja bywa niestabilna (zwłaszcza OCR dużych, skanowanych PDF-ów
 *  BIP), a kolejne próby zwykle się udają — to sedno poprawianej niezawodności. */
const TAVILY_EXTRACT_RETRIES = 1
/** Odstęp między próbami — daje Tavily chwilę na dokończenie pobrania po stronie
 *  ich serwera zamiast natychmiastowego, ponownie nieudanego strzału. */
const TAVILY_RETRY_DELAY_MS = 1500

/**
 * Pojedyncze wywołanie Tavily Extract dla zestawu adresów. Zwraca mapę
 * fetchUrl -> treść tylko dla tych URL, które faktycznie zwróciły niepustą
 * treść. URL-e, których Tavily nie oddał (np. „Failed to fetch url"), po prostu
 * nie występują w wyniku — to sygnał dla logiki ponawiania.
 */
async function tavilyExtractOnce(
  targets: string[],
  apiKey: string,
  timeoutMs = 16000,
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (targets.length === 0) return result

  try {
    // Duże PDF-y BIP (uchwały budżetowe potrafią mieć 7 MB) + extract_depth
    // „advanced" wymagają czasu, ale limit MUSI zmieścić się w tym, co zostało z
    // budżetu żądania (przekazywane z route), inaczej ekstrakcja przeciąga route
    // poza limit funkcji → 500 „Przerwa techniczna".
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), Math.max(4000, timeoutMs))

    const response = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        urls: targets,
        // „advanced" jest wymagane, by Tavily poprawnie wyciągnął treść z PDF-ów
        // i złożonych podstron BIP (uchwały, harmonogramy). „basic" często zwraca
        // z PDF pustą treść — stąd wcześniejszy problem „Tavily nie czyta PDF".
        extract_depth: "advanced",
        // Prosimy o czysty tekst (bez markdown/HTML) — lżejszy prompt dla Groq.
        format: "text",
        include_images: false,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.log("[v0] Tavily Extract: błąd HTTP", response.status)
      return result
    }

    const data = (await response.json()) as {
      results?: Array<{ url?: string; raw_content?: string }>
      failed_results?: Array<{ url?: string; error?: string }>
    }

    for (const f of data.failed_results ?? []) {
      if (f.url) console.log("[v0] Tavily Extract: nieudane", f.url, f.error ?? "")
    }

    for (const r of data.results ?? []) {
      if (typeof r.url !== "string" || !r.url) continue
      const content = (r.raw_content ?? "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
      if (!content) continue
      result.set(r.url, content.slice(0, EXTRACT_MAX_CHARS))
    }
  } catch (error) {
    console.log("[v0] Tavily Extract: wyjątek", error instanceof Error ? error.message : error)
  }

  return result
}

export async function extractTavily(urls: string[], budgetMs = 20000): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const apiKey = process.env.TAVILY_API_KEY
  const requested = urls.filter((u) => typeof u === "string" && u.length > 0).slice(0, 2)
  if (!apiKey || requested.length === 0) return out

  // Twardy termin całej ekstrakcji — sumaryczny budżet dla wszystkich prób
  // (resolve + extract + ewentualne ponowienie). Route przekazuje tu tylko tyle,
  // ile może stracić, zostawiając zapas na finalną odpowiedź modelu.
  const extractDeadline = Date.now() + Math.max(4000, budgetMs)
  const timeLeft = () => extractDeadline - Date.now()

  // Dla każdego żądanego URL sprawdzamy, czy to strona BIP prowadząca do
  // załącznika PDF. Jeśli tak — ekstrahujemy PDF, ale treść zapiszemy pod
  // ORYGINALNYM adresem wyniku (fetchUrl -> sourceUrl), by źródła się zgadzały.
  const resolved = await Promise.all(
    requested.map(async (sourceUrl) => {
      const attachment = await resolveBipAttachmentUrl(sourceUrl)
      return { sourceUrl, fetchUrl: attachment ?? sourceUrl }
    }),
  )
  const fetchToSource = new Map(resolved.map((r) => [r.fetchUrl, r.sourceUrl]))

  console.log("[v0] Tavily Extract dla:", resolved.map((r) => r.fetchUrl === r.sourceUrl ? r.fetchUrl : `${r.sourceUrl} -> ${r.fetchUrl}`).join(", "))

  // Ponawiamy Extract tylko dla celów, które jeszcze nie mają treści. Tavily
  // bywa niestabilny („Failed to fetch url") — kolejna próba zwykle zwraca OCR
  // dużego, skanowanego PDF-a, którego bezpośredni odczyt tekstu nie odzyska.
  const gotContent = new Set<string>()
  for (let attempt = 0; attempt <= TAVILY_EXTRACT_RETRIES; attempt++) {
    const pending = resolved.map((r) => r.fetchUrl).filter((u) => !gotContent.has(u))
    if (pending.length === 0) break
    // Nie zaczynamy (ani nie ponawiamy) ekstrakcji bez sensownego budżetu czasu.
    if (timeLeft() < 4000) {
      console.log("[v0] Tavily Extract: przerywam — zbyt mały budżet czasu")
      break
    }
    if (attempt > 0) {
      console.log(`[v0] Tavily Extract: ponawiam (próba ${attempt + 1}) dla`, pending.join(", "))
      await new Promise((resolve) => setTimeout(resolve, TAVILY_RETRY_DELAY_MS))
    }

    const partial = await tavilyExtractOnce(pending, apiKey, timeLeft())
    for (const [fetchUrl, content] of partial) {
      gotContent.add(fetchUrl)
      // Treść z załącznika PDF zapisujemy pod adresem oryginalnego wyniku
      // (strony BIP), żeby route i lista źródeł operowały na tym samym URL.
      const sourceUrl = fetchToSource.get(fetchUrl) ?? fetchUrl
      out.set(sourceUrl, content)
    }
  }

  // Fallback: dla celów, których Tavily nie zwrócił mimo ponowień (np. trwałe
  // „Failed to fetch url"), próbujemy przeczytać PDF bezpośrednio z serwera.
  // Aktywuje się TYLKO gdy brakuje treści — inaczej pipeline zostaje bez zmian.
  const missing = resolved.filter((r) => !out.has(r.sourceUrl))
  if (missing.length && timeLeft() > 4000) {
    const direct = await Promise.all(
      missing.map(async (r) => ({ sourceUrl: r.sourceUrl, content: await extractPdfTextDirectly(r.fetchUrl) })),
    )
    for (const d of direct) {
      if (d.content) {
        console.log("[v0] Fallback PDF: odczytano bezpośrednio", d.sourceUrl, `(${d.content.length} znaków)`)
        out.set(d.sourceUrl, d.content)
      }
    }
  }

  return out
}
