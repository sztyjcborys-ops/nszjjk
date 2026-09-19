-- =============================================================================
-- Jejkowice — przypinanie artykułów ("wyróżnione" na górze strony głównej)
-- =============================================================================
-- Migracja IDEMPOTENTNA i NIENISZCZĄCA:
--   * dodaje kolumnę public.articles.pinned (bool, domyślnie false),
--   * dodaje indeks przyspieszający sortowanie "przypięte najpierw".
-- Uruchom w Supabase → SQL Editor.
-- =============================================================================

-- 1. Flaga przypięcia artykułu. Przypięte artykuły trafiają na początek listy
--    aktualności oraz jako pierwsze na stronie głównej.
alter table public.articles
  add column if not exists pinned boolean not null default false;

-- 2. Indeks pod sortowanie: najpierw przypięte, potem najnowsze.
create index if not exists articles_pinned_created_at_idx
  on public.articles (pinned desc, created_at desc);
