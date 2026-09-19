'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

/**
 * Powiadomienie na dole ekranu sterowane parametrem w URL
 * (`?deleted=1` lub `?error=1`). Po pokazaniu czyści parametr,
 * aby odświeżenie strony nie wyświetlało go ponownie.
 */
export function ReportToast() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const deleted = params.get('deleted') === '1'
  const error = params.get('error') === '1'
  const [visible, setVisible] = useState(false)
  // Faza animacji: 'enter' odtwarza wejście, 'leave' odtwarza wyjście
  // zanim element zostanie odmontowany.
  const [leaving, setLeaving] = useState(false)
  // Zapamiętujemy typ powiadomienia, bo po wyczyszczeniu parametrów z URL
  // `deleted`/`error` wracają do false i nie mogą już sterować wyglądem.
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (!deleted && !error) return
    setIsError(error)
    setLeaving(false)
    setVisible(true)
    // Usuń parametr z adresu, by nie pojawiał się po odświeżeniu.
    router.replace(pathname, { scroll: false })
  }, [deleted, error, pathname, router])

  // Rozpoczyna animację wyjścia; po jej zakończeniu chowamy element.
  function dismiss() {
    setLeaving(true)
  }

  // Auto-ukrywanie sterowane wyłącznie widocznością, dzięki czemu
  // wyczyszczenie parametrów z URL nie anuluje timera.
  useEffect(() => {
    if (!visible || leaving) return
    const t = setTimeout(dismiss, 3000)
    return () => clearTimeout(t)
  }, [visible, leaving])

  // Po zakończeniu animacji wyjścia usuwamy toast z drzewa.
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => setVisible(false), 220)
    return () => clearTimeout(t)
  }, [leaving])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        leaving
          ? 'fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 duration-200 animate-out fade-out slide-out-to-bottom-4 fill-mode-forwards'
          : 'fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 duration-300 animate-in fade-in slide-in-from-bottom-4'
      }
    >
      <div
        className={
          isError
            ? 'flex items-center gap-2.5 rounded-full border border-destructive/30 bg-destructive text-destructive-foreground px-4 py-2.5 text-sm font-medium shadow-lg'
            : 'flex items-center gap-2.5 rounded-full border border-border bg-foreground text-background px-4 py-2.5 text-sm font-medium shadow-lg'
        }
      >
        {isError ? (
          <AlertCircle className="size-4 shrink-0" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0" />
        )}
        {isError ? 'Nie udało się usunąć zgłoszenia' : 'Usunięto zgłoszenie'}
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Zamknij powiadomienie"
          className="ml-1 rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
