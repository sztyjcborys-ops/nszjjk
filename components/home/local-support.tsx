import Link from 'next/link'
import { Store, ChevronRight, ArrowRight } from 'lucide-react'
import { localBusinesses } from '@/lib/local-businesses'
import { LocalPromosCarousel } from './local-promos-carousel'
import { LocalStoriesBar } from './local-stories-bar'

/**
 * Sekcja „Wspieraj lokalnie" na stronie głównej — pasek firm z Jejkowic oraz
 * karuzela ich promocji.
 *
 * UWAGA: rozmycie „sekcja w budowie" zostało TYMCZASOWO wyłączone, żeby można
 * było dopracować moduł firm. Podgląd sekcji jest w pełni widoczny, a awatary
 * oraz przyciski „Zobacz wszystkie" prowadzą do podstrony /firmy.
 */
export function LocalSupport() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 md:px-6">
      {/* Nagłówek sekcji */}
      <div className="mb-1 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
          <span className="whitespace-nowrap">Wspieraj lokalny</span>{' '}
          <span className="whitespace-nowrap">biznes!</span>
        </h2>
        <Link
          href="/firmy"
          prefetch={false}
          className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-eco transition-colors hover:text-eco/80"
        >
          Zobacz wszystkie
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <p className="mb-5 text-sm text-muted-foreground md:text-base">
        Poznaj firmy z Jejkowic i korzystaj z ich ofert!
      </p>

      {/* Zawartość sekcji. Na mobile blok jest „full-bleed" (wychodzi poza px-4
          sekcji aż do brzegów ekranu), żeby karty dochodziły do samych krawędzi
          — na desktopie (md+) wraca do siatki sekcji. */}
      <div className="relative -mx-4 overflow-hidden md:mx-0">
        {/* Pasek okrągłych awatarów firm — klik otwiera relacje bez wychodzenia
            ze strony głównej */}
        <LocalStoriesBar businesses={localBusinesses} />

        {/* Karuzela promocji */}
        <LocalPromosCarousel items={localBusinesses} />

        {/* Baner prowadzący do pełnej listy ofert lokalnych firm */}
        <Link
          href="/firmy"
          prefetch={false}
          className="mx-4 mt-6 flex items-center gap-4 rounded-2xl border border-eco/20 bg-eco/8 p-4 transition-colors hover:bg-eco/12 md:mx-0 md:p-5"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-eco/15 text-eco">
            <Store className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-eco">Zobacz wszystkie oferty</p>
            <p className="text-sm text-muted-foreground text-pretty">
              Przeglądaj oferty i ogłoszenia lokalnych firm z Jejkowic.
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </Link>
      </div>
    </section>
  )
}
