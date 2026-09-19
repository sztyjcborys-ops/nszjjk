// Kompresja zdjęć zgłoszeń po stronie przeglądarki — do Storage trafiają już
// małe pliki WebP. Metadane (EXIF/GPS) są usuwane, bo ponowne zakodowanie przez
// <canvas> nie przenosi żadnych metadanych oryginału.

/** Ograniczenia wejścia egzekwowane także w server action (belt & suspenders). */
export const REPORT_IMAGE_LIMITS = {
  maxFiles: 3,
  maxInputBytes: 5 * 1024 * 1024, // 5 MB na plik wejściowy
  maxEdge: 2000, // dłuższy bok po zmniejszeniu (px)
  quality: 0.8, // jakość WebP (~80%)
  acceptedInputTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  outputType: 'image/webp' as const,
}

export type CompressResult = {
  blob: Blob
  fileName: string
}

/** Zwraca czytelny komunikat, jeśli plik nie spełnia wymogów wejściowych. */
export function validateInputFile(file: File): string | null {
  if (!REPORT_IMAGE_LIMITS.acceptedInputTypes.includes(file.type as never)) {
    return 'Dozwolone są tylko pliki JPEG, PNG lub WebP.'
  }
  if (file.size > REPORT_IMAGE_LIMITS.maxInputBytes) {
    return 'Zdjęcie jest za duże (maksymalnie 5 MB).'
  }
  return null
}

/**
 * Zmniejsza obraz do maks. `maxEdge` px na dłuższym boku i konwertuje do WebP.
 * Działa wyłącznie w przeglądarce (używa createImageBitmap + canvas).
 */
export async function compressReportImage(file: File): Promise<CompressResult> {
  const invalid = validateInputFile(file)
  if (invalid) throw new Error(invalid)

  const bitmap = await createImageBitmap(file)
  try {
    const { width, height } = bitmap
    const longest = Math.max(width, height)
    const scale = longest > REPORT_IMAGE_LIMITS.maxEdge ? REPORT_IMAGE_LIMITS.maxEdge / longest : 1
    const targetW = Math.max(1, Math.round(width * scale))
    const targetH = Math.max(1, Math.round(height * scale))

    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(targetW, targetH)
        : Object.assign(document.createElement('canvas'), { width: targetW, height: targetH })
    // Ustaw wymiary również dla zwykłego <canvas>.
    canvas.width = targetW
    canvas.height = targetH

    const ctx = canvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null
    if (!ctx) throw new Error('Nie udało się przetworzyć zdjęcia.')
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)

    const blob = await canvasToWebp(canvas)
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'zdjecie'
    return { blob, fileName: `${baseName}.webp` }
  } finally {
    bitmap.close()
  }
}

async function canvasToWebp(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<Blob> {
  const { outputType, quality } = REPORT_IMAGE_LIMITS
  if ('convertToBlob' in canvas) {
    return canvas.convertToBlob({ type: outputType, quality })
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Nie udało się przetworzyć zdjęcia.'))),
      outputType,
      quality,
    )
  })
}
