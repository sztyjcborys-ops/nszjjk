-- =============================================================================
-- 002 — Nadanie pierwszej roli administratora (bootstrap)
-- =============================================================================
-- Polityki RLS celowo NIE pozwalają użytkownikowi samemu podnieść sobie roli,
-- a zarządzanie rolami wymaga bycia już adminem (patrz `profiles_admin_all`).
-- Dlatego PIERWSZEGO administratora trzeba nadać ręcznie, jednorazowo, tutaj.
--
-- Uruchom w: Supabase → SQL Editor. Zmień adres e-mail, jeśli trzeba.
-- Po wykonaniu WYLOGUJ SIĘ i zaloguj ponownie w panelu, aby odświeżyć sesję.

update public.profiles
set role = 'admin'
where email = 'wscieklydywan@gmail.com';

-- Gdyby profil jeszcze nie istniał (konto utworzone przed dodaniem triggera),
-- utwórz go na podstawie konta z auth.users:
insert into public.profiles (id, email, role)
select u.id, u.email, 'admin'
from auth.users u
where u.email = 'wscieklydywan@gmail.com'
on conflict (id) do update set role = 'admin';
