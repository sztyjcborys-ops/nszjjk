// ---------------------------------------------------------------------------
// Ulice gminy Jejkowice + ich przybliżone współrzędne na mapie.
//
// Lista ulic jest spójna z silnikiem harmonogramu odpadów (lib/waste-schedule.ts).
// Współrzędne pochodzą z geokodowania OpenStreetMap (Photon) i wskazują realne
// położenie każdej ulicy w gminie Jejkowice (powiat rybnicki). Służą do
// umiejscowienia zgłoszeń na mapie (mieszkaniec podaje adres tekstem).
// ---------------------------------------------------------------------------

export type JejkowiceStreet = {
  /** Nazwa wyświetlana, np. „Główna”. */
  name: string
  /** Znormalizowany klucz (małe litery, bez polskich znaków) do dopasowań. */
  key: string
  lat: number
  lng: number
}

/** Centrum gminy — domyślny widok mapy. */
export const JEJKOWICE_CENTER = { lat: 50.1055, lng: 18.4745 }

function stripDiacritics(input: string): string {
  const map: Record<string, string> = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ż: 'z', ź: 'z',
  }
  return input.replace(/[ąćęłńóśżź]/g, (ch) => map[ch] ?? ch)
}

/** Normalizacja nazwy ulicy — spójna z lib/waste-schedule.ts. */
export function normalizeStreet(input: string): string {
  return stripDiacritics(input.trim().toLowerCase()).replace(/\s+/g, ' ').trim()
}

// Nazwy + realne współrzędne. Współrzędne to środkowy wierzchołek geometrii
// drogi w OSM (Overpass API, ograniczone do granic administracyjnych gminy
// Jejkowice, admin_level=8). Środkowy wierzchołek zawsze LEŻY na jezdni — dzięki
// temu pinezka trafia na właściwą ulicę, także dla dróg zakrzywionych/łamanych,
// gdzie zwykła średnia współrzędnych wypadała obok ulicy.
export const JEJKOWICE_STREETS: JejkowiceStreet[] = [
  { name: 'Główna', lat: 50.102787, lng: 18.481579 },
  { name: 'Dworcowa', lat: 50.109764, lng: 18.483376 },
  { name: 'Chwałęcicka', lat: 50.117263, lng: 18.483153 },
  { name: 'Franciszka Prusa', lat: 50.103066, lng: 18.459073 },
  { name: 'Łąkowa', lat: 50.098461, lng: 18.466579 },
  { name: 'Poprzeczna', lat: 50.108644, lng: 18.478514 },
  { name: 'Sumińska', lat: 50.111885, lng: 18.452576 },
  { name: 'Świerkowa', lat: 50.112523, lng: 18.456491 },
  { name: 'Za Koleją', lat: 50.114051, lng: 18.468956 },
  { name: 'Brzozowa', lat: 50.093747, lng: 18.476967 },
  { name: 'Gajowa', lat: 50.094245, lng: 18.470077 },
  { name: 'Górska', lat: 50.095497, lng: 18.463737 },
  { name: 'Niewiadomska', lat: 50.104047, lng: 18.470575 },
  { name: 'Prosta', lat: 50.103549, lng: 18.469202 },
  { name: 'Pustki', lat: 50.096337, lng: 18.475833 },
  { name: 'Zielona', lat: 50.102189, lng: 18.467457 },
  { name: 'Krótka', lat: 50.104628, lng: 18.477754 },
  { name: 'Leśna', lat: 50.115464, lng: 18.464186 },
  { name: 'Polna', lat: 50.11181, lng: 18.466266 },
  { name: 'Przemysłowa', lat: 50.113526, lng: 18.458521 },
  { name: 'Sosnowa', lat: 50.114727, lng: 18.480417 },
  { name: 'Mostowa', lat: 50.111193, lng: 18.471894 },
  { name: 'Przed Koleją', lat: 50.111801, lng: 18.475216 },
  { name: 'Wiatrczna', lat: 50.103542, lng: 18.48482 },
  { name: 'Niedobczycka', lat: 50.099657, lng: 18.479596 },
  { name: 'Szkolna', lat: 50.106986, lng: 18.474821 },
].map((s) => ({ ...s, key: normalizeStreet(s.name) }))

/** Posortowane nazwy ulic — do podpowiedzi w polach adresu. */
export const JEJKOWICE_STREET_NAMES: string[] = JEJKOWICE_STREETS.map((s) => s.name).sort(
  (a, b) => a.localeCompare(b, 'pl'),
)

// Dłuższe klucze najpierw, by „franciszka prusa” / „za koleja” dopasować przed
// ewentualnym krótszym fragmentem.
const STREETS_BY_KEY_LENGTH = [...JEJKOWICE_STREETS].sort((a, b) => b.key.length - a.key.length)

/**
 * Dopasowuje dowolny tekst lokalizacji (np. „ul. Główna 12”, „Leśna 3A”) do
 * ulicy z Jejkowic. Zwraca ulicę ze współrzędnymi albo null, gdy nie rozpoznano.
 */
export function resolveStreet(location: string | null | undefined): JejkowiceStreet | null {
  if (!location) return null
  const normalized = normalizeStreet(location.replace(/^ul\.?\s+/i, ''))
  if (!normalized) return null
  for (const street of STREETS_BY_KEY_LENGTH) {
    if (normalized.includes(street.key)) return street
  }
  return null
}
