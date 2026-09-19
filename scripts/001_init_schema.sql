-- =============================================================================
-- Jejkowice — inicjalna struktura Supabase dopasowana do istniejącego kodu
-- =============================================================================
-- Migracja jest IDEMPOTENTNA i NIENISZCZĄCA:
--   * używa CREATE ... IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS,
--   * nie wykonuje DROP TABLE ani nie usuwa danych,
--   * jeśli któryś obiekt już istnieje w projekcie, nie zostanie nadpisany
--     jego zawartość (poza politykami RLS i funkcjami, które są odtwarzane).
-- Uruchom w Supabase → SQL Editor po akceptacji.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Wspólne funkcje pomocnicze
-- -----------------------------------------------------------------------------

-- Automatyczna aktualizacja kolumny updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 1. PROFILE + ROLE (fundament autoryzacji panelu redakcyjnego)
-- =============================================================================
-- role:
--   'resident' — mieszkaniec (domyślna; NIE jest dziś wymagana do korzystania
--                z serwisu — przygotowana na przyszłe konta mieszkańców),
--   'editor'   — redaktor (zarządza treścią),
--   'admin'    — administrator (pełne zarządzanie).

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'resident'
             check (role in ('resident', 'editor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Automatyczne tworzenie profilu przy rejestracji użytkownika w Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Uzupełnienie profili dla kont już istniejących w projekcie (bez nadpisywania).
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
on conflict (id) do nothing;

-- Funkcje pomocnicze SECURITY DEFINER — omijają RLS na profiles, więc nie
-- powodują rekurencji w politykach i mogą być używane w RLS innych tabel.
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('editor', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- RLS dla profiles.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self_or_staff" on public.profiles;
create policy "profiles_select_self_or_staff"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_staff());

-- Użytkownik może zaktualizować własny profil, ale NIE może sam zmienić sobie roli.
drop policy if exists "profiles_update_self_no_role" on public.profiles;
create policy "profiles_update_self_no_role"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_role());

-- Admin zarządza rolami wszystkich profili.
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- 2. ARTICLES (aktualności) — jedyna tabela używana już dziś w kodzie
-- =============================================================================
-- Zgodne z typem Article w lib/articles.ts oraz akcjami w app/admin/actions.ts.

create table if not exists public.articles (
  id          uuid primary key default gen_random_uuid(),
  slug        text        not null unique,
  title       text        not null,
  excerpt     text        not null,
  category    text        not null
              check (category in ('Inwestycje', 'Sport', 'Komunikaty', 'Kultura')),
  cover_image text,
  content     text        not null,
  published   boolean     not null default false,
  author_id   uuid        references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists articles_published_created_at_idx
  on public.articles (published, created_at desc);
create index if not exists articles_created_at_idx
  on public.articles (created_at desc);
create index if not exists articles_slug_idx on public.articles (slug);

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

alter table public.articles enable row level security;

-- Publiczny odczyt wyłącznie opublikowanych (getPublishedArticles / getArticleBySlug).
drop policy if exists "articles_public_read_published" on public.articles;
create policy "articles_public_read_published"
  on public.articles for select
  to anon, authenticated
  using (published = true);

-- Redakcja widzi wszystko, łącznie ze szkicami (getAllArticles / getArticleById).
drop policy if exists "articles_staff_read_all" on public.articles;
create policy "articles_staff_read_all"
  on public.articles for select
  to authenticated
  using (public.is_staff());

drop policy if exists "articles_staff_insert" on public.articles;
create policy "articles_staff_insert"
  on public.articles for insert
  to authenticated
  with check (public.is_staff());

drop policy if exists "articles_staff_update" on public.articles;
create policy "articles_staff_update"
  on public.articles for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "articles_staff_delete" on public.articles;
create policy "articles_staff_delete"
  on public.articles for delete
  to authenticated
  using (public.is_staff());

-- =============================================================================
-- 3. EVENTS (wydarzenia) — dziś statyczne w lib/data.ts (typ EventItem)
-- =============================================================================

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  slug        text        not null unique,
  title       text        not null,
  place       text        not null,
  address     text,
  event_date  date        not null,             -- EventItem.date (ISO 'YYYY-MM-DD')
  event_time  text        not null,             -- EventItem.time (np. '15:00')
  image       text,
  free        boolean     not null default true,
  intro       text        not null,
  description text[]       not null default '{}',-- akapity pełnego opisu
  highlights  text[]       not null default '{}',-- wypunktowane atrakcje
  published   boolean     not null default true,
  author_id   uuid        references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists events_date_idx on public.events (event_date);
create index if not exists events_published_date_idx
  on public.events (published, event_date);
create index if not exists events_slug_idx on public.events (slug);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

drop policy if exists "events_public_read_published" on public.events;
create policy "events_public_read_published"
  on public.events for select
  to anon, authenticated
  using (published = true);

drop policy if exists "events_staff_read_all" on public.events;
create policy "events_staff_read_all"
  on public.events for select
  to authenticated
  using (public.is_staff());

drop policy if exists "events_staff_insert" on public.events;
create policy "events_staff_insert"
  on public.events for insert
  to authenticated
  with check (public.is_staff());

drop policy if exists "events_staff_update" on public.events;
create policy "events_staff_update"
  on public.events for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "events_staff_delete" on public.events;
create policy "events_staff_delete"
  on public.events for delete
  to authenticated
  using (public.is_staff());

-- =============================================================================
-- 4. REPORTS (zgłoszenia mieszkańców) — składane anonimowo (bez konta)
-- =============================================================================
-- Kategorie zgodne z reportCategories w lib/data.ts.
-- Statusy zgodne z typem Report ('Zgłoszone' domyślnie).

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  category      text        not null
                check (category in
                  ('drogi','oswietlenie','zielen','odpady','infrastruktura','inne')),
  location      text        not null,           -- ReportForm: pole "Lokalizacja"
  description   text        not null,           -- ReportForm: "Opis problemu"
  contact_email text,                           -- potwierdzenie na e-mail (opcjonalne)
  -- Ścieżki zdjęć w prywatnym buckecie 'report-images'. Generuje je aplikacja
  -- jako reports/{report_id}/{file_uuid}.webp. Maks. 3 zdjęcia na zgłoszenie.
  image_paths   text[]      not null default '{}'
                check (coalesce(array_length(image_paths, 1), 0) <= 3),
  status        text        not null default 'Zgłoszone'
                check (status in
                  ('Zgłoszone','W trakcie','Zakończone','Zaakceptowane')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists reports_status_created_at_idx
  on public.reports (status, created_at desc);
create index if not exists reports_created_at_idx
  on public.reports (created_at desc);

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

alter table public.reports enable row level security;

-- Anonim (i każdy) MOŻE wysłać zgłoszenie, ale tylko jako nowe:
-- wymuszamy domyślny status, więc nie da się wstawić rekordu "gotowego".
drop policy if exists "reports_public_insert" on public.reports;
create policy "reports_public_insert"
  on public.reports for insert
  to anon, authenticated
  with check (status = 'Zgłoszone');

-- Anonim NIE może odczytywać/edytować/usuwać — brak polityk SELECT/UPDATE/DELETE
-- dla anon oznacza domyślną odmowę. Odczyt i zarządzanie: tylko redakcja/admin.
drop policy if exists "reports_staff_read" on public.reports;
create policy "reports_staff_read"
  on public.reports for select
  to authenticated
  using (public.is_staff());

drop policy if exists "reports_staff_update" on public.reports;
create policy "reports_staff_update"
  on public.reports for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Usuwanie zgłoszeń — redakcja (editor) oraz admin.
-- editor ma pełną obsługę zgłoszeń: podgląd, zmiana statusu, zarządzanie
-- zdjęciami oraz usuwanie zakończonych/niepotrzebnych zgłoszeń.
drop policy if exists "reports_admin_delete" on public.reports;
drop policy if exists "reports_staff_delete" on public.reports;
create policy "reports_staff_delete"
  on public.reports for delete
  to authenticated
  using (public.is_staff());

-- =============================================================================
-- 5. POLLS / ANKIETY — publiczne, z rozsądnym zabezpieczeniem przed multi-głosem
-- =============================================================================
-- Typ Poll w lib/data.ts: title, description, image, status, (daysLeft liczone
-- z ends_at). Struktura uogólniona tak, by obsłużyć ankiety jedno-wyborowe,
-- emoji i oceny — bez zmiany frontendu teraz.

create table if not exists public.polls (
  id          uuid primary key default gen_random_uuid(),
  slug        text        not null unique,
  title       text        not null,
  description text        not null default '',
  image       text,
  kind        text        not null default 'single_choice'
              check (kind in ('single_choice','emoji','rating')),
  status      text        not null default 'Aktywna'
              check (status in ('Aktywna','Zakończona')),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,                       -- podstawa do wyliczenia daysLeft
  author_id   uuid        references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.poll_options (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.polls (id) on delete cascade,
  label      text not null,
  color      text,                               -- do słupków wyników (opcjonalnie)
  sort_order int  not null default 0
);

create index if not exists poll_options_poll_id_idx on public.poll_options (poll_id);

-- Głosy anonimowe. voter_key = stabilny identyfikator z klienta (np. UUID w
-- localStorage) — daje "rozsądną" ochronę przed wielokrotnym głosowaniem
-- (unikalność na (poll_id, voter_key)) bez wymagania logowania.
create table if not exists public.poll_votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.polls (id) on delete cascade,
  option_id  uuid not null references public.poll_options (id) on delete cascade,
  voter_key  text not null,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_key)
);

create index if not exists poll_votes_poll_id_idx on public.poll_votes (poll_id);
create index if not exists poll_votes_option_id_idx on public.poll_votes (option_id);

drop trigger if exists polls_set_updated_at on public.polls;
create trigger polls_set_updated_at
  before update on public.polls
  for each row execute function public.set_updated_at();

alter table public.polls        enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes   enable row level security;

-- Ankiety i ich opcje są publicznie czytelne.
drop policy if exists "polls_public_read" on public.polls;
create policy "polls_public_read"
  on public.polls for select
  to anon, authenticated
  using (true);

drop policy if exists "poll_options_public_read" on public.poll_options;
create policy "poll_options_public_read"
  on public.poll_options for select
  to anon, authenticated
  using (true);

-- Zarządzanie ankietami/opcjami — tylko redakcja/admin.
drop policy if exists "polls_staff_write" on public.polls;
create policy "polls_staff_write"
  on public.polls for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "poll_options_staff_write" on public.poll_options;
create policy "poll_options_staff_write"
  on public.poll_options for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Głosowanie: każdy może oddać głos, ale tylko w AKTYWNEJ ankiecie i tylko na
-- opcję należącą do tej ankiety. Unikalność (poll_id, voter_key) blokuje dubel.
drop policy if exists "poll_votes_public_insert" on public.poll_votes;
create policy "poll_votes_public_insert"
  on public.poll_votes for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.poll_options o
      join public.polls p on p.id = o.poll_id
      where o.id = poll_votes.option_id
        and o.poll_id = poll_votes.poll_id
        and p.status = 'Aktywna'
    )
  );

