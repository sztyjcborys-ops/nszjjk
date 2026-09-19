'use client'

import { useMemo, useState, type ComponentType } from 'react'
import { useFormStatus } from 'react-dom'
import {
  MessageSquare,
  Bot,
  User,
  Trash2,
  CalendarDays,
  ShieldAlert,
  ShieldBan,
  ShieldOff,
  AlertTriangle,
  Search,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import {
  formatChatDate,
  type ChatConversation,
  type ChatLogRow,
  type ChatBanRow,
} from '@/lib/chat-logs'
import {
  deleteChatLogAction,
  deleteConversationAction,
  clearChatLogsAction,
  banDeviceAction,
  unbanDeviceAction,
} from '@/app/admin/rozmowy/actions'

/** Skrócony podgląd hasha urządzenia — pełny hash jest długi i nieczytelny. */
function shortHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`
}

/**
 * Przycisk „submit" dla akcji serwerowej, który podczas oczekiwania na odpowiedź
 * z bazy pokazuje kręcące się kółeczko (loading) i blokuje się przed ponownym kliknięciem.
 */
function SubmitButton({
  icon: Icon,
  label,
  pendingLabel,
  className,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  pendingLabel?: string
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${className ?? ''}`}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
      {pending ? (pendingLabel ?? label) : label}
    </button>
  )
}

type DateRange = 'all' | 'today' | '7d' | '30d'

const rangeDefs: { key: DateRange; label: string }[] = [
  { key: 'all', label: 'Wszystko' },
  { key: 'today', label: 'Dzisiaj' },
  { key: '7d', label: 'Ostatnie 7 dni' },
  { key: '30d', label: 'Ostatnie 30 dni' },
]

function isWithinRange(iso: string, range: DateRange): boolean {
  if (range === 'all') return true
  const when = new Date(iso).getTime()
  const now = Date.now()
  if (range === 'today') {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return when >= start.getTime()
  }
  const days = range === '7d' ? 7 : 30
  return when >= now - days * 24 * 60 * 60 * 1000
}

/** Godzina wiadomości, np. „14:32". */
function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Pojedyncza wymiana w stylu okna czatu:
 * pytanie użytkownika jako dymek po prawej, odpowiedź asystenta po lewej.
 */
function ExchangeRow({ message }: { message: ChatLogRow }) {
  const time = formatMessageTime(message.created_at)
  return (
    <div className="grid gap-2.5">
      {/* Wiadomość od użytkownika — jakbyśmy ją dostali, dymek po lewej. */}
      <div className="flex flex-col items-start gap-1">
        <div className="flex max-w-[92%] items-start gap-2 rounded-2xl rounded-tl-sm bg-muted px-3 py-2">
          <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {message.question}
          </span>
        </div>
        <span className="flex items-center gap-1 pl-1 text-[11px] text-muted-foreground">
          <User className="size-3" />
          {time}
        </span>
      </div>

      {message.flagged && (
        <p className="flex flex-wrap items-center gap-1.5 pl-1 text-xs font-medium text-destructive">
          <AlertTriangle className="size-3.5 shrink-0" />
          Wykryto próbę nadużycia
          {message.flag_reason && (
            <span className="font-normal text-destructive/80">({message.flag_reason})</span>
          )}
        </p>
      )}

      {/* Nasza odpowiedź (asystent) — jakbyśmy ją wysłali, dymek po prawej. */}
      <div className="-mr-12 flex flex-col items-end gap-1">
        <div className="flex max-w-[92%] items-start gap-2 rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-primary-foreground">
          <span className="min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.answer}
          </span>
        </div>
        <span className="flex items-center gap-1 pr-1 text-[11px] text-muted-foreground">
          <Bot className="size-3" />
          {time}
        </span>
      </div>
    </div>
  )
}

