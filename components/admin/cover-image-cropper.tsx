'use client'

import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Loader2, ZoomIn, ZoomOut, Check, X, RotateCcw } from 'lucide-react'

const DEFAULT_ASPECT = 16 / 9
const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.2

/**
 * Przycina wskazany fragment obrazu (w pikselach źródłowych) do zadanych
 * proporcji i zwraca plik WebP. Źródłem jest blob: URL, więc canvas nie zostaje
 * „zatruty” (brak problemów CORS) i można bezpiecznie wywołać toBlob.
 */
async function cropToWebpFile(
  imageSrc: string,
  crop: Area,
  baseName: string,
  aspect: number,
): Promise<File> {
  const image = await loadImage(imageSrc)

  // Ograniczamy szerokość wyjścia, by nie tworzyć wielkich plików.
  const maxOutW = 1600
  const outW = Math.min(maxOutW, Math.round(crop.width))
  const outH = Math.round(outW / aspect)

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Nie udało się przetworzyć zdjęcia.')

  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outW, outH)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', 0.9),
  )
  if (!blob) throw new Error('Nie udało się przetworzyć zdjęcia.')
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Nie udało się wczytać zdjęcia.'))
    img.src = src
  })
}

export function CoverImageCropper({
  imageSrc,
  onCancel,
  onConfirm,
  aspect = DEFAULT_ASPECT,
  title = 'Wykadruj zdjęcie główne',
  baseName = 'okladka',
}: {
  /** blob: URL zdjęcia do wykadrowania. */
  imageSrc: string
  onCancel: () => void
  /** Zwraca gotowy, wykadrowany plik WebP w wybranej proporcji. */
  onConfirm: (file: File) => Promise<void> | void
  /** Proporcje kadru (domyślnie 16:9, np. 3/4 dla plakatu). */
  aspect?: number
  /** Nagłówek okna kadrowania. */
  title?: string
  /** Nazwa pliku wynikowego (bez rozszerzenia). */
  baseName?: string
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaPixels, setAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_area: Area, areaInPixels: Area) => {
    setAreaPixels(areaInPixels)
  }, [])

  function clampZoom(next: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(next * 100) / 100))
  }

  function reset() {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  async function handleConfirm() {
    if (!areaPixels) return
    setSaving(true)
    try {
      const file = await cropToWebpFile(imageSrc, areaPixels, baseName, aspect)
      await onConfirm(file)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kadrowanie zdjęcia głównego"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
    >
      <div
        className={`flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-2xl border border-border bg-card shadow-xl ${
          aspect < 1 ? 'max-w-xs' : 'max-w-xl'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Zamknij kadrowanie"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Obszar kadrowania — dokładnie w proporcjach docelowego kadru */}
        <div className="relative w-full shrink-0 bg-foreground/90" style={{ aspectRatio: aspect }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            zoomSpeed={0.2}
            restrictPosition
            showGrid
            onCropChange={setCrop}
            onZoomChange={(z) => setZoom(clampZoom(z))}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Sterowanie */}
        <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
          <p className="text-xs text-muted-foreground text-pretty">
            Przeciągnij zdjęcie, aby je przesunąć. Użyj suwaka lub kółka myszy, aby powiększyć lub
            pomniejszyć. Kadr ma zawsze proporcje {aspect < 1 ? '3:4' : '16:9'}.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
              aria-label="Pomniejsz"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
            >
              <ZoomOut className="size-4" />
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(clampZoom(Number(e.target.value)))}
              aria-label="Powiększenie"
              className="h-2 w-full flex-1 cursor-pointer accent-primary"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
              aria-label="Powiększ"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
            >
              <ZoomIn className="size-4" />
            </button>
            <button
              type="button"
              onClick={reset}
              aria-label="Wyśrodkuj i zresetuj"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>

          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving || !areaPixels}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {saving ? 'Zapisywanie…' : 'Zastosuj kadr'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
