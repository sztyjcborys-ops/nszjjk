-- =============================================================================
-- Jejkowice — głosy na pomysły (lajki) z zapisem do bazy
-- =============================================================================
-- Do tej pory "lajk" żył wyłącznie w stanie React (znikał po odświeżeniu). Ta
-- migracja dodaje trwały zapis głosów:
--
--  * public.idea_votes  — jeden wiersz = jeden głos danego urządzenia (hash IP)
--                          na dany pomysł. UNIQUE (idea_id, voter_hash) blokuje
--                          podwójne głosowanie z tego samego urządzenia.
--  * public.ideas.votes — licznik zbiorczy aktualizowany atomowo przez funkcje
--                          RPC poniżej (bez wyścigów przy równoległych głosach).
--
-- Głosy zapisuje WYŁĄCZNIE server action kluczem service_role (jak zgłoszenia),
-- więc anon nie może majstrować przy liczniku bezpośrednio przez REST API.
--
-- Migracja jest IDEMPOTENTNA i NIENISZCZĄCA. Uruchom w Supabase → SQL Editor.
-- =============================================================================

create table if not exists public.idea_votes (
  id         uuid        primary key default gen_random_uuid(),
  idea_id    uuid        not null references public.ideas (id) on delete cascade,
  voter_hash text        not null,
  created_at timestamptz not null default now(),
  unique (idea_id, voter_hash)
);

create index if not exists idea_votes_idea_idx on public.idea_votes (idea_id);

alter table public.idea_votes enable row level security;
-- Brak polityk publicznych — dostęp ma tylko service_role (poniżej), więc anon
-- ani authenticated nie czytają/nie piszą tej tabeli bezpośrednio.
grant all on public.idea_votes to service_role;

-- -----------------------------------------------------------------------------
-- Atomowe oddanie głosu: wstaw wiersz do idea_votes (jeśli to urządzenie jeszcze
-- nie głosowało na ten pomysł) i podnieś licznik ideas.votes o 1. Zwraca aktualną
-- liczbę głosów. Głosować można tylko na ZATWIERDZONE pomysły.
-- -----------------------------------------------------------------------------
create or replace function public.cast_idea_vote(p_idea_id uuid, p_voter_hash text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted boolean := false;
  v_votes    integer;
begin
  insert into public.idea_votes (idea_id, voter_hash)
  values (p_idea_id, p_voter_hash)
  on conflict (idea_id, voter_hash) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted then
    update public.ideas
      set votes = votes + 1
    where id = p_idea_id and approved = true
    returning votes into v_votes;

    -- Pomysł niezatwierdzony/nieistniejący — wycofaj osierocony głos.
    if v_votes is null then
      delete from public.idea_votes
        where idea_id = p_idea_id and voter_hash = p_voter_hash;
      return null;
    end if;

    return v_votes;
  end if;

  -- To urządzenie już głosowało — zwróć bieżący licznik bez zmian.
  select votes into v_votes from public.ideas where id = p_idea_id;
  return v_votes;
end;
$$;

-- -----------------------------------------------------------------------------
-- Atomowe cofnięcie głosu: usuń wiersz z idea_votes (jeśli istniał) i zmniejsz
-- licznik o 1 (nigdy poniżej zera). Zwraca aktualną liczbę głosów.
-- -----------------------------------------------------------------------------
create or replace function public.retract_idea_vote(p_idea_id uuid, p_voter_hash text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted boolean := false;
  v_votes   integer;
begin
  delete from public.idea_votes
    where idea_id = p_idea_id and voter_hash = p_voter_hash;

  get diagnostics v_deleted = row_count;

  if v_deleted then
    update public.ideas
      set votes = greatest(votes - 1, 0)
    where id = p_idea_id
    returning votes into v_votes;
    return v_votes;
  end if;

  select votes into v_votes from public.ideas where id = p_idea_id;
  return v_votes;
end;
$$;

revoke all on function public.cast_idea_vote(uuid, text)    from anon, authenticated;
revoke all on function public.retract_idea_vote(uuid, text) from anon, authenticated;
grant  execute on function public.cast_idea_vote(uuid, text)    to service_role;
grant  execute on function public.retract_idea_vote(uuid, text) to service_role;
