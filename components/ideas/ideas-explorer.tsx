"use client"

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import {
  ThumbsUp,
  Plus,
  Send,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  Sparkles,
  X,
  Calendar,
  User,
  Bike,
  BookOpen,
  LayoutGrid,
  Route,
  ShieldCheck,
  Trees,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { IDEA_CATEGORIES, formatIdeaDate, type Idea } from "@/lib/ideas"
import {
  submitIdeaAction,
  voteIdeaAction,
  unvoteIdeaAction,
  type IdeaFormState,
} from "@/app/pomysly/actions"

/** localStorage: które pomysły to urządzenie już „polajkowało" (stan przycisku). */
const VOTED_STORAGE_KEY = "jejkowice:voted-ideas"

type SortKey = "popularne" | "najnowsze"

/** Ikona przypisana do kategorii pomysłu (fallback: LayoutGrid dla „Inne”). */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Rekreacja i sport": Bike,
  "Zieleń i środowisko": Trees,
  "Drogi i chodniki": Route,
  "Kultura i edukacja": BookOpen,
  Bezpieczeństwo: ShieldCheck,
  Inne: LayoutGrid,
}

function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? LayoutGrid
}

const initialFormState: IdeaFormState = {}

export function IdeasExplorer({ initialIdeas }: { initialIdeas: Idea[] }) {
  // Głosowanie zapisuje się w bazie (server action). `votes` to nadpisanie
  // licznika zwrócone przez serwer — po zapisie i revalidate liczba przetrwa
  // odświeżenie. `voted` to lokalny stan przycisku (per przeglądarka).
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [voted, setVoted] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortKey>("popularne")
  const [active, setActive] = useState<Idea | null>(null)
  const [isVoting, startVote] = useTransition()

  const [state, formAction, pending] = useActionState(submitIdeaAction, initialFormState)
  const formRef = useRef<HTMLFormElement>(null)

  // Po udanym zgłoszeniu czyścimy formularz (pomysł czeka na zatwierdzenie).
  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok])

  // Odtwarzamy z localStorage, które pomysły to urządzenie już polajkowało,
  // żeby po odświeżeniu przycisk pokazywał stan „Zagłosowano".
  useEffect(() => {
    try {
      const raw = localStorage.getItem(VOTED_STORAGE_KEY)
      if (raw) setVoted(new Set(JSON.parse(raw) as string[]))
    } catch {
      // Ignorujemy — brak localStorage nie może wywalić strony.
    }
  }, [])

  function persistVoted(next: Set<string>) {
    try {
      localStorage.setItem(VOTED_STORAGE_KEY, JSON.stringify([...next]))
    } catch {
      // Prywatny tryb / brak miejsca — trudno, stan zostaje tylko w pamięci.
    }
  }

  // Jeśli serwer zwrócił liczbę głosów, używamy jej; inaczej wartość z bazy.
  const voteCount = (idea: Idea) => votes[idea.id] ?? idea.votes

  const sorted = useMemo(() => {
    const clone = [...initialIdeas]
    if (sort === "popularne") clone.sort((a, b) => voteCount(b) - voteCount(a))
    else clone.sort((a, b) => (a.date < b.date ? 1 : -1))
    return clone
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIdeas, sort, votes])

  const totalVotes = useMemo(
    () => initialIdeas.reduce((sum, i) => sum + voteCount(i), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialIdeas, votes],
  )

  function toggleVote(id: string) {
    const idea = initialIdeas.find((i) => i.id === id)
    if (!idea) return

    const hadVoted = voted.has(id)
    const base = voteCount(idea)

    // Optymistyczna aktualizacja UI — natychmiast po tapnięciu.
    const nextVoted = new Set(voted)
    if (hadVoted) nextVoted.delete(id)
    else nextVoted.add(id)
    setVoted(nextVoted)
    persistVoted(nextVoted)
    setVotes((v) => ({ ...v, [id]: Math.max(base + (hadVoted ? -1 : 1), 0) }))

    // Zapis do bazy. Po odpowiedzi ustawiamy liczbę zwróconą przez serwer
    // (autorytatywną), a przy błędzie cofamy optymistyczną zmianę.
    startVote(async () => {
      const res = hadVoted ? await unvoteIdeaAction(id) : await voteIdeaAction(id)
      if (res.ok) {
        setVotes((v) => ({ ...v, [id]: res.votes }))
      } else {
        setVoted((prev) => {
          const reverted = new Set(prev)
          if (hadVoted) reverted.add(id)
          else reverted.delete(id)
          persistVoted(reverted)
          return reverted
        })
        setVotes((v) => ({ ...v, [id]: base }))
        console.log("[v0] toggleVote failed:", res.error)
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:gap-8">
      {/* Formularz zgłaszania */}
      <div id="dodaj" className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start lg:gap-5">
        <form
          ref={formRef}
          action={formAction}
          className="rounded-2xl border border-border bg-card p-5 md:rounded-3xl md:p-6"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gold text-gold-foreground">
              <Lightbulb className="size-5" />
            </span>
            <h2 className="text-base font-bold text-balance md:text-lg">Zgłoś swój pomysł</h2>
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground md:text-sm">
            Każdy pomysł najpierw sprawdza redakcja. Po zatwierdzeniu pojawi się na tej liście.
          </p>

          {/* Honeypot — ukryte pole na boty. Prawdziwi użytkownicy go nie widzą
              i nie wypełniają. Używamy `sr-only`, które chowa pole bez
              rozciągania strony (dawne left/top: -9999px powodowało poziomy
              scroll i „rozjechany” layout na mobilnym Firefoksie). */}
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="idea-website">Nie wypełniaj tego pola</label>
            <input
              id="idea-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="mt-4 md:mt-5">
            <label htmlFor="idea-title" className="mb-1 block text-[13px] font-semibold md:mb-1.5 md:text-sm">
              Tytuł pomysłu
            </label>
            <input
              id="idea-title"
              name="title"
              type="text"
              maxLength={120}
              placeholder="np. Plac zabaw przy ul. Parkowej"
              className="w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none md:rounded-2xl md:px-4 md:py-3"
            />
          </div>

          <div className="mt-3 md:mt-4">
            <label htmlFor="idea-category" className="mb-1 block text-[13px] font-semibold md:mb-1.5 md:text-sm">
              Kategoria
            </label>
            <select
              id="idea-category"
              name="category"
              defaultValue={IDEA_CATEGORIES[0]}
              className="w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none md:rounded-2xl md:px-4 md:py-3"
            >
              {IDEA_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 md:mt-4">
            <label htmlFor="idea-description" className="mb-1 block text-[13px] font-semibold md:mb-1.5 md:text-sm">
              Opis
            </label>
            <textarea
              id="idea-description"
              name="description"
              rows={4}
              maxLength={2000}
              placeholder="Opisz swój pomysł i wyjaśnij, dlaczego warto go zrealizować…"
              className="w-full resize-none rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none md:rounded-2xl md:px-4 md:py-3"
            />
          </div>

          <div className="mt-3 md:mt-4">
            <label htmlFor="idea-author" className="mb-1 block text-[13px] font-semibold md:mb-1.5 md:text-sm">
              Imię lub podpis <span className="font-normal text-muted-foreground">(opcjonalnie)</span>
            </label>
            <input
              id="idea-author"
              name="author"
              type="text"
              maxLength={60}
              placeholder="np. Anna K."
              className="w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none md:rounded-2xl md:px-4 md:py-3"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60 md:mt-5 md:rounded-2xl md:py-3.5"
          >
            <Send className="size-4" />
            {pending ? "Wysyłanie…" : "Wyślij pomysł"}
          </button>

          {state.error && (
            <p
              role="alert"
              className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-[13px] font-medium text-destructive md:mt-4 md:rounded-2xl md:px-4 md:py-3 md:text-sm"
            >
              {state.error}
            </p>
          )}

          {state.ok && (
            <p
              role="status"
              className="mt-3 flex items-center gap-2 rounded-xl bg-eco/10 px-3.5 py-2.5 text-[13px] font-medium text-eco md:mt-4 md:rounded-2xl md:px-4 md:py-3 md:text-sm"
            >
              <CheckCircle2 className="size-4 shrink-0" />
              Dziękujemy! Twój pomysł czeka na zatwierdzenie przez redakcję.
            </p>
          )}
        </form>
      </div>

      {/* Lista pomysłów */}
      <div className="flex flex-col gap-3 md:gap-5">
        {/* Pasek statystyk + sortowanie */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5 md:gap-3 md:rounded-2xl md:px-4 md:py-3">
          <div className="flex items-center gap-3 text-[13px] md:gap-4 md:text-sm">
            <span className="flex items-center gap-1.5 font-semibold md:gap-2">
              <Sparkles className="size-3.5 text-gold md:size-4" />
              {initialIdeas.length} pomysłów
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground md:gap-2">
              <ThumbsUp className="size-3.5 md:size-4" />
              {totalVotes} głosów
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-secondary/60 p-1">
            {(
              [
                { key: "popularne", label: "Popularne", icon: TrendingUp },
                { key: "najnowsze", label: "Najnowsze", icon: Plus },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon
              const isActive = sort === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSort(opt.key)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors md:gap-1.5 md:px-3 md:py-1.5 md:text-xs",
                    isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3 md:size-3.5" />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Lightbulb className="size-7" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">Brak pomysłów</h3>
            <p className="mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
              Nie ma jeszcze zatwierdzonych pomysłów. Zgłoś pierwszy z formularza obok!
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5 md:gap-3.5">
            {sorted.map((idea) => {
              const hasVoted = voted.has(idea.id)
              const CategoryIcon = categoryIcon(idea.category)
              return (
                <li
                  key={idea.id}
                  className="group flex gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-gold/50 md:gap-4 md:rounded-3xl md:p-5"
                >
                  {/* Ikona kategorii — jak w zakładce pomysłów na /ankiety */}
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground md:size-11 md:rounded-2xl">
                    <CategoryIcon className="size-5 md:size-[22px]" />
                  </span>

                  {/* Treść — klik otwiera pełnoekranowy podgląd */}
                  <button
                    type="button"
                    onClick={() => setActive(idea)}
                    className="min-w-0 flex-1 text-left"
                    aria-label={`Zobacz cały pomysł „${idea.title}”`}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5 md:mb-2 md:gap-2">
                      <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground md:text-[11px]">
                        {idea.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold leading-snug text-pretty group-hover:text-primary md:text-base">
                      {idea.title}
                    </h3>
                    <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground text-pretty md:mt-1.5 md:text-sm">
                      {idea.description}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground md:mt-3 md:text-xs">
                      Zgłoszone przez <span className="font-semibold text-foreground">{idea.author}</span> ·{" "}
                      <span className="font-semibold text-primary">Czytaj całość</span>
                    </p>
                  </button>

                  {/* Głosowanie — przeniesione na prawą stronę */}
                  <button
                    type="button"
                    onClick={() => toggleVote(idea.id)}
                    disabled={isVoting}
                    aria-pressed={hasVoted}
                    aria-label={hasVoted ? `Cofnij głos na „${idea.title}”` : `Zagłosuj na „${idea.title}”`}
                    className={cn(
                      "flex h-fit w-12 shrink-0 flex-col items-center gap-0.5 rounded-xl border py-2 text-sm font-bold tabular-nums transition-colors disabled:opacity-70 md:w-14 md:gap-1 md:rounded-2xl md:py-2.5 md:text-base",
                      hasVoted
                        ? "border-eco bg-eco text-eco-foreground"
                        : "border-border bg-secondary/40 text-eco hover:border-eco/60 hover:bg-eco/5",
                    )}
                  >
                    <ThumbsUp className={cn("size-4 md:size-5", hasVoted && "fill-current")} />
                    {voteCount(idea)}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
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

export function IdeaModal({
  idea,
  votes,
  hasVoted,
  isVoting,
  onVote,
  onClose,
}: {
  idea: Idea
  votes: number
  hasVoted: boolean
  isVoting?: boolean
  onVote: () => void
  onClose: () => void
}) {
  // Esc zamyka, a tło pod modalem nie scrolluje.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    // Blokujemy scroll tła pod modalem — zarówno na body, jak i html
    // (html jest potrzebne m.in. na mobilnym Safari/Chrome).
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [onClose])

  // Portal do <body>, aby modal nie był ograniczony przez rodzica z
  // `will-change: transform` (.page-transition), który tworzy blok zawierający
  // dla `position: fixed` i psuł pełnoekranowe pozycjonowanie.
  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex bg-navy/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idea-modal-title"
      onClick={onClose}
    >
      <div
        className="flex h-[100svh] w-full flex-col overflow-hidden border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nagłówek */}
        <div className="flex items-start justify-between gap-3 border-b border-border p-5 md:p-6">
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-secondary/60 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {idea.category}
            </span>
            <h2 id="idea-modal-title" className="mt-2 text-lg font-bold leading-snug text-balance md:text-xl">
              {idea.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij podgląd pomysłu"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Treść (przewijalna) */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90 text-pretty">
            {idea.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="size-3.5" />
              {idea.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {formatIdeaDate(idea.date)}
            </span>
          </div>
        </div>

        {/* Stopka z głosowaniem */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 p-4 md:px-6">
          <span className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground tabular-nums">{votes}</span> głosów
          </span>
          <button
            type="button"
            onClick={onVote}
            disabled={isVoting}
            aria-pressed={hasVoted}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-colors disabled:opacity-70",
              hasVoted
                ? "border-eco bg-eco text-eco-foreground"
                : "border-eco/60 bg-eco/5 text-eco hover:bg-eco/10",
            )}
          >
            <ThumbsUp className={cn("size-4", hasVoted && "fill-current")} />
            {hasVoted ? "Zagłosowano" : "Zagłosuj"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
