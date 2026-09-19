import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import type { EventItem } from '@/lib/data'
import { parseParkings, type ParkingSpot } from '@/lib/parkings'

/** Kolumny potrzebne na publicznych widokach wydarzeń (rowToEventItem). */
const EVENT_PUBLIC_COLUMNS =
  'id, slug, title, place, address, event_date, event_time, image, free, intro, description, highlights, parkings'

/** Ten sam zestaw kolumn bez `parkings` — awaryjnie, gdy migracja 011 nie została jeszcze uruchomiona. */
const EVENT_PUBLIC_COLUMNS_NO_PARKINGS =
  'id, slug, title, place, address, event_date, event_time, image, free, intro, description, highlights'

export type EventRow = {
  id: string
  slug: string
  title: string
  place: string
  address: string | null
  event_date: string
  event_time: string
  image: string | null
  free: boolean
  intro: string
  description: string[]
  highlights: string[]
  /** program w formacie 'HH:MM|Opis'; kolumna może nie istnieć przed migracją 009 */
  program?: string[] | null
  latitude?: number | null
  longitude?: number | null
  /** parkingi wydarzenia (jsonb); kolumna może nie istnieć przed migracją 011 */
  parkings?: unknown
  /** organizator wydarzenia; kolumna może nie istnieć przed migracją 012 */
  organizer?: string | null
  published: boolean
  created_at: string
  updated_at: string
}

/** Zamienia wiersz z bazy na kształt EventItem używany przez publiczne komponenty. */
export function rowToEventItem(row: EventRow): EventItem {
  return {
    id: row.slug,
    date: row.event_date,
    title: row.title,
    place: row.place,
    address: row.address ?? undefined,
    time: row.event_time,
    image: row.image || '/placeholder.svg',
    free: row.free,
    intro: row.intro,
    description: row.description ?? [],
    highlights: row.highlights ?? [],
    program: row.program ?? [],
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    parkings: parseParkings(row.parkings),
    organizer: row.organizer?.trim() ? row.organizer.trim() : undefined,
  }
}

/** Wszystkie wydarzenia (panel — wymaga uprawnień redakcji/admina). */
export async function getAdminEvents(): Promise<EventRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  if (error) {
    console.log('[v0] getAdminEvents error:', error.message)
    return []
  }
  return (data as EventRow[]) ?? []
}

/** Pojedyncze wydarzenie po id (panel). */
export async function getEventById(id: string): Promise<EventRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single()
  if (error) {
    console.log('[v0] getEventById error:', error.message)
    return null
  }
  return data as EventRow
}

/** Publiczne, opublikowane wydarzenia jako EventItem[] (wyłącznie z bazy). */
export async function getPublicEvents(): Promise<EventItem[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_PUBLIC_COLUMNS)
    .eq('published', true)
    .order('event_date', { ascending: true })

  if (error) {
    // Migracja 011 (kolumna `parkings`) mogła nie zostać jeszcze uruchomiona.
    // Ponawiamy bez tej kolumny, żeby lista wydarzeń nie znikała.
    console.log('[v0] getPublicEvents error, retry without parkings:', error.message)
    const { data: fallback, error: fallbackError } = await supabase
      .from('events')
      .select(EVENT_PUBLIC_COLUMNS_NO_PARKINGS)
      .eq('published', true)
      .order('event_date', { ascending: true })

    if (fallbackError || !fallback) {
      if (fallbackError) console.log('[v0] getPublicEvents fallback error:', fallbackError.message)
      return []
    }
    return (fallback as unknown as EventRow[]).map(rowToEventItem)
  }
  if (!data) return []
  return (data as unknown as EventRow[]).map(rowToEventItem)
}

/** Publiczne wydarzenie po slug. */
export async function getPublicEventBySlug(slug: string): Promise<EventItem | null> {
  const supabase = createPublicClient()
  // '*' zamiast listy kolumn: strona szczegółów potrzebuje program/latitude/longitude,
  // a '*' działa też przed zastosowaniem migracji 009 (kolumny po prostu nie wrócą).
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (data) return rowToEventItem(data as unknown as EventRow)
  return null
}
