import Link from 'next/link'
import {
  Recycle,
  TriangleAlert,
  CalendarDays,
  ChartColumn,
  Megaphone,
  Images,
  ArrowRight,
} from 'lucide-react'
import { WasteTileNote } from './waste-tile-note'
import { WeatherWidget } from './weather-widget'
import { ResidentSearch } from './resident-search'
import { getActivePollCount } from '@/lib/polls'
import { BUDGET_PAGE_ENABLED } from '@/lib/features'

const tiles = [
  { href: '/wywoz-smieci', label: 'Wywóz śmieci', note: 'Sprawdź terminy', icon: Recycle, tone: 'eco' },
  { href: '/zglos-sprawe', label: 'Zgłoś sprawę', note: 'Szybko i łatwo', icon: TriangleAlert, tone: 'accent' },
  { href: '/wydarzenia', label: 'Wydarzenia', note: 'Zobacz co się dzieje', icon: CalendarDays, tone: 'primary' },
  { href: '/aktualnosci', label: 'Aktualności', note: 'Najnowsze informacje', icon: Megaphone, tone: 'primary' },
  { href: '/ankiety', label: 'Ankiety i opinie', note: '2 aktywne', icon: ChartColumn, tone: 'chart5' },
  { href: '/galeria', label: 'Galeria mieszkańców', note: 'Zobacz zdjęcia', icon: Images, tone: 'eco' },
]

/** Podpis kafelka ankiet zależny od liczby aktywnych ankiet. */
function pollsNote(count: number): string {
  if (count <= 0) return 'Zagłosuj teraz'
  if (count === 1) return '1 aktywna'
  if (count <= 4) return `${count} aktywne`
  return '4+ ankiety'
}

const toneStyles: Record<string, string> = {
  eco: 'bg-eco/12 text-eco',
  accent: 'bg-accent/25 text-accent-foreground',
  primary: 'bg-primary/12 text-primary',
  chart5: 'bg-chart-5/12 text-chart-5',
}

export async function QuickAccess() {
  const activePolls = await getActivePollCount()

  return (
    <section className="-mx-4 max-w-none px-0 py-10 md:mx-auto md:max-w-3xl md:px-6 md:py-12">
      <div className="px-4 sm:px-6">
        {/* Weather */}
        <WeatherWidget embedded />

        {/* Search */}
        <div className="mt-4">
          <ResidentSearch />
        </div>

        {/* Quick access */}
        <h3 className="mb-3 mt-6 text-sm font-bold text-foreground">Najczęściej używane</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {tiles.map((tile) => {
            const Icon = tile.icon
            return (
              <Link
                key={tile.label}
                href={tile.href}
                prefetch={tile.href === '/galeria' ? false : undefined}
                className="group flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface p-4 shadow-[0_1px_3px_oklch(0.23_0.03_262_/_0.07)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-md"
              >
                <span
                  className={`flex size-11 items-center justify-center rounded-xl ${toneStyles[tile.tone]}`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-semibold leading-tight text-balance">
                  {tile.label}
                </span>
                {tile.href === '/wywoz-smieci' ? (
                  <WasteTileNote />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {tile.href === '/ankiety' ? pollsNote(activePolls) : tile.note}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Transparentna gmina — poziomy kafel budżetu.
            Wyświetlany tylko, gdy strona budżetu jest włączona
            (patrz BUDGET_PAGE_ENABLED w lib/features.ts). */}
        {BUDGET_PAGE_ENABLED ? (
          <Link
            href="/budzet"
            prefetch={false}
            className="group relative top-5 mt-3 flex items-stretch overflow-hidden rounded-2xl border border-border/70 bg-primary/5 shadow-[0_1px_3px_oklch(0.23_0.03_262_/_0.07)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
          >
            <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-2 p-4 sm:gap-3 sm:p-5">
              <div>
                <h4 className="text-base font-bold leading-tight text-balance sm:text-lg">Budżet gminy 2026</h4>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground text-pretty sm:mt-1">
                  Sprawdź, na co idą pieniądze i jak rozwija się nasza gmina.
                </p>
              </div>
              <span className="mt-0.5 inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-transform group-active:scale-[0.98] sm:mt-1 sm:px-4 sm:py-2.5 sm:text-sm">
                Zobacz szczegóły
                <ArrowRight className="size-4" />
              </span>
            </div>
            <div className="relative w-28 shrink-0 overflow-hidden sm:w-44">
              <img
                src="/images/hero-panorama.webp"
                alt="Panorama gminy Jejkowice z widokiem na kościół"
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
            </div>
          </Link>
        ) : null}
      </div>
    </section>
  )
}
