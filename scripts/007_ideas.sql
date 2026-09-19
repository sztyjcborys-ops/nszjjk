-- =============================================================================
-- Jejkowice — pomysły mieszkańców (bank pomysłów) z moderacją
-- =============================================================================
-- Mieszkaniec zgłasza pomysł anonimowo (bez konta). Pomysł trafia najpierw do
-- poczekalni (approved = false) i NIE jest widoczny publicznie. Dopiero gdy
-- redakcja/admin go zatwierdzi (approved = true), pojawia się na stronie
-- /pomysly. Brak jakichkolwiek statusów ("w trakcie", "zrealizowany" itp.) —
-- pomysł jest albo oczekujący, albo zatwierdzony.
--
-- Migracja jest IDEMPOTENTNA i NIENISZCZĄCA (CREATE ... IF NOT EXISTS /
-- CREATE OR REPLACE / DROP POLICY IF EXISTS). Uruchom w Supabase → SQL Editor.
-- =============================================================================

create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null,
  description text        not null,
  category    text        not null
              check (category in (
                'Rekreacja i sport',
                'Zieleń i środowisko',
                'Drogi i chodniki',
                'Kultura i edukacja',
                'Bezpieczeństwo',
                'Inne'
              )),
  author      text        not null default 'Mieszkaniec',
  votes       integer     not null default 0 check (votes >= 0),
  approved    boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ideas_approved_votes_idx
  on public.ideas (approved, votes desc);
create index if not exists ideas_created_at_idx
  on public.ideas (created_at desc);

drop trigger if exists ideas_set_updated_at on public.ideas;
create trigger ideas_set_updated_at
  before update on public.ideas
  for each row execute function public.set_updated_at();

alter table public.ideas enable row level security;

-- Publiczny odczyt WYŁĄCZNIE zatwierdzonych pomysłów.
drop policy if exists "ideas_public_read_approved" on public.ideas;
create policy "ideas_public_read_approved"
  on public.ideas for select
  to anon, authenticated
  using (approved = true);

-- Redakcja/admin widzi wszystko, łącznie z oczekującymi.
drop policy if exists "ideas_staff_read_all" on public.ideas;
create policy "ideas_staff_read_all"
  on public.ideas for select
  to authenticated
  using (public.is_staff());

-- WAŻNE (anty-spam): NIE pozwalamy anonimowi wstawiać wierszy bezpośrednio.
-- Klucz anon (NEXT_PUBLIC_SUPABASE_ANON_KEY) jest widoczny w przeglądarce, więc
-- publiczna polityka INSERT oznaczałaby, że każdy może zalać tabelę przez REST.
-- Zgłoszenia mieszkańców przechodzą WYŁĄCZNIE przez server action
-- (app/pomysly/actions.ts), która używa klienta service_role (omija RLS),
-- waliduje treść i stosuje limit zgłoszeń na adres IP. Dlatego kasujemy
-- ewentualną starą politykę publicznego INSERT-u.
drop policy if exists "ideas_public_insert" on public.ideas;

-- Zatwierdzanie, edycja treści i moderacja — tylko redakcja/admin.
drop policy if exists "ideas_staff_update" on public.ideas;
create policy "ideas_staff_update"
  on public.ideas for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "ideas_staff_delete" on public.ideas;
create policy "ideas_staff_delete"
  on public.ideas for delete
  to authenticated
  using (public.is_staff());

-- Odczyt publiczny (RLS i tak ogranicza anona do approved = true).
grant select         on public.ideas to anon, authenticated;
-- Redakcja/admin (zalogowani) mogą aktualizować i usuwać — pod kontrolą RLS.
grant update, delete on public.ideas to authenticated;
-- Celowo BEZ `grant insert ... to anon` — inserty robi tylko server action
-- kluczem service_role. Gdyby wcześniejsza migracja nadała ten grant, cofamy go.
revoke insert on public.ideas from anon;
revoke insert on public.ideas from authenticated;

-- WAŻNE: rola service_role (klient serwerowy w app/pomysly/actions.ts) musi
-- mieć jawne uprawnienia do tabeli. W tym projekcie domyślne uprawnienia nie
-- objęły nowych tabel, więc nadajemy je wprost — inaczej insert kończy się
-- błędem "permission denied for table ideas" (kod 42501).
grant all on public.ideas to service_role;

-- -----------------------------------------------------------------------------
-- Brak danych startowych. Tabela zaczyna pusta — na stronie /pomysly pojawiają
-- się wyłącznie pomysły zgłoszone przez mieszkańców i zatwierdzone przez
-- redakcję. Dopóki nic nie ma, strona pokazuje komunikat o braku pomysłów.
-- -----------------------------------------------------------------------------
