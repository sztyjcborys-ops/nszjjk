/**
 * Znak wodny z herbem gminy Jejkowice w prawym górnym rogu sekcji wydarzeń.
 *
 * Kadr (pozycja, rozmiar, obrót, krycie) jest ustalony osobno dla mobile i
 * desktopu i wystawiony jako zmienne CSS, więc renderuje się w pełni po
 * stronie serwera — bez migania i bez kodu klienckiego.
 */

type HerbBox = {
  /** Odstęp od prawej krawędzi sekcji (px, ujemny = wychodzi za krawędź). */
  right: number
  /** Odstęp od górnej krawędzi sekcji (px, ujemny = wychodzi nad sekcję). */
  top: number
  width: number
  height: number
  /** Obrót w stopniach. */
  rotate: number
  /** Krycie w procentach (0–100). */
  opacity: number
}

const HERB_MOBILE: HerbBox = {
  right: -5,
  top: -18,
  width: 112,
  height: 112,
  rotate: 15,
  opacity: 30,
}

const HERB_DESKTOP: HerbBox = {
  right: -7,
  top: -37,
  width: 204,
  height: 226,
  rotate: 18,
  opacity: 30,
}

const HERB_SRC = '/herb-jejkowice.svg'

function varsToCss(box: HerbBox) {
  return [
    `--herb-right:${box.right}px`,
    `--herb-top:${box.top}px`,
    `--herb-width:${box.width}px`,
    `--herb-height:${box.height}px`,
    `--herb-rotate:${box.rotate}deg`,
    `--herb-opacity:${box.opacity / 100}`,
  ].join(';')
}

const HERB_CSS = `[data-herb-watermark]{${varsToCss(HERB_MOBILE)}}
@media (min-width:768px){[data-herb-watermark]{${varsToCss(HERB_DESKTOP)}}}`

export function EventsHerbWatermark() {
  return (
    <>
      <style>{HERB_CSS}</style>

      <div
        aria-hidden
        data-herb-watermark
        className="pointer-events-none absolute bg-gold"
        style={{
          right: 'var(--herb-right)',
          top: 'var(--herb-top)',
          width: 'var(--herb-width)',
          height: 'var(--herb-height)',
          transform: 'rotate(var(--herb-rotate))',
          opacity: 'var(--herb-opacity)',
          maskImage: `url(${HERB_SRC})`,
          WebkitMaskImage: `url(${HERB_SRC})`,
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }}
      />
    </>
  )
}
