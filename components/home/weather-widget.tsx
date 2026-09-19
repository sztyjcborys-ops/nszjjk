"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import {
  Sun,
  Moon,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  type LucideIcon,
} from "lucide-react"

type Current = { temp: number; code: number; isDay: boolean }
type ForecastDay = { day: string; temp: number; code: number }
type WeatherData = { current: Current; forecast: ForecastDay[] }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// WMO weather code -> Polish description
function describe(code: number): string {
  if (code === 0) return "Bezchmurnie"
  if (code === 1) return "Przeważnie słonecznie"
  if (code === 2) return "Częściowe zachmurzenie"
  if (code === 3) return "Pochmurno"
  if (code === 45 || code === 48) return "Mgła"
  if (code >= 51 && code <= 57) return "Mżawka"
  if (code >= 61 && code <= 67) return "Deszcz"
  if (code >= 71 && code <= 77) return "Śnieg"
  if (code >= 80 && code <= 82) return "Przelotny deszcz"
  if (code >= 85 && code <= 86) return "Przelotny śnieg"
  if (code >= 95) return "Burza"
  return "Pogoda w Jejkowicach"
}

// WMO weather code -> icon
function iconFor(code: number, isDay = true): LucideIcon {
  if (code === 0 || code === 1) return isDay ? Sun : Moon
  if (code === 2) return CloudSun
  if (code === 3) return Cloud
  if (code === 45 || code === 48) return CloudFog
  if (code >= 51 && code <= 57) return CloudDrizzle
  if (code >= 61 && code <= 67) return CloudRain
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return CloudSnow
  if (code >= 80 && code <= 82) return CloudRain
  if (code >= 95) return CloudLightning
  return CloudSun
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function WeatherWidget({ embedded = false }: { embedded?: boolean }) {
  const { data, error, isLoading } = useSWR<WeatherData>("/api/weather", fetcher, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
  })
  const now = useClock()

  const timeLabel = now
    ? new Intl.DateTimeFormat("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Warsaw",
      }).format(now)
    : "--:--"
  const dateLabel = now
    ? new Intl.DateTimeFormat("pl-PL", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Europe/Warsaw",
      }).format(now)
    : ""

  const hasData = data && !("error" in data) && data.current
  const failed = !!error || (data && "error" in data)

  const CurrentIcon = hasData ? iconFor(data.current.code, data.current.isDay) : CloudSun

  return (
    <div
      className={`flex items-center gap-2 text-foreground sm:gap-4 ${
        embedded
          ? "px-1 py-1"
          : "rounded-3xl border border-border bg-background px-3 py-2"
      }`}
    >
      {/* Current weather */}
      <div className="flex min-w-0 shrink items-center gap-2.5 sm:gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-navy sm:size-11">
          <CurrentIcon className="size-5" />
        </span>

        {hasData ? (
          <div className="min-w-0">
            <p className="text-xl font-bold leading-none tabular-nums sm:text-2xl">
              {data.current.temp}°C
            </p>
            <p className="mt-1 truncate text-xs font-medium text-foreground/80">
              {describe(data.current.code)}
            </p>
            <p className="mt-0.5 truncate text-[11px] capitalize tabular-nums text-muted-foreground">
              {timeLabel} · {dateLabel}
            </p>
          </div>
        ) : failed ? (
          <div className="min-w-0">
            <p className="text-xl font-bold leading-none text-muted-foreground/40 sm:text-2xl">
              --°C
            </p>
            <p className="mt-1 truncate text-xs font-medium text-foreground/80">
              Pogoda niedostępna
            </p>
            <p className="mt-0.5 truncate text-[11px] tabular-nums text-muted-foreground">
              {timeLabel} · {dateLabel}
            </p>
          </div>
        ) : (
          <div className="min-w-0 animate-pulse space-y-1.5">
            <div className="h-5 w-20 rounded-lg bg-muted" />
            <div className="h-2.5 w-16 rounded-full bg-muted" />
            <div className="h-2.5 w-14 rounded-full bg-muted" />
          </div>
        )}
      </div>

      {/* 3-day forecast */}
      <div className="ml-auto flex shrink-0 items-center">
        {hasData
          ? data.forecast.slice(0, 4).map((f, idx) => {
              const Icon = iconFor(f.code, true)
              return (
                <div
                  key={f.day}
                  className={`items-center ${
                    idx === 3 ? "hidden min-[420px]:flex" : "flex"
                  }`}
                >
                  {idx > 0 && (
                    <span aria-hidden className="mx-2 h-8 w-px bg-border sm:mx-3" />
                  )}
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-medium leading-none text-muted-foreground">{f.day}</span>
                    <Icon className="my-1 size-5 text-gold" />
                    <span className="text-xs font-bold leading-none tabular-nums">{f.temp}°</span>
                  </div>
                </div>
              )
            })
          : Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center">
                {i > 0 && <span aria-hidden className="mx-2 h-8 w-px bg-border sm:mx-3" />}
                <div className={`flex flex-col items-center gap-1 ${isLoading ? "animate-pulse" : ""}`}>
                  <div className="h-2.5 w-5 rounded-full bg-muted" />
                  <div className="size-5 rounded-full bg-muted" />
                  <div className="h-2.5 w-4 rounded-full bg-muted" />
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}
