'use client'

// ---------------------------------------------------------------------------
// Opcjonalny picker lokalizacji dla mieszkańca w formularzu zgłoszenia.
//
// Mieszkaniec klika miejsce na mapie, a my odwrotnie geokodujemy punkt (Nominatim
// OSM) na adres „Ulica Nr” i wpisujemy go do pola lokalizacji. Dzięki temu nie
// musi znać dokładnej nazwy ulicy, a zgłoszenie i tak zapisze się jako tekst —
// bez żadnych zmian w bazie (tabela `reports` trzyma tylko `location`).
//
// MapLibre GL ładujemy z CDN (ta sama ładowarka co panel admina), kafle wektorowe
// OpenFreeMap bez klucza; awaryjnie rastrowy OSM.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react'
import type { Map as MlMap, Marker as MlMarker, StyleSpecification } from 'maplibre-gl'
import { Loader2, MapPin, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { loadMapLibre } from '@/lib/maplibre-loader'
import { JEJKOWICE_CENTER, resolveStreet } from '@/lib/jejkowice-streets'
import {
  JEJKOWICE_BOUNDARY,
  JEJKOWICE_BOUNDS,
  isInsideJejkowice,
} from '@/lib/jejkowice-boundary'

const VECTOR_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

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

function createPinElement() {
  const el = document.createElement('div')
  el.style.cssText =
    'display:flex;align-items:center;justify-content:center;width:32px;height:32px;' +
    'border-radius:9999px;background:oklch(0.52 0.2 264);color:#fff;' +
    'box-shadow:0 3px 10px rgba(0,0,0,.35);border:3px solid #fff'
  el.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>' +
    '<circle cx="12" cy="10" r="3"/></svg>'
  return el
}

/**
 * Rysuje obrys gminy Jejkowice + przyciemnioną maskę na zewnątrz granic.
 * Maska to wielokąt „cały świat z dziurą w kształcie gminy” — dzięki temu
 * obszar poza gminą jest wyszarzony i wizualnie wyłączony z wyboru.
 */
function drawBoundary(map: MlMap) {
  if (map.getSource('gmina')) return

  const world: [number, number][] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ]

  map.addSource('gmina-mask', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      // Zewnętrzny pierścień = świat, wewnętrzny = gmina (dziura).
      geometry: { type: 'Polygon', coordinates: [world, JEJKOWICE_BOUNDARY] },
    },
  })
  map.addLayer({
    id: 'gmina-mask',
    type: 'fill',
    source: 'gmina-mask',
    paint: { 'fill-color': '#0b1120', 'fill-opacity': 0.55 },
  })

  map.addSource('gmina', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [JEJKOWICE_BOUNDARY] },
    },
  })
  map.addLayer({
    id: 'gmina-outline',
    type: 'line',
    source: 'gmina',
    paint: { 'line-color': 'oklch(0.52 0.2 264)', 'line-width': 2.5, 'line-opacity': 0.9 },
  })
}

/**
 * Odwrotne geokodowanie punktu → sama nazwa ulicy (bez numeru domu).
 * Numeru celowo nie dopisujemy — wskazanie na mapie ma dać ulicę, a dokładne
 * miejsce niesie pinezka (współrzędne). Numer mieszkaniec może dopisać ręcznie.
 */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'pl' } })
    const data = (await res.json()) as {
      address?: {
        road?: string
        pedestrian?: string
        residential?: string
        footway?: string
      }
    }
    const a = data.address ?? {}
    const road = a.road || a.pedestrian || a.residential || a.footway
    if (!road) return null
    return road
  } catch {
    return null
  }
}

