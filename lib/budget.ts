import 'server-only'

import { createClient } from '@supabase/supabase-js'

/* -------------------------------------------------------------------------- *
 *  Budżet Jejkowic 2026 — warstwa danych                                     *
 *                                                                            *
 *  Wszystkie liczby pochodzą WYŁĄCZNIE z Supabase:                           *
 *   - public.budget_summary_2026 → potwierdzone kwoty (dochody/wydatki/      *
 *                                   deficyt) dla kolejnych uchwał            *
 *   - public.budgets_2026        → struktura wydatków (działy budżetu)       *
 *   - public.budget_items_2026   → szczegóły (pozycje w rozdziałach)         *
 *   - public.budget_changes_2026 → historia zmian (uchwały)                  *
 *                                                                            *
 *  Odczyt idzie po stronie serwera. Tabele budżetu mają publiczny grant      *
 *  SELECT dla roli `anon`, więc używamy klucza anon (a gdyby był dostępny    *
 *  tylko service_role — z niego). Strona i tak serwuje wyłącznie publiczne,  *
 *  zagregowane wartości budżetu gminy. Nie tworzymy tu żadnych danych        *
 *  zastępczych — jeśli zapytanie zawiedzie, zwracamy puste tablice.          *
 * -------------------------------------------------------------------------- */

export type BudgetSummaryRow = {
  id: number
  year: number | null
  resolution_no: string | null
  resolution_date: string | null
  income: number | null
  expenses: number | null
  deficit: number | null
  is_current: boolean | null
  source_url: string | null
  created_at: string | null
}

export type BudgetRow = {
  id: number
  department: number | null
  name: string | null
  amount: number | null
  type: string | null
  source_url: string | null
}

export type BudgetItemRow = {
  id: number
  department: number | null
  section: string | null
  name: string | null
  amount: number | null
  source_url: string | null
}

/** Typ zmiany budżetowej (kolumna change_type w budget_changes_2026). */
export type BudgetChangeType = 'expense' | 'income' | 'revenue' | 'transfer' | 'other'

export type BudgetChangeRow = {
  id: number
  resolution_no: string | null
  resolution_date: string | null
  department: number | null
  section: string | null
  paragraph: string | null
  delta: number | null
  amount_before: number | null
  amount_after: number | null
  description: string | null
  change_type: string | null
  source_url: string | null
}

function readClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Tabele budżetu mają publiczny SELECT dla roli `anon`. Preferujemy klucz
  // anon; service_role zostawiamy jako zapasowy, gdyby projekt miał inaczej
  // ustawione uprawnienia.
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Brak konfiguracji Supabase: ustaw NEXT_PUBLIC_SUPABASE_URL oraz NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type BudgetData = {
  summary: BudgetSummaryRow[]
  budgets: BudgetRow[]
  items: BudgetItemRow[]
  changes: BudgetChangeRow[]
  /** true, gdy którekolwiek zapytanie zwróciło błąd (np. brak grantów SELECT). */
  failed: boolean
}

export async function getBudgetData(): Promise<BudgetData> {
  try {
    const sb = readClient()
    const [summary, budgets, items, changes] = await Promise.all([
      sb.from('budget_summary_2026').select('*').order('resolution_date', { ascending: true }),
      sb.from('budgets_2026').select('*').order('amount', { ascending: false }),
      sb.from('budget_items_2026').select('*').order('amount', { ascending: false }),
      sb.from('budget_changes_2026').select('*').order('resolution_date', { ascending: false }),
    ])

    for (const [label, res] of [
      ['budget_summary_2026', summary],
      ['budgets_2026', budgets],
      ['budget_items_2026', items],
      ['budget_changes_2026', changes],
    ] as const) {
      if (res.error) {
        console.log(`[v0] Budżet — błąd odczytu ${label}:`, res.error.message)
      }
    }

    const failed = Boolean(summary.error || budgets.error || items.error || changes.error)

    return {
      summary: (summary.data as BudgetSummaryRow[]) ?? [],
      budgets: (budgets.data as BudgetRow[]) ?? [],
      items: (items.data as BudgetItemRow[]) ?? [],
      // Nie pokazujemy publicznie rekordów bez faktycznej zmiany (delta = 0).
      changes:
        ((changes.data as BudgetChangeRow[]) ?? []).filter(
          (c) => Number(c.delta ?? 0) !== 0,
        ),
      failed,
    }
  } catch (err) {
    console.log('[v0] Budżet — wyjątek podczas odczytu:', (err as Error).message)
    return { summary: [], budgets: [], items: [], changes: [], failed: true }
  }
}

