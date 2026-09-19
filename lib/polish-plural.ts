// ---------------------------------------------------------------------------
// Polska odmiana rzeczowników przez liczebniki.
//
// Język polski ma trzy formy liczbowe:
//   • one  — dla 1 (np. „1 zgłoszenie")
//   • few  — dla 2–4, ale NIE 12–14 (np. „2 zgłoszenia", „23 zgłoszenia")
//   • many — dla 0, 5–21, 12–14 itd. (np. „5 zgłoszeń", „13 zgłoszeń")
//
// Reguła (zgodna z CLDR):
//   n === 1                                     → one
//   n % 10 ∈ {2,3,4} oraz n % 100 ∉ {12,13,14}  → few
//   w pozostałych przypadkach                    → many
// ---------------------------------------------------------------------------

export type PolishForms = {
  /** Forma dla liczby 1, np. „zgłoszenie". */
  one: string
  /** Forma dla 2–4 (oprócz 12–14), np. „zgłoszenia". */
  few: string
  /** Forma dla 0, 5+ i 12–14, np. „zgłoszeń". */
  many: string
}

/** Zwraca właściwą formę rzeczownika dla podanej liczby (bez samej liczby). */
export function plForm(n: number, forms: PolishForms): string {
  const abs = Math.abs(n)
  if (abs === 1) return forms.one
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few
  return forms.many
}

/** Skrót: liczba + odmieniony rzeczownik, np. „3 zgłoszenia". */
export function plural(n: number, forms: PolishForms): string {
  return `${n} ${plForm(n, forms)}`
}
