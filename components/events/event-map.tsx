'use client'

/**
 * Mapa lokalizacji wydarzenia.
 *
 * Używa MapLibre GL + darmowych kafli WEKTOROWYCH OpenFreeMap (styl "liberty").
 * OpenFreeMap jest w 100% darmowy, bez klucza API, bez limitów i bez znaku wodnego
 * (dane z OpenStreetMap). Wektory dają ostre napisy i płynny zoom — dużo wyższą
 * jakość niż zwykłe kafle rastrowe. MapLibre ładujemy z CDN (wersja UMD z wszytym
 * workerem), bo pakiet ESM nie renderuje kafli wektorowych pod Turbopackiem.
 * Gdyby styl wektorowy się nie wczytał, mapa spada na awaryjne kafle rastrowe OSM.
 * Bez pinezki centrujemy na gminie Jejkowice.
 *
 * Dodatkowo: przycisk pełnego ekranu (natywny FullscreenControl) oraz opcjonalny
 * przełącznik parkingów, który dorysowuje znaczniki „P" z listy w lib/event-parkings.
 */

import { useEffect, useRef, useState } from 'react'
import type { Map as MlMap, Marker as MlMarker, StyleSpecification } from 'maplibre-gl'
import { ParkingSquare, Lock, LockOpen } from 'lucide-react'
import { loadMapLibre } from '@/lib/maplibre-loader'
import type { ParkingSpot } from '@/lib/parkings'

/** Domyślne centrum — gmina Jejkowice. */
export const JEJKOWICE_CENTER = { lat: 50.0897, lng: 18.5019 }

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

type EventMapProps = {
  latitude?: number
  longitude?: number
  /** true = pokaż znacznik dokładnie w punkcie (gdy admin ustawił pinezkę) */
  hasPin: boolean
  className?: string
  /** Lista parkingów do pokazania po włączeniu przełącznika. */
  parkings?: ParkingSpot[]
}

/** Znacznik jako element DOM (spójny z pinezką w pickerze admina). */
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
    'box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid #fff;cursor:pointer'
  el.textContent = 'P'
  return el
}

/** Włącza / wyłącza wszystkie gesty ruchu po mapie (przesuwanie, zoom, obrót). */
function setMapInteractions(map: MlMap, enabled: boolean) {
  const handlers = [
    'dragPan',
    'scrollZoom',
    'boxZoom',
    'dragRotate',
    'keyboard',
    'doubleClickZoom',
    'touchZoomRotate',
    'touchPitch',
  ] as const
  for (const name of handlers) {
    const handler = (map as unknown as Record<string, { enable?: () => void; disable?: () => void }>)[name]
    if (enabled) handler?.enable?.()
    else handler?.disable?.()
  }
}

/** Zwija panel informacji o źródle (ⓘ), by domyślnie pokazać tylko małą ikonę. */
function collapseAttribution(container: HTMLElement) {
  container
    .querySelectorAll('.maplibregl-ctrl-attrib.maplibregl-compact-show')
    .forEach((el) => el.classList.remove('maplibregl-compact-show'))
}