/** Wybiera bieżący snapshot budżetu: wiersz is_current, a w razie jego braku —
 *  uchwałę o najpóźniejszej dacie. */
export function currentSummary(summary: BudgetSummaryRow[]): BudgetSummaryRow | null {
  if (summary.length === 0) return null
  const flagged = summary.find((s) => s.is_current)
  if (flagged) return flagged
  return [...summary].sort((a, b) =>
    String(b.resolution_date ?? '').localeCompare(String(a.resolution_date ?? '')),
  )[0]
}

/* --------------------------------- Agregacje ------------------------------ */

export type TypeKind = 'income' | 'expense' | 'other'

/** Rozpoznaje, czy dana pozycja to dochód, wydatek, czy coś innego. */
export function typeKind(type: string | null): TypeKind {
  const s = (type ?? '').toLowerCase()
  if (s.includes('dochod') || s.includes('dochód') || s.includes('wpływ') || s.includes('income')) {
    return 'income'
  }
  if (s.includes('wydat') || s.includes('koszt') || s.includes('rozchod') || s.includes('expense')) {
    return 'expense'
  }
  return 'other'
}

export type Segment = { label: string; amount: number; department: number | null }

export type BudgetOverview = {
  income: number
  expense: number
  hasIncome: boolean
  hasExpense: boolean
  /** dochody − wydatki (ujemna wartość = deficyt); null, gdy brak danych */
  balance: number | null
  grandTotal: number
  /** etykieta dla wykresów struktury działów */
  focusLabel: string
  /** segmenty do wykresów — działy wydatków z budgets_2026 */
  segments: Segment[]
  /** potwierdzony, bieżący snapshot budżetu (budget_summary_2026) */
  current: BudgetSummaryRow | null
  /** wszystkie snapshoty uchwał, chronologicznie */
  history: BudgetSummaryRow[]
}

/**
 * Buduje nadrzędny obraz budżetu. Nagłówkowe kwoty (dochody / wydatki /
 * deficyt) pochodzą z potwierdzonej tabeli budget_summary_2026 (bieżący
 * snapshot), a struktura działów — z budgets_2026 (plan wydatków).
 */
export function buildOverview(
  budgets: BudgetRow[],
  summary: BudgetSummaryRow[] = [],
): BudgetOverview {
  const current = currentSummary(summary)

  const income = current ? Number(current.income ?? 0) : 0
  const expense = current ? Number(current.expenses ?? 0) : 0
  const hasIncome = income > 0
  const hasExpense = expense > 0
  // deficyt w tabeli jest liczbą dodatnią; saldo prezentujemy ze znakiem
  const balance =
    current && current.deficit != null
      ? -Number(current.deficit)
      : hasIncome && hasExpense
        ? income - expense
        : null

  // Działy z budgets_2026 to plan wydatków gminy — to je pokazują wykresy.
  const segments: Segment[] = budgets
    .map((b) => ({
      label: b.name?.trim() || (b.department != null ? `Dział ${b.department}` : 'Bez nazwy'),
      amount: Number(b.amount ?? 0),
      department: b.department,
    }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const grandTotal = segments.reduce((sum, s) => sum + s.amount, 0)

  return {
    income,
    expense,
    hasIncome,
    hasExpense,
    balance,
    grandTotal,
    focusLabel: 'Wydatki',
    segments,
    current,
    history: summary,
  }
}

export type ItemSection = {
  section: string
  total: number
  items: { id: number; name: string; amount: number; department: number | null }[]
}

/** Grupuje szczegółowe pozycje po rozdziale (section), posortowane malejąco. */
export function groupItemsBySection(items: BudgetItemRow[]): ItemSection[] {
  const map = new Map<string, ItemSection>()

  for (const it of items) {
    const key = it.section?.trim() || 'Pozostałe'
    const bucket =
      map.get(key) ?? { section: key, total: 0, items: [] }
    const amount = Number(it.amount ?? 0)
    bucket.total += amount
    bucket.items.push({
      id: it.id,
      name: it.name?.trim() || `Pozycja #${it.id}`,
      amount,
      department: it.department,
    })
    map.set(key, bucket)
  }

  const sections = [...map.values()]
  for (const s of sections) s.items.sort((a, b) => b.amount - a.amount)
  sections.sort((a, b) => b.total - a.total)
  return sections
}
