import 'server-only'

import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * OCHRONA CZATU AI „przy samym wejściu".
 *
 * Ten moduł żyje po stronie serwera i jest wołany na SAMYM POCZĄTKU route
 * /api/chat — ZANIM cokolwiek trafi do modelu. Robi trzy rzeczy:
 *
 *   1. hashuje IP autora (nie trzymamy surowego adresu),
 *   2. wykrywa próby nadużycia (prompt injection / wyciąganie promptu / spam),
 *   3. utrzymuje listę banów po urządzeniu (ip_hash) i sam banuje sprawców po
 *      serii wykrytych ataków.
 *
 * Wszystkie zapytania do bazy są „fail-open": gdy tabela/kolumny jeszcze nie
 * istnieją (migracja 017 nieuruchomiona) albo Supabase chwilowo nie odpowiada,
 * czat DZIAŁA dalej — po prostu bez tej warstwy — zamiast paść błędem.
 */

// ── Hash IP ──────────────────────────────────────────────────────────────────

/**
 * Sól do hashowania IP. Świadomie NIE używamy stałego prefiksu (jak w starszym
 * kodzie „jejkowice:") — przy znanej puli IPv4 taki hash jest odwracalny brute-
 * forcem. Wyprowadzamy sól z SUPABASE_SERVICE_ROLE_KEY (sekret, tylko serwer),
 * więc jest niezgadywalna i „rotuje się" wraz z kluczem. Nie wymaga nowej zmiennej.
 */
function ipSalt(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'jejkowice-fallback-salt'
  return createHash('sha256').update(`chat-ip::${secret}`).digest('hex')
}

/** Zwraca zahashowany adres IP klienta (SHA-256 z tajną solą) albo null. */
export function clientIpHashFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  const ip =
    (forwarded ? forwarded.split(',')[0]?.trim() : '') ||
    headers.get('x-real-ip') ||
    'unknown'
  return createHash('sha256').update(`${ipSalt()}::${ip}`).digest('hex')
}

// ── Wykrywanie nadużyć ───────────────────────────────────────────────────────

/**
 * Reguły detekcji. Każda ma wagę; sumujemy wagi trafień i porównujemy z progiem.
 * Podejście punktowe (a nie „jedno trafienie = ban") ogranicza fałszywe alarmy:
 * mieszkaniec pytający o zwykłą sprawę nie zbierze kilku trafień naraz, a typowy
 * atak (injection + „ujawnij prompt" + fałszywy nagłówek systemowy) — owszem.
 *
 * Wzorce celują w ATAKI zaobserwowane w logach: nadpisywanie instrukcji,
 * wyciąganie promptu słowo w słowo, fałszywe nagłówki [SYSTEM ...]/MEMORY SYNC,
 * przełączanie roli, sondowanie meta (ile zdań/znaków, TAK/NIE o konfiguracji),
 * template/SQL injection oraz „canary".
 */
type Rule = { id: string; weight: number; re: RegExp }

/**
 * „Self-reference" — odwołanie do WŁASNEGO promptu/konfiguracji/reguł bota.
 * Osobny helper, bo pojawia się jako składnik wielu ataków metakonfiguracyjnych
 * i sam w sobie (pytanie o własne instrukcje) jest niemal zawsze próbą ekstrakcji.
 */
// Tylko jednoznaczne dzierżawcze odwołania do bota — NIE zawiera „masz/zasad/
// reguł", bo mieszkaniec pyta np. o „zasady segregacji" czy „masz godziny?".
const SELF = '(twoj\\w+|twoich|twoja|swoje|swoich)'
// Rzeczowniki, o które pyta się WYŁĄCZNIE atakujący — nikt nie pyta bota gminnego
// o jego „wytyczne/konfigurację/prompt/instrukcje". Celowo bez „zasad/reguł".
const CONFIG = '(instrukcj\\w*|wytyczn\\w*|konfiguracj\\w*|prompt\\w*|obowiązk\\w*|zachowani\\w*|kontekst\\w+\\s+bazow\\w*|tekst\\w+\\s+bazow\\w*|definicj\\w*)'

