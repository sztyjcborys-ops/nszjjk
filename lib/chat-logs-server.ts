import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/** Górne limity długości zapisywanej pary — trzymamy logi „lekkie". */
const MAX_QUESTION_CHARS = 2000
const MAX_ANSWER_CHARS = 4000

/**
 * Zapisuje jedną parę pytanie → odpowiedź. Wywoływane z route /api/chat po
 * przygotowaniu odpowiedzi. Używa klienta service_role (omija RLS), bo rozmowa
 * mieszkańca jest anonimowa i nie ma sesji Supabase.
 *
 * Logowanie NIGDY nie może wywrócić odpowiedzi dla mieszkańca — dlatego wszystko
 * jest w try/catch, a błąd tylko trafia do logów serwera.
 */
export async function logChatExchange(opts: {
  sessionId: string | null
  question: string
  answer: string
  /** Zahashowany IP autora (do limitu tempa i banowania urządzenia). */
  ipHash?: string | null
  /** Czy wiadomość wykryto jako próbę nadużycia (prompt injection / spam). */
  flagged?: boolean
  /** Skrót dopasowanych reguł detekcji (do wglądu w panelu). */
  flagReason?: string | null
}): Promise<void> {
  const question = opts.question.trim().slice(0, MAX_QUESTION_CHARS)
  const answer = opts.answer.trim().slice(0, MAX_ANSWER_CHARS)
  if (!question || !answer) return

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('chat_logs').insert({
      session_id: opts.sessionId,
      question,
      answer,
      ip_hash: opts.ipHash ?? null,
      flagged: opts.flagged ?? false,
      flag_reason: opts.flagReason ?? null,
    })
    if (error) {
      console.log('[v0] logChatExchange insert error:', error.message)
      // Zgodność wstecz: gdy migracja 017 (kolumny ip_hash/flagged/flag_reason)
      // nie została jeszcze uruchomiona, insert z nowymi polami zwróci błąd
      // „column ... does not exist". Ponawiamy wtedy zapis w starym kształcie,
      // żeby nie tracić logu rozmowy.
      const admin2 = createAdminClient()
      const { error: fallbackError } = await admin2.from('chat_logs').insert({
        session_id: opts.sessionId,
        question,
        answer,
      })
      if (fallbackError) {
        console.log('[v0] logChatExchange fallback error:', fallbackError.message)
      }
    }
  } catch (err) {
    console.log('[v0] logChatExchange error:', err instanceof Error ? err.message : err)
  }
}
