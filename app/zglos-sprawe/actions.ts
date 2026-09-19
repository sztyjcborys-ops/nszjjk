'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveStreet } from '@/lib/jejkowice-streets'

const CATEGORIES = ['drogi', 'oswietlenie', 'zielen', 'odpady', 'infrastruktura', 'inne'] as const
const ACCEPTED_TYPES = ['image/webp', 'image/jpeg', 'image/png']
const MAX_FILES = 3
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB — twardy limit również po stronie serwera

export type ReportState = { ok?: true; error?: string }

export async function submitReportAction(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const category = String(formData.get('category') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const contactEmail = String(formData.get('contact_email') ?? '').trim()

  // Dokładny punkt wskazany na mapie (opcjonalny). Przyjmujemy tylko poprawne
  // liczby w granicach Polski — inaczej zapisujemy null i pinezkę wyznaczy adres.
  const parseCoord = (raw: FormDataEntryValue | null, min: number, max: number): number | null => {
    if (raw === null) return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= min && n <= max ? n : null
  }
  const lat = parseCoord(formData.get('lat'), 49, 55)
  const lng = parseCoord(formData.get('lng'), 14, 24)

  // --- Walidacja pól tekstowych ---
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return { error: 'Wybierz poprawną kategorię zgłoszenia.' }
  }
  if (!location) return { error: 'Podaj lokalizację.' }
  // Lokalizacja musi wskazywać ulicę z gminy Jejkowice — inaczej zgłoszenie nie
  // przypnie się na mapie w panelu admina. Walidujemy tym samym silnikiem, co mapa.
  if (!resolveStreet(location)) {
    return { error: 'Podaj ulicę z gminy Jejkowice — wybierz ją z podpowiedzi.' }
  }
  if (!description) return { error: 'Opisz zgłaszany problem.' }

  // --- Walidacja plików (niezależna od Storage/RLS i od klienta) ---
  const files = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)

  if (files.length > MAX_FILES) {
    return { error: `Możesz dodać maksymalnie ${MAX_FILES} zdjęcia.` }
  }
  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return { error: 'Dozwolone są tylko zdjęcia JPEG, PNG lub WebP.' }
    }
    if (file.size > MAX_BYTES) {
      return { error: 'Każde zdjęcie może mieć maksymalnie 5 MB.' }
    }
  }

  const supabase = await createClient()

  // Ścieżkę generuje aplikacja: reports/{report_id}/{file_uuid}.webp.
  // Użytkownik nie wybiera ścieżki i nie może nadpisać cudzych plików.
  const reportId = crypto.randomUUID()
  const imagePaths: string[] = []

  // Sprząta pliki już wgrane do Storage, aby nie zostawały osierocone zdjęcia,
  // gdy dalszy krok (kolejny upload lub insert) się nie powiedzie.
  //
  // Anonim ma w report-images tylko INSERT (RLS blokuje DELETE), więc do samego
  // usuwania używamy klienta service_role — wyłącznie tutaj, best-effort.
  const cleanupUploaded = async () => {
    if (imagePaths.length === 0) return
    try {
      const admin = createAdminClient()
      await admin.storage.from('report-images').remove(imagePaths)
    } catch (cleanupError) {
      // Nie przerywamy obsługi błędu użytkownika, jeśli samo sprzątanie zawiedzie.
      console.error('[v0] Nie udało się usunąć osieroconych plików:', cleanupError)
    }
  }

  for (const file of files) {
    const path = `reports/${reportId}/${crypto.randomUUID()}.webp`
    const { error: uploadError } = await supabase.storage
      .from('report-images')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) {
      await cleanupUploaded()
      return { error: 'Nie udało się przesłać zdjęcia. Spróbuj ponownie.' }
    }
    imagePaths.push(path)
  }

  // Zapis zgłoszenia — status jest wymuszony ('Zgłoszone'), image_paths ustawiane
  // w tym samym insercie, bo anonim nie ma uprawnień do UPDATE.
  const { error: insertError } = await supabase.from('reports').insert({
    id: reportId,
    category,
    location,
    description,
    contact_email: contactEmail || null,
    image_paths: imagePaths,
    lat,
    lng,
    status: 'Zgłoszone',
  })

  if (insertError) {
    // Zapis do bazy się nie powiódł — usuwamy wgrane wcześniej zdjęcia,
    // żeby nie zostały osierocone pliki w Storage.
    await cleanupUploaded()
    return { error: 'Nie udało się zapisać zgłoszenia. Spróbuj ponownie.' }
  }

  return { ok: true }
}
