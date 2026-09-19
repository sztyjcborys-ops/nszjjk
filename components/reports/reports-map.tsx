'use client'

/**
 * Mapa zgłoszeń mieszkańców.
 *
 * MapLibre GL + darmowe kafle WEKTOROWE OpenFreeMap (styl „liberty”), bez klucza
 * API i bez znaku wodnego (jak w EventMap). Każde zgłoszenie z rozpoznaną ulicą
 * dostaje punkt w kolorze statusu. Kliknięcie punktu podświetla zgłoszenie na
 * liście (onSelect) i otwiera dymek z tytułem + adresem. Gdyby styl wektorowy
 * zawiódł, spadamy na awaryjne kafle rastrowe OSM.
 *
 * Zachowanie mapy jest spójne z EventMap na stronie głównej:
 *  - mapa startuje ZABLOKOWANA (nie „łapie” scrolla strony palcem), a odblokowuje
 *    ją kliknięcie w komunikat lub w mapę,
 *  - jest przycisk pełnego ekranu (natywny FullscreenControl) — pinezki są tam
 *    również widoczne, bo są częścią tej samej instancji mapy.
 */

import { useEffect, useRef, useState } from 'react'
import type { Map as MlMap, Marker as MlMarker, StyleSpecification } from 'maplibre-gl'
import { Lock, LockOpen } from 'lucide-react'
import { loadMapLibre } from '@/lib/maplibre-loader'
import { JEJKOWICE_CENTER } from '@/lib/jejkowice-streets'

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

export type ReportPoint = {
  id: string
  title: string
  place: string
  color: string
  lat: number
  lng: number
}

/** Kolorowa pinezka jako element DOM. */
function createPinElement(color: string, active: boolean) {
  const el = document.createElement('button')
  el.type = 'button'
  el.setAttribute('aria-label', 'Zgłoszenie na mapie')
  const size = active ? 22 : 16
  el.style.cssText =
    `display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;` +
    `border-radius:9999px;background:${color};` +
    `box-shadow:0 0 0 ${active ? 6 : 4}px ${color}33, 0 2px 6px rgba(0,0,0,.35);` +
    'border:2.5px solid #fff;cursor:pointer;transition:width .15s,height .15s;padding:0'
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

type ReportsMapProps = {
  points: ReportPoint[]
  activeId: string | null
  onSelect: (id: string) => void
  className?: string
}

export function ReportsMap({ points, activeId, onSelect, className }: ReportsMapProps) {
  const wrapperEl = useRef<HTMLDivElement>(null)
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const mlRef = useRef<typeof import('maplibre-gl') | null>(null)
  const markersRef = useRef<Map<string, MlMarker>>(new Map())
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [ready, setReady] = useState(false)

  // Mapa startuje z zablokowanym ruchem (żeby nie „łapała” scrolla strony palcem).
  const [locked, setLocked] = useState(true)
  const lockedRef = useRef(true)
  lockedRef.current = locked

  // Rozróżnianie „tąpnięcia” od przewijania strony palcem.
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

  // Inicjalizacja mapy (raz).
  useEffect(() => {
    let cancelled = false
    loadMapLibre().then((maplibregl) => {
      if (cancelled || !mapEl.current || mapRef.current) return
      mlRef.current = maplibregl

      const map = new maplibregl.Map({
        container: mapEl.current,
        style: VECTOR_STYLE_URL,
        center: [JEJKOWICE_CENTER.lng, JEJKOWICE_CENTER.lat],
        zoom: 13.5,
        attributionControl: { compact: true },
        cooperativeGestures: false,
      })
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      map.addControl(
        new maplibregl.FullscreenControl({ container: wrapperEl.current ?? undefined }),
        'top-right',
      )

      // Domyślnie mapa jest zablokowana — odblokowuje ją dopiero kliknięcie.
      setMapInteractions(map, !lockedRef.current)

      map.on('load', () => {
        map.resize()
        if (mapEl.current) collapseAttribution(mapEl.current)
        if (!cancelled) setReady(true)
      })
      map.on('error', (e: { error?: { message?: string } }) => {
        if (String(e?.error?.message ?? '').toLowerCase().includes('style')) {
          map.setStyle(RASTER_FALLBACK)
        }
      })
      mapRef.current = map
    })

    return () => {
      cancelled = true
      markersRef.current.forEach((m) => m.remove())
      markersRef.current.clear()
      mapRef.current?.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  // Rysowanie / aktualizacja znaczników. Zależy też od `ready`, bo mapa ładuje
  // się asynchronicznie PO pierwszym renderze — bez tego znaczniki nigdy nie
  // zostałyby dorysowane (mapRef było null przy pierwszym uruchomieniu efektu).
  useEffect(() => {
    if (!ready) return
    const maplibregl = mlRef.current
    const map = mapRef.current
    if (!maplibregl || !map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current.clear()

    if (points.length === 0) return

    for (const p of points) {
      const active = p.id === activeId
      const el = createPinElement(p.color, active)
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        onSelectRef.current(p.id)
      })
      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
        `<strong style="font-size:12px">${p.title}</strong><br/><span style="font-size:11px;color:#666">${p.place}</span>`,
      )
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([p.lng, p.lat])
        .setPopup(popup)
        .addTo(map)
      if (active) marker.togglePopup()
      markersRef.current.set(p.id, marker)
    }

    // Dopasuj kadr do wszystkich punktów (albo wyśrodkuj na aktywnym).
    const activePoint = points.find((p) => p.id === activeId)
    if (activePoint) {
      map.flyTo({ center: [activePoint.lng, activePoint.lat], zoom: 15.5, duration: 600 })
    } else if (points.length === 1) {
      map.flyTo({ center: [points[0].lng, points[0].lat], zoom: 15, duration: 600 })
    } else {
      const bounds = new maplibregl.LngLatBounds()
      points.forEach((p) => bounds.extend([p.lng, p.lat]))
      map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 600 })
    }
  }, [points, activeId, ready])

  // Włącz / wyłącz ruch po mapie w reakcji na kłódkę.
  useEffect(() => {
    const map = mapRef.current
    if (map) setMapInteractions(map, !locked)
  }, [locked])

  return (
    <div
      ref={wrapperEl}
      className={`relative overflow-hidden rounded-2xl border border-border bg-muted [&_.maplibregl-ctrl-top-right]:origin-top-right [&_.maplibregl-ctrl-top-right]:scale-[0.8] md:[&_.maplibregl-ctrl-top-right]:scale-100 [&:fullscreen]:rounded-none [&:fullscreen_.maplibregl-ctrl-top-right]:scale-100 ${className ?? ''}`}
    >
      <div
        ref={mapEl}
        onPointerDown={handleMapPointerDown}
        onPointerUp={handleMapPointerUp}
        className="h-full w-full"
        role="application"
        aria-label="Mapa zgłoszeń w gminie Jejkowice"
      />

      {locked ? (
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
          className="absolute bottom-2 left-2 z-10 inline-flex items-center justify-center rounded-md bg-card/90 p-1.5 text-foreground shadow-md transition-colors hover:bg-card md:rounded-lg md:p-2"
        >
          <LockOpen className="size-3.5 md:size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
