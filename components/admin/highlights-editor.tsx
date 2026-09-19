'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import {
  HIGHLIGHT_ICON_OPTIONS,
  HIGHLIGHT_ICON_MAP,
  parseHighlight,
} from '@/lib/event-highlight-icons'
import { cn } from '@/lib/utils'

type Row = { iconKey: string; label: string }

function serialize(rows: Row[]) {
  return rows
    .map((r) => ({ ...r, label: r.label.trim() }))
    .filter((r) => r.label)
    .map((r) => (r.iconKey ? `${r.iconKey}|${r.label}` : r.label))
    .join('\n')
}

function rowsFromInitial(initial: string[]): Row[] {
  const parsed = initial
    .map((raw) => {
      const { iconKey, label } = parseHighlight(raw)
      return { iconKey: iconKey ?? '', label }
    })
    .filter((r) => r.label)
  return parsed.length > 0 ? parsed : []
}

/**
 * Edytor listy „Co na Ciebie czeka?" — każda pozycja ma własną ikonę
 * wybieraną z rejestru oraz tekst. Wynik trafia do rodzica jako linie
 * w formacie 'klucz|Etykieta' (albo sama etykieta dla ikony automatycznej).
 */
export function HighlightsEditor({
  initial,
  onChange,
}: {
  initial: string[]
  onChange: (value: string) => void
}) {
  const [rows, setRows] = useState<Row[]>(() => rowsFromInitial(initial))
  const [pickerFor, setPickerFor] = useState<number | null>(null)

  // Wypchnij zserializowaną wartość do rodzica przy każdej zmianie.
  useEffect(() => {
    onChange(serialize(rows))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, { iconKey: '', label: '' }])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
    setPickerFor(null)
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-2.5">
      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-3.5 py-4 text-center text-xs text-muted-foreground">
          Brak atrakcji. Dodaj pierwszą pozycję, aby pojawiła się w sekcji „Co na Ciebie czeka?".
        </p>
      )}

      <ul className="grid grid-cols-1 gap-2.5">
        {rows.map((row, index) => (
          <li key={index} className="grid min-w-0 grid-cols-1 gap-2 rounded-xl border border-border bg-card p-2">
            <div className="flex items-center gap-2">
              <IconPickerButton
                iconKey={row.iconKey}
                open={pickerFor === index}
                onToggle={() => setPickerFor((cur) => (cur === index ? null : index))}
              />
              <input
                value={row.label}
                onChange={(e) => updateRow(index, { label: e.target.value })}
                placeholder="np. Dmuchańce dla dzieci"
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                aria-label="Usuń atrakcję"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {pickerFor === index && (
              <IconGrid
                selected={row.iconKey}
                onSelect={(key) => {
                  updateRow(index, { iconKey: key })
                  setPickerFor(null)
                }}
              />
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Plus className="size-4" />
        Dodaj atrakcję
      </button>
    </div>
  )
}

function IconPickerButton({
  iconKey,
  open,
  onToggle,
}: {
  iconKey: string
  open: boolean
  onToggle: () => void
}) {
  const Icon = iconKey ? HIGHLIGHT_ICON_MAP[iconKey] ?? Sparkles : Sparkles
  const isAuto = !iconKey || !HIGHLIGHT_ICON_MAP[iconKey]
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Wybierz ikonę atrakcji"
      aria-expanded={open}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
        open
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-input bg-background text-accent-foreground hover:border-primary/40',
        isAuto && !open && 'text-muted-foreground',
      )}
    >
      <Icon className="size-4.5" />
    </button>
  )
}

function IconGrid({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (key: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HIGHLIGHT_ICON_OPTIONS
    return HIGHLIGHT_ICON_OPTIONS.filter((o) => o.label.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    ref.current?.querySelector('input')?.focus()
  }, [])

  return (
    <div ref={ref} className="rounded-xl border border-border bg-muted/40 p-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Szukaj ikony…"
        className="mb-2 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div className="grid max-h-44 grid-cols-6 gap-1 overflow-y-auto sm:grid-cols-8">
        <button
          type="button"
          onClick={() => onSelect('')}
          title="Ikona automatyczna"
          className={cn(
            'flex aspect-square items-center justify-center rounded-lg border text-[10px] font-semibold transition-colors',
            !selected
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-transparent text-muted-foreground hover:bg-background',
          )}
        >
          Auto
        </button>
        {filtered.map((opt) => {
          const Icon = opt.Icon
          const active = selected === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onSelect(opt.key)}
              title={opt.label}
              aria-label={opt.label}
              className={cn(
                'flex aspect-square items-center justify-center rounded-lg border transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-transparent text-foreground hover:bg-background',
              )}
            >
              <Icon className="size-4.5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
