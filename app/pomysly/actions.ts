'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { IDEA_CATEGORIES } from '@/lib/ideas'

const MAX_TITLE = 120
const MAX_DESCRIPTION = 2000
const MAX_AUTHOR = 60
const MIN_DESCRIPTION = 10

// Limit zgłoszeń na jeden adres IP.
const RATE_WINDOW_MINUTES = 10
const RATE_MAX_IN_WINDOW = 3

export type IdeaFormState = { ok?: true; error?: string }

/** Wyciąga adres IP klienta z nagłówków (za proxy/Vercel) i zwraca jego hash. */
async function clientIpHash(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  const ip =
    (forwarded ? forwarded.split(',')[0]?.trim() : '') ||
    h.get('x-real-ip') ||
    'unknown'
  // Hashujemy IP — w bazie nie trzymamy surowego adresu (mniej danych osobowych).
  return createHash('sha256').update(`jejkowice:${ip}`).digest('hex')
}

/**
 * Zgłoszenie pomysłu przez mieszkańca (bez konta). Trafia do poczekalni jako
 * OCZEKUJĄCY (approved = false, votes = 0). Bezpieczeństwo/anty-spam:
 *
 * 1. Insert idzie WYŁĄCZNIE przez klienta service_role — anon nie ma polityki
 *    INSERT w RLS, więc nikt nie zaleje tabeli bezpośrednio przez REST API.
 * 2. Honeypot (ukryte pole) odsiewa większość botów.
 * 3. Limit zgłoszeń na adres IP (RATE_MAX_IN_WINDOW / RATE_WINDOW_MINUTES).
 * 4. Twarda walidacja długości i kategorii.
 */
export async function submitIdeaAction(
  _prev: IdeaFormState,
  formData: FormData,
): Promise<IdeaFormState> {
  // 1) Honeypot — prawdziwi użytkownicy zostawiają to pole puste.
  //    Udajemy sukces, żeby nie podpowiadać botom, że zostały wykryte.
  const honeypot = String(formData.get('website') ?? '').trim()
  if (honeypot) return { ok: true }

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const author = String(formData.get('author') ?? '').trim()

  // 2) Walidacja treści.
  if (!title) return { error: 'Podaj tytuł pomysłu.' }
  if (title.length > MAX_TITLE) return { error: `Tytuł może mieć maksymalnie ${MAX_TITLE} znaków.` }
  if (!description) return { error: 'Opisz swój pomysł.' }
  if (description.length < MIN_DESCRIPTION)
    return { error: `Opis jest zbyt krótki — napisz przynajmniej ${MIN_DESCRIPTION} znaków.` }
  if (description.length > MAX_DESCRIPTION)
    return { error: `Opis może mieć maksymalnie ${MAX_DESCRIPTION} znaków.` }
  if (!IDEA_CATEGORIES.includes(category as (typeof IDEA_CATEGORIES)[number])) {
    return { error: 'Wybierz poprawną kategorię.' }
  }
  if (author.length > MAX_AUTHOR)
    return { error: `Podpis może mieć maksymalnie ${MAX_AUTHOR} znaków.` }

  const supabase = createAdminClient()
  const ipHash = await clientIpHash()

  // 3) Limit tempa — ile zgłoszeń z tego IP w ostatnim oknie czasowym.
  const windowStart = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString()
  const { count, error: countError } = await supabase
    .from('idea_rate_limit')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', windowStart)

  if (countError) {
    console.log('[v0] submitIdeaAction rate-check error:', countError.message)
    return { error: 'Nie udało się zapisać pomysłu. Spróbuj ponownie.' }
  }

  if ((count ?? 0) >= RATE_MAX_IN_WINDOW) {
    return {
      error: `Wysłano już kilka pomysłów z tego urządzenia. Odczekaj ${RATE_WINDOW_MINUTES} minut i spróbuj ponownie.`,
    }
  }

  // 4) Zapis pomysłu (zawsze jako oczekujący, bez głosów).
  const { error } = await supabase.from('ideas').insert({
    title,
    description,
    category,
    author: author || 'Mieszkaniec',
    votes: 0,
    approved: false,
  })

  if (error) {
    console.log('[v0] submitIdeaAction insert error:', error.message)
    return { error: 'Nie udało się zapisać pomysłu. Spróbuj ponownie.' }
  }

  // Zapisujemy ślad do licznika limitu (best-effort — nie blokuje sukcesu).
  const { error: logError } = await supabase.from('idea_rate_limit').insert({ ip_hash: ipHash })
  if (logError) console.log('[v0] submitIdeaAction rate-log error:', logError.message)

  return { ok: true }
}

// =============================================================================
// Głosowanie na pomysły (lajki) — trwały zapis do bazy
// =============================================================================

export type VoteResult = { ok: true; votes: number } | { ok: false; error: string }

/**
 * Głos identyfikujemy hashem adresu IP — jedno urządzenie = jeden głos na dany
 * pomysł. To nie jest twarde uwierzytelnienie, ale wystarcza dla publicznego
 * banku pomysłów i nie wymaga logowania. (Świadomie inny "solt" niż przy limicie
 * zgłoszeń, żeby nie łączyć obu tabel.)
 */
async function voterHash(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  const ip =
    (forwarded ? forwarded.split(',')[0]?.trim() : '') ||
    h.get('x-real-ip') ||
    'unknown'
  return createHash('sha256').update(`jejkowice-vote:${ip}`).digest('hex')
}

/**
 * Oddanie głosu na zatwierdzony pomysł. Zapis idzie kluczem service_role przez
 * atomową funkcję RPC (cast_idea_vote), która blokuje podwójne głosowanie z tego
 * samego urządzenia i podnosi licznik ideas.votes. Po zapisie unieważniamy cache
 * strony /pomysly (revalidate = 60), żeby liczba głosów była aktualna po odświeżeniu.
 */
export async function voteIdeaAction(ideaId: string): Promise<VoteResult> {
  if (!ideaId) return { ok: false, error: 'Brak identyfikatora pomysłu.' }

  const supabase = createAdminClient()
  const hash = await voterHash()

  const { data, error } = await supabase.rpc('cast_idea_vote', {
    p_idea_id: ideaId,
    p_voter_hash: hash,
  })

  if (error) {
    console.log('[v0] voteIdeaAction error:', error.message)
    return { ok: false, error: 'Nie udało się zapisać głosu. Spróbuj ponownie.' }
  }
  if (data === null || data === undefined) {
    return { ok: false, error: 'Nie znaleziono pomysłu.' }
  }

  revalidatePath('/pomysly')
  revalidatePath('/')
  return { ok: true, votes: Number(data) }
}

/** Cofnięcie własnego głosu (analogicznie, przez RPC retract_idea_vote). */
export async function unvoteIdeaAction(ideaId: string): Promise<VoteResult> {
  if (!ideaId) return { ok: false, error: 'Brak identyfikatora pomysłu.' }

  const supabase = createAdminClient()
  const hash = await voterHash()

  const { data, error } = await supabase.rpc('retract_idea_vote', {
    p_idea_id: ideaId,
    p_voter_hash: hash,
  })

  if (error) {
    console.log('[v0] unvoteIdeaAction error:', error.message)
    return { ok: false, error: 'Nie udało się cofnąć głosu. Spróbuj ponownie.' }
  }

  revalidatePath('/pomysly')
  revalidatePath('/')
  return { ok: true, votes: Number(data ?? 0) }
}
