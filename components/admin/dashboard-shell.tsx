'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Newspaper,
  Inbox,
  Lightbulb,
  CalendarDays,
  BarChart3,
  Images,
  MessageSquare,
  Users,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOutAction } from '@/app/admin/actions'
import { useScrollLock } from '@/hooks/use-scroll-lock'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
  /** Dopasowanie aktywnego stanu dla dokładnie tej ścieżki (np. pulpit). */
  exact?: boolean
}

const NAV: NavItem[] = [
  { href: '/admin', label: 'Pulpit', icon: LayoutDashboard, exact: true },
  { href: '/admin/artykuly', label: 'Artykuły', icon: Newspaper },
  { href: '/admin/zgloszenia', label: 'Zgłoszenia', icon: Inbox },
  { href: '/admin/pomysly', label: 'Pomysły', icon: Lightbulb },
  { href: '/admin/wydarzenia', label: 'Wydarzenia', icon: CalendarDays },
  { href: '/admin/ankiety', label: 'Ankiety', icon: BarChart3 },
  { href: '/admin/galeria', label: 'Galeria', icon: Images },
  { href: '/admin/rozmowy', label: 'Rozmowy z AI', icon: MessageSquare },
  { href: '/admin/uzytkownicy', label: 'Użytkownicy', icon: Users, adminOnly: true },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  editor: 'Redaktor',
  resident: 'Mieszkaniec',
}

export type ShellUser = {
  name: string
  email: string
  role: string
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

function NavLinks({
  pathname,
  isAdmin,
  badges,
  onNavigate,
}: {
  pathname: string
  isAdmin: boolean
  badges: Record<string, number>
  onNavigate?: () => void
}) {
  const items = NAV.filter((i) => !i.adminOnly || isAdmin)
  return (
    <nav className="grid gap-1" aria-label="Nawigacja panelu">
      {items.map((item) => {
        const active = isActive(pathname, item)
        const Icon = item.icon
        const count = badges[item.href] ?? 0
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {count > 0 && (
              <span
                aria-label={`${count} do sprawdzenia`}
                className={cn(
                  'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold leading-none tabular-nums',
                  active
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-primary text-primary-foreground',
                )}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
        J
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold tracking-tight">Panel</span>
        <span className="block text-xs text-muted-foreground">Jejkowice</span>
      </span>
    </div>
  )
}

export function DashboardShell({
  user,
  isAdmin,
  badges = {},
  children,
}: {
  user: ShellUser
  isAdmin: boolean
  badges?: Record<string, number>
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Zamknij szufladę po zmianie trasy.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Pełna blokada przewijania tła, gdy szuflada otwarta (niezawodna na mobile).
  useScrollLock(open)

  // Zamykanie klawiszem Escape, gdy szuflada otwarta.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="min-h-svh bg-muted/30">
      {/* Górny pasek */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Otwórz menu panelu"
              className="flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <div className="lg:hidden">
              <Brand />
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="hidden items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
              <span className="max-w-[10rem] truncate text-foreground">{user.name}</span>
              <span className="text-muted-foreground/60">·</span>
              {ROLE_LABELS[user.role] ?? 'Konto'}
            </span>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault()
                window.open('/', '_blank', 'noopener,noreferrer')
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="size-4" />
              <span className="hidden sm:inline">Zobacz stronę</span>
            </a>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Wyloguj</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[16rem_1fr]">
        {/* Sidebar — desktop */}
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] border-r border-border bg-card px-3 py-5 lg:block">
          <div className="px-2 pb-4">
            <Brand />
          </div>
          <NavLinks pathname={pathname} isAdmin={isAdmin} badges={badges} />
        </aside>

        {/* Szuflada — mobile */}
        <div
          className={cn(
            'fixed inset-0 z-50 lg:hidden',
            open ? 'pointer-events-auto' : 'pointer-events-none',
          )}
          role="dialog"
          aria-modal="true"
          aria-hidden={!open}
        >
          <div
            className={cn(
              'absolute inset-0 bg-navy/40 backdrop-blur-sm transition-opacity duration-300 ease-out',
              open ? 'opacity-100' : 'opacity-0',
            )}
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              'absolute inset-y-0 left-0 flex w-[17rem] max-w-[85%] flex-col bg-card px-3 py-4 shadow-xl transition-transform duration-300 ease-out will-change-transform',
              open ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <div className="flex items-center justify-between px-2 pb-4">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zamknij menu"
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavLinks
              pathname={pathname}
              isAdmin={isAdmin}
              badges={badges}
              onNavigate={() => setOpen(false)}
            />
            <div className="mt-auto rounded-xl bg-muted px-3 py-2.5 text-xs">
              <span className="block truncate font-medium text-foreground">{user.name}</span>
              <span className="text-muted-foreground">{ROLE_LABELS[user.role] ?? 'Konto'}</span>
            </div>
          </div>
        </div>

        {/* Treść */}
        <div className="min-w-0">
          <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
