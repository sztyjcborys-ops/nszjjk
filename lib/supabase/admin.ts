import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Klient z uprawnieniami service_role — OMIJA RLS.
 *
 * UWAGA: przeznaczony wyłącznie do wąskich operacji serwerowych, których nie
 * może wykonać klient anonimowy. W tym projekcie używany TYLKO do sprzątania
 * osieroconych plików w Storage po nieudanym zgłoszeniu.
 *
 * - `import 'server-only'` gwarantuje, że plik nigdy nie trafi do bundla klienta.
 * - Nie przechowuje sesji ani nie odświeża tokenów (brak kontekstu użytkownika).
 * - SUPABASE_SERVICE_ROLE_KEY nie ma prefiksu NEXT_PUBLIC_, więc nie wycieka do przeglądarki.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Brak konfiguracji service_role: ustaw NEXT_PUBLIC_SUPABASE_URL oraz SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
