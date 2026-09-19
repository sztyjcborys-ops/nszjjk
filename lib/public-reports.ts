import { createPublicClient } from '@/lib/supabase/public'
import {
  REPORT_CATEGORY_LABELS,
  type ReportStatus,
} from '@/lib/reports'
import { resolveStreet } from '@/lib/jejkowice-streets'

/**
 * Publiczne widoki pokazują wyłącznie nazwę ulicy — nigdy numer domu.
 * Gdy rozpoznamy ulicę z Jejkowic, używamy jej oficjalnej nazwy; w innym
 * wypadku obcinamy końcowy numer (np. „Główna 12” → „Główna”). Numer trafia
 * tylko do panelu admina, który korzysta z innego, pełnego kształtu danych.
 */
function streetOnly(location: string): string {
  const street = resolveStreet(location)
  if (street) return street.name
  const trimmed = location.replace(/\s+\d+\S*\s*$/, '').trim()
  return trimmed || location
}

/**
 * Publiczny, bezpieczny kształt zgłoszenia dla widoków dostępnych dla każdego.
 * NIE zawiera danych kontaktowych ani ścieżek do prywatnych zdjęć — pochodzi
 * z widoku public.public_reports (patrz scripts/003_public_reports.sql).
 */
export type PublicReport = {
  id: string
  /** Identyfikator kategorii (np. "drogi") — do ikon i filtrów. */
  category: string
  /** Etykieta kategorii, np. "Drogi i chodniki" — pełni rolę tytułu na karcie. */
  title: string
  /** Lokalizacja podana przez mieszkańca (np. "ul. Polna"). */
  place: string
  status: ReportStatus
  /** Sformatowana data zgłoszenia, np. "Zgłoszono: 15 maja". */
  date: string
  /** Surowy znacznik czasu (ISO) — do sortowania i etykiet względnych. */
  createdAt: string
}

type PublicReportRow = {
  id: string
  category: string
  location: string
  status: ReportStatus
  created_at: string
}

const MONTHS_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

/** e.g. "Zgłoszono: 15 maja" — zgodne z formatem statycznych kart w lib/data. */
function formatSubmittedShort(iso: string) {
  const d = new Date(iso)
  return `Zgłoszono: ${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}`
}

function toPublicReport(row: PublicReportRow): PublicReport {
  return {
    id: row.id,
    category: row.category,
    title: REPORT_CATEGORY_LABELS[row.category] ?? 'Zgłoszenie',
    place: streetOnly(row.location),
    status: row.status,
    date: formatSubmittedShort(row.created_at),
    createdAt: row.created_at,
  }
}

/**
 * Publiczne zgłoszenia z widoku public.public_reports (najnowsze pierwsze).
 * Zwraca wyłącznie realne dane z bazy — brak zgłoszeń oznacza pustą listę.
 */
export async function getPublicReports(limit?: number): Promise<PublicReport[]> {
  try {
    const supabase = createPublicClient()
    let query = supabase
      .from('public_reports')
      .select('id, category, location, status, created_at')
      .order('created_at', { ascending: false })
    if (limit) query = query.limit(limit)

    const { data, error } = await query
    if (error) {
      console.log('[v0] getPublicReports error:', error.message)
      return []
    }

    return ((data as PublicReportRow[]) ?? []).map(toPublicReport)
  } catch (e) {
    console.log('[v0] getPublicReports exception:', (e as Error).message)
    return []
  }
}
