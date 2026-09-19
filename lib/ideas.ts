/**
 * Pomysły mieszkańców — wspólne typy i stałe (klient + serwer).
 * Dane trzymamy w Supabase (public.ideas, patrz scripts/007_ideas.sql).
 * Bez statusów: pomysł jest albo oczekujący (approved = false), albo
 * zatwierdzony i widoczny publicznie (approved = true).
 */

export const IDEA_CATEGORIES = [
  'Rekreacja i sport',
  'Zieleń i środowisko',
  'Drogi i chodniki',
  'Kultura i edukacja',
  'Bezpieczeństwo',
  'Inne',
] as const

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number]

/** Surowy wiersz z bazy (widziany przez redakcję/admin — również oczekujące). */
export type IdeaRow = {
  id: string
  title: string
  description: string
  category: string
  author: string
  votes: number
  approved: boolean
  created_at: string
  updated_at: string
}

/** Publiczny kształt pomysłu dla strony /pomysly (tylko zatwierdzone). */
export type Idea = {
  id: string
  title: string
  description: string
  category: string
  author: string
  votes: number
  /** ISO 'YYYY-MM-DD' — data zgłoszenia. */
  date: string
}

const MONTHS_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

/** e.g. "2 maja 2026" */
export function formatIdeaDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`
}

/** Mapowanie surowego wiersza na publiczny kształt. */
export function toPublicIdea(row: IdeaRow): Idea {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    author: row.author,
    votes: row.votes,
    date: row.created_at.slice(0, 10),
  }
}
