import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Plakietka „Wersja przykładowa" nakładana na zdjęcia w całym serwisie.
 *
 * Sygnalizuje, że dana grafika to materiał poglądowy/wzór (szablon), a nie
 * finalna zawartość. Komponent jest pozycjonowany absolutnie, więc rodzic
 * musi mieć `position: relative` (kontenery zdjęć już to mają). Domyślnie
 * ląduje w prawym górnym rogu — pozycję można nadpisać przez `className`.
 */
export function SampleBadge({
  className,
  size = 'md',
  label,
}: {
  className?: string
  size?: 'sm' | 'md'
  label?: string
}) {
  const text = label ?? (size === 'sm' ? 'Wzór' : 'Wersja przykładowa')

  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute z-20 inline-flex select-none items-center gap-1 rounded-full border border-yellow-500/70 bg-yellow-400 font-extrabold uppercase tracking-wide text-yellow-950 shadow-lg ring-1 ring-black/10',
        size === 'sm'
          ? 'right-1.5 top-1.5 px-2 py-0.5 text-[0.55rem]'
          : 'right-3 top-3 px-3 py-1.5 text-[0.65rem]',
        className,
      )}
    >
      <FlaskConical className={size === 'sm' ? 'size-2.5' : 'size-3'} />
      {text}
    </span>
  )
}
