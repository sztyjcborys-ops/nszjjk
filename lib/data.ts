export type NewsCategory = 'Inwestycje' | 'Sport' | 'Komunikaty' | 'Kultura' | 'Alert' | 'Rozrywka'

export type NewsItem = {
  id: string
  title: string
  excerpt: string
  category: NewsCategory
  date: string
  image: string
  /** Gotowa wartość CSS `object-position` dla miniaturki na kafelku. */
  imagePosition?: string
}

export const newsCategories: ('Wszystkie' | NewsCategory)[] = [
  'Wszystkie',
  'Alert',
  'Inwestycje',
  'Sport',
  'Komunikaty',
  'Kultura',
  'Rozrywka',
]

export type EventItem = {
  id: string
  /** ISO date 'YYYY-MM-DD' — the single source of truth for day/month/weekday */
  date: string
  title: string
  place: string
  address?: string
  time: string
  image: string
  /** true = wstęp bezpłatny */
  free?: boolean
  /** krótkie hasło na kartę / listę */
  intro: string
  /** akapity pełnego opisu na stronie wydarzenia */
  description: string[]
  /** atrakcje wypunktowane na stronie wydarzenia */
  highlights?: string[]
  /** program wydarzenia — pozycje w formacie 'HH:MM|Opis' */
  program?: string[]
  /** współrzędne pinezki na mapie (opcjonalne) */
  latitude?: number
  longitude?: number
  /** parkingi przypięte do wydarzenia — pokazywane na mapie */
  parkings?: import('@/lib/parkings').ParkingSpot[]
  /** organizator wydarzenia; domyślnie „Urząd Gminy Jejkowice" */
  organizer?: string
}

const MONTHS_SHORT = [
  'STY', 'LUT', 'MAR', 'KWI', 'MAJ', 'CZE',
  'LIP', 'SIE', 'WRZ', 'PAŹ', 'LIS', 'GRU',
]

const WEEKDAYS_FULL = [
  'niedziela', 'poniedziałek', 'wtorek', 'środa',
  'czwartek', 'piątek', 'sobota',
]

const MONTHS_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

/** Parse an ISO date string into parts without timezone drift. */
export function parseEventDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return { year, monthIndex: month - 1, day, jsDate: new Date(year, month - 1, day) }
}

export function eventDay(e: EventItem) {
  return String(parseEventDate(e.date).day)
}