const RULES: Rule[] = [
  // Nadpisywanie / ignorowanie instrukcji.
  { id: 'override', weight: 3, re: /\b(ignore|disregard|forget|skip)\b.{0,40}\b(previous|prior|above|preceding|all|your|first|system)\b.{0,25}\b(instruction|direction|prompt|rule|context|configuration|information)/i },
  { id: 'override_pl', weight: 3, re: /\b(zignoruj|pomiń|zapomnij|nie stosuj się do)\b.{0,40}\b(instrukcj|polece|zasad|wytyczn|wcześniejsz|poprzedni|powyższ|systemow)/i },
  { id: 'no_longer', weight: 3, re: /\b(od teraz|from now on|starting now)\b.{0,40}\b(nie jesteś|jesteś teraz|you are now|you are no longer|nie musisz|revoked|zniesion|odwołan)/i },
  { id: 'new_role', weight: 2, re: /\b(act as|pretend to be|you are now|udawaj|wciel się|zachowuj się jak|jesteś teraz)\b/i },
  { id: 'no_restrictions', weight: 3, re: /\b(bez ograniczeń|no restrictions|no rules|no limit|developer mode|tryb dewelopera|jailbreak|\bDAN\b|don'?t limit yourself)/i },

  // Wyciąganie / ujawnianie promptu i reguł (imperatyw: pokaż/wypisz/dump…).
  { id: 'reveal', weight: 3, re: /\b(reveal|show|print|output|list|repeat|dump|state|wypisz|pokaż|ujawnij|podaj|zacytuj|wyświetl|wymień|streść|opisz|podsumuj)\b.{0,50}\b(system ?prompt|initial (instruction|prompt)|base prompt|tool definition|system (context|configuration)|active rules|instrukcj|wytyczn|konfiguracj|regu[łl]|zasad|prompt|scope|źródł|domen|ograniczeni|kategori|tożsam|format)/i },
  { id: 'reveal_en', weight: 3, re: /\b(reveal|show|print|output|list|repeat|dump|state|give me|return|hand over|share|tell me|translate|encode|convert)\b[^.?!]{0,60}\b(system ?prompt|initial (instruction|prompt)|instruction\w*|configuration|active rules|the flag|system context|initialized with|first \d+ (characters|lines|words))\b/i },
  { id: 'reveal_json', weight: 3, re: /\b(active rules|current rules|system_prompt|base prompt|initial (instruction|prompt|metadata)|initialization metadata|raw .{0,15}prompt|tool definition|system context|system configuration)\b/i },
  { id: 'verbatim', weight: 3, re: /\b(słowo w słowo|verbatim|word for word|dokładnie tak jak|bez żadnego wstępu|repeat the (preceding|above)|preceding text|everything (written )?above|text above this line|dokończ (poniższy|to) )/i },
  { id: 'sysprompt', weight: 2, re: /\bsystem ?prompt|initial prompt|prompt inicjaliz|tekst inicjaliz|pierwsze zdanie|pierwsz\w+ instrukcj/i },
  // Samo słowo „prompt" w odniesieniu do bota. Mieszkaniec gminy praktycznie
  // nigdy nie używa tego słowa — jego pojawienie się to niemal zawsze próba
  // ekstrakcji („jaki masz prompt", „w swoim prompcie", „pokaż prompt").
  { id: 'prompt_word', weight: 3, re: /\bprompt(cie|ach|ami|em|om|owi|owy\w*|y|ów|u|a|ie)?\b/i },
  // „prompt systemowy" / „instrukcja systemowa" w polskim szyku (oba kierunki).
  { id: 'sysprompt_pl', weight: 3, re: /\b(prompt\w*\s+systemow\w+|systemow\w+\s+prompt\w*|instrukcj\w+\s+systemow\w+|systemow\w+\s+instrukcj\w+|wiadomość\w*\s+systemow\w+)\b/i },
  // Jailbreak DAN / „Do Anything Now". Celowo NIE łapiemy polskiego „dane/danych"
  // — dopasowujemy tylko „DAN" jako rolę/akronim, nie każdy wyraz na „dan…".
  { id: 'dan_jailbreak', weight: 3, re: /\b(jesteś|jestes|udajesz|udawaj|wciel\w*\s+się\s+w|zachowuj\s+się\s+jak|od\s+teraz\s+jesteś|nazywasz\s+się|zostań|zostaniesz|będziesz)\s+danem\b|\btryb\s+dan\b|\bdo\s+anything\s+now\b|\bjailbreak\w*\b/i },
  // Wyciąganie danych administratora/twórcy albo „ukrytych danych/instrukcji".
  { id: 'admin_extract', weight: 3, re: /\b((dan\w+|informacj\w+|hasł\w+|dostęp\w*|nazwisk\w+|kontakt\w*)\s+(administrator\w+|admina|twórc\w+|autora)|ukrywani\w+\s+(dan\w+|informacj\w+|instrukcj\w+)|ukryt\w+\s+(dan\w+|instrukcj\w+|informacj\w+|polece\w+))\b/i },
  // Odwołanie do „swojego/twojego promptu/systemu/instrukcji" (dopełnienie
  // self_config_rev o wariant „swoim", którego wcześniej brakowało).
  { id: 'self_own_cfg', weight: 3, re: /\bw\s+(swoim|swojej|swoich)\s+(systemie|prompcie|konfiguracji|wytycznych|instrukcj\w+|regułach|kontekście|definicji)\b/i },
  { id: 'first_words', weight: 2, re: /\b(pierwsze słowo|pierwsz\w+ (zdani|słow)|początek (twoich|moich) wytyczn|od czego zaczyna się|starting from "you are)/i },

  // Sondowanie WŁASNEJ konfiguracji (rdzeń ataków, które wyciekły metadane).
  { id: 'self_config', weight: 3, re: new RegExp(`\\b${SELF}\\b[^.?!]{0,40}\\b${CONFIG}\\b`, 'i') },
  { id: 'self_config_rev', weight: 3, re: new RegExp(`\\bw (twoim |twojej |twoich )?(systemie|prompcie|konfiguracji|wytycznych|instrukcji|regułach|kontekście( bazowym)?|tekście( bazowym)?|definicji)\\b`, 'i') },
  { id: 'trusted_sources', weight: 3, re: /\b(zaufane (źródł|domen|stron)|dozwolone (kategori|tematy|źródł)|lista (dozwolonych|zaufanych)|jakie (domeny|źródła|kategorie)|oficjalne źródła.{0,20}(masz|wymienion)|podstrony urzędowe.{0,20}(masz|zaufan))/i },
  // Ekstrakcja danych kontaktowych — tylko gdy pytanie dotyczy WŁASNYCH reguł
  // bota lub żąda „wyłącznie te dane" (nie łapie zwykłego „podaj numer do urzędu").
  { id: 'contact_extract', weight: 3, re: /\b((wypisz|podaj|wymień)\s+(wyłącznie|tylko)\s+(te\s+)?(dane|adresy|url|numer)|(twoj\w+|w twoich)\s+(wytyczn\w*|instrukcj\w*|konfiguracj\w*)[^.?!]{0,60}(numer telefonu|e-?mail|adres\w* url|dane kontaktowe)|masz zawsze podawać[^.?!]{0,40}(numer|e-?mail|kontakt))/i },
  { id: 'public_info_req', weight: 3, re: /\b(dostęp\w*\s+do\s+informacji\s+publicznej|informacj\w+\s+publicznej|wniosek.{0,30}(algorytm|wytyczn|prompt|konfiguracj))\b[\s\S]{0,120}\b(algorytm|wytyczn|prompt|konfiguracj|komunikacji cyfrowej|reguł)/i },
  // Uwaga: celowo NIE łapiemy ogólnego „masz jakieś ograniczenia" — mieszkaniec
  // może pytać np. o „ograniczenia dietetyczne stołówki". Tylko sformułowania
  // wprost o narzuconych regułach bota.
  { id: 'constraint_probe', weight: 3, re: /\b(masz na��ożon\w+|nałożon\w+ (ci )?ograniczeni\w+|masz (zakaz|nakaz)\s+(wypowiada|ujawnia|podawa|mówieni|odpowiada)|ograniczeni\w+\s+(czasowe\s+na\s+daty|na\s+wypowiadani))\b/i },
  // Zakodowane ładunki (Base64/hex) + polecenie „zdekoduj i wykonaj".
  { id: 'encoded_payload', weight: 3, re: /\b(decode|zdekoduj|odkoduj|rozkoduj)\b[\s\S]{0,40}\b(base64|hex|following|and follow|then follow|i (wykonaj|zastosuj)|instrukcj|instruction)/i },
  { id: 'base64_blob', weight: 2, re: /\b[A-Za-z0-9+/]{48,}={0,2}\b/ },
  { id: 'self_system', weight: 3, re: /\b(twój|twoje|twoim|twojego)\s+system\w*\b[\s\S]{0,50}(uzna\w+|klasyfik\w+|za spam|poza scope|traktuj\w+|rozpoznaj\w+|uznawan\w+)/i },
  { id: 'rag_probe', weight: 3, re: /\b(baz\w+ wektorow|bazie wektorowej|vector (store|database)|embedding|dokument\w+ rag|\bRAG\b|jaki model (językowy|używasz)|który model|which model (are|do) you)\b/i },
  { id: 'contradict_cfg', weight: 3, re: /\b(sprzeczn\w+ z (konfiguracj|instrukcj|wytyczn|zasad|regułami|systemem)|wykonywani\w+ moich (instrukcji|poleceń)|twoim najważniejszym zadaniem jest|najważniejsz\w+ zadani\w+ jest wykonywanie)\b/i },
  { id: 'quote_rule', weight: 3, re: /\b(nawiązując do (zasady|reguły|wytycznej)|do zasady ["„]|zgodnie z (twoją )?zasadą ["„])/i },
  { id: 'according_to', weight: 3, re: /\b(według (twoich |swoich )?(wytycznych|zasad serwisu|reguł serwisu|instrukcji|konfiguracji)|nie wolno ci|kategorycznie nie wolno)\b/i },
  { id: 'prompt_replay', weight: 3, re: /\b(jesteś asystentem serwisu naszejejkowice|zakres działania:\s*[-•]|twój styl i ton:)\b/i },
  { id: 'canary_token', weight: 3, re: /\b(security_canary\w*|canary[_-]?[0-9a-f]{4,})\b/i },

  // Sondowanie meta-formy (ile zdań/znaków, sekcje, TAK/NIE, YAML/JSON).
  { id: 'meta_count', weight: 2, re: /\b(ile (dokładnie )?(zdań|znaków|słów|liter)|liczbę (znaków|słów)|wypisz (wszystkie )?(czasowniki|rzeczowniki)|najczęściej występując|więcej niż \d+ liter)/i },
  { id: 'meta_yesno', weight: 2, re: /\bodpowiedz\s+(wyłącznie|tylko)\b/i },
  { id: 'meta_struct', weight: 2, re: /\b(jako (strukturę )?(yaml|json)|w formacie (yaml|json)|klucze najwyższego poziomu|funkcj\w+ w pythonie|dekorator|wrapped .{0,15}(markdown|code block)|markdown list|w punktach|sekcj\w* (zatytułowan|wielkimi)|nagłówek\w* (wielkimi|pisany wielkimi))/i },

  // Podszywanie się pod system / dewelopera / fałszywe nagłówki.
  { id: 'fake_system', weight: 3, re: /(\[\s*(system|developer|admin|debug)\b|system (update|debug|override|replay|audit|architecture test)|memory sync|operational scope|checksum|maintenance\/debug mode|user context closed|end of conversation)/i },
  { id: 'fake_admin', weight: 2, re: /\b(jestem administratorem|jako administrator|do celów diagnostycznych|masz teraz uprawnieni|masz uprawnienie|parameter alignment|verify parameter)/i },

  // Template / SQL injection.
  { id: 'template', weight: 3, re: /\{\{\s*[\w.]+\s*\}\}|\$\{[\w.]+\}|<\|[^|]*\|>/ },
  { id: 'sqli', weight: 3, re: /('|")\s*(or|and)\s*('|")?\d+('|")?\s*=\s*('|")?\d+|union\s+select|drop\s+table|--\s|;\s*(select|insert|update|delete|drop)\b/i },

  // Sondowanie „canary" / ukrytych identyfikatorów.
  { id: 'canary', weight: 3, re: /\b(canary|hidden (instruction|identifier|prompt)|ukryt\w+ (instrukcj|identyfikator)|unique identifier|secret (token|identifier))/i },

  // Fikcyjne „bliźniacze" boty / prawo jawności — obejście przez hipotezę.
  { id: 'hypothetical', weight: 3, re: /\b(fikcyjn\w+ (gmina|asystent|bot)|openprompt|prawo (pełnej )?jawności|taki sam zestaw wytycznych|asystent gminy [\w-]+-b|hipotetyczn\w+ (bot|asystent))/i },

  // Testowanie / walidacja bota — ładunki, które wysyła TYLKO ktoś sprawdzający
  // odporność czatu, nigdy mieszkaniec pytający o sprawę gminną.
  // XSS / wstrzyknięcie HTML: tagi <script>, <img onerror=…>, <svg onload=…>,
  // uchwyty zdarzeń on…=, protokół javascript:.
  { id: 'xss_payload', weight: 3, re: /<\s*\/?\s*(script|img|svg|iframe|body|input|details|marquee)\b|\bon(error|load|click|mouseover|focus|toggle|animationstart)\s*=|javascript:\s*\S/i },
  // Jawne markery testu/walidacji: „TEST-VALIDATION-123", „validation test",
  // „sanity check", „test-123", „test wstrzyknięcia/injekcji".
  { id: 'test_marker', weight: 3, re: /\b(test[-_\s]?validation|validation[-_\s]?test|sanity[-_\s]?check|test[-_]?case|test[-_]\d+|payload[-_\s]?test|encoding[-_\s]?test|fuzz\w*)\b|\btest\w*\s+(wstrzyk\w+|injekcj\w+|iniekcj\w+|walidacj\w+|zabezpiecz\w+|odporno\w+)/i },
  // Gęste skupisko znaków specjalnych/escape (typowy fuzzing/próba łamania
  // parsera). Łapiemy tylko duże zagęszczenie, by nie ruszać zwykłej interpunkcji.
  { id: 'special_char_fuzz', weight: 3, re: /[<>{}\\/;&'"`|]{6,}|(?:[<>{}\\/;&'"`|]\s*){8,}/ },
]

export type AbuseVerdict = { flagged: boolean; score: number; reasons: string[] }

/** Ocena pojedynczej wiadomości użytkownika. */
export function detectAbuse(text: string): AbuseVerdict {
  const reasons: string[] = []
  let score = 0
  for (const rule of RULES) {
    if (rule.re.test(text)) {
      score += rule.weight
      reasons.push(rule.id)
    }
  }
  // Próg 3: jedna „mocna" reguła (waga 3) albo kilka słabszych łącznie.
  return { flagged: score >= 3, score, reasons }
}

// ── Bany i limity (Supabase, klient service_role) ────────────────────────────

/** Ile wiadomości z jednego urządzenia dopuszczamy w oknie (ochrona przed floodem). */
export const RATE_WINDOW_MS = 60_000
export const RATE_MAX_IN_WINDOW = 12

/** Po ilu wykrytych atakach w oknie zakładamy automatyczny ban. */
export const STRIKE_WINDOW_MS = 60 * 60_000
export const STRIKE_LIMIT = 2

export type ActiveBan = { reason: string | null; is_auto: boolean; expires_at: string | null }

/**
 * Czy urządzenie jest aktualnie zbanowane. „Fail-open": błąd zapytania (np. brak
 * tabeli przed migracją 017) traktujemy jako brak bana, żeby nie zablokować czatu.
 */
export async function getActiveBan(
  admin: SupabaseClient,
  ipHash: string,
): Promise<ActiveBan | null> {
  try {
    const { data, error } = await admin
      .from('chat_bans')
      .select('reason, is_auto, expires_at')
      .eq('ip_hash', ipHash)
      .maybeSingle()
    if (error || !data) return null
    // Ban stały (expires_at NULL) lub jeszcze nie wygasł.
    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null
    return data as ActiveBan
  } catch {
    return null
  }
}

/** Liczba wiadomości z urządzenia w ostatnim oknie (limit tempa). 0 przy błędzie. */
export async function countRecentMessages(admin: SupabaseClient, ipHash: string): Promise<number> {
  try {
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
    const { count, error } = await admin
      .from('chat_logs')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since)
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

/** Liczba wykrytych ataków z urządzenia w oknie „strzałów". 0 przy błędzie. */
export async function countRecentStrikes(admin: SupabaseClient, ipHash: string): Promise<number> {
  try {
    const since = new Date(Date.now() - STRIKE_WINDOW_MS).toISOString()
    const { count, error } = await admin
      .from('chat_logs')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('flagged', true)
      .gte('created_at', since)
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

/**
 * Zakłada automatyczny, STAŁY ban urządzenia. Upsert po ip_hash, więc ponowne
 * wykroczenie tylko odświeża wpis. expires_at = null → ban nigdy nie wygasa
 * (zdjąć go można wyłącznie ręcznie w panelu). Best-effort — błąd nie wywraca czatu.
 */
export async function autoBan(
  admin: SupabaseClient,
  ipHash: string,
  strikes: number,
  reasons: string[],
): Promise<void> {
  try {
    await admin.from('chat_bans').upsert(
      {
        ip_hash: ipHash,
        reason: `Automatyczny, stały ban po ${strikes} wykrytych próbach nadużycia (${reasons.slice(0, 6).join(', ')}).`,
        strikes,
        is_auto: true,
        expires_at: null,
      },
      { onConflict: 'ip_hash' },
    )
  } catch (err) {
    console.log('[v0] autoBan error:', err instanceof Error ? err.message : err)
  }
}
