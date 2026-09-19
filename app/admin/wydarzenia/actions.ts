'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/supabase/auth'
import { parseParkings } from '@/lib/parkings'

export type EventFormState = { error?: string; fieldErrors?: Record<string, string> }

function slugify(input: string) {
  const map: Record<string, string> = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
  }
  return input
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

/** Zamienia tekst z pola wieloliniowego na tablicę (akapity / punkty). */
function toLines(value: string, splitBy: 'paragraph' | 'line') {
  const raw = value.replace(/\r/g, '')
  const parts =
    splitBy === 'paragraph' ? raw.split(/\n{2,}/) : raw.split(/\n+/)
  return parts.map((p) => p.trim()).filter(Boolean)
}

/**
 * Normalizuje pozycję programu do formatu 'HH:MM|Opis'.
 * Akceptuje wejście typu '15:00 Rozpoczęcie', '15:00 - Rozpoczęcie', '15:00|Opis'.
 */
function normalizeProgramLine(line: string) {
  const pipe = line.indexOf('|')
  if (pipe >= 0) {
    return `${line.slice(0, pipe).trim()}|${line.slice(pipe + 1).trim()}`
  }
  const m = line.match(/^(\d{1,2}[:.]\d{2})\s*[-–—]?\s*(.*)$/)
  if (m) return `${m[1].replace('.', ':')}|${m[2].trim()}`
  return line
}

export async function saveEventAction(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { supabase, user } = await requireStaff()

  const id = String(formData.get('id') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const place = String(formData.get('place') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()
  const eventDate = String(formData.get('event_date') ?? '').trim()
  const eventTime = String(formData.get('event_time') ?? '').trim()
  const image = String(formData.get('image') ?? '').trim()
  const organizer = String(formData.get('organizer') ?? '').trim() || 'Urząd Gminy Jejkowice'
  const intro = String(formData.get('intro') ?? '').trim()
  const description = toLines(String(formData.get('description') ?? ''), 'paragraph')
  const highlights = toLines(String(formData.get('highlights') ?? ''), 'line')
  const program = toLines(String(formData.get('program') ?? ''), 'line').map(normalizeProgramLine)
  const free = formData.get('free') === 'on'
  const published = formData.get('published') === 'on'

  const latRaw = String(formData.get('latitude') ?? '').trim()
  const lngRaw = String(formData.get('longitude') ?? '').trim()
  const latitude = latRaw ? Number(latRaw) : null
  const longitude = lngRaw ? Number(lngRaw) : null
  const parkings = parseParkings(String(formData.get('parkings') ?? ''))

  const fieldErrors: Record<string, string> = {}
  if (!title) fieldErrors.title = 'Tytuł jest wymagany.'
  if (!place) fieldErrors.place = 'Miejsce jest wymagane.'
  if (!eventDate) fieldErrors.event_date = 'Data jest wymagana.'
  if (!eventTime) fieldErrors.event_time = 'Godzina jest wymagana.'
  if (!intro) fieldErrors.intro = 'Krótki opis jest wymagany.'
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }

  const payload = {
    title,
    place,
    address: address || null,
    event_date: eventDate,
    event_time: eventTime,
    image: image || null,
    organizer,
    free,
    intro,
    description,
    highlights,
    program,
    latitude,
    longitude,
    parkings,
    published,
  }

  // Gdy migracje 011 (`parkings`) / 012 (`organizer`) nie zostały jeszcze
  // uruchomione, baza zwróci błąd 42703 (kolumna nie istnieje). Ponawiamy zapis
  // bez brakujących kolumn, żeby panel działał niezależnie od stanu migracji.
  const isMissingColumn = (err: { code?: string; message?: string } | null, col: string) =>
    !!err && (err.code === '42703' || new RegExp(col).test(err.message ?? ''))
  const isMissingParkingsColumn = (err: { code?: string; message?: string } | null) =>
    isMissingColumn(err, 'parkings')
  const isMissingOrganizerColumn = (err: { code?: string; message?: string } | null) =>
    isMissingColumn(err, 'organizer')
  const { parkings: _parkings, ...payloadNoParkings } = payload
  const { organizer: _organizer, ...payloadNoOrganizer } = payload
  const { parkings: _p2, organizer: _o2, ...payloadNoBoth } = payload

  type DbError = { code?: string; message?: string } | null

  /** Zapis z automatycznym pomijaniem kolumn, których jeszcze nie ma w bazie. */
  async function persist(run: (data: Record<string, unknown>) => Promise<{ error: DbError }>) {
    let { error } = await run(payload)
    if (isMissingParkingsColumn(error) && isMissingOrganizerColumn(error)) {
      ;({ error } = await run(payloadNoBoth))
    } else if (isMissingParkingsColumn(error)) {
      ;({ error } = await run(payloadNoParkings))
      if (isMissingOrganizerColumn(error)) ({ error } = await run(payloadNoBoth))
    } else if (isMissingOrganizerColumn(error)) {
      ;({ error } = await run(payloadNoOrganizer))
      if (isMissingParkingsColumn(error)) ({ error } = await run(payloadNoBoth))
    }
    return error
  }

  if (id) {
    const error = await persist(async (data) => {
      const { error } = await supabase.from('events').update(data).eq('id', id)
      return { error }
    })
    if (error) return { error: 'Nie udało się zapisać zmian: ' + error.message }
  } else {
    const base = slugify(title) || 'wydarzenie'
    const slug = `${base}-${Date.now().toString(36).slice(-4)}`
    const error = await persist(async (data) => {
      const { error } = await supabase
        .from('events')
        .insert({ ...data, slug, author_id: user.id })
      return { error }
    })
    if (error) return { error: 'Nie udało się utworzyć wydarzenia: ' + error.message }
  }

  revalidatePath('/admin/wydarzenia')
  revalidatePath('/admin')
  revalidatePath('/wydarzenia')
  redirect('/admin/wydarzenia')
}

export async function deleteEventAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return

  const { supabase } = await requireStaff()

  await supabase.from('events').delete().eq('id', id)
  revalidatePath('/admin/wydarzenia')
  revalidatePath('/admin')
  revalidatePath('/wydarzenia')
}

export async function toggleEventPublishAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  const next = formData.get('next') === 'true'
  if (!id) return

  const { supabase } = await requireStaff()

  await supabase.from('events').update({ published: next }).eq('id', id)
  revalidatePath('/admin/wydarzenia')
  revalidatePath('/wydarzenia')
}
