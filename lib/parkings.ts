/**
 * Parking przypięty do konkretnego wydarzenia.
 *
 * Parkingi są ustawiane w pickerze mapy w panelu admina (obok pinezki docelowej)
 * i zapisywane w kolumnie JSONB `parkings` na wierszu wydarzenia
 * (patrz scripts/011_event_parkings.sql). Nie ma osobnej, globalnej tabeli.
 */
export type ParkingSpot = {
  name: string
  lat: number
  lng: number
}

/**
 * Bezpiecznie zamienia wartość z bazy (jsonb) lub z formularza na listę parkingów.
 *
 * Odrzuca pozycje bez poprawnych współrzędnych. Braki nazwy uzupełnia „Parking N",
 * dzięki czemu popup na mapie zawsze ma sensowny podpis.
 */
export function parseParkings(value: unknown): ParkingSpot[] {
  let raw: unknown = value
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(raw)) return []

  const spots: ParkingSpot[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const lat = Number(rec.lat)
    const lng = Number(rec.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const name = String(rec.name ?? '').trim() || `Parking ${spots.length + 1}`
    spots.push({ name, lat, lng })
  }
  return spots
}
