-- =============================================================================
-- MIGRACJA 002 — GALERIA
-- =============================================================================
-- Tabela zdjęć galerii + publiczny bucket na pliki. Wzorowane na sekcjach
-- artykułów/wydarzeń z 001_init_schema.sql (RLS + is_staff()).
--
-- Uruchom w Supabase → SQL Editor PO 001_init_schema.sql.
-- =============================================================================

create table if not exists public.gallery (
  id          uuid primary key default gen_random_uuid(),
  src         text        not null,           -- adres URL zdjęcia (bucket lub zewnętrzny)
  alt         text        not null default '',-- opis alternatywny (dostępność)
  storage_path text,                          -- ścieżka w buckecie (jeśli plik wgrany)
  sort_order  int         not null default 0, -- kolejność wyświetlania
  published   boolean     not null default true,
  author_id   uuid        references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists gallery_sort_order_idx on public.gallery (sort_order);

drop trigger if exists gallery_set_updated_at on public.gallery;
create trigger gallery_set_updated_at
  before update on public.gallery
  for each row execute function public.set_updated_at();

alter table public.gallery enable row level security;

-- Opublikowane zdjęcia są publicznie czytelne; redakcja/admin widzi wszystkie.
drop policy if exists "gallery_public_read" on public.gallery;
create policy "gallery_public_read"
  on public.gallery for select
  to anon, authenticated
  using (published or public.is_staff());

-- Zarządzanie galerią — tylko redakcja/admin.
drop policy if exists "gallery_staff_write" on public.gallery;
create policy "gallery_staff_write"
  on public.gallery for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select                 on public.gallery to anon, authenticated;
grant insert, update, delete on public.gallery to authenticated;

-- Publiczny bucket na zdjęcia galerii.
insert into storage.buckets (id, name, public)
values ('gallery-images', 'gallery-images', true)
on conflict (id) do nothing;

-- Publiczny odczyt zdjęć galerii.
drop policy if exists "storage_public_read_gallery" on storage.objects;
create policy "storage_public_read_gallery"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gallery-images');

-- Wgrywanie/edycja/usuwanie zdjęć galerii — tylko redakcja/admin.
drop policy if exists "storage_staff_write_gallery" on storage.objects;
create policy "storage_staff_write_gallery"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'gallery-images' and public.is_staff())
  with check (bucket_id = 'gallery-images' and public.is_staff());
