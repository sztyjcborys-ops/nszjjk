'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/supabase/auth'
import { REPORT_STATUSES, type ReportStatus } from '@/lib/reports'

/** Zmiana statusu zgłoszenia (redakcja/admin). */
export async function updateReportStatusAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  const status = String(formData.get('status') ?? '').trim() as ReportStatus
  if (!id || !REPORT_STATUSES.includes(status)) return

  const { supabase } = await requireStaff()

  const { error } = await supabase.from('reports').update({ status }).eq('id', id)
  if (error) {
    console.log('[v0] updateReportStatusAction error:', error.message)
  }

  revalidatePath('/admin')
  revalidatePath('/admin/zgloszenia')
  // Publiczny widok korzysta z cache (revalidate) — odświeżamy go natychmiast.
  revalidatePath('/zglos-sprawe')
}

/** Dodanie notatki wewnętrznej do zgłoszenia (redakcja/admin). */
export async function addReportNoteAction(formData: FormData) {
  const reportId = String(formData.get('reportId') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  if (!reportId || !body) return

  const { supabase, user } = await requireStaff()

  // Podpis autora zapisujemy „w locie", by notatka zachowała autorstwo.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()
  const authorName = profile?.full_name || profile?.email || 'Redakcja'

  const { error } = await supabase.from('report_notes').insert({
    report_id: reportId,
    author_id: user.id,
    author_name: authorName,
    body,
  })
  if (error) {
    console.log('[v0] addReportNoteAction error:', error.message)
  }

  revalidatePath(`/admin/zgloszenia/${reportId}`)
}

/** Usunięcie notatki wewnętrznej (redakcja/admin). */
export async function deleteReportNoteAction(formData: FormData) {
  const noteId = String(formData.get('noteId') ?? '').trim()
  const reportId = String(formData.get('reportId') ?? '').trim()
  if (!noteId) return

  const { supabase } = await requireStaff()

  const { error } = await supabase.from('report_notes').delete().eq('id', noteId)
  if (error) {
    console.log('[v0] deleteReportNoteAction error:', error.message)
  }

  if (reportId) revalidatePath(`/admin/zgloszenia/${reportId}`)
}

/** Usunięcie zgłoszenia wraz z jego zdjęciami w prywatnym buckecie. */
export async function deleteReportAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return

  const { supabase } = await requireStaff()

  // Pobierz ścieżki zdjęć, aby posprzątać Storage po usunięciu rekordu.
  const { data: report } = await supabase
    .from('reports')
    .select('image_paths')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('reports').delete().eq('id', id)
  if (error) {
    console.log('[v0] deleteReportAction error:', error.message)
    redirect('/admin/zgloszenia?error=1')
  }

  const paths = (report?.image_paths as string[] | undefined) ?? []
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from('report-images').remove(paths)
    if (storageError) {
      console.log('[v0] deleteReportAction storage error:', storageError.message)
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/zgloszenia')
  // Publiczny widok korzysta z cache (revalidate) — odświeżamy go natychmiast.
  revalidatePath('/zglos-sprawe')
  // Rekord szczegółów już nie istnieje — wracamy do listy z potwierdzeniem.
  redirect('/admin/zgloszenia?deleted=1')
}
