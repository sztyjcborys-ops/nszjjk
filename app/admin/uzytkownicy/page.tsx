import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentProfile } from '@/lib/supabase/auth'
import { listUsers } from './actions'
import { UserManagement } from './user-management'

export const metadata: Metadata = {
  title: 'Użytkownicy — panel | Jejkowice',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  // Współdzielone z layoutem (React.cache) — brak dodatkowego round-tripu do Auth.
  const profile = await getCurrentProfile()
  if (!profile) redirect('/admin/login')

  // Tylko administrator zarządza kontami.
  if (profile.role !== 'admin') redirect('/admin')

  const users = await listUsers()

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Wróć do aktualności
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Użytkownicy</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Dodawaj konta redaktorów i administratorów oraz zarządzaj ich rolami.
        </p>
      </div>

      <UserManagement users={users} currentUserId={profile.userId} />
    </div>
  )
}
