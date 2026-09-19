/**
 * Punkt ostrości ("focal point") miniaturki zdjęcia głównego.
 *
 * Wartość jest doklejana do istniejącego adresu w kolumnie `cover_image`
 * jako fragment `#focal=50-30`, dzięki czemu NIE wymaga nowej kolumny
 * w bazie ani dodatkowego zapisu — zapisuje się razem z artykułem.
 * Fragment (część po `#`) nigdy nie jest wysyłany do serwera plików,
 * więc adres zdjęcia działa dokładnie tak jak wcześniej.
 */
export type ImageFocal = { x: number; y: number }

export const DEFAULT_FOCAL: ImageFocal = { x: 50, y: 50 }

const FOCAL_HASH = /#focal=(\d{1,3})-(\d{1,3})$/

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 50
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** Rozdziela adres zdjęcia na czysty URL i punkt ostrości. */
export function parseImageFocal(src?: string | null): { src: string; focal: ImageFocal } {
  const value = src ?? ''
  const match = value.match(FOCAL_HASH)
  if (!match) return { src: value, focal: { ...DEFAULT_FOCAL } }
  return {
    src: value.replace(FOCAL_HASH, ''),
    focal: { x: clampPercent(Number(match[1])), y: clampPercent(Number(match[2])) },
  }
}

/** Czysty adres zdjęcia, bez zapisanego punktu ostrości. */
export function stripImageFocal(src?: string | null): string {
  return parseImageFocal(src).src
}

/** Dokleja punkt ostrości do adresu (pomija zapis, gdy kadr jest wyśrodkowany). */
export function withImageFocal(src: string, focal: ImageFocal): string {
  const clean = stripImageFocal(src)
  if (!clean) return ''
  const x = clampPercent(focal.x)
  const y = clampPercent(focal.y)
  if (x === DEFAULT_FOCAL.x && y === DEFAULT_FOCAL.y) return clean
  return `${clean}#focal=${x}-${y}`
}

/** Zamienia punkt ostrości na wartość CSS `object-position`. */
export function focalToObjectPosition(focal?: ImageFocal | null): string {
  const { x, y } = focal ?? DEFAULT_FOCAL
  return `${clampPercent(x)}% ${clampPercent(y)}%`
}
