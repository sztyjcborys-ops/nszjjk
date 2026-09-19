-- =============================================================================
-- MIGRACJA 015 — MODERACJA GALERII + CLOUDFLARE R2
-- =============================================================================
-- Rozszerza istniejącą tabelę public.gallery (patrz 002_gallery.sql) o:
--   * status moderacji: 'pending' | 'approved'
--   * dostawcę pliku: 'supabase' | 'r2'
--
-- Model działania:
--   - Zdjęcia dodawane przez redakcję w panelu -> status 'approved' (domyślnie),
--     przechowywane jak dotąd w Supabase Storage (storage_provider = 'supabase').
--   - Zdjęcia nadesłane przez mieszkańców -> plik trafia do Cloudflare R2
--     (storage_provider = 'r2'), rekord ma status 'pending' i published = false,
--     więc NIE jest widoczny w publicznej galerii.
--   - Akceptacja (tylko panel/redakcja): status -> 'approved', published -> true.
--   - Odrzucenie: plik kasowany fizycznie z R2, a rekord z bazy (w tej kolejności).
--
-- Wgrywanie i moderacja rekordów 'pending' odbywa się WYŁĄCZNIE przez serwer
-- (klient service_role / server actions z requireStaff). Anonim nie ma prawa
-- INSERT ani UPDATE na tej tabeli, więc użytkownik nie może samodzielnie ustawić
-- 'approved'. RLS z 002_gallery.sql pozostaje bez zmian.
--
-- Uruchom w Supabase -> SQL Editor PO 002_gallery.sql.
-- =============================================================================

alter table public.gallery
  add column if not exists status text not null default 'approved',
  add column if not exists storage_provider text not null default 'supabase';

-- Domyślne 'approved' sprawia, że istniejące zdjęcia pozostają widoczne.
alter table public.gallery
  drop constraint if exists gallery_status_check;
alter table public.gallery
  add constraint gallery_status_check check (status in ('pending', 'approved'));

alter table public.gallery
  drop constraint if exists gallery_storage_provider_check;
alter table public.gallery
  add constraint gallery_storage_provider_check check (storage_provider in ('supabase', 'r2'));

create index if not exists gallery_status_idx on public.gallery (status);

-- Bezpiecznik na poziomie bazy: rekord 'pending' nigdy nie może być publiczny.
-- (Publikacja następuje dopiero przy akceptacji, która ustawia oba pola razem.)
update public.gallery set published = false where status = 'pending' and published = true;
