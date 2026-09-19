import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile, isStaffRole } from '@/lib/supabase/auth'
import type { ReportStatus } from '@/lib/reports'
import type { NewsCategory } from '@/lib/data'

export type DashboardArticle = {
  id: string
  title: string
  category: NewsCategory
  created_at: string
  published: boolean
}

export type DashboardReport = {
  id: string
  location: string
  category: string
  status: ReportStatus
  created_at: string
}

export type AdminDashboardData = {
  articles: { total: number; published: number; draft: number; recent: DashboardArticle[] }
  reports: { total: number; newCount: number; recent: DashboardReport[] }
  events: { total: number; upcoming: number }
  polls: { total: number; active: number }
  gallery: { total: number; pending: number }
  ideas: { total: number; pending: number }
}

const EMPTY: AdminDashboardData = {
  articles: { total: 0, published: 0, draft: 0, recent: [] },
  reports: { total: 0, newCount: 0, recent: [] },
  events: { total: 0, upcoming: 0 },
  polls: { total: 0, active: 0 },
  gallery: { total: 0, pending: 0 },
  ideas: { total: 0, pending: 0 },
}

/**
 * Zbiorcze statystyki pulpitu, czytane przez klienta SESYJNEGO (RLS) — tak samo
 * jak reszta panelu. Dane widzi tylko zalogowany staff, dokładnie w zakresie,
 * na jaki pozwalają mu polityki RLS. Nie używamy tu klienta service_role.
 *
 * Wydajność:
 * - liczniki przez `count: 'exact', head: true` (baza zwraca samą liczbę,
 *   bez wierszy), zamiast pobierać całe tabele tylko po to, by policzyć `.length`;
 * - "ostatnie" listy przez `limit(4)` i wyłącznie potrzebne kolumny
 *   (bez ciężkiego `articles.content` czy PII zgłoszeń);
 * - wszystkie zapytania równolegle (`Promise.all`).
 *
 * Cache: `React.cache` deduplikuje odczyt w obrębie JEDNEGO żądania. Nie ma
 * współdzielonego cache między użytkownikami — dane sesyjne zależą od cookies,
 * więc nie mogą trafić do globalnego `unstable_cache`. Strona jest dynamiczna,
 * a liczniki odświeżają się przy każdym wejściu na pulpit.
 */
const loadDashboard = cache(async (): Promise<AdminDashboardData> => {
  const supabase = await createClient()

  const [
    articlesTotal,
    articlesPublished,
    recentArticles,
    reportsTotal,
    reportsNew,
    recentReports,
    eventsTotal,
    eventsUpcoming,
    pollsTotal,
    pollsActive,
    galleryTotal,
    galleryPending,
    ideasTotal,
    ideasPending,
  ] = await Promise.all([
    supabase.from('articles').select('id', { count: 'exact', head: true }),
    supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('published', true),
    supabase
      .from('articles')
      .select('id, title, category, created_at, published')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('reports').select('id', { count: 'exact', head: true }),
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Zgłoszone'),
    supabase
      .from('reports')
      .select('id, location, category, status, created_at')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('event_date', new Date().toISOString().slice(0, 10)),
    supabase.from('polls').select('id', { count: 'exact', head: true }),
    supabase
      .from('polls')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Aktywna'),
    supabase.from('gallery').select('id', { count: 'exact', head: true }),
    supabase
      .from('gallery')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('ideas').select('id', { count: 'exact', head: true }),
    supabase
      .from('ideas')
      .select('id', { count: 'exact', head: true })
      .eq('approved', false),
  ])

  const total = articlesTotal.count ?? 0
  const published = articlesPublished.count ?? 0

  return {
    articles: {
      total,
      published,
      draft: total - published,
      recent: (recentArticles.data as DashboardArticle[]) ?? [],
    },
    reports: {
      total: reportsTotal.count ?? 0,
      newCount: reportsNew.count ?? 0,
      recent: (recentReports.data as DashboardReport[]) ?? [],
    },
    events: { total: eventsTotal.count ?? 0, upcoming: eventsUpcoming.count ?? 0 },
    polls: { total: pollsTotal.count ?? 0, active: pollsActive.count ?? 0 },
    gallery: { total: galleryTotal.count ?? 0, pending: galleryPending.count ?? 0 },
    ideas: { total: ideasTotal.count ?? 0, pending: ideasPending.count ?? 0 },
  }
})

/**
 * Dane pulpitu dla bieżącego użytkownika. Redakcja/admin dostaje agregat,
 * pozostali — puste liczniki. Bramka roli wykonuje się PRZED odczytem danych.
 */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const profile = await getCurrentProfile()
  if (!profile || !isStaffRole(profile.role)) return EMPTY
  return loadDashboard()
}

/**
 * Liczniki „do sprawdzenia" dla plakietek w nawigacji panelu. Klucz = href
 * pozycji menu. Zwracamy tylko rzeczy wymagające uwagi (nowe/oczekujące),
 * więc plakietka pojawia się wyłącznie, gdy jest co przejrzeć.
 *
 * Osobna, lekka funkcja (a nie pełny agregat pulpitu), bo wywołujemy ją w
 * layoucie na KAŻDEJ podstronie panelu — pobieramy same liczby (`head: true`),
 * równolegle, i tylko dla pozycji, które mają stan „niesprawdzone".
 */
export type NavCounts = Record<string, number>

const loadNavCounts = cache(async (): Promise<NavCounts> => {
  const supabase = await createClient()

  const [reportsNew, ideasPending, galleryPending, articlesDraft] = await Promise.all([
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Zgłoszone'),
    supabase.from('ideas').select('id', { count: 'exact', head: true }).eq('approved', false),
    supabase
      .from('gallery')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('published', false),
  ])

  return {
    '/admin/zgloszenia': reportsNew.count ?? 0,
    '/admin/pomysly': ideasPending.count ?? 0,
    '/admin/galeria': galleryPending.count ?? 0,
    '/admin/artykuly': articlesDraft.count ?? 0,
  }
})

export async function getNavCounts(): Promise<NavCounts> {
  const profile = await getCurrentProfile()
  if (!profile || !isStaffRole(profile.role)) return {}
  return loadNavCounts()
}
