import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(url, service, { auth: { persistSession: false } })

const { data, error } = await admin.from('profiles').select('*').limit(3)
console.log('[v0] profiles sample error:', error?.message ?? 'none')
console.log('[v0] profiles sample rows:', JSON.stringify(data, null, 2))

const { data: users, error: uErr } = await admin.auth.admin.listUsers()
console.log('[v0] listUsers error:', uErr?.message ?? 'none')
console.log(
  '[v0] existing users:',
  JSON.stringify(
    (users?.users ?? []).map((u) => ({ id: u.id, email: u.email })),
    null,
    2,
  ),
)
