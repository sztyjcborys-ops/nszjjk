'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type Role = 'resident' | 'editor' | 'admin'
const ROLES: Role[] = ['resident', 'editor', 'admin']

export type CreateUserState = {
  error?: string
  success?: string
  fieldErrors?: Record<string, string>
}

export type UpdateUserState = {
  error?: string
  success?: string
  fieldErrors?: Record<string, string>
}

export type UserRow = {
  id: string
  email: string | null
  full_name: string | null
  role: Role
  created_at: string
}

/**
 * Zwraca uwierzytelnionego klienta oraz bieżącego użytkownika, ale tylko gdy ma
 * on rolę `admin`. W przeciwnym razie przekierowuje — to jedyna bramka dla
 * operacji zarządzania kontami.
 */
async function requireAdmin() {
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

  if (profile?.role !== 'admin') {
    redirect('/admin')
  }

  return { supabase, user }
}

/** Lista wszystkich profili (widoczna dla admina dzięki RLS). */
export async function listUsers(): Promise<UserRow[]> {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: true })

  if (error) return []
  return (data ?? []) as UserRow[]
}

/** Zmiana roli istniejącego użytkownika. RLS (`profiles_admin_all`) pilnuje uprawnień. */
export async function changeRoleAction(formData: FormData) {
  const { supabase, user } = await requireAdmin()

  const id = String(formData.get('id') ?? '').trim()
  const role = String(formData.get('role') ?? '').trim() as Role

  if (!id || !ROLES.includes(role)) return

  // Zabezpieczenie: admin nie może odebrać roli samemu sobie (uniknięcie samoblokady).
  if (id === user.id && role !== 'admin') return

  await supabase.from('profiles').update({ role }).eq('id', id)
  revalidatePath('/admin/uzytkownicy')
}

/** Utworzenie nowego konta (redaktor/administrator/mieszkaniec). */
export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const { supabase } = await requireAdmin()

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  const fullName = String(formData.get('full_name') ?? '').trim()
  const role = String(formData.get('role') ?? 'editor').trim() as Role

  const fieldErrors: Record<string, string> = {}
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fieldErrors.email = 'Podaj poprawny adres e-mail.'
  }
  if (password.length < 8) {
    fieldErrors.password = 'Hasło musi mieć co najmniej 8 znaków.'
  }
  if (!ROLES.includes(role)) {
    fieldErrors.role = 'Wybierz poprawną rolę.'
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  // Utworzenie konta w Supabase Auth wymaga uprawnień service_role.
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  })

  if (error || !data.user) {
    const msg = error?.message ?? ''
    if (/already|registered|exists/i.test(msg)) {
      return { fieldErrors: { email: 'Użytkownik z tym adresem już istnieje.' } }
    }
    return { error: 'Nie udało się utworzyć konta: ' + (msg || 'nieznany błąd') }
  }

  // Profil tworzy trigger `handle_new_user`. Ustawiamy rolę i imię przez
  // uwierzytelnionego klienta admina (RLS `profiles_admin_all`).
  await supabase
    .from('profiles')
    .update({ role, full_name: fullName || null })
    .eq('id', data.user.id)

  revalidatePath('/admin/uzytkownicy')
  return { success: `Utworzono konto ${email}.` }
}

/**
 * Aktualizacja danych konta przez administratora: imię i nazwisko oraz
 * (opcjonalnie) nowe hasło. Zmiana hasła i metadanych wymaga service_role.
 */
export async function updateUserAction(
  _prev: UpdateUserState,
  formData: FormData,
): Promise<UpdateUserState> {
  const { supabase } = await requireAdmin()

  const id = String(formData.get('id') ?? '').trim()
  const fullName = String(formData.get('full_name') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!id) return { error: 'Brak identyfikatora użytkownika.' }

  const fieldErrors: Record<string, string> = {}
  if (password && password.length < 8) {
    fieldErrors.password = 'Hasło musi mieć co najmniej 8 znaków.'
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  const admin = createAdminClient()

  // Zmiana hasła (jeśli podano) oraz synchronizacja imienia w metadanych Auth.
  const { error: authError } = await admin.auth.admin.updateUserById(id, {
    ...(password ? { password } : {}),
    user_metadata: { full_name: fullName || null },
  })
  if (authError) {
    return { error: 'Nie udało się zapisać zmian: ' + authError.message }
  }

  // Imię trzymamy też w profilu (używanym w całym panelu).
  await supabase.from('profiles').update({ full_name: fullName || null }).eq('id', id)

  revalidatePath('/admin/uzytkownicy')
  return {
    success: password ? 'Zapisano dane i zmieniono hasło.' : 'Zapisano zmiany.',
  }
}

/** Usunięcie konta użytkownika (kaskadowo usuwa profil). */
export async function deleteUserAction(formData: FormData) {
  const { user } = await requireAdmin()

  const id = String(formData.get('id') ?? '').trim()
  if (!id || id === user.id) return // nie można usunąć własnego konta

  const admin = createAdminClient()
  await admin.auth.admin.deleteUser(id)

  revalidatePath('/admin/uzytkownicy')
}
