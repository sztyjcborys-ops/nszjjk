import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

const EMAIL = 'test@test.pl'
const PASSWORD = 'test1234'

const admin = createClient(url, service, { auth: { persistSession: false } })

// Znajdź istniejącego użytkownika auth.
const { data: list } = await admin.auth.admin.listUsers()
const existing = (list?.users ?? []).find((u) => u.email === EMAIL)

let userId = existing?.id
if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password: PASSWORD,
    email_confirm: true,
  })
  console.log('[v0] update user error:', error?.message ?? 'none')
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })
  userId = data?.user?.id
  console.log('[v0] create user error:', error?.message ?? 'none')
}

// Upewnij się, że profil ma rolę admin (wymagane przez requireStaff).
const { error: profileErr } = await admin.from('profiles').upsert(
  {
    id: userId,
    email: EMAIL,
    full_name: 'Konto testowe',
    role: 'admin',
    updated_at: new Date().toISOString(),
  },
  { onConflict: 'id' },
)
console.log('[v0] upsert profile error:', profileErr?.message ?? 'none')
console.log('[v0] done. userId:', userId)
