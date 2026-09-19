'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Heart,
  Home,
  Images,
  Lightbulb,
  Landmark,
  Newspaper,
  Trash2,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { ShieldMark } from '@/components/brand-logo'
import { cn } from '@/lib/utils'
import { BUDGET_PAGE_ENABLED } from '@/lib/features'
import { useScrollLock } from '@/hooks/use-scroll-lock'

/* -------------------------------------------------------------------------- */
/*  Pozycje / transformacje obrazków                                          */
/* -------------------------------------------------------------------------- */

type Transform = {
  x: number // px w poziomie
  y: number // px w pionie
  scale: number // 1 = 100%
  rotate: number // stopnie
  opacity: number // 0–1
  height: number // wysokość obrazka w px
}

const SKYLINE: Transform = {
  x: 0,
  y: -2,
  scale: 0.98,
  rotate: 0,
  opacity: 1,
  height: 81,
}

/* --- Skyline skalowany proporcjonalnie do szerokości ekranu ---------------- *
 * Parametry były dobrane idealnie na Galaxy S24 (szerokość CSS = 360px).      *
 * Zamiast sztywnych pikseli przeliczamy je na jednostki `vw` względem tej     *
 * bazy, dzięki czemu kadr panoramy wygląda identycznie na każdym telefonie.   *
 * Delikatny limit (do ~480px) zapobiega przerośnięciu na większych ekranach.  */
const SKYLINE_REF_W = 360
const SKYLINE_MAX_W = 480
const svw = (px: number) => `${((px / SKYLINE_REF_W) * 100).toFixed(3)}vw`
const skylineLen = (px: number) =>
  `min(${svw(px)}, ${((px * SKYLINE_MAX_W) / SKYLINE_REF_W).toFixed(1)}px)`

const SKYLINE_HEIGHT = skylineLen(SKYLINE.height)
const skylineImgStyle = {
  height: SKYLINE_HEIGHT,
  opacity: SKYLINE.opacity,
  transform: `translate(${svw(SKYLINE.x)}, ${svw(SKYLINE.y)}) rotate(${SKYLINE.rotate}deg) scale(${SKYLINE.scale})`,
}

/* -------------------------------------------------------------------------- */

type MenuItem = {
  href: string
  label: string
  icon: LucideIcon
  external?: boolean
  children?: MenuItem[]
}

const groups: MenuItem[][] = [
  [
    { href: '/', label: 'Start', icon: Home },
    {
      href: '#centrum-mieszkanca',
      label: 'Centrum mieszkańca',
      icon: Users,
      children: [
        { href: '/galeria', label: 'Galeria', icon: Images },
        { href: '/ankiety', label: 'Ankiety', icon: BarChart3 },
        { href: '/pomysly', label: 'Pomysły dla Jejkowic', icon: Lightbulb },
        { href: '/wywoz-smieci', label: 'Wywóz śmieci', icon: Trash2 },
        { href: '/zglos-sprawe', label: 'Zgłoś sprawę', icon: AlertTriangle },
      ],
    },
    { href: '/aktualnosci', label: 'Aktualności', icon: Newspaper },
    { href: '/wydarzenia', label: 'Wydarzenia', icon: CalendarDays },
    // Pozycja „Budżet gminy" pojawia się tylko, gdy strona budżetu jest
    // włączona (patrz BUDGET_PAGE_ENABLED w lib/features.ts).
    ...(BUDGET_PAGE_ENABLED
      ? [{ href: '/budzet', label: 'Budżet gminy', icon: Wallet }]
      : []),
    { href: '/poznaj-jejkowice', label: 'Poznaj Jejkowice', icon: BookOpen },
    {
      href: 'https://jejkowice.pl',
      label: 'Urząd Gminy Jejkowice',
      icon: Landmark,
      external: true,
    },
  ],
]

/** Podpis w stopce — odnośnik do strony urzędu, bez ikony. */
const OFFICE = {
  href: 'https://www.facebook.com/GminaJejkowice',
  label: 'Facebook gminy Jejkowice',
}

