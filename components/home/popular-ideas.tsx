"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowRight, ThumbsUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Idea } from "@/lib/ideas"
import { voteIdeaAction, unvoteIdeaAction } from "@/app/pomysly/actions"
import { IdeaModal } from "@/components/ideas/ideas-explorer"

/** Ten sam klucz co w pełnym eksploratorze pomysłów — stan „polajkowane"
 *  jest współdzielony między stroną główną a /pomysly. */
const VOTED_STORAGE_KEY = "jejkowice:voted-ideas"

export function PopularIdeas({ ideas }: { ideas: Idea[] }) {
  // `votes` nadpisuje licznik wartością zwróconą przez serwer po zapisie.
  // `voted` to lokalny stan przycisku (per przeglądarka).
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [voted, setVoted] = useState<Set<string>>(new Set())
  const [active, setActive] = useState<Idea | null>(null)
  const [isVoting, startVote] = useTransition()

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VOTED_STORAGE_KEY)
      if (raw) setVoted(new Set(JSON.parse(raw) as string[]))
    } catch {
      // Brak localStorage nie może wywalić strony.
    }
  }, [])

  function persistVoted(next: Set<string>) {
    try {
      localStorage.setItem(VOTED_STORAGE_KEY, JSON.stringify([...next]))
    } catch {
      // Tryb prywatny / brak miejsca — stan zostaje tylko w pamięci.
    }
  }

  const voteCount = (idea: Idea) => votes[idea.id] ?? idea.votes

  function toggleVote(id: string) {
    const idea = ideas.find((i) => i.id === id)
    if (!idea) return

    const hadVoted = voted.has(id)
    const base = voteCount(idea)

    // Optymistyczna aktualizacja UI.
    const nextVoted = new Set(voted)
    if (hadVoted) nextVoted.delete(id)
    else nextVoted.add(id)
    setVoted(nextVoted)
    persistVoted(nextVoted)
    setVotes((v) => ({ ...v, [id]: Math.max(base + (hadVoted ? -1 : 1), 0) }))

    startVote(async () => {
      const res = hadVoted ? await unvoteIdeaAction(id) : await voteIdeaAction(id)
      if (res.ok) {
        setVotes((v) => ({ ...v, [id]: res.votes }))
      } else {
        // Cofamy optymistyczną zmianę przy błędzie.
        setVoted((prev) => {
          const reverted = new Set(prev)
          if (hadVoted) reverted.add(id)
          else reverted.delete(id)
          persistVoted(reverted)
          return reverted
        })
        setVotes((v) => ({ ...v, [id]: base }))
        console.log("[v0] popular toggleVote failed:", res.error)
      }
    })
  }

  return (
    <div className="mt-8 border-t border-accent/30 pt-6">
      <p className="mb-4 font-bold">Popularne pomysły</p>
      <ul className="space-y-3">
        {ideas.map((idea) => {
          const hasVoted = voted.has(idea.id)
          return (
            <li
              key={idea.id}
              className="flex items-center justify-between gap-4 rounded-2xl bg-card p-4 transition-colors hover:bg-card/70"
            >
              <button
                type="button"
                onClick={() => setActive(idea)}
                className="min-w-0 flex-1 text-left"
                aria-label={`Zobacz pomysł „${idea.title}”`}
              >
                <p className="text-sm font-bold leading-snug text-pretty">{idea.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{idea.category}</p>
              </button>
              <button
                type="button"
                onClick={() => toggleVote(idea.id)}
                disabled={isVoting}
                aria-pressed={hasVoted}
                aria-label={hasVoted ? `Cofnij głos na „${idea.title}”` : `Zagłosuj na „${idea.title}”`}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums transition-colors disabled:opacity-70",
                  hasVoted
                    ? "bg-eco text-eco-foreground"
                    : "bg-eco/10 text-eco hover:bg-eco/20",
                )}
              >
                <ThumbsUp className={cn("size-4", hasVoted && "fill-current")} />
                {voteCount(idea)}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-5 flex justify-end">
        <Link
          href="/pomysly"
          prefetch={false}
          className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
        >
          Zobacz wszystkie pomysły
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {active && (
        <IdeaModal
          idea={active}
          votes={voteCount(active)}
          hasVoted={voted.has(active.id)}
          isVoting={isVoting}
          onVote={() => toggleVote(active.id)}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  )
}