/** true, gdy wydarzenie już się odbyło (data wcześniejsza niż dzisiaj). */
export function isPastEvent(e: EventItem) {
  const { jsDate } = parseEventDate(e.date)
  if (Number.isNaN(jsDate.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return jsDate.getTime() < today.getTime()
}

export function eventMonthShort(e: EventItem) {
  return MONTHS_SHORT[parseEventDate(e.date).monthIndex]
}

/** e.g. "sobota, 8 sierpnia 2026" — przyjmuje datę ISO 'YYYY-MM-DD'. */
export function formatEventLongDate(date: string) {
  if (!date) return ''
  const { year, monthIndex, day, jsDate } = parseEventDate(date)
  if (Number.isNaN(jsDate.getTime())) return ''
  return `${WEEKDAYS_FULL[jsDate.getDay()]}, ${day} ${MONTHS_GENITIVE[monthIndex]} ${year}`
}

/** e.g. "sobota, 8 sierpnia 2026" */
export function eventLongDate(e: EventItem) {
  return formatEventLongDate(e.date)
}

export type Report = {
  id: string
  title: string
  place: string
  status: 'Zgłoszone' | 'W trakcie' | 'Zakończone' | 'Zaakceptowane'
  date: string
  image: string
}

export const reportCategories = [
  { id: 'drogi', label: 'Drogi i chodniki', icon: 'road' },
  { id: 'oswietlenie', label: 'Oświetlenie', icon: 'lamp' },
  { id: 'zielen', label: 'Zieleń i porządek', icon: 'tree' },
  { id: 'odpady', label: 'Odpady', icon: 'trash' },
  { id: 'infrastruktura', label: 'Infrastruktura', icon: 'building' },
  { id: 'inne', label: 'Inne', icon: 'dots' },
] as const

export type WastePickup = {
  day: string
  month: string
  type: string
  when: string
  color: string
}

export const wasteSchedule: WastePickup[] = [
  { day: '18', month: 'MAJ', type: 'Papier', when: 'Jutro', color: 'oklch(0.52 0.2 264)' },
  { day: '24', month: 'MAJ', type: 'Zmieszane', when: 'Za 7 dni', color: 'oklch(0.55 0.02 262)' },
  { day: '31', month: 'MAJ', type: 'Bioodpady', when: 'Za 14 dni', color: 'oklch(0.45 0.09 60)' },
  { day: '7', month: 'CZE', type: 'Szkło', when: 'Za 21 dni', color: 'oklch(0.58 0.14 152)' },
  { day: '14', month: 'CZE', type: 'Plastik i metal', when: 'Za 28 dni', color: 'oklch(0.83 0.15 83)' },
]

export const surveyResults = [
  { label: 'Siłownia plenerowa', value: 42, color: 'oklch(0.52 0.2 264)' },
  { label: 'Ścieżki rowerowe', value: 28, color: 'oklch(0.58 0.14 152)' },
  { label: 'Dodatkowe ławki i zieleń', value: 20, color: 'oklch(0.83 0.15 83)' },
  { label: 'Miejsce rekreacji dla młodzieży', value: 10, color: 'oklch(0.62 0.16 20)' },
]

export const villageStats = [
  { value: '~1305', label: 'Pierwsza wzmianka' },
  { value: '7 800+', label: 'Mieszkańców' },
  { value: '94 km��', label: 'Powierzchnia' },
  { value: '1', label: 'Wspólna gmina' },
]

export const importantPhones = [
  { name: 'Urząd Gminy', phone: '32 430 20 50' },
  { name: 'Zakład Komunalny', phone: '32 430 20 51' },
  { name: 'Pogotowie Energetyczne', phone: '991' },
  { name: 'Policja', phone: '997' },
]

export const weather = {
  temp: 18,
  desc: 'Pochmurno z przejaśnieniami',
  forecast: [
    { day: 'Pt', temp: 18 },
    { day: 'So', temp: 20 },
    { day: 'Nd', temp: 21 },
    { day: 'Pon', temp: 19 },
  ],
}

export type IdeaStatus =
  | 'Nowy pomysł'
  | 'Zgłoszony'
  | 'W trakcie analizy'
  | 'Zaakceptowany'
  | 'Zrealizowany'

export const ideaStatuses: IdeaStatus[] = [
  'Nowy pomysł',
  'Zgłoszony',
  'W trakcie analizy',
  'Zaakceptowany',
  'Zrealizowany',
]

export type Idea = {
  id: string
  title: string
  description: string
  status: IdeaStatus
  votes: number
  author: string
  category: string
  date: string
}

export const ideaCategories = [
  'Rekreacja i sport',
  'Zieleń i środowisko',
  'Drogi i chodniki',
  'Kultura i edukacja',
  'Bezpieczeństwo',
  'Inne',
] as const

export const ideas: Idea[] = [
  {
    id: 'lawki-sciezki',
    title: 'Więcej ławek i miejsc do odpoczynku przy ścieżkach spacerowych',
    description:
      'Wzdłuż popularnych tras spacerowych brakuje miejsc, gdzie można odpocząć. Dodatkowe ławki ucieszą szczególnie seniorów i rodziny z dziećmi.',
    status: 'W trakcie analizy',
    votes: 124,
    author: 'Anna K.',
    category: 'Rekreacja i sport',
    date: '2026-05-02',
  },
  {
    id: 'silownia-plenerowa',
    title: 'Siłownia plenerowa w centrum Jejkowic',
    description:
      'Zestaw urządzeń do ćwiczeń na świeżym powietrzu w centralnym punkcie gminy — bezpłatna aktywność dla mieszkańców w każdym wieku.',
    status: 'Zgłoszony',
    votes: 89,
    author: 'Marek W.',
    category: 'Rekreacja i sport',
    date: '2026-05-08',
  },
  {
    id: 'wybieg-dla-psow',
    title: 'Wybieg dla psów w okolicy zalewu',
    description:
      'Ogrodzone miejsce, gdzie psy mogą pobiegać bez smyczy, a właściciele spokojnie porozmawiać. Coraz więcej gmin decyduje się na takie rozwiązanie.',
    status: 'Nowy pomysł',
    votes: 54,
    author: 'Ola P.',
    category: 'Rekreacja i sport',
    date: '2026-05-14',
  },
  {
    id: 'oswietlenie-przejscia',
    title: 'Doświetlenie przejść dla pieszych przy szkole',
    description:
      'Dedykowane oświetlenie i aktywne znaki poprawią bezpieczeństwo dzieci w drodze do szkoły, zwłaszcza jesienią i zimą.',
    status: 'Zaakceptowany',
    votes: 47,
    author: 'Rada Rodziców',
    category: 'Bezpieczeństwo',
    date: '2026-04-20',
  },
  {
    id: 'nasadzenia-drzew',
    title: 'Nowe nasadzenia drzew wzdłuż ul. Głównej',
    description:
      'Szpaler drzew poprawi estetykę, da cień latem i pomoże w retencji wody deszczowej.',
    status: 'W trakcie analizy',
    votes: 38,
    author: 'Tomasz L.',
    category: 'Zieleń i środowisko',
    date: '2026-04-28',
  },
  {
    id: 'strefa-mlodziezy',
    title: 'Miejsce spotkań dla młodzieży z Wi-Fi',
    description:
      'Zadaszona strefa z ławkami, ładowarkami i dostępem do internetu, gdzie młodzież może spędzać czas po szkole.',
    status: 'Nowy pomysł',
    votes: 31,
    author: 'Kuba i Zosia',
    category: 'Kultura i edukacja',
    date: '2026-05-16',
  },
  {
    id: 'stojaki-rowerowe',
    title: 'Stojaki rowerowe przy urzędzie i sklepach',
    description:
      'Wygodne i bezpieczne miejsca do parkowania rowerów zachęcą mieszkańców do rezygnacji z samochodu na krótkich trasach.',
    status: 'Zrealizowany',
    votes: 26,
    author: 'Piotr N.',
    category: 'Drogi i chodniki',
    date: '2026-03-30',
  },
]

/** Skrócony zestaw dla panelu na stronie głównej (3 najpopularniejsze). */
export const quickIdeas = ideas
