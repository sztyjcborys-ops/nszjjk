import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { type Idea, type IdeaRow, toPublicIdea } from '@/lib/ideas'

/**
 * Publiczne, ZATWIERDZONE pomysły dla strony /pomysly i strony głównej.
 * Używa klienta anon (bez cookies) — RLS zwraca wyłącznie approved = true,
 * a widok może być cache'owany przez Next.js.
 */
export async function getPublicIdeas(limit?: number): Promise<Idea[]> {
  try {
    const supabase = createPublicClient()
    let query = supabase
      .from('ideas')
      .select('*')
      .eq('approved', true)
      .order('votes', { ascending: false })
      .order('created_at', { ascending: false })
    if (limit) query = query.limit(limit)

    const { data, error } = await query
    if (error) {
      console.log('[v0] getPublicIdeas error:', error.message)
      return []
    }
    return ((data as IdeaRow[]) ?? []).map(toPublicIdea)
  } catch (e) {
    console.log('[v0] getPublicIdeas exception:', (e as Error).message)
    return []
  }
}

/**
 * Wszystkie pomysły dla panelu (oczekujące + zatwierdzone). Używa klienta z
 * cookies — RLS przepuszcza pełny odczyt tylko redakcji/adminowi (is_staff()).
 * Oczekujące na górze, potem najnowsze.
 */
export async function getAllIdeas(): Promise<IdeaRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .order('approved', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.log('[v0] getAllIdeas error:', error.message)
    return []
  }
  return (data as IdeaRow[]) ?? []
}
