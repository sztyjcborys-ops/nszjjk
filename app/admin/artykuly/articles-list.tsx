'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Search,
  SlidersHorizontal,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  FileText,
  Pin,
  PinOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatArticleDate } from '@/lib/format'
import { deleteArticleAction, togglePublishAction, togglePinAction } from '../actions'
import { PendingIconButton } from '@/components/admin/pending-icon-button'

export type ArticleVM = {
  id: string
  title: string
  category: string
  cover_image: string | null
  published: boolean
  pinned: boolean
  created_at: string
}

type TabKey = 'all' | 'published' | 'drafts' | 'pinned'

const PAGE_SIZE = 6

const tabDefs: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'published', label: 'Opublikowane' },
  { key: 'drafts', label: 'Szkice' },
  { key: 'pinned', label: 'Przypięte' },
]

function matchesTab(article: ArticleVM, tab: TabKey): boolean {
  switch (tab) {
    case 'published':
      return article.published
    case 'drafts':
      return !article.published
    case 'pinned':
      return article.pinned
    default:
      return true
  }
}

export function ArticlesList({ articles }: { articles: ArticleVM[] }) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<TabKey>('all')
  const [page, setPage] = useState(1)

  const counts = useMemo(
    () => ({
      all: articles.length,
      published: articles.filter((a) => matchesTab(a, 'published')).length,
      drafts: articles.filter((a) => matchesTab(a, 'drafts')).length,
      pinned: articles.filter((a) => matchesTab(a, 'pinned')).length,
    }),
    [articles],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return articles
      .filter((a) => matchesTab(a, tab))
      .filter((a) =>
        q === '' ? true : `${a.title} ${a.category}`.toLowerCase().includes(q),
      )
  }, [articles, tab, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(start, start + PAGE_SIZE)

  function selectTab(next: TabKey) {
    setTab(next)
    setPage(1)
  }

  function updateQuery(value: string) {
    setQuery(value)
    setPage(1)
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Szukaj artykułów..."
            aria-label="Szukaj artykułów"
            className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground"
          aria-hidden="true"
        >
          <SlidersHorizontal className="size-4" />
        </span>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabDefs.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => selectTab(t.key)}
              aria-pressed={active}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              {t.label}
              <span
                className={`flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                  active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          )
        })}
      </div>

      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <FileText className="size-6" />
          </span>
          <p className="mt-3 text-sm text-muted-foreground">Brak artykułów dla wybranych filtrów.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {pageItems.map((a) => (
            <li key={a.id}>
              <div className="flex gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40 sm:gap-4 sm:p-4">
                <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary sm:size-20">
                  {a.cover_image ? (
                    <Image
                      src={a.cover_image || '/placeholder.svg'}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <FileText className="size-6" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
                      {a.category}
                    </span>
                    {a.published ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        Opublikowany
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        Szkic
                      </span>
                    )}
                    {a.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <Pin className="size-3" />
                        Przypięty
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1.5 line-clamp-2 text-pretty text-sm font-semibold leading-snug sm:text-base">
                    {a.title}
                  </h3>

                  <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                    <time className="min-w-0 flex-1 truncate">{formatArticleDate(a.created_at)}</time>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-center gap-0.5">
                  <form action={togglePinAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="next" value={String(!a.pinned)} />
                    <PendingIconButton
                      aria-label={a.pinned ? 'Odepnij artykuł' : 'Przypnij artykuł na górze'}
                      className={`flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted ${
                        a.pinned
                          ? 'text-primary hover:text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {a.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                    </PendingIconButton>
                  </form>
                  <form action={togglePublishAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="next" value={String(!a.published)} />
                    <PendingIconButton
                      aria-label={a.published ? 'Ukryj z głównej strony' : 'Pokaż na głównej stronie'}
                      title={a.published ? 'Widoczny — kliknij, aby ukryć' : 'Ukryty — kliknij, aby pokazać'}
                      className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
                        a.published
                          ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          : 'text-red-500 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300'
                      }`}
                      spinnerClassName={a.published ? undefined : 'text-red-500 dark:text-red-400'}
                    >
                      {a.published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </PendingIconButton>
                  </form>
                  <Link
                    href={`/admin/${a.id}`}
                    aria-label="Edytuj"
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <form action={deleteArticleAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <PendingIconButton
                      aria-label="Usuń"
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </PendingIconButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground sm:text-sm">
            {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} z {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Poprzednia strona"
              className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              {currentPage}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Następna strona"
              className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
