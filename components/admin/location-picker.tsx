'use client'

/**
 * Picker lokalizacji w panelu admina.
 *
 * MapLibre GL + darmowe kafle WEKTOROWE OpenFreeMap (styl "liberty"), bez klucza
 * API i bez znaku wodnego. Kliknięcie mapy ustawia pinezkę docelową ALBO dodaje
 * parking — zależnie od wybranego trybu. Wyszukiwarka korzysta z Nominatim (OSM).
 * Wybrane współrzędne i lista parkingów trafiają do ukrytych pól formularza.
 * Gdyby styl wektorowy zawiódł, spadamy na awaryjne kafle rastrowe OSM.
 */

import { useEffect, useRef, useState } from 'react'
import type { Map as MlMap, Marker as MlMarker, StyleSpecification } from 'maplibre-gl'
import { MapPin, Search, X, Loader2, ParkingSquare, Trash2 } from 'lucide-react'
import { loadMapLibre } from '@/lib/maplibre-loader'
import type { ParkingSpot } from '@/lib/parkings'

/** Domyślne centrum — gmina Jejkowice. */
const DEFAULT_CENTER = { lat: 50.0897, lng: 18.5019 }

/** Wektorowy styl OpenFreeMap (najwyższa jakość, bez klucza, bez watermarku). */
const VECTOR_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

/** Awaryjne kafle rastrowe OpenStreetMap, gdyby wektorowy styl zawiódł. */
const RASTER_FALLBACK: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

type LatLng = { lat: number; lng: number }
type Mode = 'target' | 'parking'

type LocationPickerProps = {
  latitude?: number | null
  longitude?: number | null
  /** Parkingi wydarzenia (do wczytania przy edycji). */
  parkings?: ParkingSpot[]
  /** Podpowiedź do wyszukiwarki (adres wpisany w formularzu). */
  addressHint?: string
  /** Wywoływane po zmianie pinezki — do podglądu na żywo. */
  onChange?: (lat: number | null, lng: number | null) => void
  /** Wywoływane po zmianie listy parkingów — do podglądu na żywo. */
  onParkingsChange?: (parkings: ParkingSpot[]) => void
}

/** Zwija panel informacji o źródle (ⓘ), by domyślnie pokazać tylko małą ikonę. */
function collapseAttribution(container: HTMLElement) {
  container
    .querySelectorAll('.maplibregl-ctrl-attrib.maplibregl-compact-show')
    .forEach((el) => el.classList.remove('maplibregl-compact-show'))
}

/** Pinezka docelowa jako element DOM (SVG, kolor marki). */
function createPinElement() {
  const el = document.createElement('div')
  el.style.cssText =
    'display:flex;align-items:center;justify-content:center;width:34px;height:34px;' +
    'border-radius:9999px;background:oklch(0.52 0.2 264);color:#fff;' +
    'box-shadow:0 3px 10px rgba(0,0,0,.35);border:3px solid #fff'
  el.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>' +
    '<circle cx="12" cy="10" r="3"/></svg>'
  return el
}

/** Znacznik parkingu — niebieski kwadrat z literą „P". */
function createParkingElement() {
  const el = document.createElement('div')
  el.style.cssText =
    'display:flex;align-items:center;justify-content:center;width:26px;height:26px;' +
    'border-radius:7px;background:#1d4ed8;color:#fff;font:700 15px/1 system-ui,sans-serif;' +
    'box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff'
  el.textContent = 'P'
  return el
}