export function EventMap({ latitude, longitude, hasPin, className, parkings = [] }: EventMapProps) {
  const lat = latitude ?? JEJKOWICE_CENTER.lat
  const lng = longitude ?? JEJKOWICE_CENTER.lng

  const wrapperEl = useRef<HTMLDivElement>(null)
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const markerRef = useRef<MlMarker | null>(null)
  const parkingMarkersRef = useRef<MlMarker[]>([])

  const [showParking, setShowParking] = useState(false)
  // Mapa startuje z zablokowanym ruchem (żeby nie „łapała" scrolla strony palcem).
  // Odblokowuje ją kliknięcie w mapę lub w pasek z komunikatem.
  const [locked, setLocked] = useState(true)
  const lockedRef = useRef(true)
  lockedRef.current = locked

  // Rozróżnianie „tąpnięcia" od przewijania strony palcem: zapamiętujemy punkt
  // i czas wciśnięcia, a przy puszczeniu odblokowujemy tylko gdy palec/kursor
  // ledwo się ruszył i gest był krótki. Dzięki temu scroll po mapie NIE liczy
  // się jako kliknięcie i nie odblokowuje przypadkiem.
  const tapStart = useRef<{ x: number; y: number; t: number } | null>(null)

  function handleMapPointerDown(e: React.PointerEvent) {
    if (!lockedRef.current) return
    tapStart.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }

  function handleMapPointerUp(e: React.PointerEvent) {
    if (!lockedRef.current) return
    const start = tapStart.current
    tapStart.current = null
    if (!start) return
    const movedX = Math.abs(e.clientX - start.x)
    const movedY = Math.abs(e.clientY - start.y)
    const elapsed = Date.now() - start.t
    if (movedX < 10 && movedY < 10 && elapsed < 400) setLocked(false)
  }

  useEffect(() => {
    let cancelled = false

    loadMapLibre().then((maplibregl) => {
      if (cancelled || !mapEl.current || mapRef.current) return

      const mapInstance = new maplibregl.Map({
        container: mapEl.current,
        style: VECTOR_STYLE_URL,
        center: [lng, lat],
        zoom: hasPin ? 16 : 14,
        attributionControl: { compact: true },
        // Przesuwanie jednym palcem (bez trybu „dwóch palców”).
        cooperativeGestures: false,
      })
      mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      // Przycisk pełnego ekranu — rozwija mapę na całe okno przeglądarki.
      mapInstance.addControl(
        new maplibregl.FullscreenControl({ container: wrapperEl.current ?? undefined }),
        'top-right',
      )

      // Domyślnie mapa jest zablokowana — odblokowuje ją dopiero kłódka.
      setMapInteractions(mapInstance, !lockedRef.current)

      // Kontener bywa mierzony po zamontowaniu karty — wymuszamy przeliczenie
      // rozmiaru i zwijamy panel źródła, żeby domyślnie była tylko mała ikona ⓘ.
      mapInstance.on('load', () => {
        mapInstance.resize()
        if (mapEl.current) collapseAttribution(mapEl.current)
      })
      // Gdyby styl wektorowy się nie wczytał, spadamy na rastrowy OSM.
      mapInstance.on('error', (e) => {
        if (String(e?.error?.message ?? '').toLowerCase().includes('style')) {
          mapInstance.setStyle(RASTER_FALLBACK)
        }
      })

      if (hasPin) {
        markerRef.current = new maplibregl.Marker({ element: createPinElement(), anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(mapInstance)
      }

      mapRef.current = mapInstance
    })

    // Mapa bywa tworzona, gdy jej zakładka jest ukryta (display:none w podglądzie
    // wydarzenia) — wtedy kontener ma 0×0, a canvas MapLibre zapamiętuje błędny
    // rozmiar i po pokazaniu wystaje poza ekran (przewijanie w poziomie na
    // telefonie). ResizeObserver wymusza `resize()` przy każdej zmianie rozmiaru
    // kontenera, w tym przy przejściu ukryty → widoczny.
    const observedEl = mapEl.current
    const ro =
      observedEl && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            mapRef.current?.resize()
          })
        : null
    if (ro && observedEl) ro.observe(observedEl)

    return () => {
      cancelled = true
      ro?.disconnect()
      markerRef.current?.remove()
      markerRef.current = null
      parkingMarkersRef.current.forEach((m) => m.remove())
      parkingMarkersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, hasPin])

  // Pokazywanie / ukrywanie znaczników parkingów w reakcji na przełącznik.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Zawsze najpierw czyścimy istniejące znaczniki parkingów.
    parkingMarkersRef.current.forEach((m) => m.remove())
    parkingMarkersRef.current = []
    if (!showParking || parkings.length === 0) return

    loadMapLibre().then((maplibregl) => {
      if (!mapRef.current) return
      parkings.forEach((p) => {
        const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setText(p.name)
        const marker = new maplibregl.Marker({ element: createParkingElement(), anchor: 'center' })
          .setLngLat([p.lng, p.lat])
          .setPopup(popup)
          .addTo(mapRef.current!)
        parkingMarkersRef.current.push(marker)
      })

      // Po włączeniu parkingów „łapiemy fokus" na wszystkie znaczniki — mapa
      // oddala/zbliża się tak, by w kadrze zmieściły się wszystkie parkingi
      // oraz pinezka celu (jeśli jest).
      const bounds = new maplibregl.LngLatBounds()
      parkings.forEach((p) => bounds.extend([p.lng, p.lat]))
      if (hasPin) bounds.extend([lng, lat])
      mapRef.current.fitBounds(bounds, { padding: 64, maxZoom: 16, duration: 600 })
    })
  }, [showParking, parkings, hasPin, lat, lng])

  // Włącz / wyłącz ruch po mapie w reakcji na kłódkę.
  useEffect(() => {
    const map = mapRef.current
    if (map) setMapInteractions(map, !locked)
  }, [locked])

  return (
    <div
      ref={wrapperEl}
      className={`relative [&_.maplibregl-ctrl-top-right]:origin-top-right [&_.maplibregl-ctrl-top-right]:scale-[0.8] md:[&_.maplibregl-ctrl-top-right]:scale-100 [&:fullscreen_.maplibregl-ctrl-top-right]:scale-[1.4] [&:fullscreen_[data-map-btn]]:gap-2 [&:fullscreen_[data-map-btn]]:rounded-xl [&:fullscreen_[data-map-btn]]:px-4 [&:fullscreen_[data-map-btn]]:py-2.5 [&:fullscreen_[data-map-btn]]:text-base [&:fullscreen_[data-map-icon]]:size-5 [&:fullscreen_[data-map-relock]]:hidden ${className ?? ''}`}
    >
      <div
        ref={mapEl}
        onPointerDown={handleMapPointerDown}
        onPointerUp={handleMapPointerUp}
        className="absolute inset-0 h-full w-full"
        role="application"
        aria-label="Mapa lokalizacji wydarzenia"
      />
      {parkings.length > 0 && (
        <button
          type="button"
          onClick={() => setShowParking((v) => !v)}
          aria-pressed={showParking}
          data-map-btn
          className={`absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold shadow-md transition-colors md:gap-1.5 md:rounded-lg md:px-2.5 md:py-1.5 md:text-xs ${
            showParking
              ? 'bg-card/95 text-foreground hover:bg-card'
              : 'bg-navy text-navy-foreground hover:bg-navy/90'
          }`}
        >
          <ParkingSquare className="size-3.5 md:size-4" data-map-icon aria-hidden="true" />
          Parkingi
        </button>
      )}

      {locked ? (
        // Zablokowana mapa: cały komunikat jest klikalny i odblokowuje ruch
        // (osobny przycisk „Odblokuj mapę" został usunięty).
        <button
          type="button"
          onClick={() => setLocked(false)}
          className="absolute inset-x-0 bottom-2 z-10 mx-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-navy/90 px-3 py-1 text-[10px] font-medium text-navy-foreground shadow-sm transition-colors hover:bg-navy md:text-[11px] [&:is(:fullscreen_*)]:bottom-4 [&:is(:fullscreen_*)]:gap-2 [&:is(:fullscreen_*)]:px-4 [&:is(:fullscreen_*)]:py-2 [&:is(:fullscreen_*)]:text-sm"
        >
          <Lock className="size-3 md:size-3.5 [&:is(:fullscreen_*)]:size-4" aria-hidden="true" />
          Mapa zablokowana — kliknij, aby przesuwać
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setLocked(true)}
          aria-pressed
          aria-label="Zablokuj mapę"
          title="Zablokuj mapę"
          data-map-relock
          className="absolute bottom-2 left-2 z-10 inline-flex items-center justify-center rounded-md bg-card/90 p-1.5 text-foreground shadow-md transition-colors hover:bg-card md:rounded-lg md:p-2"
        >
          <LockOpen className="size-3.5 md:size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
