"use client"

import { useMemo, useState } from "react"
import { MapPin } from "lucide-react"
import { StatusBadge } from "@/components/shared/badges"
import { cn } from "@/lib/utils"
import { REPORT_STATUSES, type ReportStatus } from "@/lib/reports"
import type { PublicReport } from "@/lib/public-reports"

type Filter = "Wszystkie" | ReportStatus

const FILTERS: Filter[] = ["Wszystkie", ...REPORT_STATUSES]

export function PublicReportsList({ reports }: { reports: PublicReport[] }) {
  const [filter, setFilter] = useState<Filter>("Wszystkie")

  const counts = useMemo(() => {
    const map = new Map<Filter, number>()
    map.set("Wszystkie", reports.length)
    for (const r of reports) map.set(r.status, (map.get(r.status) ?? 0) + 1)
    return map
  }, [reports])

  const visible = useMemo(
    () => (filter === "Wszystkie" ? reports : reports.filter((r) => r.status === filter)),
    [reports, filter],
  )

  return (
    <div>
      {/* Filtry statusów */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs font-bold",
                filter === f ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
              )}
            >
              {counts.get(f) ?? 0}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          Brak zgłoszeń w tej kategorii.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <li
              key={r.id}
              className="flex flex-col rounded-3xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MapPin className="size-5" aria-hidden />
                </span>
                <StatusBadge status={r.status} />
              </div>
              <h2 className="mt-4 font-bold leading-snug text-balance">{r.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{r.place}</p>
              <p className="mt-auto pt-4 text-xs text-muted-foreground">{r.date}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
