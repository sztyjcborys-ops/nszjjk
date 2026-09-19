-- =============================================================================
-- Jejkowice — autor artykułu + nowe kategorie "Alert" i "Rozrywka"
-- =============================================================================
-- Migracja IDEMPOTENTNA i NIENISZCZĄCA:
--   * dodaje kolumnę public.articles.author (nazwa autora do wyświetlenia),
--   * rozszerza dopuszczalne kategorie o 'Alert' oraz 'Rozrywka'.
-- Uruchom w Supabase → SQL Editor.
-- =============================================================================

-- 1. Kolumna z nazwą autora (opcjonalna; puste = "UG Jejkowice" po stronie UI).
alter table public.articles
  add column if not exists author text;

-- 2. Rozszerzenie listy dozwolonych kategorii.
--    Zdejmujemy stare ograniczenie CHECK i dodajemy nowe z dwiema kategoriami.
alter table public.articles
  drop constraint if exists articles_category_check;

alter table public.articles
  add constraint articles_category_check
  check (category in ('Inwestycje', 'Sport', 'Komunikaty', 'Kultura', 'Alert', 'Rozrywka'));
