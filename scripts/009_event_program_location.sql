-- =============================================================================
-- Jejkowice — program wydarzenia + lokalizacja na mapie (pinezka)
-- =============================================================================
-- Migracja jest IDEMPOTENTNA i NIENISZCZĄCA (add column if not exists).
-- Uruchom w Supabase → SQL Editor.
-- =============================================================================

-- Program wydarzenia: lista pozycji w formacie 'HH:MM|Opis' (jedna na element).
alter table public.events
  add column if not exists program text[] not null default '{}';

-- Współrzędne pinezki z panelu admina (opcjonalne).
alter table public.events
  add column if not exists latitude  double precision;
alter table public.events
  add column if not exists longitude double precision;

-- Odświeżenie schema cache PostgREST — bez tego API zwraca błąd
-- „Could not find the 'latitude' column of 'events' in the schema cache”.
notify pgrst, 'reload schema';
