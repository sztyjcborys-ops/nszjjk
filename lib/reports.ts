export type ReportStatus = 'Zgłoszone' | 'W trakcie' | 'Zakończone' | 'Zaakceptowane'

export const REPORT_STATUSES: ReportStatus[] = [
  'Zgłoszone',
  'W trakcie',
  'Zaakceptowane',
  'Zakończone',
]

export type ReportRow = {
  id: string
  category: string
  location: string
  description: string
  contact_email: string | null
  image_paths: string[]
  status: ReportStatus
  // Dokładne współrzędne wskazane przez mieszkańca na mapie (pinezka). Null, gdy
  // adres wpisano ręcznie — wtedy pinezkę wyznacza geokoder po adresie.
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

export type ReportNote = {
  id: string
  report_id: string
  author_id: string | null
  author_name: string | null
  body: string
  created_at: string
}

/** Etykiety kategorii zgłoszeń (zgodne z reportCategories w lib/data.ts). */
export const REPORT_CATEGORY_LABELS: Record<string, string> = {
  drogi: 'Drogi i chodniki',
  oswietlenie: 'Oświetlenie',
  zielen: 'Zieleń i porządek',
  odpady: 'Odpady',
  infrastruktura: 'Infrastruktura',
  inne: 'Inne',
}

const MONTHS_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

/** e.g. "15 maja 2024, 14:32" */
export function formatReportDate(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}, ${time}`
}

/** Względny czas, np. „10 min temu", „2 godz. temu", „wczoraj". */
export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'przed chwilą'
  if (min < 60) return `${min} min temu`
  const hrs = Math.round(min / 60)
  if (hrs < 24) return `${hrs} godz. temu`
  const days = Math.round(hrs / 24)
  if (days === 1) return 'wczoraj'
  if (days < 7) return `${days} dni temu`
  return formatReportDate(iso)
}

/** Klasy Tailwind dla plakietki statusu zgłoszenia. */
export function statusBadgeClass(status: ReportStatus) {
  switch (status) {
    case 'Zgłoszone':
      return 'bg-gold/25 text-gold-foreground'
    case 'W trakcie':
      return 'bg-primary/10 text-primary'
    case 'Zaakceptowane':
      return 'bg-eco/15 text-eco'
    case 'Zakończone':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function countByStatus(reports: ReportRow[]) {
  const counts: Record<ReportStatus, number> = {
    'Zgłoszone': 0,
    'W trakcie': 0,
    'Zaakceptowane': 0,
    'Zakończone': 0,
  }
  for (const r of reports) counts[r.status] = (counts[r.status] ?? 0) + 1
  return counts
}
