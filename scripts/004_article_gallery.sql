-- =============================================================================
-- MIGRACJA 004 — GALERIA ZDJĘĆ W ARTYKUŁACH
-- =============================================================================
-- Dodaje kolumnę `gallery` (JSONB) do tabeli artykułów. Przechowuje listę
-- zdjęć galerii w formacie: [{ "src": "https://…", "alt": "opis" }, …].
--
-- Zdjęcie główne (cover_image) oraz zdjęcia galerii trafiają do istniejącego
-- publicznego bucketa `article-images` (utworzonego w 001_init_schema.sql),
-- więc NIE trzeba tworzyć nowego bucketa ani polityk Storage.
--
-- Migracja jest IDEMPOTENTNA i NIENISZCZĄCA.
-- Uruchom w Supabase → SQL Editor PO 001_init_schema.sql.
-- =============================================================================

alter table public.articles
  add column if not exists gallery jsonb not null default '[]'::jsonb;
