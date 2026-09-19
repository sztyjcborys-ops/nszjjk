import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Klient tylko do odczytu PUBLICZNYCH danych (anon key, bez cookies).
 *
 * Celowo NIE używa cookies() ani nagłówków żądania — dzięki temu strony, które
 * pobierają wyłącznie publiczne treści (aktualności, wydarzenia, ankiety,
 * galeria, publiczne zgłoszenia), mogą być cache'owane przez Next.js
 * (Full Route Cache + `revalidate`) i prefetchowane, zamiast renderować się
 * dynamicznie przy każdym wejściu.
 *
 * Uwaga: nie ma tu sesji użytkownika, więc RLS traktuje te zapytania jak
 * anonimowe — używaj go WYŁĄCZNIE do danych, które i tak są publiczne.
 * Do panelu, danych prywatnych i wszystkiego, co zależy od zalogowanego
 * użytkownika, nadal używamy klienta z cookies z `lib/supabase/server.ts`.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}
