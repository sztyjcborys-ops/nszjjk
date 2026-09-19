'use client'

import { Search, ArrowRight } from 'lucide-react'
import { useState } from 'react'

export function ResidentSearch() {
  const [q, setQ] = useState('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const term = q.trim()
    if (!term) return
    // Zamiast przechodzić do listy aktualności, przekazujemy pytanie mieszkańca
    // wprost do asystenta AI. Chatbot nasłuchuje tego zdarzenia (patrz chatbot.tsx):
    // otwiera okno i wysyła pytanie do /api/chat. Używamy CustomEvent, bo chatbot
    // jest montowany osobno (ConditionalChatbot) i nie dzieli stanu z tą wyszukiwarką.
    window.dispatchEvent(new CustomEvent('apogeum:ask-ai', { detail: { question: term } }))
    setQ('')
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-2 rounded-full bg-card pl-4 pr-1.5 py-1.5 shadow-lg shadow-navy/10 ring-1 ring-navy/5"
    >
      <Search className="size-4 shrink-0 text-navy/60" aria-hidden="true" />
      <label className="sr-only" htmlFor="resident-search">
        Zapytaj asystenta AI o gminę
      </label>
      <input
        id="resident-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        placeholder="Zapytaj asystenta AI o gminę..."
        className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-navy placeholder:text-navy/45 outline-none"
      />
      <button
        type="submit"
        aria-label="Zapytaj asystenta AI"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground shadow-md transition-transform active:scale-90"
      >
        <ArrowRight className="size-4" />
      </button>
    </form>
  )
}
