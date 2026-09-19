import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'

/** Kolumny ankiety potrzebne publicznemu frontendowi. */
const POLL_PUBLIC_COLUMNS =
  'id, slug, title, description, image, status, starts_at, ends_at, created_at, updated_at, author_id, kind'

export type PollStatus = 'Aktywna' | 'Zakończona'
export type PollKind = 'single_choice' | 'emoji' | 'rating'

export type PollRow = {
  id: string
  slug: string
  title: string
  description: string
  image: string | null
  kind: PollKind
  status: PollStatus
  starts_at: string
  ends_at: string | null
  author_id: string | null
  created_at: string
  updated_at: string
}

export type PollOptionRow = {
  id: string
  poll_id: string
  label: string
  color: string | null
  sort_order: number
}

/** Wiersz z widoku public.poll_results (agregat głosów, bez voter_key). */
export type PollResultRow = {
  poll_id: string
  option_id: string
  label: string
  color: string | null
  sort_order: number
  votes: number
}

export type PollWithOptions = PollRow & {
  options: PollOptionRow[]
}

export type PollListItem = PollRow & {
  optionsCount: number
  totalVotes: number
}

/** Liczba dni do zakończenia ankiety (null, gdy brak daty lub już minęła). */
export function pollDaysLeft(row: Pick<PollRow, 'ends_at' | 'status'>): number | null {
  if (row.status !== 'Aktywna' || !row.ends_at) return null
  const end = new Date(row.ends_at).getTime()
  const diff = end - Date.now()
  if (diff <= 0) return null
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/** Wszystkie ankiety do panelu (z liczbą opcji i sumą głosów). */
export async function getAdminPolls(): Promise<PollListItem[]> {
  const supabase = await createClient()

  const { data: polls, error } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.log('[v0] getAdminPolls error:', error.message)
    return []
  }

  const { data: results } = await supabase
    .from('poll_results')
    .select('poll_id, option_id, votes')

  const countByPoll = new Map<string, { options: number; votes: number }>()
  for (const r of (results as { poll_id: string; votes: number }[] | null) ?? []) {
    const agg = countByPoll.get(r.poll_id) ?? { options: 0, votes: 0 }
    agg.options += 1
    agg.votes += Number(r.votes) || 0
    countByPoll.set(r.poll_id, agg)
  }

  return (polls as PollRow[]).map((p) => ({
    ...p,
    optionsCount: countByPoll.get(p.id)?.options ?? 0,
    totalVotes: countByPoll.get(p.id)?.votes ?? 0,
  }))
}

/** Ankieta z opcjami (panel edycji). */
export async function getPollById(id: string): Promise<PollWithOptions | null> {
  const supabase = await createClient()

  const { data: poll, error } = await supabase.from('polls').select('*').eq('id', id).single()
  if (error || !poll) {
    if (error) console.log('[v0] getPollById error:', error.message)
    return null
  }

  const { data: options } = await supabase
    .from('poll_options')
    .select('*')
    .eq('poll_id', id)
    .order('sort_order', { ascending: true })

  return { ...(poll as PollRow), options: (options as PollOptionRow[]) ?? [] }
}

/** Opcja ankiety z liczbą głosów — kształt dla publicznego frontendu. */
export type PublicPollOption = {
  id: string
  label: string
  color: string | null
  votes: number
}

/** Ankieta z opcjami i wynikami — kształt dla publicznego frontendu. */
export type PublicPoll = {
  id: string
  slug: string
  title: string
  description: string
  image: string | null
  status: PollStatus
  kind: PollKind
  startsAt: string
  endsAt: string | null
  daysLeft: number | null
  totalVotes: number
  options: PublicPollOption[]
}

/**
 * Publiczne ankiety wraz z opcjami i zbiorczymi wynikami (widok poll_results,
 * bez ujawniania pojedynczych głosów). Aktywne pierwsze, potem najnowsze.
 */
export async function getPublicPolls(): Promise<PublicPoll[]> {
  const supabase = createPublicClient()

  const { data: polls, error } = await supabase
    .from('polls')
    .select(POLL_PUBLIC_COLUMNS)
    .order('status', { ascending: true }) // 'Aktywna' < 'Zakończona' alfabetycznie
    .order('created_at', { ascending: false })

  if (error || !polls) {
    if (error) console.log('[v0] getPublicPolls error:', error.message)
    return []
  }

  const { data: results } = await supabase
    .from('poll_results')
    .select('poll_id, option_id, label, color, sort_order, votes')
    .order('sort_order', { ascending: true })

  const optionsByPoll = new Map<string, PublicPollOption[]>()
  const totalByPoll = new Map<string, number>()
  for (const r of (results as PollResultRow[] | null) ?? []) {
    const list = optionsByPoll.get(r.poll_id) ?? []
    list.push({ id: r.option_id, label: r.label, color: r.color, votes: Number(r.votes) || 0 })
    optionsByPoll.set(r.poll_id, list)
    totalByPoll.set(r.poll_id, (totalByPoll.get(r.poll_id) ?? 0) + (Number(r.votes) || 0))
  }

  return (polls as PollRow[]).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    image: p.image,
    status: p.status,
    kind: p.kind,
    startsAt: p.starts_at,
    endsAt: p.ends_at,
    daysLeft: pollDaysLeft(p),
    totalVotes: totalByPoll.get(p.id) ?? 0,
    options: optionsByPoll.get(p.id) ?? [],
  }))
}

