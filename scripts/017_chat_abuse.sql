-- =============================================================================
-- 017 — OCHRONA CZATU AI: wykrywanie nadużyć + bany (anty-spam / anty-injection)
-- =============================================================================
-- Dodaje warstwę obrony asystenta AI PRZY SAMYM WEJŚCIU (route /api/chat):
--
--  1) chat_logs.ip_hash   — ZAHASHOWANY (SHA-256, tajna sól) adres IP autora
--                           rozmowy. NIE trzymamy surowego IP. Pozwala:
--                             • grupować limit tempa i „strzały" po urządzeniu,
--                             • zbanować konkretne urządzenie z panelu admina.
--  2) chat_logs.flagged   — czy wiadomość została wykryta jako próba nadużycia
--                           (prompt injection / wyciąganie promptu / spam).
--  3) chat_logs.flag_reason — skrót dopasowanych reguł (do wglądu w panelu).
--  4) public.chat_bans    — lista zbanowanych urządzeń (po ip_hash). Ban może
--                           być czasowy (expires_at) lub stały (expires_at NULL),
--                           założony automatycznie (is_auto = true, po serii
--                           wykrytych ataków) albo ręcznie przez redakcję.
--
-- Dostęp: obie rzeczy pisze WYŁĄCZNIE serwer kluczem service_role (omija RLS).
-- Przeglądarka nie może czytać ani pisać tych danych. Redakcja/admin czyta i
-- zarządza banami przez RLS (is_staff()).
--
-- Migracja jest IDEMPOTENTNA i NIENISZCZĄCA. Uruchom w Supabase → SQL Editor
-- PO migracji 013_chat_logs.sql.
-- =============================================================================

-- --- 1) Kolumny na chat_logs -------------------------------------------------
alter table public.chat_logs
  add column if not exists ip_hash     text,
  add column if not exists flagged     boolean not null default false,
  add column if not exists flag_reason text;

-- Szybkie liczenie ostatnich wiadomości / „strzałów" z danego urządzenia.
create index if not exists chat_logs_ip_time_idx
  on public.chat_logs (ip_hash, created_at desc);

-- Szybkie wyszukanie wykrytych nadużyć w panelu.
create index if not exists chat_logs_flagged_idx
  on public.chat_logs (flagged, created_at desc)
  where flagged;

-- --- 2) Tabela banów ---------------------------------------------------------
create table if not exists public.chat_bans (
  id         uuid        primary key default gen_random_uuid(),
  -- Zahashowany (SHA-256 z tajną solą) adres IP urządzenia. Jedno urządzenie
  -- = jeden wpis. UNIQUE, żeby ponowny ban tylko odświeżał istniejący.
  ip_hash    text        not null unique,
  reason     text,
  -- Ile wykrytych ataków doprowadziło do bana (dla banów automatycznych).
  strikes    integer     not null default 0,
  -- true = ban założony automatycznie przez detektor; false = ręcznie w panelu.
  is_auto    boolean     not null default false,
  created_at timestamptz not null default now(),
  -- NULL = ban stały; wartość = ban wygasa o tej porze.
  expires_at timestamptz
);

create index if not exists chat_bans_ip_idx on public.chat_bans (ip_hash);
create index if not exists chat_bans_created_idx on public.chat_bans (created_at desc);

alter table public.chat_bans enable row level security;

-- Odczyt / zakładanie / zdejmowanie banów z panelu — tylko redakcja/admin.
drop policy if exists "chat_bans_staff_read" on public.chat_bans;
create policy "chat_bans_staff_read"
  on public.chat_bans for select
  to authenticated
  using (public.is_staff());

drop policy if exists "chat_bans_staff_insert" on public.chat_bans;
create policy "chat_bans_staff_insert"
  on public.chat_bans for insert
  to authenticated
  with check (public.is_staff());

drop policy if exists "chat_bans_staff_delete" on public.chat_bans;
create policy "chat_bans_staff_delete"
  on public.chat_bans for delete
  to authenticated
  using (public.is_staff());

grant select, insert, delete on public.chat_bans to authenticated;

-- Serwer (route /api/chat) czyta bany i zakłada bany automatyczne kluczem
-- service_role. Rola ta omija RLS, ale nadal potrzebuje GRANT-ów na tabeli,
-- inaczej dostaje „permission denied for table chat_bans" (42501).
grant select, insert, update, delete on public.chat_bans to service_role;
