-- =============================================================================
-- Jejkowice — publiczny widok zgłoszeń mieszkańców
-- =============================================================================
-- Zgłoszenia (public.reports) są prywatne: RLS pozwala je czytać wyłącznie
-- redakcji/adminowi (patrz 001_init_schema.sql). Aby pokazać mieszkańcom listę
-- "Ostatnie zgłoszenia" oraz publiczny widok na stronie /zgloszenia, tworzymy
-- BEZPIECZNY widok agregujący, który:
--   * NIE ujawnia danych kontaktowych (contact_email),
--   * NIE ujawnia ścieżek do prywatnych zdjęć (image_paths),
--   * udostępnia tylko: kategorię, lokalizację, status i datę zgłoszenia.
--
-- Widok działa z uprawnieniami właściciela (security_invoker = off), więc
-- pomija RLS na tabeli reports — dokładnie tak samo jak istniejący widok
-- public.poll_results. Migracja jest idempotentna i nieniszcząca.
-- Uruchom w Supabase → SQL Editor po akceptacji.
-- =============================================================================

create or replace view public.public_reports
with (security_invoker = off) as
select
  r.id,
  r.category,
  r.location,
  r.status,
  r.created_at
from public.reports r
order by r.created_at desc;

grant select on public.public_reports to anon, authenticated;
