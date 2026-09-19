'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Route,
  Lightbulb,
  Trees,
  Trash2,
  Building2,
  MoreHorizontal,
  MapPin,
  Search,
  ChevronRight,
  ArrowUpDown,
  type LucideIcon,
} from 'lucide-react'
import {
  REPORT_CATEGORY_LABELS,
  relativeTime,
  type ReportRow,
  type ReportStatus,
} from '@/lib/reports'
import { resolveStreet, JEJKOWICE_STREET_NAMES } from '@/lib/jejkowice-streets'
import { geocodeJejkowice, locationKey, type LatLng } from '@/lib/geocode-address'
import { ReportsMap, type ReportPoint } from '@/components/reports/reports-map'
import { cn } from '@/lib/utils'

/** Ikona kategorii zgłoszenia. */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  drogi: Route,
  oswietlenie: Lightbulb,
  zielen: Trees,
  odpady: Trash2,
  infrastruktura: Building2,
  inne: MoreHorizontal,
}

type StatusStyle = { dot: string; pin: string; badge: string; tint: string; icon: string }

/** Kolory statusu — dla kropki, pinezki mapy, plakietki i kafla listy. */
const STATUS_STYLE: Record<ReportStatus, StatusStyle> = {
  Zgłoszone: {
    dot: 'bg-red-500',
    pin: '#ef4444',
    badge: 'bg-red-50 text-red-600 ring-red-200',
    tint: 'bg-red-50 text-red-600',
    icon: 'text-red-600',
  },
  'W trakcie': {
    dot: 'bg-amber-500',
    pin: '#f59e0b',
    badge: 'bg-amber-50 text-amber-600 ring-amber-200',
    tint: 'bg-amber-50 text-amber-600',
    icon: 'text-amber-600',
  },
  Zaakceptowane: {
    dot: 'bg-amber-500',
    pin: '#f59e0b',
    badge: 'bg-amber-50 text-amber-600 ring-amber-200',
    tint: 'bg-amber-50 text-amber-600',
    icon: 'text-amber-600',
  },
  Zakończone: {
    dot: 'bg-slate-400',
    pin: '#94a3b8',
    badge: 'bg-slate-100 text-slate-500 ring-slate-200',
    tint: 'bg-slate-100 text-slate-500',
    icon: 'text-slate-500',
  },
}

const STATUS_LABEL: Record<ReportStatus, string> = {
  Zgłoszone: 'Nowe',
  'W trakcie': 'W trakcie',
  Zaakceptowane: 'W trakcie',
  Zakończone: 'Zakończone',
}

type FilterKey = 'all' | 'new' | 'progress' | 'done'

const FILTERS: { key: FilterKey; label: string; match: (s: ReportStatus) => boolean }[] = [
  { key: 'all', label: 'Wszystkie', match: () => true },
  { key: 'new', label: 'Nowe', match: (s) => s === 'Zgłoszone' },
  { key: 'progress', label: 'W trakcie', match: (s) => s === 'W trakcie' || s === 'Zaakceptowane' },
  { key: 'done', label: 'Zakończone', match: (s) => s === 'Zakończone' },
]