function ConversationCard({
  conversation,
  isBanned,
  autoBanned,
  manualBanned,
}: {
  conversation: ChatConversation
  isBanned: boolean
  autoBanned: boolean
  manualBanned: boolean
}) {
  const { messages, sessionId, ipHash, flagged } = conversation
  // „Nadużycie" pokazujemy też, gdy urządzenie dostało automatycznego bana.
  const abuse = flagged || autoBanned
  // Czerwoną obwódkę pokazujemy przy nadużyciu ORAZ przy ręcznym zbanowaniu.
  const highlighted = abuse || manualBanned
  const count = messages.length
  const countLabel = count === 1 ? '1 wiadomość' : `${count} wiadomości`
  const [open, setOpen] = useState(false)

  return (
    <li
      className={`overflow-hidden rounded-2xl border bg-card ${
        highlighted ? 'border-destructive/60 ring-1 ring-destructive/30' : 'border-border'
      }`}
    >
      {/* Nagłówek — klik rozwija/zwija rozmowę. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors sm:px-4 ${
          highlighted ? 'hover:bg-destructive/5' : 'hover:bg-muted/50'
        }`}
      >
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0" />
            <span className="truncate">{formatChatDate(conversation.startedAt)}</span>
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            {manualBanned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                <ShieldBan className="size-3" />
                Zablokowany
              </span>
            )}
            {abuse && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                <ShieldAlert className="size-3" />
                Nadużycie
              </span>
            )}
            {ipHash && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                {shortHash(ipHash)}
              </span>
            )}
          </span>
        </span>

        {/* Ilość wiadomości — zawsze z prawej strony. */}
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          <MessageSquare className="size-3" />
          {count}
          <span className="sr-only">{countLabel}</span>
        </span>
      </button>

      {open && (
        <>
          <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border px-3 py-2 sm:px-4">
            {/* Ban / status urządzenia (o ile znamy ip_hash). */}
            {ipHash &&
              (isBanned ? (
                <form action={unbanDeviceAction}>
                  <input type="hidden" name="ipHash" value={ipHash} />
                  <SubmitButton
                    icon={ShieldOff}
                    label="Odbanuj"
                    pendingLabel="Odbanowuję…"
                    className="text-eco hover:bg-eco/10"
                  />
                </form>
              ) : (
                <form
                  action={banDeviceAction}
                  onSubmit={(e) => {
                    if (!confirm('Zbanować to urządzenie? Nie będzie mogło korzystać z asystenta.'))
                      e.preventDefault()
                  }}
                >
                  <input type="hidden" name="ipHash" value={ipHash} />
                  <SubmitButton
                    icon={ShieldBan}
                    label="Zbanuj"
                    pendingLabel="Banuję…"
                    className="text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                  />
                </form>
              ))}

            {/* Usunięcie całej rozmowy (o ile mamy session_id). */}
            {sessionId && (
              <form
                action={deleteConversationAction}
                onSubmit={(e) => {
                  if (!confirm('Usunąć całą rozmowę? Tej operacji nie można cofnąć.')) e.preventDefault()
                }}
              >
                <input type="hidden" name="sessionId" value={sessionId} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Usuń rozmowę
                </button>
              </form>
            )}
          </div>

          <ul className="grid gap-4 border-t border-border px-3 py-3 sm:px-4">
            {messages.map((m) => (
              <li key={m.id} className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <ExchangeRow message={m} />
                </div>
                {/* Usunięcie pojedynczej pary pytanie → odpowiedź. */}
                <form
                  action={deleteChatLogAction}
                  onSubmit={(e) => {
                    if (!confirm('Usunąć ten wpis?')) e.preventDefault()
                  }}
                >
                  <input type="hidden" name="id" value={m.id} />
                  <button
                    type="submit"
                    aria-label="Usuń wpis"
                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
    </li>
  )
}

/** Panel aktywnych banów urządzeń (ip_hash). Pozwala zdjąć ban jednym kliknięciem. */
function BansPanel({ bans }: { bans: ChatBanRow[] }) {
  if (bans.length === 0) return null

  return (
    <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
        <ShieldBan className="size-4" />
        Zbanowane urządzenia ({bans.length})
      </h2>
      <ul className="mt-3 grid gap-2">
        {bans.map((ban) => {
          const expired =
            ban.expires_at !== null && new Date(ban.expires_at).getTime() <= Date.now()
          return (
            <li
              key={ban.id}
              className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-mono text-muted-foreground">{shortHash(ban.ip_hash)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      ban.is_auto ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {ban.is_auto ? 'automatyczny' : 'ręczny'}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {ban.expires_at === null
                      ? 'stały'
                      : expired
                        ? 'wygasł'
                        : `do ${formatChatDate(ban.expires_at)}`}
                  </span>
                </p>
                {ban.reason && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{ban.reason}</p>
                )}
              </div>
              <form action={unbanDeviceAction}>
                <input type="hidden" name="ipHash" value={ban.ip_hash} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-eco/40 hover:bg-eco/10 hover:text-eco"
                >
                  <ShieldOff className="size-3.5" />
                  Odbanuj
                </button>
              </form>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function ChatLogsManager({
  conversations,
  bans,
}: {
  conversations: ChatConversation[]
  bans: ChatBanRow[]
}) {
  const bannedHashes = useMemo(() => new Set(bans.map((b) => b.ip_hash)), [bans])
  // Urządzenia z automatycznym banem — do oznaczenia rozmów jako „nadużycie".
  const autoBannedHashes = useMemo(
    () => new Set(bans.filter((b) => b.is_auto).map((b) => b.ip_hash)),
    [bans],
  )
  // Urządzenia zbanowane ręcznie — dostają czerwoną obwódkę i badge „Zablokowany".
  const manualBannedHashes = useMemo(
    () => new Set(bans.filter((b) => !b.is_auto).map((b) => b.ip_hash)),
    [bans],
  )

  const [query, setQuery] = useState('')
  const [range, setRange] = useState<DateRange>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return conversations.filter((c) => {
      if (!isWithinRange(c.lastAt, range)) return false
      if (q === '') return true
      return c.messages.some(
        (m) =>
          m.question.toLowerCase().includes(q) || m.answer.toLowerCase().includes(q),
      )
    })
  }, [conversations, query, range])

  const total = filtered.reduce((n, c) => n + c.messages.length, 0)

  return (
    <div className="grid gap-4">
      <BansPanel bans={bans} />

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <MessageSquare className="size-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Brak rozmów</h2>
          <p className="mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
            Nikt jeszcze nie rozmawiał z asystentem AI — albo logi zostały wyczyszczone.
          </p>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj w rozmowach..."
              aria-label="Szukaj w rozmowach"
              className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {rangeDefs.map((r) => {
              const active = range === r.key
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  aria-pressed={active}
                  className={`inline-flex shrink-0 items-center rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  {r.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {filtered.length}{' '}
              {filtered.length === 1 ? 'rozmowa' : 'rozmów'} · {total}{' '}
              {total === 1 ? 'wiadomość' : 'wiadomości'}
            </p>
            <form
              action={clearChatLogsAction}
              onSubmit={(e) => {
                if (!confirm('Usunąć WSZYSTKIE logi rozmów? Tej operacji nie można cofnąć.'))
                  e.preventDefault()
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
                Wyczyść wszystko
              </button>
            </form>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Search className="size-6" />
              </span>
              <p className="mt-3 text-sm text-muted-foreground">
                Brak rozmów dla wybranych filtrów.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {filtered.map((c) => (
                <ConversationCard
                  key={c.key}
                  conversation={c}
                  isBanned={c.ipHash ? bannedHashes.has(c.ipHash) : false}
                  autoBanned={c.ipHash ? autoBannedHashes.has(c.ipHash) : false}
                  manualBanned={c.ipHash ? manualBannedHashes.has(c.ipHash) : false}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
