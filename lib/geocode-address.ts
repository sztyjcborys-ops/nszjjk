'use client'

// ---------------------------------------------------------------------------
// Geokodowanie adresu zgłoszenia → realne współrzędne pinezki na mapie.
//
// Zgłoszenia trzymają w bazie tylko adres tekstowy (np. „Główna 12"). Wcześniej
// mapa stawiała pinezkę w JEDNYM zaszytym punkcie na ulicę (resolveStreet), więc
// numer domu był ignorowany i wszystkie zgłoszenia z tej samej ulicy lądowały w
// tym samym miejscu. Tutaj pytamy Nominatim (OSM) o pełny adres — ten sam
// darmowy geokoder, którego używa już LocationPicker — dzięki czemu „Główna 12"
// i „Główna 50" trafiają na właściwe, różne budynki.
//
// Wynik cache'ujemy w pamięci (na sesję) oraz w localStorage (między sesjami),
// żeby nie odpytywać Nominatim wielokrotnie o ten sam adres i nie łamać limitów.
// ---------------------------------------------------------------------------

import { normalizeStreet } from '@/lib/jejkowice-streets'

export type LatLng = { lat: number; lng: number }

/** Klucz cache/porównań dla adresu — spójny między mapą a geokoderem. */
export function locationKey(location: string): string {
  return normalizeStreet(location.replace(/^ul\.?\s+/i, ''))
}

// Cache w pamięci: adres → współrzędne (lub null = szukaliśmy, nie znaleziono).
const memory = new Map<string, LatLng | null>()
const STORAGE_PREFIX = 'jejkowice-geocode:'

function readStorage(key: string): LatLng | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as LatLng
    if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') return parsed
  } catch {
    // Uszkodzony wpis w localStorage ignorujemy.
  }
  return undefined
}

function writeStorage(key: string, value: LatLng) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // Brak miejsca / tryb prywatny — cache w pamięci wystarczy.
  }
}

/**
 * Zwraca realne współrzędne adresu w gminie Jejkowice albo null, gdy Nominatim
 * nic nie znalazł. Trafienia trafiają do cache (pamięć + localStorage), więc
 * kolejne wywołania dla tego samego adresu są natychmiastowe.
 */
export async function geocodeJejkowice(location: string): Promise<LatLng | null> {
  const key = locationKey(location)
  if (!key) return null

  if (memory.has(key)) return memory.get(key) ?? null

  const stored = readStorage(key)
  if (stored) {
    memory.set(key, stored)
    return stored
  }

  try {
    const query = `${location.replace(/^ul\.?\s+/i, '').trim()}, Jejkowice, Poland`
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pl&q=' +
      encodeURIComponent(query)
    const res = await fetch(url, { headers: { 'Accept-Language': 'pl' } })
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    if (data.length) {
      const hit: LatLng = { lat: Number(data[0].lat), lng: Number(data[0].lon) }
      if (Number.isFinite(hit.lat) && Number.isFinite(hit.lng)) {
        memory.set(key, hit)
        writeStorage(key, hit)
        return hit
      }
    }
    // Negatywny wynik cache'ujemy tylko w pamięci (na wypadek chwilowej awarii
    // sieci nie zapisujemy „braku" na stałe do localStorage).
    memory.set(key, null)
    return null
  } catch {
    return null
  }
}
