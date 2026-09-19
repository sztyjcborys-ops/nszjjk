'use client'

import { useRef } from 'react'
import { Crosshair, RotateCcw } from 'lucide-react'
import { DEFAULT_FOCAL, focalToObjectPosition, type ImageFocal } from '@/lib/image-focal'

/**
 * Wybór kadru miniaturki na kafelku aktualności.
 *
 * Admin klika (lub przeciąga) punkt na zdjęciu 16:9 — ten punkt zostaje
 * środkiem kadru w wąskiej miniaturce na stronie głównej. Wartość zapisuje
 * się razem z adresem zdjęcia, więc nie ma osobnego zapisu do bazy.
 */
export function ThumbnailFocusPicker({
  src,
  focal,
  onChange,
}: {
  src: string
  focal: ImageFocal
  onChange: (next: ImageFocal) => void
}) {
  const areaRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  function pointToFocal(clientX: number, clientY: number) {
    const el = areaRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    onChange({ x: Math.round(x), y: Math.round(y) })
  }

  function nudge(dx: number, dy: number) {
    onChange({
      x: Math.min(100, Math.max(0, focal.x + dx)),
      y: Math.min(100, Math.max(0, focal.y + dy)),
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowLeft') return nudge(-step, 0), e.preventDefault()
    if (e.key === 'ArrowRight') return nudge(step, 0), e.preventDefault()
    if (e.key === 'ArrowUp') return nudge(0, -step), e.preventDefault()
    if (e.key === 'ArrowDown') return nudge(0, step), e.preventDefault()
  }

  const position = focalToObjectPosition(focal)
  const isDefault = focal.x === DEFAULT_FOCAL.x && focal.y === DEFAULT_FOCAL.y

  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-secondary/30 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Crosshair className="size-4 text-primary" />
          Kadr miniaturki na kafelku
        </span>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_FOCAL })}
          disabled={isDefault}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RotateCcw className="size-3.5" />
          Wyśrodkuj
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {/* Zdjęcie 16:9 z ruchomym punktem ostrości */}
        <div
          ref={areaRef}
          role="slider"
          tabIndex={0}
          aria-label="Punkt kadrowania miniaturki"
          aria-valuetext={`Poziomo ${focal.x}%, pionowo ${focal.y}%`}
          onKeyDown={handleKeyDown}
          onPointerDown={(e) => {
            draggingRef.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            pointToFocal(e.clientX, e.clientY)
          }}
          onPointerMove={(e) => {
            if (draggingRef.current) pointToFocal(e.clientX, e.clientY)
          }}
          onPointerUp={(e) => {
            draggingRef.current = false
            e.currentTarget.releasePointerCapture(e.pointerId)
          }}
          className="relative aspect-[16/9] w-full max-w-xs shrink-0 cursor-crosshair touch-none overflow-hidden rounded-xl border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src || '/placeholder.svg'} alt="" className="size-full object-cover" />
          {/* Podświetlenie obszaru, który faktycznie trafi na kafelek */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-[30%] border-x-2 border-primary bg-primary/10"
            style={{ left: `clamp(0%, ${focal.x}%, 100%)`, transform: 'translateX(-50%)' }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary-foreground bg-primary shadow"
            style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
          />
        </div>

        {/* Podgląd 1:1 tego, co zobaczą mieszkańcy na kafelku */}
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Podgląd kafelka</span>
          <div className="relative flex h-28 w-56 overflow-hidden rounded-xl border border-border bg-card">
            <div className="absolute inset-y-0 right-0 w-[52%] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src || '/placeholder.svg'}
                alt=""
                style={{ objectPosition: position }}
                className="size-full object-cover"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-card via-card/80 to-transparent" />
            </div>
            <div className="relative z-10 flex w-[68%] flex-col justify-center p-2.5">
              <span className="line-clamp-3 text-[0.7rem] font-bold leading-snug text-foreground">
                Tak przycięte zdjęcie pojawi się obok tytułu.
              </span>
            </div>
          </div>
          <p className="max-w-56 text-xs text-muted-foreground text-pretty">
            Kliknij lub przeciągnij punkt na zdjęciu, aby wybrać kadr. Strzałkami możesz go dostroić.
          </p>
        </div>
      </div>
    </div>
  )
}
