"use client"

import { useEffect, useMemo, useState } from "react"
import {
  readSavedAddress,
  referenceDate,
  nextPickupsByType,
  relativeLabel,
  type SavedAddress,
} from "@/lib/waste-schedule"

export function WasteTileNote() {
  const [mounted, setMounted] = useState(false)
  const [saved, setSaved] = useState<SavedAddress | null>(null)

  useEffect(() => {
    setMounted(true)
    setSaved(readSavedAddress())
  }, [])

  const from = useMemo(() => referenceDate(), [])
  const nearest = useMemo(() => {
    if (!saved) return null
    return nextPickupsByType(saved.region, saved.regionSegregowane, from)[0] ?? null
  }, [saved, from])

  // Skrócone nazwy kategorii dla wąskiego kafelka na telefonie.
  const shortLabels: Record<string, string> = {
    segregowane: "Segregowane",
    zmieszane: "Zmieszane",
    bio: "Bio",
    gabaryty: "Gabaryty",
    popiol: "Popiół",
  }

  // Zanim odczytamy pamięć przeglądarki – neutralny placeholder (zgodny z SSR).
  if (!mounted) {
    return <span className="text-xs text-muted-foreground">Sprawdź termin</span>
  }

  if (!saved || !nearest) {
    return <span className="text-xs text-muted-foreground">Wpisz swój adres</span>
  }

  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: nearest.color }} aria-hidden />
      <span className="min-w-0 truncate">
        <span className="font-semibold text-foreground">{relativeLabel(nearest.date, from)}</span>
        <span className="text-muted-foreground"> · {shortLabels[nearest.kind] ?? nearest.label}</span>
      </span>
    </span>
  )
}
