'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  User,
  ThumbsUp,
  Trash2,
  Pencil,
  Check,
  X,
  Inbox,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import {
  IDEA_CATEGORIES,
  formatIdeaDate,
  type IdeaRow,
} from '@/lib/ideas'
import {
  approveIdeaAction,
  unapproveIdeaAction,
  deleteIdeaAction,
  updateIdeaAction,
  type EditIdeaState,
} from '@/app/admin/pomysly/actions'
import { cn } from '@/lib/utils'

type Filter = 'Oczekujące' | 'Zatwierdzone' | 'Wszystkie'

const initialEditState: EditIdeaState = {}

function IdeaCard({ idea, onEdit }: { idea: IdeaRow; onEdit: (idea: IdeaRow) => void }) {
  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-2.5 p-3.5 sm:gap-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-primary sm:px-2.5 sm:text-[0.7rem]">
            {idea.category}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold sm:px-2.5 sm:text-[0.7rem]',
              idea.approved
                ? 'bg-eco/15 text-eco'
                : 'bg-gold/15 text-gold-foreground',
            )}
          >
            {idea.approved ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
            {idea.approved ? 'Zatwierdzony' : 'Oczekuje'}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[0.7rem] font-semibold text-muted-foreground tabular-nums sm:text-xs">
            <ThumbsUp className="size-3.5" />
            {idea.votes}
          </span>
        </div>

        <h3 className="text-sm font-bold leading-snug text-pretty sm:text-base">{idea.title}</h3>
        <p className="line-clamp-4 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
          {idea.description}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[0.7rem] text-muted-foreground sm:text-xs">
          <span className="flex items-center gap-1.5">
            <User className="size-3.5" />
            {idea.author}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {formatIdeaDate(idea.created_at)}
          </span>
        </div>
      </div>

      {/* Akcje */}
      <div className="flex items-center gap-2 border-t border-border bg-muted/40 p-3">
        {idea.approved ? (
          <form action={unapproveIdeaAction} className="flex-1">
            <input type="hidden" name="id" value={idea.id} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
              Cofnij publikację
            </button>
          </form>
        ) : (
          <form action={approveIdeaAction} className="flex-1">
            <input type="hidden" name="id" value={idea.id} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-eco py-2 text-sm font-bold text-eco-foreground transition-transform active:scale-[0.99]"
            >
              <Check className="size-4" />
              Zatwierdź
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => onEdit(idea)}
          aria-label="Edytuj pomysł"
          className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Pencil className="size-4" />
        </button>

        <form
          action={deleteIdeaAction}
          onSubmit={(e) => {
            if (!confirm('Usunąć ten pomysł? Tej operacji nie można cofnąć.')) e.preventDefault()
          }}
        >
          <input type="hidden" name="id" value={idea.id} />
          <button
            type="submit"
            aria-label="Usuń pomysł"
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </form>
      </div>
    </li>
  )
}

function EditModal({ idea, onClose }: { idea: IdeaRow; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(updateIdeaAction, initialEditState)

  useEffect(() => {
    if (state.ok) onClose()
  }, [state.ok, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-idea-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92svh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-xl sm:max-h-[88svh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border p-5 md:p-6">
          <h2 id="edit-idea-title" className="text-lg font-bold md:text-xl">
            Edytuj pomysł
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij edycję"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-5 md:p-6">
            <input type="hidden" name="id" value={idea.id} />

            <label htmlFor="edit-title" className="mb-1.5 block text-sm font-semibold">
              Tytuł
            </label>
            <input
              id="edit-title"
              name="title"
              type="text"
              maxLength={120}
              defaultValue={idea.title}
              className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
            />

            <label htmlFor="edit-category" className="mb-1.5 mt-4 block text-sm font-semibold">
              Kategoria
            </label>
            <select
              id="edit-category"
              name="category"
              defaultValue={idea.category}
              className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              {IDEA_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label htmlFor="edit-description" className="mb-1.5 mt-4 block text-sm font-semibold">
              Opis
            </label>
            <textarea
              id="edit-description"
              name="description"
              rows={7}
              maxLength={2000}
              defaultValue={idea.description}
              className="w-full resize-none rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm leading-relaxed focus:border-primary focus:outline-none"
            />

            <label htmlFor="edit-author" className="mb-1.5 mt-4 block text-sm font-semibold">
              Podpis autora
            </label>
            <input
              id="edit-author"
              name="author"
              type="text"
              maxLength={60}
              defaultValue={idea.author}
              className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
            />

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3.5">
              <input
                type="checkbox"
                name="approved"
                defaultChecked={idea.approved}
                className="mt-0.5 size-4 accent-eco"
              />
              <span className="text-sm">
                <span className="font-semibold">Zatwierdź i opublikuj</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Zaznaczony pomysł jest widoczny publicznie na stronie „Pomysły”.
                </span>
              </span>
            </label>

            {state.error && (
              <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {state.error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 p-4 md:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              <Check className="size-4" />
              {pending ? 'Zapisywanie…' : 'Zapisz zmiany'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function IdeasManager({ ideas }: { ideas: IdeaRow[] }) {
  const [filter, setFilter] = useState<Filter>('Oczekujące')
  const [editing, setEditing] = useState<IdeaRow | null>(null)

  const counts = useMemo(() => {
    const pending = ideas.filter((i) => !i.approved).length
    return {
      Oczekujące: pending,
      Zatwierdzone: ideas.length - pending,
      Wszystkie: ideas.length,
    }
  }, [ideas])

  const filtered = useMemo(() => {
    if (filter === 'Wszystkie') return ideas
    if (filter === 'Oczekujące') return ideas.filter((i) => !i.approved)
    return ideas.filter((i) => i.approved)
  }, [ideas, filter])

  const tabs: Filter[] = ['Oczekujące', 'Zatwierdzone', 'Wszystkie']

  return (
    <div className="grid gap-5">
      <div className="scrollbar-none -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
        {tabs.map((t) => {
          const active = filter === t
          const showBadge = t === 'Oczekujące' && counts.Oczekujące > 0
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              aria-pressed={active}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors md:px-3.5 md:py-2 md:text-base',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 text-foreground hover:bg-secondary',
              )}
            >
              {t}
              {showBadge && (
                <span
                  className={cn(
                    'inline-flex min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-bold md:min-w-5 md:text-xs',
                    active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-red-500 text-white',
                  )}
                >
                  {counts.Oczekujące}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Inbox className="size-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            {filter === 'Oczekujące' ? 'Brak pomysłów do zatwierdzenia' : 'Brak pomysłów'}
          </h2>
          <p className="mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
            {filter === 'Oczekujące'
              ? 'Wszystkie zgłoszone pomysły zostały już rozpatrzone.'
              : 'Nie ma tu jeszcze żadnych pomysłów.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onEdit={setEditing} />
          ))}
        </ul>
      )}

      {editing && <EditModal idea={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
