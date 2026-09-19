// Ten moduł jest CLIENT-SAFE: zawiera wyłącznie typy i czyste funkcje pomocnicze.
// Zapis logów (service_role, server-only) żyje w `lib/chat-logs-server.ts`,
// żeby komponent kliencki panelu mógł importować typy/formatery bez wciągania
// `server-only` do bundla przeglądarki.

/** Pojedynczy wpis logu: jedna para pytanie → odpowiedź. */
export type ChatLogRow = {
  id: string
  session_id: string | null
  question: string
  answer: string
  created_at: string
  /** Zahashowany IP autora (od migracji 017). Null dla starszych wpisów. */
  ip_hash?: string | null
  /** Czy wpis wykryto jako próbę nadużycia (prompt injection / spam). */
  flagged?: boolean | null
  /** Skrót dopasowanych reguł detekcji. */
  flag_reason?: string | null
}

/** Rozmowa = wpisy o tym samym `session_id`, uporządkowane chronologicznie. */
export type ChatConversation = {
  /** Klucz grupujący: session_id albo (dla wpisów bez sesji) id wiersza. */
  key: string
  /** session_id do usuwania całej rozmowy; null dla wpisów bez sesji. */
  sessionId: string | null
  startedAt: string
  lastAt: string
  messages: ChatLogRow[]
  /** ip_hash urządzenia (z pierwszego wpisu, który go ma) — do banowania. */
  ipHash: string | null
  /** Czy w rozmowie wystąpiła choć jedna wykryta próba nadużycia. */
  flagged: boolean
}

/** Wpis listy banów (tabela chat_bans, migracja 017). */
export type ChatBanRow = {
  id: string
  ip_hash: string
  reason: string | null
  strikes: number
  is_auto: boolean
  created_at: string
  expires_at: string | null
}

/** Prosty test formatu UUID (v4-ish). Chroni kolumnę uuid przed śmieciem. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Zwraca poprawny UUID albo null (gdy klient nie przekazał sensownego id). */
export function normalizeSessionId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim()
  return UUID_RE.test(v) ? v : null
}

/** Grupuje płaską listę wpisów w rozmowy, posortowane od najnowszej. */
export function groupConversations(rows: ChatLogRow[]): ChatConversation[] {
  const byKey = new Map<string, ChatLogRow[]>()
  for (const row of rows) {
    // Wpisy bez session_id traktujemy jako osobne, jednowiadomościowe rozmowy.
    const key = row.session_id ?? `solo:${row.id}`
    const list = byKey.get(key)
    if (list) list.push(row)
    else byKey.set(key, [row])
  }

  const conversations: ChatConversation[] = []
  for (const [key, list] of byKey) {
    const messages = [...list].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    conversations.push({
      key,
      sessionId: messages[0].session_id,
      startedAt: messages[0].created_at,
      lastAt: messages[messages.length - 1].created_at,
      messages,
      ipHash: messages.find((m) => m.ip_hash)?.ip_hash ?? null,
      flagged: messages.some((m) => m.flagged === true),
    })
  }

  conversations.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
  return conversations
}

const MONTHS_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

/** np. „15 maja 2024, 14:32" */
export function formatChatDate(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}, ${time}`
}
