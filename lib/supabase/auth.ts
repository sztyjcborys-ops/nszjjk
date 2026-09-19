import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Zweryfikowany użytkownik bieżącego żądania.
 *
 * Owinięte w `React.cache`, więc `supabase.auth.getUser()` (sieciowa walidacja
 * tokenu w Supabase Auth) wykonuje się NAJWYŻEJ RAZ na żądanie, nawet jeśli
 * layout i strona pytają o użytkownika niezależnie. Bez tego każda nawigacja
 * po panelu robiła osobny round-trip w layoucie i w podstronach.
 *
 * Bezpieczeństwo bez zmian: to wciąż `getUser()` (serwerowa walidacja JWT),
 * a nie odczyt z niezaufanego ciasteczka.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export type CurrentProfile = {
  userId: string
  email: string
  fullName: string | null
  role: 'resident' | 'editor' | 'admin'
}

/**
 * Profil (rola + dane wyświetlane) zalogowanego użytkownika — również raz na
 * żądanie. Zwraca `null`, gdy nikt nie jest zalogowany.
 */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getSessionUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  const role = (profile?.role as CurrentProfile['role']) ?? 'resident'
  return {
    userId: user.id,
    email: profile?.email || user.email || '',
    fullName: profile?.full_name ?? null,
    role,
  }
})

/** Czy użytkownik należy do redakcji/administracji (odpowiednik SQL `is_staff()`). */
export function isStaffRole(role: string | null | undefined): boolean {
  return role === 'editor' || role === 'admin'
}

/**
 * Bramka dla akcji redakcyjnych (server actions). Weryfikuje NIE TYLKO sesję,
 * ale i rolę po stronie serwera: sam fakt bycia zalogowanym (np. konto
 * „resident”) nie wystarczy — trzeba mieć rolę editor/admin.
 *
 * To druga warstwa obrony niezależna od RLS w bazie. Zwraca ten sam klient z
 * sesją użytkownika, więc dalsze zapisy w akcji przechodzą przez RLS, a nie
 * przez service_role.
 */
export async function requireStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isStaffRole(profile?.role)) {
    redirect('/admin')
  }

  return { supabase, user, role: (profile?.role as CurrentProfile['role']) ?? 'resident' }
}
