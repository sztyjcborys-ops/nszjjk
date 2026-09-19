import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Uruchamiaj middleware (odświeżanie sesji Supabase + ochrona panelu)
     * WYŁĄCZNIE tam, gdzie potrzebna jest sesja użytkownika:
     * - /admin  — ochrona panelu i przekierowania logowania
     * - /auth   — callback logowania / obsługa sesji
     *
     * Publiczne trasy (strona główna, aktualności, wydarzenia, ankiety,
     * galeria, zgłoszenia) NIE wywołują już zapytania auth.getUser() przy
     * każdej nawigacji, dzięki czemu mogą być cache'owane i prefetchowane.
     */
    '/admin/:path*',
    '/auth/:path*',
  ],
}
