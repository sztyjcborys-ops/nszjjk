import Link from "next/link"
import { Construction, ArrowLeft } from "lucide-react"

export function UnderConstruction({
  eyebrow,
  title,
  description = "Pracujemy nad tą sekcją. Zajrzyj wkrótce — wprowadzamy tu nowe treści.",
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-20 text-center md:py-28">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-gold/15 text-gold md:size-20">
        <Construction className="size-8 md:size-10" />
      </span>
      {eyebrow && <p className="mt-6 text-sm font-medium text-muted-foreground">{eyebrow}</p>}
      <h1 className="mt-2 text-3xl font-extrabold leading-tight text-balance md:text-4xl">{title}</h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-pretty text-muted-foreground">{description}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <ArrowLeft className="size-4" />
        Wróć na stronę główną
      </Link>
    </div>
  )
}
