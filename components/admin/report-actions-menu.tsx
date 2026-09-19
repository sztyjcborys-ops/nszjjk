'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2, MoreHorizontal, Trash2 } from 'lucide-react'
import { deleteReportAction } from '@/app/admin/zgloszenia/actions'

/** Przycisk usuwania z animowanym spinnerem podczas wysyłki. */
function DeleteSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      role="menuitem"
      disabled={pending}
      aria-busy={pending}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-70"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
      {pending ? 'Usuwanie…' : 'Usuń zgłoszenie'}
    </button>
  )
}

/** Menu „…" w nagłówku szczegółów zgłoszenia (obecnie: usuń zgłoszenie). */
export function ReportActionsMenu({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Więcej opcji"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
      >
        <MoreHorizontal className="size-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          <form action={deleteReportAction}>
            <input type="hidden" name="id" value={id} />
            <DeleteSubmitButton />
          </form>
        </div>
      )}
    </div>
  )
}