export function LocationPicker({
  latitude,
  longitude,
  parkings: initialParkings,
  addressHint,
  onChange,
  onParkingsChange,
}: LocationPickerProps) {
  const hasInitial = typeof latitude === 'number' && typeof longitude === 'number'
  const [pos, setPos] = useState<LatLng | null>(
    hasInitial ? { lat: latitude as number, lng: longitude as number } : null,
  )
  const [parkings, setParkings] = useState<ParkingSpot[]>(initialParkings ?? [])
  const [mode, setMode] = useState<Mode>('target')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const markerRef = useRef<MlMarker | null>(null)
  const parkingMarkersRef = useRef<MlMarker[]>([])
  const mlRef = useRef<typeof import('maplibre-gl') | null>(null)
  // Wartości w refach, aby handler kliknięcia mapy widział aktualny stan
  // bez odtwarzania mapy przy każdej zmianie.
  const modeRef = useRef(mode)
  modeRef.current = mode
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onParkingsChangeRef = useRef(onParkingsChange)
  onParkingsChangeRef.current = onParkingsChange

  function updateParkings(next: ParkingSpot[]) {
    setParkings(next)
    onParkingsChangeRef.current?.(next)
  }

  // Inicjalizacja mapy (dynamiczny import — MapLibre działa tylko po stronie klienta).
  useEffect(() => {
    let cancelled = false

    loadMapLibre().then((maplibregl) => {
      if (cancelled || !mapEl.current || mapRef.current) return
      mlRef.current = maplibregl

      const start = pos ?? DEFAULT_CENTER
      const map = new maplibregl.Map({
        container: mapEl.current,
        style: VECTOR_STYLE_URL,
        center: [start.lng, start.lat],
        zoom: pos ? 16 : 14,
        attributionControl: { compact: true },
      })
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      map.on('load', () => {
        map.resize()
        if (mapEl.current) collapseAttribution(mapEl.current)
      })
      // Gdyby styl wektorowy się nie wczytał, spadamy na rastrowy OSM.
      map.on('error', (e: { error?: { message?: string } }) => {
        if (String(e?.error?.message ?? '').toLowerCase().includes('style')) {
          map.setStyle(RASTER_FALLBACK)
        }
      })

      if (pos) {
        markerRef.current = new maplibregl.Marker({ element: createPinElement(), anchor: 'bottom' })
          .setLngLat([pos.lng, pos.lat])
          .addTo(map)
      }

      map.on('click', (e: { lngLat: { lat: number; lng: number } }) => {
        const point = { lat: e.lngLat.lat, lng: e.lngLat.lng }
        if (modeRef.current === 'parking') {
          setParkings((prev) => {
            const next = [...prev, { name: `Parking ${prev.length + 1}`, ...point }]
            onParkingsChangeRef.current?.(next)
            return next
          })
        } else {
          setPos(point)
          onChangeRef.current?.(point.lat, point.lng)
        }
      })

      mapRef.current = map
    })

    return () => {
      cancelled = true
      markerRef.current?.remove()
      markerRef.current = null
      parkingMarkersRef.current.forEach((m) => m.remove())
      parkingMarkersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Odzwierciedlenie stanu `pos` na mapie (znacznik docelowy + widok).
  useEffect(() => {
    const maplibregl = mlRef.current
    const map = mapRef.current
    if (!maplibregl || !map || !pos) return

    if (markerRef.current) {
      markerRef.current.setLngLat([pos.lng, pos.lat])
    } else {
      markerRef.current = new maplibregl.Marker({ element: createPinElement(), anchor: 'bottom' })
        .setLngLat([pos.lng, pos.lat])
        .addTo(map)
    }
    map.panTo([pos.lng, pos.lat])
  }, [pos])

  // Odzwierciedlenie listy parkingów na mapie (niebieskie znaczniki „P").
  useEffect(() => {
    const maplibregl = mlRef.current
    const map = mapRef.current
    if (!maplibregl || !map) return

    parkingMarkersRef.current.forEach((m) => m.remove())
    parkingMarkersRef.current = []

    parkings.forEach((p) => {
      const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setText(p.name)
      const marker = new maplibregl.Marker({ element: createParkingElement(), anchor: 'center' })
        .setLngLat([p.lng, p.lat])
        .setPopup(popup)
        .addTo(map)
      parkingMarkersRef.current.push(marker)
    })
  }, [parkings])

  async function handleSearch() {
    const q = (query || addressHint || '').trim()
    if (!q) return
    setSearching(true)
    setSearchError(null)
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
        encodeURIComponent(q)
      const res = await fetch(url, { headers: { 'Accept-Language': 'pl' } })
      const data = (await res.json()) as Array<{ lat: string; lon: string }>
      if (!data.length) {
        setSearchError('Nie znaleziono adresu. Kliknij mapę, aby ustawić pinezkę ręcznie.')
        return
      }
      const next = { lat: Number(data[0].lat), lng: Number(data[0].lon) }
      setPos(next)
      onChange?.(next.lat, next.lng)
      mapRef.current?.flyTo({ center: [next.lng, next.lat], zoom: 16 })
    } catch {
      setSearchError('Nie udało się wyszukać adresu. Spróbuj ponownie lub kliknij mapę.')
    } finally {
      setSearching(false)
    }
  }

  function clearPin() {
    setPos(null)
    onChange?.(null, null)
    markerRef.current?.remove()
    markerRef.current = null
  }

  function renameParking(index: number, name: string) {
    updateParkings(parkings.map((p, i) => (i === index ? { ...p, name } : p)))
  }

  function removeParking(index: number) {
    updateParkings(parkings.filter((_, i) => i !== index))
  }

  const modeButtonBase =
    'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors'

  return (
    <div className="grid gap-2.5">
      {/* Ukryte pola wysyłane w formularzu */}
      <input type="hidden" name="latitude" value={pos ? pos.lat.toFixed(6) : ''} />
      <input type="hidden" name="longitude" value={pos ? pos.lng.toFixed(6) : ''} />
      <input type="hidden" name="parkings" value={JSON.stringify(parkings)} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-input bg-background px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                handleSearch()
              }
            }}
            placeholder={addressHint ? `Szukaj: ${addressHint}` : 'Szukaj adresu, np. ul. Główna 1, Jejkowice'}
            className="w-full bg-transparent py-2.5 text-sm outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Znajdź
        </button>
      </div>

      {/* Przełącznik trybu klikania na mapie */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setMode('target')}
          aria-pressed={mode === 'target'}
          className={`${modeButtonBase} ${
            mode === 'target' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MapPin className="size-4" />
          Pinezka docelowa
        </button>
        <button
          type="button"
          onClick={() => setMode('parking')}
          aria-pressed={mode === 'parking'}
          className={`${modeButtonBase} ${
            mode === 'parking' ? 'bg-navy text-navy-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ParkingSquare className="size-4" />
          Dodaj parking
        </button>
      </div>

      <div
        ref={mapEl}
        className="h-64 w-full overflow-hidden rounded-2xl border border-border"
        style={{ zIndex: 0 }}
        role="application"
        aria-label="Mapa do ustawienia pinezki i parkingów wydarzenia"
      />

      <p className="text-xs text-muted-foreground text-pretty">
        {mode === 'target'
          ? 'Tryb pinezki docelowej — kliknij mapę, aby ustawić miejsce wydarzenia.'
          : 'Tryb parkingów — każde kliknięcie mapy dodaje nowy parking. Nazwy zmienisz na liście poniżej.'}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="size-3.5" />
          {pos ? (
            <span className="font-medium text-foreground">
              {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
            </span>
          ) : (
            'Brak pinezki docelowej (opcjonalnie).'
          )}
        </span>
        {pos && (
          <button
            type="button"
            onClick={clearPin}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <X className="size-3.5" />
            Usuń pinezkę
          </button>
        )}
      </div>
      {searchError && <p className="text-xs text-destructive">{searchError}</p>}

      {/* Lista parkingów — zmiana nazwy i usuwanie */}
      {parkings.length > 0 && (
        <div className="grid gap-2 rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <ParkingSquare className="size-4 text-navy" />
            Parkingi ({parkings.length})
          </div>
          <ul className="grid gap-2">
            {parkings.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#1d4ed8] text-[11px] font-bold text-white">
                  P
                </span>
                <input
                  value={p.name}
                  onChange={(e) => renameParking(i, e.target.value)}
                  aria-label={`Nazwa parkingu ${i + 1}`}
                  className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring"
                />
                <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:inline">
                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                </span>
                <button
                  type="button"
                  onClick={() => removeParking(i)}
                  aria-label={`Usuń parking ${i + 1}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
