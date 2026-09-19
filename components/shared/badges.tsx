import { cn } from '@/lib/utils'
import type { NewsCategory, Report } from '@/lib/data'

const categoryStyles: Record<NewsCategory, string> = {
  Inwestycje: 'bg-primary text-primary-foreground',
  Sport: 'bg-eco text-eco-foreground',
  Komunikaty: 'bg-accent text-accent-foreground',
  Kultura: 'bg-chart-5 text-white',
  Alert: 'bg-destructive text-white',
  Rozrywka: 'bg-chart-1 text-white',
}

export function CategoryBadge({
  category,
  size = 'md',
}: {
  category: NewsCategory
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-bold uppercase tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-[0.6rem]' : 'rounded-md px-2.5 py-1 text-xs',
        categoryStyles[category],
      )}
    >
      {category}
    </span>
  )
}

const statusStyles: Record<Report['status'], string> = {
  Zgłoszone: 'bg-primary/10 text-primary',
  'W trakcie': 'bg-accent/25 text-accent-foreground',
  Zakończone: 'bg-eco/15 text-eco',
  Zaakceptowane: 'bg-eco/15 text-eco',
}

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: Report['status']
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[0.65rem]' : 'px-2.5 py-1 text-xs',
        statusStyles[status],
      )}
    >
      {status}
    </span>
  )
}

export function Pill({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        className,
      )}
    >
      {children}
    </span>
  )
}
