'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CollapsibleSection({
  icon,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-start gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-muted/40 sm:p-6"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-balance text-base font-bold tracking-tight text-foreground sm:text-lg">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-pretty text-[12.5px] leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        >
          <ChevronDown className="size-5" strokeWidth={2} />
        </span>
      </button>
      {open ? (
        <div id={contentId} className="px-4 pb-4 sm:px-6 sm:pb-6">
          {children}
        </div>
      ) : null}
    </section>
  )
}