/** Widok panelu: mapa + filtry + lista zgłoszeń. Kliknięcie kafla otwiera szczegóły. */
export function ReportsBoard({ reports }: { reports: ReportRow[] }) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')
  const [newestFirst, setNewestFirst] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Realne współrzędne adresów (z Nominatim), keszowane po znormalizowanym
  // adresie. Trzymamy je też w refie, żeby efekt geokodowania nie musiał mieć
  // `geo` w zależnościach (uniknięcie restartów pętli przy każdym trafieniu).
  const [geo, setGeo] = useState<Record<string, LatLng>>({})
  const geoRef = useRef<Record<string, LatLng>>({})

  const newCount = useMemo(() => reports.filter((r) => r.status === 'Zgłoszone').length, [reports])

  const visible = useMemo(() => {
    const activeFilter = FILTERS.find((f) => f.key === filter)!
    const q = query.trim().toLowerCase()
    const list = reports.filter((r) => {
      if (!activeFilter.match(r.status)) return false
      if (q && !r.location.toLowerCase().includes(q)) return false
      return true
    })
    list.sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return newestFirst ? diff : -diff
    })
    return list
  }, [reports, filter, query, newestFirst])

  // Punkty na mapę — tylko zgłoszenia z rozpoznaną ulicą Jejkowic. Jeśli mamy
  // już zgeokodowany dokładny adres (z numerem domu), używamy go; do czasu
  // odpowiedzi z Nominatim pinezka stoi na środku ulicy (fallback resolveStreet).
  const points = useMemo<ReportPoint[]>(() => {
    const out: ReportPoint[] = []
    for (const r of visible) {
      const street = resolveStreet(r.location)
      // Pinezkę stawiamy, gdy mamy dokładny punkt z mapy ALBO rozpoznaną ulicę.
      const exact = typeof r.lat === 'number' && typeof r.lng === 'number'
      if (!exact && !street) continue
      // Priorytet: dokładny punkt wskazany przez mieszkańca → zgeokodowany adres
      // (z numerem domu) → środek ulicy jako ostateczny fallback.
      const precise = geo[locationKey(r.location)]
      out.push({
        id: r.id,
        title: REPORT_CATEGORY_LABELS[r.category] ?? 'Zgłoszenie',
        place: r.location,
        color: STATUS_STYLE[r.status].pin,
        lat: exact ? (r.lat as number) : precise?.lat ?? street!.lat,
        lng: exact ? (r.lng as number) : precise?.lng ?? street!.lng,
      })
    }
    return out
  }, [visible, geo])

  // Doprecyzuj pozycje pinezek — geokoduj pełne adresy widocznych zgłoszeń.
  // Sekwencyjnie (po jednym), żeby uszanować limity Nominatim; wyniki są
  // keszowane, więc kolejne przeliczenia są natychmiastowe.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const seen = new Set<string>()
      for (const r of visible) {
        if (cancelled) return
        const key = locationKey(r.location)
        if (!key || seen.has(key) || geoRef.current[key]) continue
        seen.add(key)
        const hit = await geocodeJejkowice(r.location)
        if (cancelled) return
        if (hit) {
          geoRef.current = { ...geoRef.current, [key]: hit }
          setGeo(geoRef.current)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [visible])

  // Domyślnie podświetl pierwsze widoczne zgłoszenie na mapie (dymek jak w projekcie).
  useEffect(() => {
    if (activeId && points.some((p) => p.id === activeId)) return
    setActiveId(points[0]?.id ?? null)
  }, [points, activeId])

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Wyszukiwarka adresu — ulice z Jejkowic (jak przy wywozie śmieci) */}
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/30 md:px-4 md:py-2">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          list="jejkowice-streets"
          placeholder="Szukaj po ulicy, np. Główna"
          aria-label="Szukaj zgłoszeń po ulicy w Jejkowicach"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <datalist id="jejkowice-streets">
          {JEJKOWICE_STREET_NAMES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      {/* Filtry statusu — kompaktowe pastylki (mniejsze na mobile) */}
      <div className="scrollbar-none -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors md:px-3.5 md:py-2 md:text-base',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 text-foreground hover:bg-secondary',
              )}
            >
              {f.label}
              {f.key === 'new' && newCount > 0 && (
                <span
                  className={cn(
                    'inline-flex min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-bold md:min-w-5 md:text-xs',
                    active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-red-500 text-white',
                  )}
                >
                  {newCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Mapa */}
      <ReportsMap
        points={points}
        activeId={activeId}
        onSelect={(id) => setActiveId(id)}
        className="h-56 md:h-72"
      />

      {/* Nagłówek listy + sortowanie */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight md:text-xl">Lista zgłoszeń</h2>
        <button
          type="button"
          onClick={() => setNewestFirst((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowUpDown className="size-4" />
          {newestFirst ? 'Najnowsze' : 'Najstarsze'}
        </button>
      </div>

      {/* Lista */}
      {visible.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Brak zgłoszeń dla wybranych filtrów.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {visible.map((r) => {
            const Icon = CATEGORY_ICON[r.category] ?? MoreHorizontal
            const style = STATUS_STYLE[r.status]
            const active = r.id === activeId
            const isNew = r.status === 'Zgłoszone'
            const title = REPORT_CATEGORY_LABELS[r.category] ?? 'Zgłoszenie'
            return (
              <li key={r.id}>
                <Link
                  href={`/admin/zgloszenia/${r.id}`}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors md:gap-3.5 md:p-3.5',
                    active
                      ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                      : isNew
                        ? 'border-red-100 bg-red-50/60 hover:bg-red-50'
                        : 'border-border bg-card hover:bg-muted/40',
                  )}
                >
                  <span className={cn('size-2 shrink-0 rounded-full', style.dot)} aria-hidden />
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl md:size-12',
                      style.tint,
                    )}
                  >
                    <Icon className={cn('size-5 md:size-6', style.icon)} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold leading-tight md:text-base">
                      {title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground md:text-sm">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">
                        {r.location} · {relativeTime(r.created_at)}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset md:px-2.5 md:py-1 md:text-sm',
                      style.badge,
                    )}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