/** Kolory zapasowe dla słupków, gdy opcja nie ma ustawionego koloru. */
const FALLBACK_BAR_COLORS = [
  'oklch(0.52 0.2 264)',
  'oklch(0.58 0.14 152)',
  'oklch(0.83 0.15 83)',
  'oklch(0.62 0.16 20)',
  'oklch(0.55 0.02 262)',
]

/** Wyróżniona ankieta na stronę główną — słupki wyników + liczba głosów. */
export type FeaturedPoll = {
  title: string
  description: string
  daysLeft: number | null
  total: number
  results: { label: string; value: number; color: string }[]
}

/**
 * Wybiera najświeższą AKTYWNĄ ankietę i przelicza jej wyniki na procenty do
 * karty na stronie głównej. Zwraca null, gdy nie ma aktywnych ankiet — wtedy
 * strona główna pokazuje statyczny przykład (jak dotychczas).
 */
export async function getFeaturedPoll(): Promise<FeaturedPoll | null> {
  try {
    const polls = await getPublicPolls()
    const active = polls.filter((p) => p.status === 'Aktywna' && p.options.length > 0)
    const poll = active[0]
    if (!poll) return null

    const total = poll.totalVotes
    const results = poll.options.map((o, i) => ({
      label: o.label,
      value: total > 0 ? Math.round((o.votes / total) * 100) : 0,
      color: o.color ?? FALLBACK_BAR_COLORS[i % FALLBACK_BAR_COLORS.length],
    }))

    return {
      title: poll.title,
      description: poll.description,
      daysLeft: poll.daysLeft,
      total,
      results,
    }
  } catch (e) {
    console.log('[v0] getFeaturedPoll exception:', (e as Error).message)
    return null
  }
}

/**
 * Najświeższa AKTYWNA ankieta z pełnymi opcjami (z identyfikatorami) — dla
 * widżetu głosowania na stronie głównej. Zwraca null, gdy nie ma aktywnych
 * ankiet z opcjami.
 */
export async function getFeaturedPublicPoll(): Promise<PublicPoll | null> {
  try {
    const polls = await getPublicPolls()
    return polls.find((p) => p.status === 'Aktywna' && p.options.length > 0) ?? null
  } catch (e) {
    console.log('[v0] getFeaturedPublicPoll exception:', (e as Error).message)
    return null
  }
}

/**
 * Wszystkie AKTYWNE ankiety z pełnymi opcjami — dla karuzeli ankiet na stronie
 * głównej (mieszkaniec przewija je strzałkami). Zwraca pustą tablicę, gdy nie
 * ma aktywnych ankiet z opcjami.
 */
export async function getFeaturedPublicPolls(): Promise<PublicPoll[]> {
  try {
    const polls = await getPublicPolls()
    return polls.filter((p) => p.status === 'Aktywna' && p.options.length > 0)
  } catch (e) {
    console.log('[v0] getFeaturedPublicPolls exception:', (e as Error).message)
    return []
  }
}

/**
 * Liczba aktywnych ankiet do kafelka na stronie głównej. Zwraca 0 przy braku
 * danych lub błędzie (kafelek pokazuje wtedy zachętę do głosowania).
 */
export async function getActivePollCount(): Promise<number> {
  try {
    const supabase = createPublicClient()
    const { count, error } = await supabase
      .from('polls')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Aktywna')

    if (error) {
      console.log('[v0] getActivePollCount error:', error.message)
      return 0
    }
    return count ?? 0
  } catch (e) {
    console.log('[v0] getActivePollCount exception:', (e as Error).message)
    return 0
  }
}

/** Wyniki (liczba głosów) dla pojedynczej ankiety. */
export async function getPollResults(pollId: string): Promise<PollResultRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('poll_results')
    .select('*')
    .eq('poll_id', pollId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.log('[v0] getPollResults error:', error.message)
    return []
  }
  return (data as PollResultRow[]) ?? []
}
