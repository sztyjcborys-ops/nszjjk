'use client'

import { useMemo } from 'react'
import { formatPLN, formatPLNCompact } from '@/lib/format'

type Segment = { label: string; amount: number }

/**
 * Ranking działów jako poziome słupki zbudowane w HTML/flex — czyta się
 * znacznie lepiej niż biblioteczny wykres na wąskim ekranie telefonu, a mimo
 * to w pełni reaguje na dane z Supabase (szerokość słupka = udział w maksimum).
 */
const BAR_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
  'var(--chart-9)',
]

export function DepartmentsChart({ segments }: { segments: Segment[] }) {
  const rows = useMemo(() => {
    const sorted = [...segments].sort((a, b) => b.amount - a.amount).slice(0, 8)
    const max = sorted.reduce((m, s) => Math.max(m, s.amount), 0) || 1
    return sorted.map((s, i) => ({
      ...s,
      ratio: s.amount / max,
      color: BAR_COLORS[i % BAR_COLORS.length],
    }))
  }, [segments])

  return (
    <ol className="flex flex-col gap-3.5">
      {rows.map((r, i) => (
        <li key={r.label} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="truncate text-[13px] font-medium text-foreground">{r.label}</span>
            </span>
            <span
              className="shrink-0 text-[12.5px] font-semibold tabular-nums text-foreground"
              title={formatPLN(r.amount)}
            >
              {formatPLNCompact(r.amount)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(r.ratio * 100, 3)}%`, backgroundColor: r.color }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}