/** Miękka fala rozdzielająca sekcje — kierunek i kolor zależą od miejsca użycia. */
function Wave({
  className,
  accent = false,
}: {
  className?: string
  accent?: boolean
}) {
  const curve = 'M0 26 C 280 4 600 42 900 28 C 1130 17 1310 6 1440 14'
  return (
    <svg
      viewBox="0 0 1440 44"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <path d={`${curve} L1440 44 L0 44 Z`} fill="currentColor" />
      {accent && (
        <path
          d={curve}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

/* -------------------------------------------------------------------------- */

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  // `render` trzyma panel w drzewie także podczas animacji zamykania,
  // `show` steruje klasami przejścia (wejście/wyjście).
  const [render, setRender] = useState(open)
  const [show, setShow] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (open) {
      setRender(true)
      // Dwie ramki, aby przeglądarka zdążyła namalować stan początkowy
      // przed uruchomieniem animacji wejścia.
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)))
      return () => cancelAnimationFrame(r)
    }
    setShow(false)
    const t = setTimeout(() => {
      setRender(false)
      setExpanded(null)
    }, 200)
    return () => clearTimeout(t)
  }, [open])

  // Pełna blokada przewijania tła, gdy panel jest w drzewie (także w trakcie
  // animacji zamykania). Niezawodna również na mobilnych przeglądarkach.
  useScrollLock(render)

  useEffect(() => {
    if (!render) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [render, onClose])

  if (!render || !mounted) return null

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const renderRow = (
    item: MenuItem,
    opts: { withBorder: boolean; nested?: boolean; expandedRow?: boolean },
  ) => {
    const Icon = item.icon
    const Chevron = item.children
      ? opts.expandedRow
        ? ChevronDown
        : ChevronRight
      : ChevronRight
    const active = item.children ? false : isActive(item.href)

    return (
      <>
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-navy transition-colors',
            opts.nested
              ? 'size-8 [@media(min-height:700px)]:size-9'
              : 'size-9 [@media(min-height:700px)]:size-11',
            active && 'bg-primary/20',
          )}
        >
          <Icon
            className={cn(
              opts.nested
                ? 'size-[15px] [@media(min-height:700px)]:size-[17px]'
                : 'size-[18px] [@media(min-height:700px)]:size-[21px]',
            )}
            strokeWidth={1.7}
          />
        </span>
        <span
          className={cn(
            'flex flex-1 items-center justify-between gap-2 font-bold tracking-tight text-navy',
            opts.nested
              ? 'py-2.5 text-[13.5px] [@media(min-height:700px)]:py-3 [@media(min-height:700px)]:text-[14.5px]'
              : 'py-3.5 text-[15px] [@media(min-height:700px)]:py-4 [@media(min-height:700px)]:text-[16.5px]',
            opts.withBorder && 'border-b border-border/60',
          )}
        >
          <span className="truncate">{item.label}</span>
          <Chevron className="size-[18px] shrink-0 text-primary" strokeWidth={2.25} />
        </span>
      </>
    )
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu główne"
      className={cn(
        'fixed inset-0 z-[70] flex flex-col bg-background transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform] lg:hidden motion-reduce:transition-none',
        show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-[0.985]',
      )}
    >
      {/* --- Nagłówek + panorama --- */}
      <div className="relative shrink-0 bg-gradient-to-b from-secondary/70 to-background">
        <div className="flex items-start justify-between gap-3 px-4 pt-2 [@media(min-height:700px)]:pt-3">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
            <ShieldMark className="h-9 w-auto shrink-0" />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-tight text-navy">
                JEJKOWICE
              </span>
              <span className="-mt-0.5 font-script text-sm leading-none text-gold">
                nasza gmina!
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij menu"
            className="-mr-1 flex size-10 items-center justify-center rounded-xl text-navy transition-colors hover:bg-navy/5"
          >
            <X className="size-6" strokeWidth={2.25} />
          </button>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none mt-1 overflow-hidden"
          style={{ height: SKYLINE_HEIGHT }}
        >
          <img
            src="/images/burger-skyline.png"
            alt=""
            className="w-full object-cover object-bottom"
            style={skylineImgStyle}
          />
        </div>
        <Wave className="-mt-5 block h-6 w-full text-background" />
      </div>

      {/* --- Lista nawigacji --- */}
      <nav
        aria-label="Nawigacja mobilna"
        className="flex-1 overflow-y-auto overscroll-contain px-4 pb-3"
      >
        {groups.map((group, gi) => (
          <ul
            key={gi}
            className={cn('py-1 [@media(min-height:700px)]:py-1.5', gi > 0 && 'border-t border-border')}
          >
            {group.map((item, ii) => {
              const withBorder = ii < group.length - 1
              const isExpanded = expanded === item.label

              if (item.children) {
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : item.label)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center gap-3 rounded-lg text-left transition-colors active:bg-muted/60"
                    >
                      {renderRow(item, { withBorder, expandedRow: isExpanded })}
                    </button>
                    <div
                      className={cn(
                        'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                        isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                      )}
                    >
                      <div className="overflow-hidden">
                        <ul
                          className={cn(
                            'ml-5 border-l border-border/70 py-1 pl-3 transition-opacity duration-200 ease-out motion-reduce:transition-none',
                            isExpanded ? 'opacity-100' : 'opacity-0',
                          )}
                        >
                          {item.children.map((child, ci) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                prefetch={false}
                                onClick={onClose}
                                tabIndex={isExpanded ? undefined : -1}
                                aria-hidden={isExpanded ? undefined : true}
                                className="flex items-center gap-3 rounded-lg transition-colors active:bg-muted/60"
                              >
                                {renderRow(child, {
                                  withBorder: ci < item.children!.length - 1,
                                  nested: true,
                                })}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                )
              }

              if (item.external) {
                return (
                  <li key={item.href + item.label}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-lg transition-colors active:bg-muted/60"
                    >
                      {renderRow(item, { withBorder })}
                    </a>
                  </li>
                )
              }

              return (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg transition-colors active:bg-muted/60"
                  >
                    {renderRow(item, { withBorder })}
                  </Link>
                </li>
              )
            })}
          </ul>
        ))}
      </nav>

      {/* --- Stopka (bez ciemnego tła — elementy w kolorze navy) --- */}
      <div className="relative shrink-0 border-t border-background">
        <div className="relative bg-background px-5 pb-4 pt-3 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [@media(min-height:700px)]:pt-4">
          <div className="relative flex flex-col items-center text-center">
            <p className="font-script text-base leading-tight text-navy [@media(min-height:700px)]:text-lg">
              Wszystko, co ważne w naszej gminie —{' '}
              <span className="text-gold">blisko Ciebie.</span>
            </p>
            <div className="mt-3 [@media(min-height:700px)]:mt-4">
              <p className="flex items-center justify-center gap-2 text-[13px] font-extrabold tracking-[0.12em] text-navy">
                I <Heart className="size-4 fill-gold text-gold" /> JEJKOWICE
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
