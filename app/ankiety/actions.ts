'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type VoteResult = { ok: boolean; error?: string }

/**
 * Publiczny głos w ankiecie. RLS wymusza, że głosować można tylko w AKTYWNEJ
 * ankiecie i tylko na opcję do niej należącą. Unikalność (poll_id, voter_key)
 * blokuje wielokrotne głosowanie — voter_key to stabilny identyfikator klienta
 * z localStorage (bez logowania).
 */
export async function submitPollVoteAction(input: {
  pollId: string
  optionId: string
  voterKey: string
}): Promise<VoteResult> {
  const pollId = String(input.pollId ?? '').trim()
  const optionId = String(input.optionId ?? '').trim()
  const voterKey = String(input.voterKey ?? '').trim()

  if (!pollId || !optionId || !voterKey) {
    return { ok: false, error: 'Nieprawidłowe dane głosu.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('poll_votes').insert({
    poll_id: pollId,
    option_id: optionId,
    voter_key: voterKey,
  })

  if (error) {
    // 23505 = naruszenie unikalności → mieszkaniec już oddał głos w tej ankiecie.
    if (error.code === '23505') {
      return { ok: false, error: 'Już oddałeś głos w tej ankiecie.' }
    }
    console.log('[v0] submitPollVoteAction error:', error.message)
    return { ok: false, error: 'Nie udało się zapisać głosu. Spróbuj ponownie.' }
  }

  revalidatePath('/ankiety')
  revalidatePath('/')
  return { ok: true }
}
