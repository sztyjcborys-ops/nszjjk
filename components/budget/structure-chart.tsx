'use client'

import { useMemo, useState } from 'react'
import { Sector } from 'recharts'
import { formatPLN, formatPLNCompact } from '@/lib/format'
import { cn } from '@/lib/utils'

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
  'var(--chart-9)',
]

const CENTER = 50
const BASE_INNER = 31
const BASE_OUTER = 43
const ACTIVE_INNER = 29
const ACTIVE_OUTER = 48
const PADDING_ANGLE = 1.5

type Segment = { label: string; amount: number }

type Slice = Segment & {
  color: string
  percent: number
  startAngle: number
  endAngle: number
}

export function StructureChart({
  segments,
  total,
}: {
  segments: Segment[]
  total: number
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const active = hovered ?? selected

  const toggleSelected = (i: number) =>
    setSelected((prev) => (prev === i ? null : i))

  const slices = useMemo<Slice[]>(() => {
    const sorted = [...segments].sort((a, b) => b.amount - a.amount)
    const top = sorted.slice(0, 6)
    const restAmount = sorted.slice(6).reduce((s, x) => s + x.amount, 0)
    const base =
      restAmount > 0 ? [...top, { label: 'Pozostałe', amount: restAmount }] : top

    let cursor = 90
    return base.map((s, i) => {
      const percent = total > 0 ? (s.amount / total) * 100 : 0
      const span = (percent / 100) * 360
      const startAngle = cursor
      const endAngle = cursor - span
      cursor = endAngle
      return {
        ...s,
        color: COLORS[i % COLORS.length],
        percent,
        startAngle,
        endAngle,
      }
    })
  }, [segments, total])

  const focus = active != null ? slices[active] : null

  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,190px)_1fr] sm:items-center">
      <div className="relative mx-auto aspect-square w-full max-w-[190px]">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full"
          role="img"
          aria-label="Struktura budżetu według działów"
        >
          {slices.map((s, i) => {
            const isActive = active === i
            const half = PADDING_ANGLE / 2
            return (
              <Sector
                key={s.label}
                cx={CENTER}
                cy={CENTER}
                innerRadius={isActive ? ACTIVE_INNER : BASE_INNER}
                outerRadius={isActive ? ACTIVE_OUTER : BASE_OUTER}
                startAngle={s.startAngle - half}
                endAngle={s.endAngle + half}
                fill={s.color}
                style={{
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out',
                  outline: 'none',
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => toggleSelected(i)}
              />
            )
          })}
          {focus ? (
            <Sector
              cx={CENTER}
              cy={CENTER}
              innerRadius={ACTIVE_OUTER + 1.5}
              outerRadius={ACTIVE_OUTER + 2.5}
              startAngle={focus.startAngle - PADDING_ANGLE / 2}
              endAngle={focus.endAngle + PADDING_ANGLE / 2}
              fill={focus.color}
              opacity={0.4}
              style={{ pointerEvents: 'none' }}
            />
          ) : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {focus ? 'Dział' : 'Razem'}
          </span>
          <span className="mt-0.5 max-w-[75%] text-balance text-[13px] font-bold leading-tight text-foreground">
            {focus ? formatPLNCompact(focus.amount) : formatPLNCompact(total)}
          </span>
          {focus ? (
            <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
              {focus.percent.toFixed(1).replace('.', ',')}%
            </span>
          ) : null}
        </div>
      </div>

      <ul className="flex min-w-0 flex-col gap-1.5">
        {slices.map((s, i) => (
          <li key={s.label}>
            <button
              type="button"
              aria-pressed={selected === i}
              onClick={() => toggleSelected(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                active === i
                  ? 'bg-muted ring-1 ring-primary/30'
                  : 'hover:bg-muted/60',
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                {s.label}
              </span>
              <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold tabular-nums text-muted-foreground">
                {s.percent.toFixed(1).replace('.', ',')}%
              </span>
              <span className="shrink-0 whitespace-nowrap text-right text-[12px] font-semibold tabular-nums text-foreground">
                {formatPLN(s.amount)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
