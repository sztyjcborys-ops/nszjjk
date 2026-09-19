// ---------------------------------------------------------------------------
// Silnik harmonogramu wywozu odpadów dla gminy Jejkowice
//
// Mieszkaniec wpisuje adres (np. "Główna 42"), a system:
//   1. rozpoznaje ulicę + numer,
//   2. ustala rejon (1–5) — wyjątki rejonu 5 sprawdzane są w pierwszej kolejności,
//   3. wylicza terminy odbioru dla każdego rodzaju odpadów.
//
// Harmonogram dotyczy roku 2026.
// ---------------------------------------------------------------------------

export const SCHEDULE_YEAR = 2026

// Główny rejon adresu — steruje zmieszanymi, bio, popiołem i gabarytami.
export type Region = 1 | 2 | 3 | 4 | 5

// Rejon segregowanych to NIEZALEŻNY identyfikator wynikający z osobnej tabeli
// „Podział ulic dla odbioru odpadów segregowanych". Numer rejonu segregowanych
// NIE musi pokrywać się z głównym rejonem adresu (np. rejon 4 → rejonSegregowane 5).
export type SegregatedRegion = number

export type WasteKind = "zmieszane" | "popiol" | "bio" | "segregowane" | "gabaryty"

export type WasteTypeMeta = {
  kind: WasteKind
  label: string
  color: string
}

export const WASTE_TYPES: WasteTypeMeta[] = [
  { kind: "zmieszane", label: "Odpady zmieszane", color: "oklch(0.45 0.02 262)" },
  { kind: "popiol", label: "Popiół", color: "oklch(0.68 0.02 262)" },
  { kind: "bio", label: "Bioodpady", color: "oklch(0.45 0.09 60)" },
  { kind: "segregowane", label: "Odpady segregowane", color: "oklch(0.58 0.14 152)" },
  { kind: "gabaryty", label: "Gabaryty", color: "oklch(0.55 0.13 300)" },
]

// ---------------------------------------------------------------------------
// Normalizacja tekstu (małe litery, bez polskich znaków, bez nadmiaru spacji)
// ---------------------------------------------------------------------------

function stripDiacritics(input: string): string {
  const map: Record<string, string> = {
    ą: "a",
    ć: "c",
    ę: "e",
    ł: "l",
    ń: "n",
    ó: "o",
    ś: "s",
    ż: "z",
    ź: "z",
  }
  return input.replace(/[ąćęłńóśżź]/g, (ch) => map[ch] ?? ch)
}

