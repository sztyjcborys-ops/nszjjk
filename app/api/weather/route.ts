import { NextResponse } from "next/server"

// Jejkowice (gmina Jejkowice, powiat rybnicki)
const LAT = 50.1247
const LON = 18.4636

// Refresh weather at most every 15 minutes
export const revalidate = 900

const DAY_LABELS = ["Nd", "Pon", "Wt", "Śr", "Czw", "Pt", "So"]

export async function GET() {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,weather_code,is_day` +
      `&daily=weather_code,temperature_2m_max` +
      `&timezone=Europe%2FWarsaw&forecast_days=5`

    const res = await fetch(url, { next: { revalidate: 900 } })
    if (!res.ok) {
      throw new Error(`Open-Meteo responded ${res.status}`)
    }
    const data = await res.json()

    const current = {
      temp: Math.round(data.current?.temperature_2m ?? 0),
      code: data.current?.weather_code ?? 0,
      isDay: data.current?.is_day === 1,
    }

    const times: string[] = data.daily?.time ?? []
    const codes: number[] = data.daily?.weather_code ?? []
    const maxTemps: number[] = data.daily?.temperature_2m_max ?? []

    // Skip today (index 0), show next 4 days
    const forecast = times.slice(1, 5).map((iso, i) => {
      const idx = i + 1
      const date = new Date(iso + "T12:00:00")
      return {
        day: DAY_LABELS[date.getDay()],
        temp: Math.round(maxTemps[idx] ?? 0),
        code: codes[idx] ?? 0,
      }
    })

    return NextResponse.json(
      { current, forecast },
      {
        headers: {
          // Served from CDN/browser cache for 15 min, stale copy allowed while revalidating
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        },
      },
    )
  } catch (error) {
    console.log("[v0] weather fetch error:", (error as Error).message)
    return NextResponse.json({ error: "Nie udało się pobrać pogody" }, { status: 502 })
  }
}
