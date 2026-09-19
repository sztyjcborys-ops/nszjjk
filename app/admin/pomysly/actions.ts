'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/supabase/auth'
import { IDEA_CATEGORIES } from '@/lib/ideas'

/** Bramka redakcyjna: wymaga roli editor/admin (nie tylko zalogowania). */
async function requireStaffClient() {
  const { supabase } = await requireStaff()
  return supabase
}

function revalidateIdeas() {
  revalidatePath('/admin/pomysly')
  // Publiczne widoki korzystają z cache (revalidate) — odświeżamy natychmiast.
  revalidatePath('/pomysly')
  revalidatePath('/')
}

/** Szybkie zatwierdzenie pomysłu — trafia na publiczną listę. */
export async function approveIdeaAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return

  const supabase = await requireStaffClient()
  const { error } = await supabase.from('ideas').update({ approved: true }).eq('id', id)
  if (error) console.log('[v0] approveIdeaAction error:', error.message)

  revalidateIdeas()
}

/** Cofnięcie zatwierdzenia — pomysł znika z publicznej listy (wraca do poczekalni). */
export async function unapproveIdeaAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return

  const supabase = await requireStaffClient()
  const { error } = await supabase.from('ideas').update({ approved: false }).eq('id', id)
  if (error) console.log('[v0] unapproveIdeaAction error:', error.message)

  revalidateIdeas()
}

export type EditIdeaState = { ok?: true; error?: string }

/**
 * Edycja treści pomysłu przez redakcję/admina. Opcjonalnie zatwierdza go od
 * razu (checkbox „Zatwierdź i opublikuj”).
 */
export async function updateIdeaAction(
  _prev: EditIdeaState,
  formData: FormData,
): Promise<EditIdeaState> {
  const id = String(formData.get('id') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const author = String(formData.get('author') ?? '').trim()
  const approved = formData.get('approved') === 'on'

  if (!id) return { error: 'Brak identyfikatora pomysłu.' }
  if (!title) return { error: 'Tytuł nie może być pusty.' }
  if (!description) return { error: 'Opis nie może być pusty.' }
  if (!IDEA_CATEGORIES.includes(category as (typeof IDEA_CATEGORIES)[number])) {
    return { error: 'Wybierz poprawną kategorię.' }
  }

  const supabase = await requireStaffClient()
  const { error } = await supabase
    .from('ideas')
    .update({
      title,
      description,
      category,
      author: author || 'Mieszkaniec',
      approved,
    })
    .eq('id', id)

  if (error) {
    console.log('[v0] updateIdeaAction error:', error.message)
    return { error: 'Nie udało się zapisać zmian. Spróbuj ponownie.' }
  }

  revalidateIdeas()
  return { ok: true }
}

/** Usunięcie pomysłu (trwałe). */
export async function deleteIdeaAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return

  const supabase = await requireStaffClient()
  const { error } = await supabase.from('ideas').delete().eq('id', id)
  if (error) console.log('[v0] deleteIdeaAction error:', error.message)

  revalidateIdeas()
}
