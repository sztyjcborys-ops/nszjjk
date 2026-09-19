import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Newspaper,
  Inbox,
  CalendarDays,
  BarChart3,
  Plus,
  ArrowRight,
  FileText,
  MapPin,
  Lightbulb,
  Bell,
  Images,
  Mail,
} from 'lucide-react'
import { formatArticleDate } from '@/lib/articles'
import { formatReportDate, statusBadgeClass, REPORT_CATEGORY_LABELS } from '@/lib/reports'
import { getAdminDashboardData } from '@/lib/admin-dashboard'
import { getCurrentProfile } from '@/lib/supabase/auth'
import { plForm, plural } from '@/lib/polish-plural'

export const metadata: Metadata = {
  title: 'Pulpit — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/** Pierwsze imię z pełnej nazwy (do powitania). */
function firstName(full: string | null | undefined): string | null {
  const name = (full ?? '').trim().split(/\s+/)[0]
  return name || null
}

/** Powitanie zależne od pory dnia: 05:00–17:59 „Dzień dobry”, 18:00–04:59 „Dobry wieczór”. */
function greeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 18) return 'Dzień dobry'
  return 'Dobry wieczór'
}

function formatToday(): string {
  const s = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

type Stat = {
  href: string
  count: number
  label: string
  icon: React.ComponentType<{ className?: string }>
  /** Kafelek alarmowy (czerwony) — podświetlany, gdy count > 0. */
  alert?: boolean
}

type Attention = {
  href: string
  text: string
  hint: string
  /** Najpilniejsza pozycja — wyróżniona kropką. */
  urgent?: boolean
}

export default async function AdminDashboard() {
  const [{ articles, reports, events, polls, gallery, ideas }, profile] = await Promise.all([
    getAdminDashboardData(),
    getCurrentProfile(),
  ])

  // „Wymaga uwagi" — rzeczy niedokończone / nieprzejrzane, złożone z realnych danych.
  const attention: Attention[] = []
  if (reports.newCount > 0) {
    attention.push({
      href: '/admin/zgloszenia',
      text: `${plural(reports.newCount, {
        one: 'nowe zgłoszenie',
        few: 'nowe zgłoszenia',
        many: 'nowych zgłoszeń',
      })} do obsługi`,
      hint: 'Zgłoszenia mieszkańców',
      urgent: true,
    })
  }
  if (articles.draft > 0) {
    attention.push({
      href: '/admin/artykuly',
      text:
        articles.draft === 1
          ? 'Dokończ szkic artykułu'
          : `${articles.draft} szkiców artykułów do dokończenia`,
      hint: 'Nieopublikowane treści',
    })
  }
  if (ideas.pending > 0) {
    attention.push({
      href: '/admin/pomysly',
      text: `${ideas.pending} ${plForm(ideas.pending, {
        one: 'pomysł oczekuje',
        few: 'pomysły oczekują',
        many: 'pomysłów oczekuje',
      })} na zatwierdzenie`,
      hint: 'Propozycje mieszkańców',
    })
  }
  if (gallery.pending > 0) {
    attention.push({
      href: '/admin/galeria',
      text: `${gallery.pending} ${plForm(gallery.pending, {
        one: 'zdjęcie czeka',
        few: 'zdjęcia czekają',
        many: 'zdjęć czeka',
      })} na moderację`,
      hint: 'Galeria mieszkańców',
    })
  }

  const stats: Stat[] = [
    {
      href: '/admin/zgloszenia',
      count: reports.newCount,
      label: plForm(reports.newCount, {
        one: 'Nowe zgłoszenie',
        few: 'Nowe zgłoszenia',
        many: 'Nowych zgłoszeń',
      }),
      icon: Bell,
      alert: true,
    },
    {
      href: '/admin/pomysly',
      count: ideas.pending,
      label: plForm(ideas.pending, {
        one: 'Nowy pomysł',
        few: 'Nowe pomysły',
        many: 'Nowych pomysłów',
      }),
      icon: Lightbulb,
      alert: true,
    },
    {
      href: '/admin/artykuly',
      count: articles.published,
      label: plForm(articles.published, {
        one: 'Opublikowany artykuł',
        few: 'Opublikowane artykuły',
        many: 'Opublikowanych artykułów',
      }),
      icon: Newspaper,
    },
    {
      href: '/admin/wydarzenia',
      count: events.upcoming,
      label: plForm(events.upcoming, {
        one: 'Nadchodzące wydarzenie',
        few: 'Nadchodzące wydarzenia',
        many: 'Nadchodzących wydarzeń',
      }),
      icon: CalendarDays,
    },
    {
      href: '/admin/galeria',
      count: gallery.pending,
      label: plForm(gallery.pending, {
        one: 'Zdjęcie do moderacji',
        few: 'Zdjęcia do moderacji',
        many: 'Zdjęć do moderacji',
      }),
      icon: Images,
      alert: true,
    },
    {
      href: '/admin/ankiety',
      count: polls.active,
      label: plForm(polls.active, {
        one: 'Aktywna ankieta',
        few: 'Aktywne ankiety',
        many: 'Aktywnych ankiet',
      }),
      icon: BarChart3,
    },
  ]

  // Przegląd — stan wszystkich treści w gminie w formie czytelnej tabeli.
  // `ready` = gotowe/widoczne (opublikowane, nadchodzące, aktywne, obsłużone),
  // `pending` = wymaga działania (szkice, do zatwierdzenia, do moderacji, nowe).
  const overview: {
    label: string
    icon: React.ComponentType<{ className?: string }>
    total: number
    ready: number
    pending: number
  }[] = [
    { label: 'Artykuły', icon: Newspaper, total: articles.total, ready: articles.published, pending: articles.draft },
    { label: 'Wydarzenia', icon: CalendarDays, total: events.total, ready: events.upcoming, pending: 0 },
    { label: 'Pomysły', icon: Lightbulb, total: ideas.total, ready: Math.max(0, ideas.total - ideas.pending), pending: ideas.pending },
    { label: 'Ankiety', icon: BarChart3, total: polls.total, ready: polls.active, pending: 0 },
    { label: 'Zdjęcia', icon: Images, total: gallery.total, ready: Math.max(0, gallery.total - gallery.pending), pending: gallery.pending },
    { label: 'Zgłoszenia', icon: Inbox, total: reports.total, ready: Math.max(0, reports.total - reports.newCount), pending: reports.newCount },
  ]

  const actions = [
    { href: '/admin/nowy', label: 'Dodaj artykuł', icon: Plus, primary: true },
    { href: '/admin/wydarzenia/nowy', label: 'Dodaj wydarzenie', icon: CalendarDays },
    { href: '/admin/zgloszenia', label: 'Przejrzyj zgłoszenia', icon: Mail },
    { href: '/admin/ankiety/nowa', label: 'Utwórz ankietę', icon: BarChart3 },
  ]

  const recentArticles = articles.recent
  const recentReports = reports.recent
  const name = firstName(profile?.fullName)
  const todoCount = attention.length

  return (
    <div className="grid gap-8">
      {/* Powitanie */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {greeting()}
            {name ? `, ${name}` : ''}!
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            {todoCount === 0
              ? 'Wszystko na bieżąco — nic nie wymaga uwagi.'
              : `Masz ${todoCount} ${plForm(todoCount, {
                  one: 'rzecz wymagającą uwagi',
                  few: 'rzeczy wymagające uwagi',
                  many: 'rzeczy wymagających uwagi',
                })}.`}
          </p>
        </div>
        <p className="shrink-0 text-sm text-muted-foreground sm:text-right">{formatToday()}</p>
      </header>

      {/* Kafelki statystyk — rzeczy do obsługi */}
      <section
        aria-label="Do obsługi"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        {stats.map((s) => {
          const Icon = s.icon
          const hot = s.alert && s.count > 0
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`group relative flex flex-col justify-between gap-4 rounded-2xl border p-4 transition-all hover:shadow-sm ${
                hot
                  ? 'border-destructive/20 bg-destructive/5 hover:border-destructive/40'
                  : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              <span
                className={`flex size-10 items-center justify-center rounded-xl ${
                  hot ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="size-5" />
                {hot && (
                  <span className="absolute right-3 top-3 size-2.5 rounded-full bg-destructive ring-2 ring-background" />
                )}
              </span>
              <span>
                <span className="block text-2xl font-bold tabular-nums leading-none">{s.count}</span>
                <span className="mt-1.5 block text-xs font-medium text-muted-foreground text-pretty">
                  {s.label}
                </span>
              </span>
            </Link>
          )
        })}
      </section>

      {/* Przegląd — stan wszystkich treści w gminie w formie tabeli */}
      <section aria-label="Przegląd gminy">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Przegląd</h2>
          <span className="text-xs text-muted-foreground">Stan treści w gminie</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[19rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th scope="col" className="px-4 py-2.5">
                  Sekcja
                </th>
                <th scope="col" className="hidden px-2 py-2.5 text-right sm:table-cell">
                  Gotowe
                </th>
                <th scope="col" className="px-2 py-2.5 text-right">
                  Oczekuje
                </th>
                <th scope="col" className="px-4 py-2.5 text-right">
                  Łącznie
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {overview.map((o) => {
                const Icon = o.icon
                const pct = o.total > 0 ? Math.round((o.ready / o.total) * 100) : 0
                return (
                  <tr key={o.label} className="transition-colors hover:bg-muted/40">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <span className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium leading-none">{o.label}</span>
                          <span
                            className="mt-1.5 flex h-1 w-16 overflow-hidden rounded-full bg-muted"
                            aria-hidden="true"
                          >
                            <span
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                        </span>
                      </span>
                    </th>
                    <td className="hidden px-2 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {o.ready}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      {o.pending > 0 ? (
                        <span className="font-semibold text-amber-600">{o.pending}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold tabular-nums">
                      {o.total}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Szybkie działania */}
      <section aria-label="Szybkie działania">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Szybkie działania</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {actions.map((a) => {
            const Icon = a.icon
            return (
              <Link
                key={a.href}
                href={a.href}
                className={`group flex flex-col items-center justify-center gap-2.5 rounded-2xl border p-4 text-center transition-all hover:shadow-sm ${
                  a.primary
                    ? 'border-primary/20 bg-primary/5 hover:border-primary/40'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <span
                  className={`flex size-11 items-center justify-center rounded-xl transition-colors ${
                    a.primary
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground group-hover:text-primary'
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <span
                  className={`text-xs font-semibold text-pretty ${a.primary ? 'text-primary' : ''}`}
                >
                  {a.label}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Wymaga uwagi (dawniej „Twoje zadania") */}
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="size-4 text-muted-foreground" />
            Wymaga uwagi
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {todoCount}
            </span>
          </h2>
        </div>
        {attention.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Wszystko obsłużone — brak zaległości.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {attention.map((item, i) => (
              <li key={i}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
                >
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      item.urgent ? 'border-destructive' : 'border-muted-foreground/40'
                    }`}
                  >
                    {item.urgent && <span className="size-1.5 rounded-full bg-destructive" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.text}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {item.hint}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ostatnie zgłoszenia */}
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Inbox className="size-4 text-muted-foreground" />
            Ostatnie zgłoszenia
          </h2>
          <Link
            href="/admin/zgloszenia"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Zobacz wszystkie
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {recentReports.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Brak zgłoszeń od mieszkańców.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recentReports.map((r) => (
              <li key={r.id}>
                <Link
                  href="/admin/zgloszenia"
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{r.location}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${statusBadgeClass(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {REPORT_CATEGORY_LABELS[r.category] ?? r.category} ·{' '}
                      {formatReportDate(r.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ostatnie artykuły */}
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Newspaper className="size-4 text-muted-foreground" />
            Ostatnie artykuły
          </h2>
          <Link
            href="/admin/artykuly"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Zobacz wszystkie
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {recentArticles.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <FileText className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Brak artykułów.</p>
            <Link
              href="/admin/nowy"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
            >
              <Plus className="size-4" /> Dodaj pierwszy
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recentArticles.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/${a.id}`}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-start gap-2">
                      <span className="min-w-0 break-words text-sm font-medium">{a.title}</span>
                      <span
                        className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                          a.published ? 'bg-eco/15 text-eco' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {a.published ? 'Opublikowany' : 'Szkic'}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {a.category} · {formatArticleDate(a.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
