'use client'

import { createClient } from '@/lib/supabase/client'
import { compressReportImage } from '@/lib/image-compression'

/**
 * Kompresuje zdjęcie do WebP w przeglądarce i wgrywa je do publicznego bucketa
 * `article-images` (zapis dozwolony tylko dla zalogowanej redakcji — RLS).
 * Zwraca publiczny adres URL oraz ścieżkę w Storage (do ewentualnego sprzątania).
 */
export async function uploadArticleImage(raw: File): Promise<{ src: string; path: string }> {
  const { blob, fileName } = await compressReportImage(raw)
  const file = new File([blob], fileName, { type: 'image/webp' })

  const supabase = createClient()
  const path = `articles/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage
    .from('article-images')
    .upload(path, file, { contentType: 'image/webp', upsert: false })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('article-images').getPublicUrl(path)
  return { src: data.publicUrl, path }
}
