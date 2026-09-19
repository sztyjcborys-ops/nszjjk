import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'

export type GalleryRow = {
  id: string
  src: string
  alt: string
  storage_path: string | null
  sort_order: number
  published: boolean
  status: 'pending' | 'approved'
  storage_provider: 'supabase' | 'r2'
  author_id: string | null
  created_at: string
  updated_at: string
}

/** Uproszczony kształt zdjęcia używany przez publiczną galerię. */
export type GalleryImage = {
  id: string
  src: string
  alt: string
}

const MONTHS_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

/** e.g. "15 maja 2024" */
export function formatGalleryDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`
}

/** Wszystkie zdjęcia (panel — wymaga uprawnień redakcji/admina). */
export async function getAdminGallery(): Promise<GalleryRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('gallery')
    .select('*')
    .eq('status', 'approved')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.log('[v0] getAdminGallery error:', error.message)
    return []
  }
  return (data as GalleryRow[]) ?? []
}

/** Zdjęcia oczekujące na moderację (panel — wymaga uprawnień redakcji/admina). */
export async function getPendingGallery(): Promise<GalleryRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('gallery')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.log('[v0] getPendingGallery error:', error.message)
    return []
  }
  return (data as GalleryRow[]) ?? []
}

/** Pojedyncze zdjęcie po id (panel edycji). */
export async function getGalleryImageById(id: string): Promise<GalleryRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('gallery').select('*').eq('id', id).maybeSingle()
  if (error) {
    console.log('[v0] getGalleryImageById error:', error.message)
    return null
  }
  return (data as GalleryRow) ?? null
}

/** Publiczne, opublikowane zdjęcia jako GalleryImage[] (wyłącznie z bazy). */
export async function getPublicGallery(): Promise<GalleryImage[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('gallery')
    .select('id, src, alt, sort_order, created_at')
    .eq('published', true)
    .eq('status', 'approved')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error || !data) {
    if (error) console.log('[v0] getPublicGallery error:', error.message)
    return []
  }

  return (data as Pick<GalleryRow, 'id' | 'src' | 'alt'>[]).map((g) => ({
    id: g.id,
    src: g.src,
    alt: g.alt,
  }))
}
