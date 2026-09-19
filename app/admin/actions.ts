'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/supabase/auth'
import { normalizeGallery } from '@/lib/articles'
import type { NewsCategory } from '@/lib/data'

const CATEGORIES: NewsCategory[] = ['Inwestycje', 'Sport', 'Komunikaty', 'Kultura', 'Alert', 'Rozrywka']

export type AuthState = { error?: string }
export type EditorState = { error?: string; fieldErrors?: Record<string, string> }

/** Turn a Polish title into a URL-safe slug. */
function slugify(input: string) {
  const map: Record<string, string> = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
  }
  return input
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Podaj adres e-mail i hasło.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Nieprawidłowy e-mail lub hasło.' }
  }

  revalidatePath('/', 'layout')
  redirect('/admin')
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/admin/login')
}

export async function saveArticleAction(_prev: EditorState, formData: FormData): Promise<EditorState> {
  const { supabase, user } = await requireStaff()

  const id = String(formData.get('id') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const excerpt = String(formData.get('excerpt') ?? '').trim()
  const categoryRaw = String(formData.get('category') ?? '').trim()
  const cover = String(formData.get('cover_image') ?? '').trim()
  const content = String(formData.get('content') ?? '').trim()
  const published = formData.get('published') === 'on'
  const pinned = formData.get('pinned') === 'on'
  const author = String(formData.get('author') ?? '').trim()

  // Ręcznie ustawiona data/godzina publikacji ("YYYY-MM-DDTHH:mm", czas lokalny).
  const publishedAtRaw = String(formData.get('published_at') ?? '').trim()
  const publishedAtDate = publishedAtRaw ? new Date(publishedAtRaw) : null
  const publishedAtIso =
    publishedAtDate && !Number.isNaN(publishedAtDate.getTime())
      ? publishedAtDate.toISOString()
      : null

  // Galeria zdjęć przychodzi jako JSON z formularza (URL-e już wgranych plików).
  let gallery: { src: string; alt?: string }[] = []
  try {
    gallery = normalizeGallery(JSON.parse(String(formData.get('gallery') ?? '[]')))
  } catch {
    gallery = []
  }

  const fieldErrors: Record<string, string> = {}
  if (!title) fieldErrors.title = 'Tytuł jest wymagany.'
  if (!excerpt) fieldErrors.excerpt = 'Krótki opis jest wymagany.'
  if (!CATEGORIES.includes(categoryRaw as NewsCategory)) fieldErrors.category = 'Wybierz kategorię.'
  if (!content || content === '<p></p>') fieldErrors.content = 'Treść artykułu jest wymagana.'
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  const category = categoryRaw as NewsCategory
  const payload = {
    title,
    excerpt,
    category,
    cover_image: cover || null,
    content,
    gallery,
    published,
    pinned,
    author: author || null,
    updated_at: new Date().toISOString(),
    // Ręcznie ustawiona data publikacji nadpisuje created_at (jeśli podano).
    ...(publishedAtIso ? { created_at: publishedAtIso } : {}),
  }

  if (id) {
    const { error } = await supabase.from('articles').update(payload).eq('id', id)
    if (error) {
      return { error: 'Nie udało się zapisać zmian: ' + error.message }
    }
  } else {
    // Ensure a unique slug on create.
    const base = slugify(title) || 'artykul'
    const slug = `${base}-${Date.now().toString(36).slice(-4)}`
    const { error } = await supabase.from('articles').insert({
      ...payload,
      slug,
      author_id: user.id,
    })
    if (error) {
      return { error: 'Nie udało się utworzyć artykułu: ' + error.message }
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/artykuly')
  revalidatePath('/aktualnosci')
  revalidatePath('/')
  redirect('/admin/artykuly')
}

export async function deleteArticleAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  if (!id) return

  const { supabase } = await requireStaff()

  await supabase.from('articles').delete().eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/admin/artykuly')
  revalidatePath('/aktualnosci')
  revalidatePath('/')
}

export async function togglePinAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  const next = formData.get('next') === 'true'
  if (!id) return

  const { supabase } = await requireStaff()

  const { error } = await supabase
    .from('articles')
    .update({ pinned: next, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.log('[v0] togglePinAction error:', error.message)
    return
  }

  revalidatePath('/admin')
  revalidatePath('/admin/artykuly')
  revalidatePath('/aktualnosci')
  revalidatePath('/')
}

export async function togglePublishAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim()
  const next = formData.get('next') === 'true'
  if (!id) return

  const { supabase } = await requireStaff()

  await supabase
    .from('articles')
    .update({ published: next, updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/admin')
  revalidatePath('/aktualnosci')
  revalidatePath('/')
}
