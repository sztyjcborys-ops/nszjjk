'use client'

import { useState, useTransition } from 'react'
import { Plus, User, X, Trash2 } from 'lucide-react'
import { relativeTime, type ReportNote } from '@/lib/reports'
import { addReportNoteAction, deleteReportNoteAction } from '@/app/admin/zgloszenia/actions'

/** Sekcja „Notatki wewnętrzne" — lista notatek + dodawanie nowej. */
export function ReportNotes({
  reportId,
  notes,
}: {
  reportId: string
  notes: ReportNote[]
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = value.trim()
    if (!body) return
    const fd = new FormData()
    fd.set('reportId', reportId)
    fd.set('body', body)
    startTransition(async () => {
      await addReportNoteAction(fd)
      setValue('')
      setOpen(false)
    })
  }

  function handleDelete(noteId: string) {
    const fd = new FormData()
    fd.set('noteId', noteId)
    fd.set('reportId', reportId)
    startTransition(async () => {
      await deleteReportNoteAction(fd)
    })
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">Notatki wewnętrzne</h2>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <Plus className="size-4" />
            Dodaj notatkę
          </button>
        )}
      </div>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-2 rounded-2xl border border-border bg-card p-4"
        >
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            placeholder="Treść notatki widocznej tylko dla redakcji…"
            className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setValue('')
              }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="size-4" />
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isPending || value.trim().length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Zapisywanie…' : 'Zapisz notatkę'}
            </button>
          </div>
        </form>
      )}

      {notes.length > 0 ? (
        <ul className="grid gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-2xl bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted-foreground/15 text-muted-foreground">
                  <User className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold">
                      {note.author_name || 'Redakcja'}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeTime(note.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground text-pretty">
                    {note.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  disabled={isPending}
                  aria-label="Usuń notatkę"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !open && (
          <p className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
            Brak notatek. Dodaj pierwszą, aby zapisać ustalenia zespołu.
          </p>
        )
      )}
    </section>
  )
}
