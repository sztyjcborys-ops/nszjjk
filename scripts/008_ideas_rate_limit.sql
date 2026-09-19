-- =============================================================================
-- Jejkowice — limit zgłaszania pomysłów (anty-spam)
-- =============================================================================
-- Lekki dziennik zgłoszeń pomysłów służący do ograniczania tempa (rate limit)
-- na adres IP. Zapisujemy WYŁĄCZNIE zahashowany (SHA-256) adres IP i czas — nie
-- przechowujemy surowego IP ani żadnych innych danych osobowych.
--
-- Dostęp: tabela ma włączony RLS i NIE ma żadnych polityk, więc anon oraz
-- zwykli zalogowani użytkownicy nie mają do niej dostępu. Pisze i czyta ją
-- tylko server action kluczem service_role (który omija RLS).
--
-- Migracja jest IDEMPOTENTNA i NIENISZCZĄCA. Uruchom w Supabase → SQL Editor
-- PO migracji 007_ideas.sql.
-- =============================================================================

create table if not exists public.idea_rate_limit (
  id         bigint generated always as identity primary key,
  ip_hash    text        not null,
  created_at timestamptz not null default now()
);

-- Szybkie zliczanie ostatnich zgłoszeń z danego IP w oknie czasowym.
create index if not exists idea_rate_limit_ip_time_idx
  on public.idea_rate_limit (ip_hash, created_at desc);

-- Sam czas — do okresowego sprzątania starych wpisów.
create index if not exists idea_rate_limit_time_idx
  on public.idea_rate_limit (created_at);

alter table public.idea_rate_limit enable row level security;

-- Brak polityk = brak dostępu dla anon/authenticated. Dostęp ma tylko
-- service_role (omija RLS). Dla pewności cofamy ewentualne granty.
revoke all on public.idea_rate_limit from anon;
revoke all on public.idea_rate_limit from authenticated;

-- WAŻNE: rola service_role musi mieć jawne uprawnienia do tej tabeli, bo
-- domyślne uprawnienia nie objęły nowych tabel. Bez tego liczenie limitu
-- kończy się błędem "permission denied for table idea_rate_limit" (42501).
grant all on public.idea_rate_limit to service_role;
