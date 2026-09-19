-- =============================================================================
-- MIGRACJA 016 — GRANTY DLA service_role (naprawa "permission denied for table")
-- =============================================================================
-- Objaw: publiczne nadsyłanie zdjęć do galerii kończyło się błędem, a obrazy z
-- Cloudflare R2 nie ładowały się przez proxy. Przyczyna: server action i proxy
-- korzystają z klucza sekretnego Supabase (rola `service_role`), a wcześniejsze
-- migracje nadały granty tabelowe tylko rolom `anon` i `authenticated`
-- (patrz 002_gallery.sql). `service_role` omija RLS, ale nadal wymaga grantów
-- tabelowych na poziomie Postgresa — bez nich każde zapytanie zwraca
-- "permission denied for table ...".
--
-- Ta migracja przywraca standardowy dla Supabase stan: service_role ma pełny
-- dostęp do obiektów w schemacie `public` (RLS i tak pozostaje egzekwowane dla
-- ról anon/authenticated). Bezpieczne do wielokrotnego uruchomienia.
--
-- Uruchom w Supabase → SQL Editor.
-- =============================================================================

grant usage on schema public to service_role;

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Aby przyszłe tabele/sekwencje również były dostępne dla service_role bez
-- kolejnej migracji.
alter default privileges in schema public
  grant all privileges on tables    to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
alter default privileges in schema public
  grant all privileges on functions to service_role;
