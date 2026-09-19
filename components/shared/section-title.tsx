import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
  tone = 'default',
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: { href: string; label: string }
  tone?: 'default' | 'light'
}) {
  const light = tone === 'light'
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {eyebrow}
          </span>
        )}
        <h2
          className={`text-pretty text-2xl font-bold tracking-tight md:text-3xl ${
            light ? 'text-navy-foreground' : ''
          }`}
        >
          {title}
        </h2>
        {description && (
          <p
            className={`mt-1.5 max-w-2xl text-sm md:text-base ${
              light ? 'text-navy-foreground/70' : 'text-muted-foreground'
            }`}
          >
            {description}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          prefetch={false}
          className={`flex shrink-0 items-center gap-1 text-sm font-semibold hover:underline ${
            light ? 'text-navy-foreground' : 'text-primary'
          }`}
        >
          {action.label}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  )
}
