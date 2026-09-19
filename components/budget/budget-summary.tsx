import { Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { formatBudgetDate, formatPLN } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BudgetOverview } from '@/lib/budget'

type Card = {
  label: string
  value: number
  hint: string
  icon: typeof Wallet
  tone: 'primary' | 'eco' | 'destructive' | 'accent'
  signed?: boolean
}

const TONE: Record<Card['tone'], string> = {
  primary: 'bg-primary/10 text-primary',
  eco: 'bg-eco/12 text-eco',
  destructive: 'bg-destructive/10 text-destructive',
  accent: 'bg-accent/20 text-accent-foreground',
}

export function BudgetSummary({ overview }: { overview: BudgetOverview }) {
  const cards: Card[] = []

  if (overview.hasIncome) {
    cards.push({
      label: 'Dochody',
      value: overview.income,
      hint: 'Planowane wpływy gminy',
      icon: TrendingUp,
      tone: 'eco',
    })
  }
  if (overview.hasExpense) {
    cards.push({
      label: 'Wydatki',
      value: overview.expense,
      hint: 'Planowane koszty gminy',
      icon: TrendingDown,
      tone: 'primary',
    })
  }
  if (overview.balance != null) {
    cards.push({
      label: overview.balance >= 0 ? 'Nadwyżka' : 'Deficyt',
      value: overview.balance,
      hint: 'Dochody minus wydatki',
      icon: Scale,
      tone: overview.balance >= 0 ? 'eco' : 'destructive',
      signed: true,
    })
  }
  if (cards.length === 0) {
    cards.push({
      label: 'Budżet ogółem',
      value: overview.grandTotal,
      hint: 'Suma planu budżetowego',
      icon: Wallet,
      tone: 'primary',
    })
  }

  const current = overview.current
  const resolutionUrl =
    current?.source_url && /^https?:\/\//.test(current.source_url)
      ? current.source_url
      : 'https://bip.jejkowice.pl/uchwala-nr-br-0007-xxx-162-2026-rady-gminy-jejkowice-z-dnia-20-lipca-2026-r-w-sprawie-zmian-w-uchwale-budzetowej-gminy-jejkowice-na-rok-2026#'
  const grid = (
    <div
      className={cn(
        'grid gap-3 sm:gap-4',
        cards.length >= 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2',
      )}
    >
      {cards.map((c) => {
        const Icon = c.icon
        const display =
          c.signed && c.value > 0 ? `+${formatPLN(c.value)}` : formatPLN(c.value)
        return (
          <div
            key={c.label}
            className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-xl',
                TONE[c.tone],
              )}
            >
              <Icon className="size-[18px]" strokeWidth={2} />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {c.label}
              </span>
              <span className="text-balance text-base font-bold leading-tight tracking-tight text-foreground sm:text-lg">
                {display}
              </span>
              <span className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {c.hint}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )

  if (!current) return grid

  return (
    <div className="flex flex-col gap-3">
      {grid}
      <p className="px-1 text-[11.5px] leading-relaxed text-muted-foreground">
        Stan potwierdzony na dzień{' '}
        <span className="font-semibold text-foreground">
          {current.resolution_date ? formatBudgetDate(current.resolution_date) : '—'}
        </span>
        {current.resolution_no && current.resolution_no !== 'BAZA' ? (
          <>
            {' · uchwała '}
            <a
              href={resolutionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
            >
              {current.resolution_no}
            </a>
          </>
        ) : null}
        .
      </p>
    </div>
  )
}
