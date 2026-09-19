import { ArrowDown, ArrowUp } from 'lucide-react'
import { formatBudgetDate, formatPLN } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BudgetChangeRow, BudgetChangeType } from '@/lib/budget'

/** Normalizuje wartość kolumny change_type do znanego typu zmiany. */
function normalizeType(raw: string | null): BudgetChangeType {
  const s = (raw ?? '').trim().toLowerCase()
  if (s === 'expense' || s === 'income' || s === 'revenue' || s === 'transfer') {
    return s
  }
  return 'other'
}

/**
 * Zwraca opis kierunku zmiany zależny od typu (change_type) oraz znaku delty.
 * Nie zgadujemy typu z opisu — korzystamy wyłącznie z change_type.
 */
function changeLabel(type: BudgetChangeType, positive: boolean): string {
  const dir = positive ? 'Zwiększenie' : 'Zmniejszenie'
  switch (type) {
    case 'expense':
      return `${dir} planu wydatków`
    case 'income':
      return `${dir} planu dochodów`
    case 'revenue':
      return `${dir} przychodów budżetu`
    case 'transfer':
      return positive
        ? 'Przesunięcie środków (zwiększenie w tej pozycji)'
        : 'Przesunięcie środków (zmniejszenie w tej pozycji)'
    default:
      return positive ? 'Zwiększenie pozycji budżetowej' : 'Zmniejszenie pozycji budżetowej'
  }
}

export function BudgetChanges({ changes }: { changes: BudgetChangeRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      <ChangesLegend />

      <ol className="relative flex flex-col gap-0">
        {changes.map((c, i) => {
          const delta = Number(c.delta ?? 0)
          const positive = delta >= 0
          const type = normalizeType(c.change_type)
          const last = i === changes.length - 1
          return (
            <li key={c.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!last ? (
                <span
                  className="absolute left-[7px] top-4 h-full w-px bg-border"
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={cn(
                  'relative mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full ring-4 ring-card',
                  positive ? 'bg-eco' : 'bg-destructive',
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[12px] font-medium text-muted-foreground">
                  {c.resolution_date ? formatBudgetDate(c.resolution_date) : '—'}
                </span>

                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full',
                      positive
                        ? 'bg-eco/15 text-eco'
                        : 'bg-destructive/15 text-destructive',
                    )}
                    aria-hidden="true"
                  >
                    {positive ? (
                      <ArrowUp className="size-3.5" strokeWidth={2.75} />
                    ) : (
                      <ArrowDown className="size-3.5" strokeWidth={2.75} />
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-[15px] font-bold tabular-nums',
                      positive ? 'text-eco' : 'text-destructive',
                    )}
                  >
                    {positive ? '+' : '−'}
                    {formatPLN(Math.abs(delta))}
                  </span>
                </div>
                <p
                  className={cn(
                    'text-[12px] font-semibold',
                    positive ? 'text-eco' : 'text-destructive',
                  )}
                >
                  {changeLabel(type, positive)}
                </p>

                {c.resolution_no ? (
                  <p className="mt-1.5 text-[12px] font-semibold text-primary">
                    Uchwała {c.resolution_no}
                  </p>
                ) : null}

                {c.description ? (
                  <p className="mt-1 text-pretty text-[13px] leading-relaxed text-foreground">
                    {c.description}
                  </p>
                ) : null}

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  {c.section ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                      {c.section}
                    </span>
                  ) : null}
                  {c.paragraph ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                      § {c.paragraph}
                    </span>
                  ) : null}
                  {c.amount_before != null && c.amount_after != null ? (
                    <span className="tabular-nums">
                      {formatPLN(Number(c.amount_before))} → {formatPLN(Number(c.amount_after))}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function ChangesLegend() {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <p className="text-[12.5px] font-semibold text-foreground">Jak czytać zmiany?</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        <li className="flex items-center gap-2 text-[12px] leading-relaxed text-muted-foreground">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-eco/15 text-eco">
            <ArrowUp className="size-3" strokeWidth={2.75} aria-hidden="true" />
          </span>
          <span>
            <span className="font-medium text-foreground">↑</span> oznacza zwiększenie
            danej pozycji budżetu, np. wydatków, dochodów lub przychodów.
          </span>
        </li>
        <li className="flex items-center gap-2 text-[12px] leading-relaxed text-muted-foreground">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <ArrowDown className="size-3" strokeWidth={2.75} aria-hidden="true" />
          </span>
          <span>
            <span className="font-medium text-foreground">↓</span> oznacza zmniejszenie
            danej pozycji budżetowej.
          </span>
        </li>
      </ul>
      <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
        Rodzaj zmiany pokazujemy zgodnie z dokumentem budżetowym. Zwiększenie planu wydatków
        oznacza, że na dane zadanie zaplanowano więcej pieniędzy – nie oznacza to dodatkowego
        dochodu gminy.
      </p>
    </div>
  )
}
