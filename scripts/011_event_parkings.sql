-- =============================================================================
-- Jejkowice — parkingi przypięte do konkretnego wydarzenia
-- =============================================================================
-- Parkingi nie są już globalne — każde wydarzenie ma własną listę punktów
-- parkingowych ustawianych w pickerze mapy w panelu admina (obok pinezki
-- docelowej). Trzymamy je w kolumnie JSONB `parkings` na tabeli `events`,
-- spójnie z innymi listami wydarzenia (description, highlights, program).
--
-- Kształt: [{ "name": "Parking przy szkole", "lat": 50.08, "lng": 18.50 }, ...]
--
-- Migracja jest IDEMPOTENTNA i NIENISZCZĄCA. Uruchom w Supabase → SQL Editor.
-- =============================================================================

-- 1. Nowa kolumna per-wydarzenie (domyślnie pusta tablica).
alter table public.events
  add column if not exists parkings jsonb not null default '[]'::jsonb;

-- 2. Sprzątanie po poprzednim podejściu z globalną tabelą parkingów.
--    (Bezpieczne — usuwa tylko, jeśli tabela faktycznie istnieje.)
drop table if exists public.parkings cascade;
