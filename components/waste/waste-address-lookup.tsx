"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, MapPin, Recycle, CalendarDays, AlertCircle, Pencil, Info, ChevronDown } from "lucide-react"
import {
  parseAddress,
  resolveRegion,
  resolveSegregatedRegion,
  nextPickupsByType,
  upcomingPickups,
  formatLongDate,
  monthShort,
  weekday,
  relativeLabel,
  readSavedAddress,
  referenceDate,
  WASTE_STORAGE_KEY as STORAGE_KEY,
  SCHEDULE_YEAR,
  type SavedAddress as Saved,
} from "@/lib/waste-schedule"

export function WasteAddressLookup() {
  const [mounted, setMounted] = useState(false)
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<Saved | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  // Wczytaj zapisany adres z pamięci przeglądarki przy pierwszym renderze.
  useEffect(() => {
    setMounted(true)
    setSaved(readSavedAddress())
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseAddress(input)
    if (!parsed) {
      setError("Podaj ulicę i numer domu, np. „Główna 42”.")
      return
    }
    const region = resolveRegion(parsed)
    if (!region) {
      setError(`Nie rozpoznaliśmy adresu „${parsed.street} ${parsed.number}”. Sprawdź pisownię ulicy.`)
      return
    }
    // Rejon segregowanych ustalamy NIEZALEŻNIE z osobnej tabeli. Bez cichego
    // fallbacku na główny rejon — brak wpisu zapisujemy jako null.
    const regionSegregowane = resolveSegregatedRegion(parsed)
    const label = `${parsed.street} ${parsed.number}`
    const next: Saved = { label, region, regionSegregowane }
    setSaved(next)
    setError(null)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // pamięć niedostępna — działamy dalej bez zapisu
    }
  }

  function handleChangeAddress() {
    setSaved(null)
    setInput("")
    setError(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignoruj
    }
  }

  const from = useMemo(() => referenceDate(), [])
  const nextByType = useMemo(
    () => (saved ? nextPickupsByType(saved.region, saved.regionSegregowane, from) : []),
    [saved, from],
  )
  const upcoming = useMemo(
    () => (saved ? upcomingPickups(saved.region, saved.regionSegregowane, from, 10) : []),
    [saved, from],
  )

  // Unikamy niezgodności hydratacji — dopóki nie zamontowano, pokazujemy formularz.
  if (!mounted || !saved) {
    return (
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 md:p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-eco/10 text-eco sm:size-11">
            <Recycle className="size-4 sm:size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold sm:text-lg">Sprawdź swój harmonogram</h2>
            <p className="text-xs text-muted-foreground sm:text-sm">Wpisz ulicę i numer domu.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 sm:mt-5">
          <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-secondary/50 p-1 focus-within:ring-2 focus-within:ring-eco/40 sm:gap-2 sm:p-1.5">
            <MapPin className="ml-1.5 size-4 shrink-0 text-muted-foreground sm:ml-2 sm:size-5" aria-hidden />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="np. Główna 42"
              aria-label="Ulica i numer domu"
              className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground sm:py-2.5 sm:text-base"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-2 rounded-xl bg-eco px-3 py-2 text-sm font-semibold text-eco-foreground transition-colors hover:bg-eco/90 sm:px-4 sm:py-2.5"
            >
              <Search className="size-4" />
              <span className="hidden sm:inline">Sprawdź</span>
            </button>
          </div>
        </form>

        {error ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-pretty text-muted-foreground sm:text-sm">
            Zapamiętamy Twój adres w tej przeglądarce — przy kolejnej wizycie od razu zobaczysz
            swój harmonogram.
          </p>
        )}
      </div>
    )
  }

  const nearest = nextByType[0]

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Nagłówek z adresem */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-eco/10 text-eco sm:size-10">
            <MapPin className="size-4 sm:size-5" />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight sm:text-base">{saved.label}</p>
            <p className="text-xs text-muted-foreground sm:text-sm">Rejon {saved.region}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleChangeAddress}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary sm:px-3 sm:py-2 sm:text-sm"
        >
          <Pencil className="size-3.5" />
          Zmień adres
        </button>
      </div>

      {/* Najbliższy odbiór — hero */}
      {nearest && (
        <div className="relative overflow-hidden rounded-3xl bg-eco p-5 text-eco-foreground sm:p-6 md:p-7">
          <Recycle className="absolute -right-8 -top-8 size-32 text-white/10 sm:size-44" aria-hidden />
          <p className="text-xs font-medium uppercase tracking-wide text-eco-foreground/80">Najbliższy odbiór</p>
          <p className="mt-1 text-2xl font-extrabold leading-none sm:text-3xl md:text-4xl">
            {relativeLabel(nearest.date, from)}
          </p>
          <p className="mt-1.5 text-sm font-medium text-eco-foreground/90">
            {formatLongDate(nearest.date)} · <span className="capitalize">{weekday(nearest.date)}</span>
          </p>
          <span className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: nearest.color }} aria-hidden />
            {nearest.label}
          </span>
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-eco-foreground/85 sm:text-sm">
            Wystaw pojemnik przed posesję do godz. 6:00 rano w dniu odbioru.
          </p>
        </div>
      )}

      {/* Najbliższy odbiór każdego rodzaju — w jednym kaflu */}
      {nextByType.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-eco/10 text-eco sm:size-9">
              <CalendarDays className="size-4 sm:size-[18px]" />
            </span>
            <div>
              <h3 className="text-sm font-bold sm:text-base">Najbliższe terminy według rodzaju odpadu</h3>
              <p className="text-xs leading-relaxed text-pretty text-muted-foreground sm:text-sm">
                Kolejny odbiór każdej kategorii odpadów pod Twoim adresem.
              </p>
            </div>
          </div>

          <ul className="mt-3 flex flex-col border-t border-border sm:mt-4">
            {nextByType.map((p) => (
              <li
                key={p.kind}
                className="flex items-center gap-2.5 border-b border-border py-2.5 last:border-b-0 sm:gap-3 sm:py-3"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-11"
                  style={{ backgroundColor: p.color }}
                  aria-hidden
                >
                  <Recycle className="size-4 text-white sm:size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.label}</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {formatLongDate(p.date)} · <span className="capitalize">{weekday(p.date)}</span>
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeLabel(p.date, from)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Uwaga: brak przypisanego rejonu segregowanych dla tego adresu */}
      {saved.regionSegregowane === null && (
        <p className="flex items-start gap-2 rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Dla tego adresu nie znaleziono rejonu odbioru odpadów segregowanych w harmonogramie.
          Terminy papieru, plastiku i szkła nie są wyświetlane — pozostałe odpady bez zmian.
        </p>
      )}

      {/* Pełny nadchodzący harmonogram — domyślnie zwinięty */}
      <div className="rounded-3xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setScheduleOpen((v) => !v)}
          aria-expanded={scheduleOpen}
          className="flex w-full items-center justify-between gap-3 rounded-3xl px-4 py-3.5 text-left transition-colors hover:bg-secondary/40 sm:px-5 sm:py-4"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-secondary text-secondary-foreground sm:size-9">
              <CalendarDays className="size-4 sm:size-[18px]" />
            </span>
            <span>
              <span className="block text-sm font-bold sm:text-base">Twój harmonogram</span>
              <span className="block text-xs text-muted-foreground">
                {upcoming.length > 0 ? `${upcoming.length} nadchodzących terminów · ${SCHEDULE_YEAR}` : SCHEDULE_YEAR}
              </span>
            </span>
          </span>
          <ChevronDown
            className={`size-5 shrink-0 text-muted-foreground transition-transform ${scheduleOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {scheduleOpen && (
          <div className="px-4 pb-3 sm:px-5 sm:pb-4">
            <ul className="flex flex-col border-t border-border">
              {upcoming.map((p, i) => (
                <li
                  key={`${p.kind}-${p.date.toISOString()}`}
                  className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
                >
                  <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary text-secondary-foreground sm:size-11">
                    <span className="text-sm font-extrabold leading-none">{p.date.getDate()}</span>
                    <span className="text-[0.55rem] font-bold uppercase tracking-wide">
                      {monthShort(p.date)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.label}</p>
                    <p className="text-xs capitalize text-muted-foreground">{weekday(p.date)}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeLabel(p.date, from)}</span>
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  />
                  {i === 0 && <span className="sr-only">Najbliższy odbiór</span>}
                </li>
              ))}
            </ul>
            {upcoming.length === 0 && (
              <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <CalendarDays className="size-4" />
                Brak nadchodzących terminów w roku {SCHEDULE_YEAR}.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
