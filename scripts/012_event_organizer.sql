-- =============================================================================
-- Jejkowice — organizator przypisany do konkretnego wydarzenia
-- =============================================================================
-- Do tej pory organizator był na stałe wpisany w widoku wydarzenia
-- („Urząd Gminy Jejkowice"). Teraz każde wydarzenie ma własne pole
-- `organizer`, ustawiane w panelu admina. Domyślnie pozostaje to urząd gminy.
--
-- Migracja jest IDEMPOTENTNA i NIENISZCZĄCA. Uruchom w Supabase → SQL Editor.
-- =============================================================================

alter table public.events
  add column if not exists organizer text not null default 'Urząd Gminy Jejkowice';
