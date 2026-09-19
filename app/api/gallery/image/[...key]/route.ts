import type { NextRequest } from 'next/server'
import { getR2Object } from '@/lib/r2'
import { createAdminClient } from '@/lib/supabase/admin'

// aws-sdk/client-s3 wymaga środowiska Node (nie Edge).
export const runtime = 'nodejs'

/**
 * Serwuje prywatne obiekty z R2 bez publicznego bucketu.
 *
 * Odsłaniamy tylko klucze faktycznie zarejestrowane w tabeli gallery jako
 * storage_provider = 'r2' — to zamyka możliwość zgadywania/enumeracji zawartości
 * bucketu. Same klucze to losowe UUID-y, więc URL działa jak nieodgadywalny
 * capability link (również dla oczekujących zdjęć widocznych tylko w panelu).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: parts } = await params
  const key = parts.map((p) => decodeURIComponent(p)).join('/')

  const admin = createAdminClient()
  const { data } = await admin
    .from('gallery')
    .select('id')
    .eq('storage_path', key)
    .eq('storage_provider', 'r2')
    .maybeSingle()

  if (!data) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const obj = await getR2Object(key)
    if (!obj.Body) {
      return new Response('Not found', { status: 404 })
    }
    const bytes = await obj.Body.transformToByteArray()
    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': obj.ContentType ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[v0] R2 proxy error:', error)
    return new Response('Not found', { status: 404 })
  }
}
