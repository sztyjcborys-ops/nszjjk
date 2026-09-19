'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/supabase/auth'

export type PollFormState = { error?: string; fieldErrors?: Record<string, string> }

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

/** Kolory słupków wyników — cykliczne, spójne z resztą serwisu. */
const OPTION_COLORS = [
  'oklch(0.52 0.2 264)',
  'oklch(0.58 0.14 152)',
  'oklch(0.83 0.15 83)',
  'oklch(0.62 0.16 20)',
  'oklch(0.55 0.02 262)',
  'oklch(0.45 0.09 60)',
]

export async function savePollAction(
  _prev: PollFormState,
  formData: FormData,
): Promise<PollFormState> {
  const { supabase, user } = await requireStaff()

  const id = String(formData.get('id') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const image = String(formData.get('image') ?? '').trim()
  const status = String(formData.get('status') ?? 'Aktywna').trim()
  const endsAt = String(formData.get('ends_at') ?? '').trim()
  const options = formData
    .getAll('options')
    .map((o) => String(o).trim())
    .filter(Boolean)

  const fieldErrors: Record<string, string> = {}
  if (!title) fieldErrors.title = 'Tytuł ankiety jest wymagany.'
  if (status !== 'Aktywna' && status !== 'Zakończona') fieldErrors.status = 'Wybierz status.'
  if (options.length < 2) fieldErrors.options = 'Podaj co najmniej dwie odpowiedzi.'
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }

  const payload = {
    title,
    description,
    image: image || null,
    status,
    ends_at: endsAt ? new Date(endsAt).toISOString() : null,
  }

  let pollId = id

  if (id) {
    const { error } = await supabase.from('polls').update(payload).eq('id', id)
    if (error) return { error: 'Nie udało się zapisać zmian: ' + error.message }
  } else {
    const base = slugify(title) || 'ankieta'
    const slug = `${base}-${Date.now().toString(36).slice(-4)}`
    const { data, error } = await supabase
      .from('polls')
      .insert({ ...payload, slug, kind: 'single_choice', author_id: user.id })
      .select('id')
      .single()
    if (error || !data) return { error: 'Nie udało się utworzyć ankiety: ' + (error?.message ?? '') }
    pollId = data.id as string
  }

  // Synchronizacja opcji: usuwamy dotychczasowe i zapisujemy nowe w kolejności.
  // (Głosy oddane na usunięte opcje znikają wraz z nimi — świadome uproszczenie
  // przy edycji zestawu odpowiedzi.)
  await supabase.from('poll_options').delete().eq('poll_id', pollId)
  const rows = options.map((label, i) => ({
    poll_id: pollId,
    label,
    color: OPTION_COLORS[i % OPTION_COLORS.length],
    sort_order: i,
  }))
  const { error: optErr } = await supabase.from('poll_options').insert(rows)
  if (optErr) return { error: 'Nie udało się zapisać odpowiedzi: ' + optErr.message }

  revalidatePath('/admin/ankiety')
  revalidatePath('/admin')
  revalidatePath('/ankiety')
  // Strona główna pokazuje wyróżnioną ankietę (getFeaturedPoll).
  revalidatePath('/')
  redirect('/admin/ankiety')
}

export async function deletePollAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return

  const { supabase } = await requireStaff()

  await supabase.from('polls').delete().eq('id', id)
  revalidatePath('/admin/ankiety')
  revalidatePath('/admin')
  revalidatePath('/ankiety')
  // Strona główna pokazuje wyróżnioną ankietę (getFeaturedPoll).
  revalidatePath('/')
}

export async function togglePollStatusAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  const next = String(formData.get('next') ?? '').trim()
  if (!id || (next !== 'Aktywna' && next !== 'Zakończona')) return

  const { supabase } = await requireStaff()

  await supabase.from('polls').update({ status: next }).eq('id', id)
  revalidatePath('/admin/ankiety')
  revalidatePath('/ankiety')
  // Strona główna pokazuje wyróżnioną ankietę (getFeaturedPoll).
  revalidatePath('/')
}