-- Pojedynczych głosów NIE można czytać publicznie (brak polityki SELECT dla anon).
-- Redakcja/admin może przeglądać surowe głosy (np. audyt).
drop policy if exists "poll_votes_staff_read" on public.poll_votes;
create policy "poll_votes_staff_read"
  on public.poll_votes for select
  to authenticated
  using (public.is_staff());

-- Publiczne WYNIKI zbiorcze przez widok (agreguje głosy, nie ujawnia voter_key).
-- Widok działa z uprawnieniami właściciela, więc pomija RLS na poll_votes.
create or replace view public.poll_results as
select
  o.poll_id,
  o.id            as option_id,
  o.label,
  o.color,
  o.sort_order,
  count(v.id)     as votes
from public.poll_options o
left join public.poll_votes v on v.option_id = o.id
group by o.poll_id, o.id, o.label, o.color, o.sort_order;

grant select on public.poll_results to anon, authenticated;

-- =============================================================================
-- 6. GRANTY tabel (RLS pozostaje właściwą bramką dostępu)
-- =============================================================================
grant select                         on public.articles     to anon, authenticated;
grant insert, update, delete         on public.articles     to authenticated;

grant select                         on public.events       to anon, authenticated;
grant insert, update, delete         on public.events       to authenticated;

grant insert                         on public.reports      to anon, authenticated;
grant select, update, delete         on public.reports      to authenticated;

