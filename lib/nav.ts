import { BUDGET_PAGE_ENABLED } from '@/lib/features'

export const mainNav = [
  { href: '/', label: 'Start' },
  { href: '/aktualnosci', label: 'Aktualności' },
  { href: '/wydarzenia', label: 'Wydarzenia' },
  { href: '/wywoz-smieci', label: 'Wywóz śmieci' },
  { href: '/firmy', label: 'Firmy' },
  { href: '/zglos-sprawe', label: 'Zgłoś sprawę' },
  { href: '/ankiety', label: 'Ankiety' },
  // Pozycja „Budżet" pojawia się tylko, gdy strona budżetu jest włączona
  // (patrz BUDGET_PAGE_ENABLED w lib/features.ts).
  ...(BUDGET_PAGE_ENABLED ? [{ href: '/budzet', label: 'Budżet' }] : []),
  { href: '/galeria', label: 'Galeria' },
  { href: '/poznaj-jejkowice', label: 'Poznaj Jejkowice' },
] as const

export const menuLinks = [
  { href: '/poznaj-jejkowice', label: 'O gminie', icon: 'book' },
  { href: '/galeria', label: 'Galeria mieszkańców', icon: 'images' },
  { href: '/wywoz-smieci', label: 'Wywóz śmieci', icon: 'recycle' },
  { href: '/ankiety', label: 'Ankiety i opinie', icon: 'chart' },
  { href: '/pomysly', label: 'Pomysły dla Jejkowic', icon: 'idea' },
  { href: '/zglos-sprawe', label: 'Zgłoś sprawę', icon: 'alert' },
  { href: '/wydarzenia', label: 'Kalendarz wydarzeń', icon: 'calendar' },
] as const
