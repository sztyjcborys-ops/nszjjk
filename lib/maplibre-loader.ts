/**
 * Ładowarka MapLibre GL z CDN.
 *
 * Pakiet npm `maplibre-gl` w wersji 6 jest ESM-only, a jego web worker (który
 * parsuje WEKTOROWE kafle) nie jest poprawnie pakowany przez Turbopack — przez
 * co źródło wektorowe nigdy się nie ładuje i mapa zostaje pusta. Wersja UMD z
 * CDN ma workera „wszytego" jako blob, więc działa niezależnie od bundlera i
 * poprawnie renderuje kafle wektorowe. Ładujemy skrypt + CSS tylko raz i
 * zwracamy globalny obiekt `window.maplibregl`.
 */

import type * as maplibregl from 'maplibre-gl'

const MAPLIBRE_VERSION = '5.6.0'
const JS_URL = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`
const CSS_URL = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`

type MapLibre = typeof maplibregl

let loaderPromise: Promise<MapLibre> | null = null

/** Ładuje MapLibre GL z CDN (raz na sesję) i zwraca globalny obiekt. */
export function loadMapLibre(): Promise<MapLibre> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('MapLibre można wczytać tylko w przeglądarce'))
  }

  const existing = (window as unknown as { maplibregl?: MapLibre }).maplibregl
  if (existing) return Promise.resolve(existing)

  if (loaderPromise) return loaderPromise

  loaderPromise = new Promise<MapLibre>((resolve, reject) => {
    // CSS (idempotentnie)
    if (!document.querySelector(`link[data-maplibre]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = CSS_URL
      link.dataset.maplibre = 'true'
      document.head.appendChild(link)
    }

    // JS
    const done = () => {
      const ml = (window as unknown as { maplibregl?: MapLibre }).maplibregl
      if (ml) resolve(ml)
      else reject(new Error('MapLibre nie został poprawnie wczytany'))
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-maplibre]')
    if (existingScript) {
      if ((window as unknown as { maplibregl?: MapLibre }).maplibregl) done()
      else existingScript.addEventListener('load', done, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = JS_URL
    script.async = true
    script.dataset.maplibre = 'true'
    script.addEventListener('load', done, { once: true })
    script.addEventListener('error', () => reject(new Error('Nie udało się wczytać MapLibre z CDN')), {
      once: true,
    })
    document.head.appendChild(script)
  })

  return loaderPromise
}
