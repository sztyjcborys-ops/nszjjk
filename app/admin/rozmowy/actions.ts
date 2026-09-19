'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/supabase/auth'
import { createAdminClient } from '@/lib/supabase/admin'

/** Usunięcie pojedynczego wpisu (pary pytanie → odpowiedź). */
export async function deleteChatLogAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return

  const { supabase } = await requireStaff()

  const { error } = await supabase.from('chat_logs').delete().eq('id', id)
  if (error) {
    console.log('[v0] deleteChatLogAction error:', error.message)
  }

  revalidatePath('/admin/rozmowy')
}

/** Usunięcie całej rozmowy (wszystkich wpisów o danym session_id). */
export async function deleteConversationAction(formData: FormData) {
  const sessionId = String(formData.get('sessionId') ?? '').trim()
  if (!sessionId) return

  const { supabase } = await requireStaff()

  const { error } = await supabase.from('chat_logs').delete().eq('session_id', sessionId)
  if (error) {
    console.log('[v0] deleteConversationAction error:', error.message)
  }

  revalidatePath('/admin/rozmowy')
}

/** Wyczyszczenie WSZYSTKICH logów rozmów. */
export async function clearChatLogsAction() {
  const { supabase } = await requireStaff()

  // .delete() wymaga filtra — warunek prawdziwy dla każdego wiersza usuwa całość.
  const { error } = await supabase.from('chat_logs').delete().not('id', 'is', null)
  if (error) {
    console.log('[v0] clearChatLogsAction error:', error.message)
  }

  revalidatePath('/admin/rozmowy')
}

/**
 * Ręczny, STAŁY ban urządzenia po ip_hash. Upsert po ip_hash, więc powtórny ban
 * tego samego urządzenia tylko odświeża wpis. expires_at = null → ban nigdy nie
 * wygasa (zdjąć można wyłącznie przyciskiem „Odbanuj").
 *
 * Zapis wykonujemy klientem service_role (createAdminClient), a NIE klientem
 * zalogowanego redaktora: upsert to „INSERT … ON CONFLICT DO UPDATE", więc wymaga
 * uprawnienia UPDATE, którego polityki RLS chat_bans nie dają rolom authenticated
 * (mają tylko select/insert/delete). Przez to ręczny ban po cichu nie działał.
 * Autoryzację nadal robi requireStaff() — sam zapis omija RLS zgodnie z rolą serwera.
 */
export async function banDeviceAction(formData: FormData) {
  const ipHash = String(formData.get('ipHash') ?? '').trim()
  if (!ipHash) return

  const reasonRaw = String(formData.get('reason') ?? '').trim()
  await requireStaff()
  const admin = createAdminClient()

  const { error } = await admin.from('chat_bans').upsert(
    {
      ip_hash: ipHash,
      reason: reasonRaw || 'Ban ręczny, stały (panel redakcji).',
      is_auto: false,
      expires_at: null,
    },
    { onConflict: 'ip_hash' },
  )
  if (error) {
    console.log('[v0] banDeviceAction error:', error.message)
  }

  revalidatePath('/admin/rozmowy')
}

/** Zdjęcie bana urządzenia (po ip_hash). Zapis klientem service_role dla spójności. */
export async function unbanDeviceAction(formData: FormData) {
  const ipHash = String(formData.get('ipHash') ?? '').trim()
  if (!ipHash) return

  await requireStaff()
  const admin = createAdminClient()

  const { error } = await admin.from('chat_bans').delete().eq('ip_hash', ipHash)
  if (error) {
    console.log('[v0] unbanDeviceAction error:', error.message)
  }

  revalidatePath('/admin/rozmowy')
}
