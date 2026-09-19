import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import type { NewsCategory, NewsItem } from '@/lib/data'
import { formatArticleDate, formatArticleTime } from '@/lib/format'
import { focalToObjectPosition, parseImageFocal } from '@/lib/image-focal'

export { formatArticleDate, formatArticleTime }

/** Kolumny potrzebne na LIŚCIE aktualności (bez ciężkiego pola `content`). */
const ARTICLE_LIST_COLUMNS =
  'id, slug, title, excerpt, category, cover_image, published, pinned, author_id, created_at, updated_at'

/** Pojedyncze zdjęcie w galerii artykułu (przechowywane w kolumnie `gallery` jsonb). */
export type ArticleGalleryImage = {
  src: string
  alt?: string
}

export type Article = {
  id: string
  slug: string
  title: string
  excerpt: string
  category: NewsCategory
  cover_image: string | null
  content: string
  gallery: ArticleGalleryImage[]
  published: boolean
  /** Przypięty artykuł — trafia na początek listy i strony głównej. */
  pinned: boolean
  author: string | null
  author_id: string | null
  created_at: string
  updated_at: string
}

/** Normalizuje kolumnę `gallery` z bazy (jsonb) do bezpiecznej tablicy. */
export function normalizeGallery(value: unknown): ArticleGalleryImage[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
    .map((v) => ({
      src: typeof v.src === 'string' ? v.src : '',
      alt: typeof v.alt === 'string' ? v.alt : '',
    }))
    .filter((v) => v.src.length > 0)
}

/** Map a DB row to the NewsItem shape used by the shared cards. */
export function articleToNewsItem(a: Article): NewsItem {
  // Punkt ostrości miniaturki jest zapisany w tym samym adresie (fragment `#focal=`).
  const { src, focal } = parseImageFocal(a.cover_image)
  return {
    id: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    category: a.category,
    date: formatArticleDate(a.created_at),
    image: src || '/placeholder.svg',
    imagePosition: focalToObjectPosition(focal),
  }
}

/**
 * True gdy błąd zapytania wynika z braku kolumny `pinned` — czyli migracja
 * `scripts/006_article_pinned.sql` nie została jeszcze uruchomiona. Pozwala to
 * płynnie działać stronie zanim admin doda kolumnę w Supabase.
 */
function isMissingPinnedColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false
  return error.code === '42703' || /pinned/i.test(error.message ?? '')
}

/** Published articles for public pages: pinned first, then newest. */
export async function getPublishedArticles(): Promise<Article[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('articles')
    .select(ARTICLE_LIST_COLUMNS)
    .eq('published', true)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    // Fallback zanim uruchomiono migrację `pinned`.
    if (isMissingPinnedColumn(error)) {
      const { data: fallback, error: fbError } = await supabase
        .from('articles')
        .select('id, slug, title, excerpt, category, cover_image, published, author_id, created_at, updated_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
      if (fbError) {
        console.log('[v0] getPublishedArticles fallback error:', fbError.message)
        return []
      }
      return (fallback as unknown as Article[]) ?? []
    }
    console.log('[v0] getPublishedArticles error:', error.message)
    return []
  }
  return (data as unknown as Article[]) ?? []
}

/** A single published article by slug (for the public detail page). */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (error) {
    console.log('[v0] getArticleBySlug error:', error.message)
    return null
  }
  if (!data) return null
  return { ...(data as Article), gallery: normalizeGallery((data as { gallery?: unknown }).gallery) }
}

/** All articles (drafts included) for the admin dashboard. RLS restricts this to authenticated users. */
export async function getAllArticles(): Promise<Article[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    // Fallback zanim uruchomiono migrację `pinned`.
    if (isMissingPinnedColumn(error)) {
      const { data: fallback, error: fbError } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false })
      if (fbError) {
        console.log('[v0] getAllArticles fallback error:', fbError.message)
        return []
      }
      return (fallback as Article[]) ?? []
    }
    console.log('[v0] getAllArticles error:', error.message)
    return []
  }
  return (data as Article[]) ?? []
}

/** Single article by id for the admin editor. */
export async function getArticleById(id: string): Promise<Article | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.log('[v0] getArticleById error:', error.message)
    return null
  }
  if (!data) return null
  return { ...(data as Article), gallery: normalizeGallery((data as { gallery?: unknown }).gallery) }
}
