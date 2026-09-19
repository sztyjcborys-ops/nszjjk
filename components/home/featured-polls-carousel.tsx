"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { PublicPoll } from "@/lib/polls"
import { PollVoting, useVotedPolls } from "@/components/surveys/poll-voting"
import { cn } from "@/lib/utils"

/**
 * Karuzela wyróżnionych ankiet na stronie głównej. Pokazuje jedną ankietę na
 * raz; strzałkami (oraz przesunięciem palcem na dotyku) można przechodzić do
 * kolejnych, dzięki czemu mieszkańcy widzą więcej ankiet bez wchodzenia na
 * podstronę /ankiety. Stan głosowania jest wspólny z /ankiety (localStorage).
 */
export function FeaturedPollsCarousel({ polls }: { polls: PublicPoll[] }) {
  const { votedPolls, persistVoted } = useVotedPolls()
  const [index, setIndex] = useState(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const count = polls.length
  const clamp = (i: number) => (i + count) % count
  const go = (dir: number) => setIndex((i) => clamp(i + dir))
  const poll = polls[index]
  const multiple = count > 1

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    if (!t) return
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    // Reaguj tylko na gest wyraźnie poziomy — inaczej pionowe przewijanie
    // strony przypadkiem przełączałoby ankiety.
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? 1 : -1)
    }
  }

  const arrowClass =
    "flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5 active:scale-95"

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="relative">
        {multiple && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Poprzednia ankieta"
            className={cn(arrowClass, "absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 md:flex")}
          >
            <ChevronLeft className="size-5" />
          </button>
        )}

        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8"
        >
          <div className="mb-4">
            <h3 className="text-balance text-lg font-bold leading-snug md:text-xl">{poll.title}</h3>
            {poll.description && (
              <p className="mt-1 text-pretty text-sm text-muted-foreground">{poll.description}</p>
            )}
            {poll.daysLeft != null && (
              <p className="mt-1.5 text-xs font-semibold text-primary">
                Koniec za {poll.daysLeft} {poll.daysLeft === 1 ? "dzień" : "dni"}
              </p>
            )}
          </div>
          <PollVoting
            key={poll.id}
            poll={poll}
            hasVoted={votedPolls.includes(poll.id)}
            onVoted={() => persistVoted(poll.id)}
          />
        </div>

        {multiple && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Następna ankieta"
            className={cn(arrowClass, "absolute right-0 top-1/2 z-10 hidden translate-x-1/2 -translate-y-1/2 md:flex")}
          >
            <ChevronRight className="size-5" />
          </button>
        )}
      </div>

      {multiple && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Poprzednia ankieta"
            className={cn(arrowClass, "md:hidden")}
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="flex items-center gap-1.5" role="tablist" aria-label="Ankiety">
            {polls.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Ankieta ${i + 1} z ${count}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/50",
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Następna ankieta"
            className={cn(arrowClass, "md:hidden")}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  )
}