grant select                         on public.polls        to anon, authenticated;
grant insert, update, delete         on public.polls        to authenticated;
grant select                         on public.poll_options to anon, authenticated;
grant insert, update, delete         on public.poll_options to authenticated;
grant insert                         on public.poll_votes   to anon, authenticated;
grant select                         on public.poll_votes   to authenticated;

grant select, update                 on public.profiles     to authenticated;

-- =============================================================================
-- 7. STORAGE — kubełki na zdjęcia (artykuły, wydarzenia, zgłoszenia)
-- =============================================================================
-- article-images / event-images: publiczne (pokazywane na stronach publicznych).
-- report-images: prywatne (zdjęcia zgłoszeń widzi tylko redakcja/admin),
--                ale każdy może wgrać plik przy składaniu zgłoszenia.

insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

-- Prywatny bucket zgłoszeń z twardym limitem rozmiaru (5 MB) i whitelistą MIME.
-- To druga warstwa ochrony obok walidacji w server action i kompresji w kliencie.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-images', 'report-images', false,
  5242880,                                    -- 5 MB na plik
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Publiczny odczyt zdjęć artykułów i wydarzeń.
drop policy if exists "storage_public_read_article_event" on storage.objects;
create policy "storage_public_read_article_event"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('article-images', 'event-images'));

