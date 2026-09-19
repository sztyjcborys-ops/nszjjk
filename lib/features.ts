/**
 * Przełączniki funkcji (feature flags).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  STRONA „BUDŻET GMINY" — jak włączyć / wyłączyć
 * ─────────────────────────────────────────────────────────────────────────
 *  Aby PONOWNIE WŁĄCZYĆ całą sekcję budżetu, zmień poniższą wartość na `true`.
 *  Aby ją UKRYĆ, ustaw `false`.
 *
 *  Ta jedna flaga steruje wszystkim naraz:
 *    • dostępnością strony /budzet (przy `false` zwraca 404 — nie da się wejść),
 *    • kafelkiem „Budżet gminy 2026" na stronie głównej,
 *    • pozycją „Budżet" w menu (desktop i mobilne),
 *    • dokładaniem danych budżetowych do odpowiedzi asystenta AI.
 *
 *  Kod strony i komponentów budżetu NIE jest usuwany — pozostaje w projekcie,
 *  więc przywrócenie widoczności to zmiana tej jednej wartości.
 *
 *  Opcjonalnie można sterować flagą przez zmienną środowiskową
 *  NEXT_PUBLIC_BUDGET_PAGE_ENABLED ("true"/"false"); domyślnie liczy się
 *  wartość poniżej.
 */
export const BUDGET_PAGE_ENABLED =
  process.env.NEXT_PUBLIC_BUDGET_PAGE_ENABLED === 'true' ? true : false
