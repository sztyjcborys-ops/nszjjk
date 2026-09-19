"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, BarChart3, Check, Loader2, Lock, ThumbsUp } from "lucide-react"
import type { PublicPoll } from "@/lib/polls"
import { submitPollVoteAction } from "@/app/ankiety/actions"
import { cn } from "@/lib/utils"

export const VOTER_KEY_STORAGE = "jejkowice_voter_key"
export const VOTED_POLLS_STORAGE = "jejkowice_voted_polls"

/** Polska odmiana słowa „głos”. */
export function votesLabel(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (n === 1) return "głos"
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "głosy"
  return "głosów"
}

/**
 * Wspólny stan głosowania oparty o localStorage: stabilny klucz głosującego
 * (voter_key) oraz lista ankiet, w których już zagłosowano. Dzięki wspólnym
 * kluczom głos oddany na stronie głównej jest pamiętany także na /ankiety.
 */
export function useVotedPolls() {
  const [votedPolls, setVotedPolls] = useState<string[]>([])

  useEffect(() => {
    try {
      let key = localStorage.getItem(VOTER_KEY_STORAGE)
      if (!key) {
        key = crypto.randomUUID()
        localStorage.setItem(VOTER_KEY_STORAGE, key)
      }
      const voted = JSON.parse(localStorage.getItem(VOTED_POLLS_STORAGE) || "[]")
      if (Array.isArray(voted)) setVotedPolls(voted)
    } catch {
      // localStorage niedostępny — głosowanie nadal działa, tylko bez pamięci lokalnej
    }
  }, [])

  function persistVoted(pollId: string) {
    setVotedPolls((prev) => {
      const next = Array.from(new Set([...prev, pollId]))
      try {
        localStorage.setItem(VOTED_POLLS_STORAGE, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  return { votedPolls, persistVoted }
}

/* ── Głosowanie / wyniki (wspólne dla /ankiety i strony głównej) ────── */
export function PollVoting({
  poll,
  hasVoted,
  onVoted,
  className,
}: {
  poll: PublicPoll
  hasVoted: boolean
  onVoted: () => void
  className?: string
}) {
  const router = useRouter()
  const [choice, setChoice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Optymistyczna nakładka: natychmiast po oddaniu głosu dorzucamy +1 do
  // wybranej odpowiedzi, żeby wynik zaskoczył od razu wizualnie. Gdy odświeżone
  // dane z serwera (już zawierające ten głos) dotrą przez propsy, nakładkę
  // czyścimy, więc nie ma podwójnego liczenia.
  const [optimisticOptionId, setOptimisticOptionId] = useState<string | null>(null)

  useEffect(() => {
    setOptimisticOptionId(null)
  }, [poll.totalVotes])

  const displayPoll = optimisticOptionId
    ? {
        ...poll,
        totalVotes: poll.totalVotes + 1,
        options: poll.options.map((o) =>
          o.id === optimisticOptionId ? { ...o, votes: o.votes + 1 } : o,
        ),
      }
    : poll

  // Ankieta domyślnie pokazuje wyniki. Panel głosowania odsłania się dopiero
  // po kliknięciu przycisku „Zagłosuj" — i tylko w aktywnej ankiecie, w której
  // użytkownik jeszcze nie oddał głosu.
  const canVote = poll.status === "Aktywna" && !hasVoted
  const showResults = !canVote || !voting
  const leadingVotes = Math.max(0, ...displayPoll.options.map((o) => o.votes))

  function handleVote() {
    if (!choice) {
      setError("Wybierz odpowiedź.")
      return
    }
    setError(null)
    const votedOptionId = choice
    // Najpierw pokazujemy wyniki jeszcze z „poprzednimi" liczbami, a dopiero
    // po krótkiej chwili doliczamy głos. Dzięki temu użytkownik widzi, jak
    // paski i procenty wizualnie „zaskakują" w górę (animacja szerokości),
    // zamiast zobaczyć od razu gotowy, zaktualizowany wynik.
    onVoted()
    setChoice(null)
    window.setTimeout(() => setOptimisticOptionId(votedOptionId), 450)
    startTransition(async () => {
      let key = ""
      try {
        key = localStorage.getItem(VOTER_KEY_STORAGE) || ""
      } catch {
        // ignore
      }
      const res = await submitPollVoteAction({ pollId: poll.id, optionId: votedOptionId, voterKey: key })
      if (res.ok) {
        router.refresh()
      } else {
        // Głos nie przeszedł — wycofaj optymistyczną nakładkę i pokaż błąd.
        setOptimisticOptionId(null)
        setError(res.error ?? "Nie udało się zapisać głosu.")
      }
    })
  }

  if (poll.options.length === 0) {
    return <p className={cn("text-sm text-muted-foreground", className)}>Ta ankieta nie ma jeszcze odpowiedzi.</p>
  }

  if (showResults) {
    return (
      <div
        key="results"
        className={cn(
          "animate-in fade-in-0 slide-in-from-left-1 duration-200 ease-out motion-reduce:animate-none",
          className,
        )}
      >
        {hasVoted && poll.status === "Aktywna" && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-eco/10 px-3 py-2.5 text-sm font-semibold text-eco">
            <Check className="size-4 shrink-0" />
            Dziękujemy za Twój głos!
          </div>
        )}
        <div className="space-y-3.5">
          {[...displayPoll.options].sort((a, b) => b.votes - a.votes).map((o) => {
            const pct = displayPoll.totalVotes > 0 ? Math.round((o.votes / displayPoll.totalVotes) * 100) : 0
            const leading = o.votes > 0 && o.votes === leadingVotes
            return (
              <div key={o.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className={cn("text-sm leading-snug text-pretty", leading ? "font-bold" : "font-medium")}>
                    {o.label}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      leading ? "bg-primary" : "bg-primary/50",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ThumbsUp className="size-3.5" />
            {displayPoll.totalVotes} {votesLabel(displayPoll.totalVotes)} oddano
          </p>
        </div>
        {canVote && (
          <button
            type="button"
            onClick={() => setVoting(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-bold text-gold-foreground shadow-sm transition-transform active:scale-[0.99]"
          >
            <ThumbsUp className="size-4" />
            Zagłosuj
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      key="voting"
      className={cn(
        "animate-in fade-in-0 slide-in-from-right-1 duration-200 ease-out motion-reduce:animate-none",
        className,
      )}
    >
      <div className="overflow-hidden rounded-2xl border border-border">
        {poll.options.map((o, i) => {
          const active = choice === o.id
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setChoice(o.id)}
              aria-pressed={active}
              className={cn(
                "flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors",
                i > 0 && "border-t border-border",
                active ? "bg-primary/5" : "hover:bg-secondary/40",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  active ? "border-primary" : "border-muted-foreground/40",
                )}
              >
                {active && <span className="size-2.5 rounded-full bg-primary" />}
              </span>
              <span className={cn("text-sm leading-snug text-pretty", active ? "font-semibold" : "font-medium")}>
                {o.label}
              </span>
            </button>
          )
        })}
      </div>

      {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}

      <button
        type="button"
        onClick={handleVote}
        disabled={isPending}
        className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-3 text-sm font-bold text-background transition-transform active:scale-[0.99] disabled:opacity-60"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isPending ? "Zapisywanie…" : "Zagłosuj"}
        {!isPending && <ArrowRight className="size-4" />}
      </button>

      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" />
        Twój głos jest anonimowy.
      </p>

      <button
        type="button"
        onClick={() => setVoting(false)}
        className="mx-auto mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        <BarChart3 className="size-3.5" />
        Wróć do wyników
      </button>
    </div>
  )
}
