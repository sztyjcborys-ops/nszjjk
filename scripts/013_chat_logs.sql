-- =============================================================================
-- 013 — CHAT_LOGS (lekkie logi rozmów z asystentem AI)
-- =============================================================================
-- Tymczasowe, lekkie zapisywanie rozmów mieszkańców z chatbotem AI, żeby
-- redakcja/admin mogła zobaczyć, o co pytają mieszkańcy i co odpowiada AI —
-- oraz usuwać te wpisy wprost z panelu.
--
-- „Lekkie" = zapisujemy tylko parę pytanie → odpowiedź (bez pełnego kontekstu,
-- źródeł, danych serwisu). Wiersze jednej rozmowy łączy `session_id`.
--
-- Migracja jest IDEMPOTENTNA i NIENISZCZĄCA (CREATE ... IF NOT EXISTS,
-- CREATE OR REPLACE, DROP POLICY IF EXISTS). Uruchom w Supabase → SQL Editor.
-- =============================================================================

create table if not exists public.chat_logs (
  id         uuid        primary key default gen_random_uuid(),
  -- Grupuje wiadomości w jedną rozmowę (generowane po stronie przeglądarki).
  -- Może być NULL, gdy klient nie przekazał identyfikatora sesji.
  session_id uuid,
  question   text        not null,
  answer     text        not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_logs_created_at_idx
  on public.chat_logs (created_at desc);
create index if not exists chat_logs_session_created_idx
  on public.chat_logs (session_id, created_at);

alter table public.chat_logs enable row level security;

-- Wpisy tworzy WYŁĄCZNIE serwer (route /api/chat) klientem service_role, który
-- omija RLS — dlatego NIE dodajemy polityki INSERT dla anon/authenticated.
-- Dzięki temu przeglądarka nie może samodzielnie dopisywać ani czytać logów.

-- Odczyt i usuwanie — tylko redakcja/admin (funkcja is_staff() z migracji 001).
drop policy if exists "chat_logs_staff_read" on public.chat_logs;
create policy "chat_logs_staff_read"
  on public.chat_logs for select
  to authenticated
  using (public.is_staff());

drop policy if exists "chat_logs_staff_delete" on public.chat_logs;
create policy "chat_logs_staff_delete"
  on public.chat_logs for delete
  to authenticated
  using (public.is_staff());

grant select, delete on public.chat_logs to authenticated;

-- Serwer (route /api/chat) zapisuje logi klientem service_role. Rola ta omija
-- RLS, ale nadal potrzebuje GRANT-ów na tabeli — bez tego INSERT kończy się
-- błędem „permission denied for table chat_logs" (kod 42501).
grant select, insert, delete on public.chat_logs to service_role;
