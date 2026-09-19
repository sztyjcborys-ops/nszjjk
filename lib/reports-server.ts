import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { ReportRow, ReportNote } from '@/lib/reports'

/** Wszystkie zgłoszenia (RLS ogranicza odczyt do redakcji/admina), najnowsze pierwsze. */
export async function getReports(): Promise<ReportRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.log('[v0] getReports error:', error.message)
    return []
  }
  return (data as ReportRow[]) ?? []
}

/** Pojedyncze zgłoszenie po id (RLS ogranicza odczyt do redakcji/admina). */
export async function getReportById(id: string): Promise<ReportRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('reports').select('*').eq('id', id).single()

  if (error) {
    console.log('[v0] getReportById error:', error.message)
    return null
  }
  return (data as ReportRow) ?? null
}

/** Notatki wewnętrzne zgłoszenia (RLS ogranicza odczyt do redakcji/admina), najstarsze pierwsze. */
export async function getReportNotes(reportId: string): Promise<ReportNote[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('report_notes')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true })

  if (error) {
    console.log('[v0] getReportNotes error:', error.message)
    return []
  }
  return (data as ReportNote[]) ?? []
}

/**
 * Podpisane, tymczasowe adresy URL zdjęć z prywatnego bucketa `report-images`.
 * Zwraca mapę: ścieżka → URL (pomija te, których nie udało się podpisać).
 */
export async function getSignedReportImages(
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('report-images')
    .createSignedUrls(paths, 60 * 60)

  if (error || !data) {
    console.log('[v0] getSignedReportImages error:', error?.message)
    return {}
  }

  const map: Record<string, string> = {}
  for (const item of data) {
    if (item.signedUrl && item.path) map[item.path] = item.signedUrl
  }
  return map
}
