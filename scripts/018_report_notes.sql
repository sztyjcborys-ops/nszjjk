-- =============================================================================
-- Jejkowice — notatki wewnętrzne do zgłoszeń mieszkańców
-- =============================================================================
-- Sekcja „Notatki wewnętrzne" w panelu (widok szczegółów zgłoszenia). Notatki
-- są WYŁĄCZNIE dla redakcji/admina — nie są nigdzie pokazywane mieszkańcom.
--
-- Migracja jest IDEMPOTENTNA i NIENISZCZĄCA (CREATE ... IF NOT EXISTS /
-- CREATE OR REPLACE / DROP POLICY IF EXISTS). Uruchom w Supabase → SQL Editor.
-- =============================================================================

create table if not exists public.report_notes (
  id          uuid        primary key default gen_random_uuid(),
  report_id   uuid        not null references public.reports (id) on delete cascade,
  author_id   uuid        references auth.users (id) on delete set null,
  -- Zapisany „w locie" podpis autora (imię i nazwisko lub e-mail), aby notatka
  -- zachowała autorstwo nawet po zmianie/usunięciu profilu.
  author_name text,
  body        text        not null check (length(btrim(body)) > 0),
  created_at  timestamptz not null default now()
);

create index if not exists report_notes_report_id_created_at_idx
  on public.report_notes (report_id, created_at desc);

alter table public.report_notes enable row level security;

-- Odczyt notatek — tylko redakcja/admin.
drop policy if exists "report_notes_staff_read" on public.report_notes;
create policy "report_notes_staff_read"
  on public.report_notes for select
  to authenticated
  using (public.is_staff());

-- Dodawanie notatek — redakcja/admin, tylko we własnym imieniu (author_id = self).
drop policy if exists "report_notes_staff_insert" on public.report_notes;
create policy "report_notes_staff_insert"
  on public.report_notes for insert
  to authenticated
  with check (public.is_staff() and author_id = auth.uid());

-- Usuwanie notatek — redakcja/admin.
drop policy if exists "report_notes_staff_delete" on public.report_notes;
create policy "report_notes_staff_delete"
  on public.report_notes for delete
  to authenticated
  using (public.is_staff());

grant select, insert, delete on public.report_notes to authenticated;
