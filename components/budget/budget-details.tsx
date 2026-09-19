'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatPLN } from '@/lib/format'
import { cn } from '@/lib/utils'

type ItemSection = {
  section: string
  total: number
  items: { id: number; name: string; amount: number; department: number | null }[]
}

export function BudgetDetails({ sections }: { sections: ItemSection[] }) {
  const [open, setOpen] = useState<string | null>(sections[0]?.section ?? null)
  const max = sections.reduce((m, s) => Math.max(m, s.total), 0) || 1

  return (
    <ul className="flex flex-col divide-y divide-border">
      {sections.map((s) => {
        const isOpen = open === s.section
        return (
          <li key={s.section}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : s.section)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 py-3 text-left"
            >
              <ChevronDown
                className={cn(
                  'size-4 shrink-0 text-primary transition-transform duration-200',
                  isOpen ? 'rotate-0' : '-rotate-90',
                )}
                strokeWidth={2.25}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[14px] font-semibold text-foreground">
                    {s.section}
                  </span>
                  <span className="shrink-0 text-[13px] font-bold tabular-nums text-foreground">
                    {formatPLN(s.total)}
                  </span>
                </span>
                <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${Math.max((s.total / max) * 100, 3)}%` }}
                  />
                </span>
              </span>
            </button>

            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-200 ease-out',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <ul className="ml-7 flex flex-col gap-1 border-l border-border/70 pb-3 pl-4">
                  {s.items.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-baseline justify-between gap-3 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                        {it.name}
                      </span>
                      <span className="shrink-0 text-[12.5px] font-medium tabular-nums text-foreground">
                        {formatPLN(it.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
