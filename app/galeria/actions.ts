'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToR2, deleteFromR2, r2KeyToPublicPath } from '@/lib/r2'

const ACCEPTED_TYPES = ['image/webp', 'image/jpeg', 'image/png']
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB — twardy limit również po stronie serwera

export type SubmitState = { ok?: true; error?: string }

/**
 * Publiczne zgłoszenie zdjęcia do galerii przez mieszkańca.
 *
 * Plik trafia do prywatnego bucketu R2, a rekord zapisujemy klientem
 * service_role z WYMUSZONYM statusem 'pending' i published = false. Użytkownik
 * nie przekazuje statusu — nie ma więc możliwości samodzielnego ustawienia
 * 'approved'. Zdjęcie pojawi się w galerii dopiero po akceptacji w panelu.
 */
export async function submitGalleryPhotoAction(formData: FormData): Promise<SubmitState> {
  const file = formData.get('image_file')
  const alt = String(formData.get('alt') ?? '').trim()

  // --- Walidacja pliku (niezależna od klienta) ---
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Wybierz zdjęcie do przesłania.' }
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { error: 'Dozwolone są zdjęcia JPEG, PNG lub WebP.' }
  }
  if (file.size > MAX_BYTES) {
    return { error: 'Zdjęcie może mieć maksymalnie 8 MB.' }
  }

  // Ścieżkę/nazwę generuje serwer — losowy UUID gwarantuje unikalność i to, że
  // użytkownik nie nadpisze cudzego pliku ani nie wskaże własnej ścieżki.
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'webp'
  const key = `gallery/${crypto.randomUUID()}.${ext}`

  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    await uploadToR2(key, bytes, file.type)
  } catch (error) {
    console.error('[v0] R2 upload error:', error)
    return { error: 'Nie udało się przesłać zdjęcia. Spróbuj ponownie.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('gallery').insert({
    src: r2KeyToPublicPath(key),
    alt: alt || 'Zdjęcie nadesłane przez mieszkańca',
    storage_path: key,
    storage_provider: 'r2',
    status: 'pending',
    published: false,
    sort_order: 0,
    author_id: null,
  })

  if (error) {
    // Zapis do bazy się nie powiódł — kasujemy wgrany plik, aby nie zostawić
    // osieroconego obiektu w R2.
    try {
      await deleteFromR2(key)
    } catch (cleanupError) {
      console.error('[v0] R2 cleanup po nieudanym insercie:', cleanupError)
    }
    console.error('[v0] gallery insert error:', error.message)
    return { error: 'Nie udało się zapisać zdjęcia. Spróbuj ponownie.' }
  }

  // Odśwież panel — nowe zgłoszenie ma się pojawić w sekcji oczekujących.
  revalidatePath('/admin/galeria')
  revalidatePath('/admin')
  return { ok: true }
}
