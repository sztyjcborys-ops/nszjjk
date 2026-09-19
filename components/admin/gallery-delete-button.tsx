"use client"

import { useFormStatus } from "react-dom"
import { Loader2, Trash2 } from "lucide-react"

/**
 * Przycisk usuwania zdjęcia z panelu. Pokazuje kręcące się kółeczko w trakcie
 * akcji serwerowej, żeby było widać, że proces trwa (useFormStatus działa tylko
 * wewnątrz <form>, więc to osobny komponent kliencki).
 */
export function GalleryDeleteButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      aria-label="Usuń"
      aria-busy={pending}
      disabled={pending}
      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-70"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  )
}