export function ReportMapPicker({
  value,
  onPick,
}: {
  value: string
  onPick: (address: string, coords: { lat: number; lng: number }) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const markerRef = useRef<MlMarker | null>(null)
  const mlRef = useRef<typeof import('maplibre-gl') | null>(null)

  useEffect(() => {
    let cancelled = false

    // Jeśli mieszkaniec zaczął już wpisywać rozpoznaną ulicę, wyśrodkuj na niej.
    const known = resolveStreet(value)
    const start = known ? { lat: known.lat, lng: known.lng } : JEJKOWICE_CENTER

    loadMapLibre().then((maplibregl) => {
      if (cancelled || !mapEl.current || mapRef.current) return
      mlRef.current = maplibregl

      const map = new maplibregl.Map({
        container: mapEl.current,
        style: VECTOR_STYLE_URL,
        center: [start.lng, start.lat],
        zoom: known ? 16 : 13.5,
        minZoom: 12,
        // Kadr ograniczony do okolic gminy (bbox z niewielkim marginesem),
        // więc mieszkaniec nie „ucieknie” mapą do innej miejscowości.
        maxBounds: [
          [JEJKOWICE_BOUNDS[0][0] - 0.012, JEJKOWICE_BOUNDS[0][1] - 0.012],
          [JEJKOWICE_BOUNDS[1][0] + 0.012, JEJKOWICE_BOUNDS[1][1] + 0.012],
        ],
        attributionControl: { compact: true },
      })
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      map.on('load', () => {
        map.resize()
        drawBoundary(map)
      })
      map.on('error', (e: { error?: { message?: string } }) => {
        if (String(e?.error?.message ?? '').toLowerCase().includes('style')) {
          map.setStyle(RASTER_FALLBACK)
          map.once('styledata', () => drawBoundary(map))
        }
      })

      map.on('click', async (e: { lngLat: { lat: number; lng: number } }) => {
        const point = { lat: e.lngLat.lat, lng: e.lngLat.lng }

        // Twardy filtr granicy gminy — punkty spoza Jejkowic odrzucamy zanim
        // w ogóle odpytamy geokoder (np. „Polna” istnieje też w sąsiednich
        // miejscowościach, więc sam adres tekstowy by nie wystarczył).
        if (!isInsideJejkowice(point.lng, point.lat)) {
          setLoading(false)
          setError('To miejsce jest poza gminą Jejkowice. Wskaż punkt w obrębie zaznaczonego obszaru.')
          return
        }

        if (markerRef.current) {
          markerRef.current.setLngLat([point.lng, point.lat])
        } else {
          markerRef.current = new maplibregl.Marker({ element: createPinElement(), anchor: 'bottom' })
            .setLngLat([point.lng, point.lat])
            .addTo(map)
        }

        setError(null)
        setLoading(true)
        const address = await reverseGeocode(point.lat, point.lng)
        setLoading(false)
        if (address) {
          // Przekazujemy DOKŁADNY punkt kliknięcia razem z rozpoznanym adresem —
          // pinezka w panelu admina trafi wtedy tam, gdzie mieszkaniec wskazał,
          // a nie na najbliższy numer domu wyznaczony przez geokoder.
          onPick(address, point)
        } else {
          setError('Nie rozpoznano adresu w tym miejscu. Kliknij bliżej ulicy.')
        }
      })

      mapRef.current = map
    })

    return () => {
      cancelled = true
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pełny ekran zmienia rozmiar kontenera mapy — MapLibre musi się przeliczyć.
  // Blokujemy też scroll strony i wychodzimy z trybu klawiszem Escape.
  useEffect(() => {
    const raf = requestAnimationFrame(() => mapRef.current?.resize())
    if (!fullscreen) return () => cancelAnimationFrame(raf)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen])

  return (
    <div
      className={cn(
        'mt-2 grid min-w-0 gap-1.5',
        fullscreen &&
          'fixed inset-0 z-[1000] mt-0 grid-rows-[1fr_auto] gap-2 bg-background p-3 md:p-4',
      )}
    >
      <div className={cn('relative min-w-0', fullscreen && 'min-h-0')}>
        <div
          ref={mapEl}
          className={cn(
            'map-clip w-full min-w-0 overflow-hidden rounded-lg border border-border [transform:translateZ(0)]',
            fullscreen ? 'h-full' : 'h-56',
          )}
          style={{ zIndex: 0 }}
          role="application"
          aria-label="Mapa — kliknij, aby wskazać miejsce zgłoszenia"
        />
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          aria-label={fullscreen ? 'Zamknij pełny ekran' : 'Otwórz mapę na pełnym ekranie'}
          className="absolute left-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/90 px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:border-primary/40"
        >
          {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          {fullscreen ? 'Zamknij' : 'Pełny ekran'}
        </button>
      </div>
      <p className="flex min-h-[2.5rem] items-start gap-1.5 text-xs text-muted-foreground text-pretty">
        {loading ? (
          <>
            <Loader2 className="mt-px size-3.5 shrink-0 animate-spin" />
            Rozpoznaję adres wskazanego miejsca…
          </>
        ) : (
          <>
            <MapPin className="mt-px size-3.5 shrink-0" />
            Kliknij na mapie, a adres uzupełni się automatycznie.
          </>
        )}
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