function normalizeStreet(input: string): string {
  return stripDiacritics(input.trim().toLowerCase())
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeNumber(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase()
}

// ---------------------------------------------------------------------------
// Parsowanie adresu wpisanego jednym polem, np. "ul. Franciszka Prusa 33A"
// ---------------------------------------------------------------------------

export type ParsedAddress = {
  street: string
  number: string
  streetKey: string
  numberKey: string
}

export function parseAddress(raw: string): ParsedAddress | null {
  const cleaned = raw
    .trim()
    .replace(/^ul\.?\s+/i, "") // usuń przedrostek "ul." / "ul "
    .replace(/,/g, " ")

  // Ostatnia grupa cyfr (z opcjonalną literą) to numer domu, reszta to ulica.
  const match = cleaned.match(/^(.*?)[\s]+(\d+\s*[a-zA-Z]?)\s*$/)
  if (!match) return null

  const street = match[1].trim()
  const number = match[2].trim()
  if (!street) return null

  return {
    street,
    number: normalizeNumber(number),
    streetKey: normalizeStreet(street),
    numberKey: normalizeNumber(number),
  }
}

// ---------------------------------------------------------------------------
// Rejon 5 — wyjątki. Sprawdzane W PIERWSZEJ KOLEJNOŚCI (przed regułami ulic).
// Klucz: znormalizowana nazwa ulicy. Wartość: konkretne numery domów.
// ---------------------------------------------------------------------------

const REGION_5_EXCEPTIONS: Record<string, string[]> = {
  chwalecicka: ["12D", "16", "16A", "18A", "18C", "18D", "22", "22A", "22B", "24", "24A"],
  dworcowa: ["37", "39", "43A"],
  glowna: [
    "33", "37A", "64", "64A", "64C", "66", "68", "70A", "70B", "72", "72A",
    "91", "93", "95", "95A", "97", "138", "138A",
  ],
  "franciszka prusa": ["15A", "20C", "20D", "20E", "33", "33A", "33B", "33C"],
  lakowa: ["7"],
  poprzeczna: ["2", "4", "6", "110", "112", "114", "116"],
  suminska: ["15", "15A", "17A", "37", "37A", "68D", "68G", "88C"],
  swierkowa: ["9A", "9B", "9C", "23A", "27A"],
  "za koleja": ["46", "46A", "48", "50", "50A", "50C", "50D", "50E"],
}

// Ulice o stałym rejonie (niezależnie od numeru — poza wyjątkami rejonu 5).
const STATIC_STREET_REGIONS: Record<string, Region> = {
  // Rejon 2
  brzozowa: 2,
  "franciszka prusa": 2,
  gajowa: 2,
  gorska: 2,
  lakowa: 2,
  niewiadomska: 2,
  prosta: 2,
  pustki: 2,
  zielona: 2,
  // Rejon 3
  krotka: 3,
  lesna: 3,
  polna: 3,
  przemyslowa: 3,
  sosnowa: 3,
  suminska: 3,
  swierkowa: 3,
  "za koleja": 3,
  // Rejon 4
  chwalecicka: 4,
  dworcowa: 4,
  mostowa: 4,
  "przed koleja": 4,
  wiatrczna: 4,
}

// Zbiór numerów Niedobczyckiej należących do rejonu 2 (reszta -> rejon 1).
const NIEDOBCZYCKA_REGION_2 = new Set(["18", "18A", "18B", "20", "22"])

// ---------------------------------------------------------------------------
// Rozpoznawanie rejonu na podstawie ulicy i numeru.
// ---------------------------------------------------------------------------

export function resolveRegion(parsed: ParsedAddress): Region | null {
  const { streetKey, numberKey } = parsed
  const numeric = Number.parseInt(numberKey, 10)

  // 1) Wyjątki rejonu 5 — najpierw.
  const exceptions = REGION_5_EXCEPTIONS[streetKey]
  if (exceptions && exceptions.includes(numberKey)) {
    return 5
  }

  // 2) Ulice z regułą zależną od numeru.
  switch (streetKey) {
    case "glowna":
      if (Number.isNaN(numeric)) return null
      return numeric % 2 === 1 ? 1 : 3 // nieparzyste -> R1, parzyste -> R3
    case "niedobczycka":
      return NIEDOBCZYCKA_REGION_2.has(numberKey) ? 2 : 1
    case "poprzeczna":
      if (!Number.isNaN(numeric) && numeric >= 138 && numeric <= 144) return 3
      return 4
    case "szkolna":
      return numberKey === "9" ? 4 : 3
    default:
      break
  }

  // 3) Ulice o stałym rejonie.
  const staticRegion = STATIC_STREET_REGIONS[streetKey]
  if (staticRegion) return staticRegion

  return null
}

// ---------------------------------------------------------------------------
// Podział ulic dla odbioru odpadów SEGREGOWANYCH (papier, plastik, szkło).
//
// To NIEZALEŻNY podział — odwzorowany 1:1 z urzędowej tabeli
// „Podział ulic dla odbioru odpadów segregowanych (papier, plastik, szkło)"
// harmonogramu Gminy Jejkowice 2026. Dla segregowanych istnieją WYŁĄCZNIE
// rejony 1–4 (brak Rejonu 5). Numer rejonu segregowanych NIE jest wyliczany
// z głównego rejonu adresu — jest ustalany samodzielnie z poniższych tabel.
//
// Struktura (analogiczna do reguł głównych):
//   • SEGREGATED_NUMBER_RULES   – ulice, gdzie rejon zależy od numeru domu,
//   • SEGREGATED_STREET_REGIONS – ulice o stałym rejonie segregowanych.
//
// Klucz: znormalizowana nazwa ulicy (jak w resolveRegion).
// Wartość: numer rejonu segregowanych (niezależny identyfikator 1–4).
// ---------------------------------------------------------------------------

// Numery Niedobczyckiej należące do segregowanego Rejonu 2 (reszta → Rejon 1).
const NIEDOBCZYCKA_SEG_REGION_2 = new Set(["18", "18A", "18B", "20", "22"])

const SEGREGATED_NUMBER_RULES: Record<
  string,
  (numberKey: string, numeric: number) => SegregatedRegion | null
> = {
  // Główna: nieparzyste → Rejon 1, parzyste → Rejon 3.
  glowna: (_key, numeric) =>
    Number.isNaN(numeric) ? null : numeric % 2 === 1 ? 1 : 3,
  // Niedobczycka: 18,18A,18B,20,22 → Rejon 2, pozostałe → Rejon 1.
  niedobczycka: (numberKey) => (NIEDOBCZYCKA_SEG_REGION_2.has(numberKey) ? 2 : 1),
  // Poprzeczna: numery 138–144 → Rejon 3, pozostałe → Rejon 4.
  poprzeczna: (_key, numeric) =>
    !Number.isNaN(numeric) && numeric >= 138 && numeric <= 144 ? 3 : 4,
  // Szkolna: numer 9 → Rejon 4, pozostałe → Rejon 3.
  szkolna: (numberKey) => (numberKey === "9" ? 4 : 3),
}

const SEGREGATED_STREET_REGIONS: Record<string, SegregatedRegion> = {
  // Rejon segregowany 2
  brzozowa: 2,
  "franciszka prusa": 2,
  gajowa: 2,
  gorska: 2,
  lakowa: 2,
  niewiadomska: 2,
  prosta: 2,
  pustki: 2,
  zielona: 2,
  // Rejon segregowany 3
  krotka: 3,
  lesna: 3,
  polna: 3,
  przemyslowa: 3,
  sosnowa: 3,
  suminska: 3,
  swierkowa: 3,
  "za koleja": 3,
  // Rejon segregowany 4
  chwalecicka: 4,
  dworcowa: 4,
  mostowa: 4,
  "przed koleja": 4,
  wiatrczna: 4,
}

// Rozpoznanie rejonu segregowanych na podstawie ulicy i numeru — NIEZALEŻNIE
// od głównego rejonu. Zwraca numer rejonu segregowanych (1–4) lub null, gdy
// ulica nie występuje w urzędowej tabeli segregowanych (bez cichego fallbacku).
export function resolveSegregatedRegion(parsed: ParsedAddress): SegregatedRegion | null {
  const { streetKey, numberKey } = parsed
  const numeric = Number.parseInt(numberKey, 10)

  // 1) Reguły zależne od numeru domu (dla segregowanych).
  const numberRule = SEGREGATED_NUMBER_RULES[streetKey]
  if (numberRule) {
    const result = numberRule(numberKey, numeric)
    if (result !== null) return result
  }

  // 2) Ulice o stałym rejonie segregowanych.
  const staticRegion = SEGREGATED_STREET_REGIONS[streetKey]
  if (staticRegion !== undefined) return staticRegion

  return null
}

// ---------------------------------------------------------------------------
// HARMONOGRAM 2026 — dane rzeczywiste z urzędowego harmonogramu gminy.
//
// Struktura: dla każdego rejonu tablica 12 miesięcy (0 = styczeń … 11 = grudzień),
// a każdy miesiąc to lista dni odbioru (może być kilka terminów lub żaden).
// ---------------------------------------------------------------------------

type MonthlyDays = number[][] // 12 miesięcy × lista dni

// --- Odpady zmieszane (ZM) ---
const ZMIESZANE: Record<Region, MonthlyDays> = {
  1: [[23], [24], [24], [9, 21], [5, 19], [2, 16, 30], [14, 28], [11, 25], [8, 22], [6, 20], [17], [10]],
  2: [[23], [24], [24], [9, 21], [5, 19], [2, 16, 30], [14, 28], [11, 25], [8, 22], [6, 20], [17], [10]],
  3: [[2, 27], [26], [26], [10, 23], [7, 21], [5, 18], [2, 16, 30], [13, 27], [10, 24], [8, 22], [19], [11]],
  4: [[8, 29], [27], [27], [14, 24], [8, 22], [6, 19], [3, 17, 31], [14, 28], [11, 25], [9, 23], [20], [15]],
  5: [[16], [6], [6], [3, 17], [5, 15, 29], [12, 26], [10, 24], [7, 21], [4, 18], [2, 16, 30], [27], [22]],
}

// --- Popiół (P) — odbierany 1 października – 30 kwietnia ---
const POPIOL: Record<Region, MonthlyDays> = {
  1: [[15], [10], [10], [11], [], [], [], [], [], [6], [3], [1, 29]],
  2: [[15], [10], [10], [9], [], [], [], [], [], [10], [3], [1, 29]],
  3: [[20], [12], [12], [11], [], [], [], [], [], [8], [5], [3]],
  4: [[22], [13], [13], [14], [], [], [], [], [], [10], [6], [4]],
  5: [[16], [6], [6], [3], [], [], [], [], [], [30], [27], [22]],
}

// --- Bioodpady (B) ---
const BIO: Record<Region, MonthlyDays> = {
  1: [[9], [3], [3, 31], [16, 28], [12, 26], [9, 23], [7, 21], [4, 18], [1, 15, 29], [13, 27], [24], [17]],
  2: [[13], [5], [5], [2, 17, 30], [14, 28], [11, 25], [9, 23], [6, 20], [3, 17], [15, 29], [26], [18]],
  3: [[9], [3], [3, 31], [16, 28], [12, 26], [9, 23], [7, 21], [4, 18], [1, 15, 29], [13, 27], [24], [17]],
  4: [[13], [5], [5], [2, 17, 30], [14, 28], [11, 25], [9, 23], [6, 20], [3, 17], [15, 29], [26], [18]],
  5: [[16], [6], [6], [3, 17], [5, 15, 29], [12, 26], [10, 24], [7, 21], [4, 18], [2, 16, 30], [27], [22]],
}

// --- Gabaryty — raz w roku, w drugiej połowie września ---
const GABARYTY: Record<Region, MonthlyDays> = {
  1: [[], [], [], [], [], [], [], [], [21], [], [], []],
  2: [[], [], [], [], [], [], [], [], [24], [], [], []],
  3: [[], [], [], [], [], [], [], [], [16], [], [], []],
  4: [[], [], [], [], [], [], [], [], [28], [], [], []],
  5: [[], [], [], [], [], [], [], [], [18], [], [], []],
}

// --- Odpady segregowane (S) — kluczowane NIEZALEŻNYM rejonem segregowanych ---
// Terminy odbioru dla każdego rejonu segregowanych z osobnej tabeli harmonogramu.
// Klucz to numer rejonu segregowanych (SegregatedRegion), a nie główny rejon adresu.
const SEGREGOWANE: Record<SegregatedRegion, MonthlyDays> = {
  1: [[15], [13], [13], [15], [15], [15], [16], [14], [15], [15], [16], [15]],
  2: [[16], [17], [17], [16], [19], [16], [17], [18], [16], [16], [17], [16]],
  3: [[15], [13], [13], [15], [15], [15], [16], [14], [15], [15], [16], [15]],
  4: [[16], [17], [17], [16], [19], [16], [17], [18], [16], [16], [17], [16]],
}

// ---------------------------------------------------------------------------
// Budowa listy dat odbioru dla danego rejonu i rodzaju odpadów.
// ---------------------------------------------------------------------------

// Zwraca terminy dla danego rodzaju odpadów.
//   • zmieszane / bio / popiol / gabaryty → sterowane głównym rejonem (region),
//   • segregowane → sterowane NIEZALEŻNYM rejonem segregowanych (regionSegregowane).
function monthlyFor(
  kind: WasteKind,
  region: Region,
  regionSegregowane: SegregatedRegion | null,
): MonthlyDays | null {
  switch (kind) {
    case "zmieszane":
      return ZMIESZANE[region]
    case "popiol":
      return POPIOL[region]
    case "bio":
      return BIO[region]
    case "gabaryty":
      return GABARYTY[region]
    case "segregowane":
      // Wyłącznie rejon segregowanych — niezależny od głównego rejonu adresu.
      if (regionSegregowane === null) return null
      return SEGREGOWANE[regionSegregowane] ?? null
    default:
      return null
  }
}

export type Pickup = {
  kind: WasteKind
  label: string
  color: string
  date: Date
}

// Wszystkie odbiory (dla wszystkich rodzajów) w roku, posortowane rosnąco.
// region → zmieszane/bio/popiol/gabaryty; regionSegregowane → segregowane.
export function buildPickups(region: Region, regionSegregowane: SegregatedRegion | null): Pickup[] {
  const pickups: Pickup[] = []
  for (const type of WASTE_TYPES) {
    const monthly = monthlyFor(type.kind, region, regionSegregowane)
    if (!monthly) continue
    monthly.forEach((days, monthIdx) => {
      for (const day of days) {
        if (!day) continue
        pickups.push({
          kind: type.kind,
          label: type.label,
          color: type.color,
          date: new Date(SCHEDULE_YEAR, monthIdx, day),
        })
      }
    })
  }
  return pickups.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// Najbliższy odbiór każdego rodzaju odpadów, licząc od podanej daty.
export function nextPickupsByType(
  region: Region,
  regionSegregowane: SegregatedRegion | null,
  from: Date,
): Pickup[] {
  const startOfDay = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const all = buildPickups(region, regionSegregowane)
  const result: Pickup[] = []
  for (const type of WASTE_TYPES) {
    const upcoming = all
      .filter((p) => p.kind === type.kind && p.date.getTime() >= startOfDay.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    if (upcoming.length > 0) result.push(upcoming[0])
  }
  return result.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// Lista nadchodzących odbiorów (wszystkie rodzaje) od podanej daty.
export function upcomingPickups(
  region: Region,
  regionSegregowane: SegregatedRegion | null,
  from: Date,
  limit = 12,
): Pickup[] {
  const startOfDay = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return buildPickups(region, regionSegregowane)
    .filter((p) => p.date.getTime() >= startOfDay.getTime())
    .slice(0, limit)
}

// ---------------------------------------------------------------------------
// Pomocnicze formatowanie dat po polsku.
// ---------------------------------------------------------------------------

const MONTHS_LONG = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
]

const MONTHS_SHORT = [
  "STY", "LUT", "MAR", "KWI", "MAJ", "CZE",
  "LIP", "SIE", "WRZ", "PAŹ", "LIS", "GRU",
]

const WEEKDAYS = [
  "niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota",
]

export function formatLongDate(date: Date): string {
  return `${date.getDate()} ${MONTHS_LONG[date.getMonth()]}`
}

export function monthShort(date: Date): string {
  return MONTHS_SHORT[date.getMonth()]
}

export function weekday(date: Date): string {
  return WEEKDAYS[date.getDay()]
}

export function relativeLabel(date: Date, from: Date): string {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((target.getTime() - start.getTime()) / 86_400_000)
  if (diffDays <= 0) return "Dzisiaj"
  if (diffDays === 1) return "Jutro"
  if (diffDays < 7) return `Za ${diffDays} dni`
  if (diffDays < 14) return "Za tydzień"
  return `Za ${Math.round(diffDays / 7)} tyg.`
}

// ---------------------------------------------------------------------------
// Adres zapisany w pamięci przeglądarki — współdzielony przez stronę główną
// oraz podstronę „Wywóz śmieci".
// ---------------------------------------------------------------------------

export const WASTE_STORAGE_KEY = "jejkowice-waste-address"

export type SavedAddress = {
  label: string
  region: Region
  // Niezależny rejon segregowanych (1–4) lub null, gdy adresu nie ma w tabeli
  // segregowanych. NIE jest równy głównemu rejonowi — poza kompatybilnością
  // starych zapisów (patrz readSavedAddress).
  regionSegregowane: SegregatedRegion | null
}

export function readSavedAddress(): SavedAddress | null {
  try {
    const raw = localStorage.getItem(WASTE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SavedAddress>
    if (parsed?.label && parsed?.region) {
      // Rozróżniamy stary zapis (brak pola) od nowego (pole obecne, może być null).
      const hasSegregatedField = Object.prototype.hasOwnProperty.call(
        parsed,
        "regionSegregowane",
      )
      return {
        label: parsed.label,
        region: parsed.region,
        // Kompatybilność: TYLKO stare zapisy bez pola dziedziczą główny rejon.
        // Nowe zapisy zachowują swoją wartość (również null — bez fallbacku).
        regionSegregowane: hasSegregatedField
          ? (parsed.regionSegregowane ?? null)
          : parsed.region,
      }
    }
    return null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Wyłuskanie adresu z dowolnego zdania (np. „kiedy wywóz na Głównej 33?").
//
// Używane PO STRONIE SERWERA, gdy mieszkaniec NIE zapisał adresu w module,
// ale podał go bezpośrednio w pytaniu do czatu. Dzięki temu AI potrafi samo
// ustalić rejon i podać termin — bez odsyłania do modułu.
//
// Bezpieczeństwo: akceptujemy tylko kandydatów, których ulica + numer faktycznie
// rozpoznają rejon (resolveRegion !== null). Losowe liczby w zdaniu są odrzucane.
// Dłuższe nazwy ulic testujemy najpierw (np. „Franciszka Prusa" przed „Prusa").
// ---------------------------------------------------------------------------
// Warianty klucza ulicy uwzględniające polską odmianę przez przypadki.
// Mieszkańcy piszą „na Głównej / Leśnej / Sumińskiej", a tabele używają mianownika
// („glowna", „lesna", „suminska"). Nazwy ulic w Jejkowicach to głównie przymiotniki
// żeńskie, więc końcówki dopełniacza/miejscownika „-(i)ej" sprowadzamy do „-a".
function streetKeyCandidates(key: string): string[] {
  const out = [key]
  if (key.endsWith("iej")) out.push(`${key.slice(0, -3)}a`) // gorskiej → gorska
  else if (key.endsWith("ej")) out.push(`${key.slice(0, -2)}a`) // glownej → glowna
  return out
}

export function extractAddressFromText(text: string): SavedAddress | null {
  const cleaned = text
    .replace(/[,.;:!?()]/g, " ")
    .replace(/\bul\.?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!cleaned) return null

  const tokens = cleaned.split(" ")
  for (let i = 0; i < tokens.length; i++) {
    // Token będący numerem domu, np. „33" lub „33A".
    const numMatch = tokens[i].match(/^(\d+[a-zA-Z]?)$/)
    if (!numMatch) continue
    const number = numMatch[1]

    // Nazwa ulicy = 1–3 słowa tuż przed numerem; próbujemy od najdłuższej.
    for (let words = Math.min(3, i); words >= 1; words--) {
      const street = tokens.slice(i - words, i).join(" ")
      const parsed = parseAddress(`${street} ${number}`)
      if (!parsed) continue

      // Sprawdzamy klucz dosłowny oraz warianty po sprowadzeniu odmiany do mianownika.
      for (const key of streetKeyCandidates(parsed.streetKey)) {
        const candidate: ParsedAddress = { ...parsed, streetKey: key }
        const region = resolveRegion(candidate)
        if (region == null) continue
        const regionSegregowane = resolveSegregatedRegion(candidate)
        return {
          label: `${parsed.street} ${parsed.number}`,
          region,
          regionSegregowane,
        }
      }
    }
  }
  return null
}

// Data odniesienia — jeśli aktualny rok wykracza poza harmonogram,
// pokazujemy pełny rok referencyjny.
export function referenceDate(): Date {
  const now = new Date()
  if (now.getFullYear() !== SCHEDULE_YEAR) return new Date(SCHEDULE_YEAR, 0, 1)
  return now
}

// ---------------------------------------------------------------------------
// Zwięzły opis harmonogramu dla asystenta AI.
//
// Używany PO STRONIE SERWERA (czat AI) wtedy, gdy mieszkaniec zapisał już adres
// w module „Wywóz śmieci" (adres jest przesyłany z przeglądarki do API czatu).
// Dzięki temu AI odpowiada na pytania „kiedy wywóz śmieci" z NASZEGO harmonogramu,
// bez odpytywania zewnętrznych źródeł i bez ponownego pytania o adres.
//
// Uwaga: ta funkcja jest czysta (bez localStorage), więc można ją bezpiecznie
// wywołać na serwerze — wystarczy przekazać zapisany adres.
// ---------------------------------------------------------------------------
export function describeWasteScheduleForAI(saved: SavedAddress): string {
  const from = referenceDate()
  const nextByType = nextPickupsByType(saved.region, saved.regionSegregowane, from)
  const upcoming = upcomingPickups(saved.region, saved.regionSegregowane, from, 8)

  const header = `Adres mieszkańca: ${saved.label} (rejon ${saved.region}${
    saved.regionSegregowane
      ? `, rejon segregowanych ${saved.regionSegregowane}`
      : ", brak rejonu segregowanych — bez terminów papieru/plastiku/szkła"
  }). Harmonogram na rok ${SCHEDULE_YEAR}.`

  const nextLines = nextByType.map(
    (p) => `- ${p.label}: ${formatLongDate(p.date)} ${SCHEDULE_YEAR} (${weekday(p.date)}, ${relativeLabel(p.date, from)})`,
  )
  const upcomingLines = upcoming.map(
    (p) => `- ${formatLongDate(p.date)} (${weekday(p.date)}) — ${p.label}`,
  )

  const parts = [header]
  if (nextLines.length) parts.push(`Najbliższy odbiór każdego rodzaju odpadów:\n${nextLines.join("\n")}`)
  if (upcomingLines.length) parts.push(`Kolejne najbliższe terminy (wszystkie rodzaje):\n${upcomingLines.join("\n")}`)
  if (nextLines.length === 0 && upcomingLines.length === 0) {
    parts.push(`Brak nadchodzących terminów w roku ${SCHEDULE_YEAR}.`)
  }
  return parts.join("\n")
}
