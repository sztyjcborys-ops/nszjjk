import { getCurrentProfile } from '@/lib/supabase/auth'
import { getNavCounts } from '@/lib/admin-dashboard'
import { DashboardShell, type ShellUser } from '@/components/admin/dashboard-shell'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Jedno, współdzielone (React.cache) pobranie użytkownika + profilu na żądanie.
  // Podstrony, które również potrzebują sesji, korzystają z tego samego wyniku
  // zamiast robić własny round-trip do Supabase Auth.
  const profile = await getCurrentProfile()

  // Brak zalogowanego użytkownika = strona logowania. Renderujemy ją bez powłoki
  // dashboardu (uniknięcie pętli przekierowań i pusty, czysty ekran logowania).
  if (!profile) {
    return <div className="min-h-svh bg-muted/30">{children}</div>
  }

  const shellUser: ShellUser = {
    name: profile.fullName || profile.email || 'Konto',
    email: profile.email,
    role: profile.role,
  }

  const badges = await getNavCounts()

  return (
    <DashboardShell user={shellUser} isAdmin={profile.role === 'admin'} badges={badges}>
      {children}
    </DashboardShell>
  )
}
