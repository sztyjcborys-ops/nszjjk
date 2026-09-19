"use client"

import { useState } from "react"
import { NewsCard } from "@/components/shared/news-card"
import { type NewsItem, newsCategories } from "@/lib/data"
import { cn } from "@/lib/utils"

export function NewsList({ items }: { items: NewsItem[] }) {
  const [active, setActive] = useState<string>("Wszystkie")

  const filtered = active === "Wszystkie" ? items : items.filter((n) => n.category === active)

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1.5 md:gap-2">
        {newsCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors md:px-4 md:py-2 md:text-sm",
              active === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
          Brak aktualności w tej kategorii.
        </p>
      )}
    </div>
  )
}
