import { formatBudgetDate, formatPLNCompact } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BudgetSummaryRow } from '@/lib/budget'

/**
 * Oś czasu kolejnych uchwał budżetowych. Dla każdego snapshotu z
 * budget_summary_2026 pokazujemy dochody, wydatki i deficyt wraz z
 * proporcjonalnymi słupkami (szerokość = udział w największej kwocie w
 * całej serii), dzięki czemu widać, jak budżet rósł w ciągu roku.
 */
export function BudgetHistory({ history }: { history: BudgetSummaryRow[] }) {
  const rows = [...history].sort((a, b) =>
    String(a.resolution_date ?? '').localeCompare(String(b.resolution_date ?? '')),
  )

  const max =
    rows.reduce(
      (m, r) => Math.max(m, Number(r.income ?? 0), Number(r.expenses ?? 0)),
      0,
    ) || 1

  return (
    <ol className="flex flex-col gap-4">
      {rows.map((r) => {
        const income = Number(r.income ?? 0)
        const expenses = Number(r.expenses ?? 0)
        const deficit = Number(r.deficit ?? 0)
        const isBase = r.resolution_no === 'BAZA'
        return (
          <li
            key={r.id}
            className={cn(
              'flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5',
              r.is_current && 'border-primary/40 ring-1 ring-primary/20',
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold text-foreground">
                  {isBase
                    ? 'Budżet bazowy'
                    : r.resolution_no
                      ? `Uchwała ${r.resolution_no}`
                      : 'Zmiana'}
                </span>
                <span className="text-[11.5px] text-muted-foreground">
                  {r.resolution_date ? formatBudgetDate(r.resolution_date) : '—'}
                </span>
              </div>
              {r.is_current ? (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-primary">
                  Aktualny
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <MetricBar label="Dochody" value={income} max={max} tone="eco" />
              <MetricBar label="Wydatki" value={expenses} max={max} tone="primary" />
            </div>

            <div className="flex items-center justify-between border-t border-border/70 pt-2 text-[12px]">
              <span className="text-muted-foreground">Deficyt</span>
              <span className="font-semibold tabular-nums text-destructive">
                −{formatPLNCompact(deficit)}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function MetricBar({
  label,
  value,
  max,
  tone,
}: {
  label: string
  value: number
  max: number
  tone: 'eco' | 'primary'
}) {
  const ratio = Math.max((value / max) * 100, 3)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11.5px] font-medium text-muted-foreground">{label}</span>
        <span className="text-[12.5px] font-semibold tabular-nums text-foreground">
          {formatPLNCompact(value)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            tone === 'eco' ? 'bg-eco' : 'bg-primary',
          )}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  )
}
