// Client-safe date/time formatters (no server imports) so both server pages
// and client components — like the admin live preview — can share them.

const MONTHS_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

/** e.g. "15 maja 2024" */
export function formatArticleDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`
}

/** e.g. "10:30" (24h) */
export function formatArticleTime(iso: string) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** ISO → wartość dla <input type="datetime-local"> ("YYYY-MM-DDTHH:mm", czas lokalny). */
export function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Pełna kwota w złotych, np. "12 345 678 zł". */
export function formatPLN(n: number) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(n)
}

/** Skrócona kwota do etykiet wykresów, np. "12,3 mln zł", "820 tys. zł". */
export function formatPLNCompact(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} mln zł`
  }
  if (abs >= 10_000) {
    return `${(n / 1_000).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} tys. zł`
  }
  return `${n.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} zł`
}

/** Data uchwały "YYYY-MM-DD" → "15 maja 2026" (bez przesunięć stref). */
export function formatBudgetDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  return `${d} ${MONTHS_GENITIVE[m - 1]} ${y}`
}