-- Wgrywanie/edycja/usuwanie zdjęć artykułów i wydarzeń — tylko redakcja/admin.
drop policy if exists "storage_staff_write_article_event" on storage.objects;
create policy "storage_staff_write_article_event"
  on storage.objects for all
  to authenticated
  using (bucket_id in ('article-images', 'event-images') and public.is_staff())
  with check (bucket_id in ('article-images', 'event-images') and public.is_staff());

-- Zdjęcia zgłoszeń: każdy (także anonim) może WGRAĆ nowy plik przy składaniu
-- zgłoszenia, ale WYŁĄCZNIE pod prefiksem reports/... — ścieżkę narzuca aplikacja
-- (reports/{report_id}/{file_uuid}.webp). Dzięki temu nie da się wgrać pliku w
-- dowolne miejsce. Odczyt jest zablokowany dla anonima, więc nie można też
-- zgadywać/nadpisywać cudzych plików (upload bez upsert = brak nadpisania).
drop policy if exists "storage_public_upload_report" on storage.objects;
create policy "storage_public_upload_report"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = 'reports'
  );

-- Anonim NIE może odczytywać, pobierać ani usuwać zdjęć zgłoszeń
-- (brak polityk SELECT/DELETE dla anon = domyślna odmowa).
-- Odczyt zdjęć zgłoszeń — tylko redakcja/admin.
drop policy if exists "storage_staff_read_report" on storage.objects;
create policy "storage_staff_read_report"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'report-images' and public.is_staff());

-- Edycja/nadpisywanie zdjęć zgłoszeń — tylko redakcja/admin.
drop policy if exists "storage_staff_modify_report" on storage.objects;
create policy "storage_staff_modify_report"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'report-images' and public.is_staff())
  with check (bucket_id = 'report-images' and public.is_staff());

-- Usuwanie zdjęć zgłoszeń — redakcja (editor) oraz admin.
drop policy if exists "storage_admin_delete_report" on storage.objects;
drop policy if exists "storage_staff_delete_report" on storage.objects;
create policy "storage_staff_delete_report"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'report-images' and public.is_staff());

-- =============================================================================
-- 8. NADANIE ROLI redaktora/admina (wykonaj RĘCZNIE po migracji)
-- =============================================================================
-- Konto musi najpierw istnieć w Authentication → Users. Następnie:
--
--   update public.profiles set role = 'admin'
--   where email = 'twoj-email@przyklad.pl';
--
--   update public.profiles set role = 'editor'
--   where email = 'redaktor@przyklad.pl';
-- =============================================================================
