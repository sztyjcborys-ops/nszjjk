import {
  Armchair,
  Baby,
  Bike,
  BookOpen,
  Bus,
  Cake,
  Camera,
  Church,
  Coffee,
  Dog,
  Drama,
  Dumbbell,
  FerrisWheel,
  Flame,
  Gamepad2,
  Gift,
  GraduationCap,
  Handshake,
  Heart,
  IceCream,
  Landmark,
  Mic2,
  Music,
  Palette,
  PartyPopper,
  Popcorn,
  Sparkles,
  Star,
  Sun,
  Tent,
  TreePine,
  Trophy,
  Users,
  Utensils,
  Wine,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Rejestr ikon dostępnych dla listy „Co na Ciebie czeka?".
 * `key` jest zapisywany w bazie (format 'key|Etykieta'), `label` to podpowiedź
 * w wyborze ikony w panelu — nie mylić z tekstem wpisywanym przez redakcję.
 */
export type HighlightIconOption = {
  key: string
  label: string
  Icon: LucideIcon
}

export const HIGHLIGHT_ICON_OPTIONS: HighlightIconOption[] = [
  { key: 'party', label: 'Zabawa', Icon: PartyPopper },
  { key: 'music', label: 'Muzyka', Icon: Music },
  { key: 'mic', label: 'Występy', Icon: Mic2 },
  { key: 'food', label: 'Jedzenie', Icon: Utensils },
  { key: 'sweets', label: 'Słodkości', Icon: Cake },
  { key: 'icecream', label: 'Lody', Icon: IceCream },
  { key: 'popcorn', label: 'Popcorn', Icon: Popcorn },
  { key: 'coffee', label: 'Kawiarnia', Icon: Coffee },
  { key: 'drinks', label: 'Napoje', Icon: Wine },
  { key: 'family', label: 'Dla rodzin', Icon: Users },
  { key: 'kids', label: 'Dla dzieci', Icon: Baby },
  { key: 'games', label: 'Gry i zabawy', Icon: Gamepad2 },
  { key: 'sport', label: 'Sport', Icon: Dumbbell },
  { key: 'bike', label: 'Rowery', Icon: Bike },
  { key: 'trophy', label: 'Konkursy', Icon: Trophy },
  { key: 'gift', label: 'Nagrody', Icon: Gift },
  { key: 'workshop', label: 'Warsztaty', Icon: Palette },
  { key: 'education', label: 'Edukacja', Icon: GraduationCap },
  { key: 'reading', label: 'Czytanie', Icon: BookOpen },
  { key: 'theatre', label: 'Teatr', Icon: Drama },
  { key: 'photo', label: 'Zdjęcia', Icon: Camera },
  { key: 'funfair', label: 'Wesołe miasteczko', Icon: FerrisWheel },
  { key: 'outdoor', label: 'Na świeżym powietrzu', Icon: TreePine },
  { key: 'sun', label: 'Pogoda / lato', Icon: Sun },
  { key: 'bonfire', label: 'Ognisko', Icon: Flame },
  { key: 'tent', label: 'Namiot / piknik', Icon: Tent },
  { key: 'seating', label: 'Miejsca siedzące', Icon: Armchair },
  { key: 'animals', label: 'Zwierzęta', Icon: Dog },
  { key: 'community', label: 'Spotkanie', Icon: Handshake },
  { key: 'culture', label: 'Kultura', Icon: Landmark },
  { key: 'church', label: 'Uroczystość', Icon: Church },
  { key: 'transport', label: 'Dojazd', Icon: Bus },
  { key: 'special', label: 'Niespodzianki', Icon: Sparkles },
  { key: 'star', label: 'Atrakcje', Icon: Star },
  { key: 'love', label: 'Dla każdego', Icon: Heart },
]

export const HIGHLIGHT_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  HIGHLIGHT_ICON_OPTIONS.map((o) => [o.key, o.Icon]),
)

/** Kolejność ikon używana, gdy pozycja nie ma jawnie przypisanego klucza. */
export const HIGHLIGHT_FALLBACK_ICONS: LucideIcon[] = [
  Utensils,
  Users,
  Music,
  Armchair,
  Star,
  Sparkles,
  TreePine,
  PartyPopper,
]

export type ParsedHighlight = { iconKey: string | null; label: string }

/**
 * Rozbija zapisaną pozycję na klucz ikony i etykietę.
 * Obsługuje nowy format 'key|Etykieta' oraz starsze pozycje bez ikony.
 */
export function parseHighlight(raw: string): ParsedHighlight {
  const line = raw.trim()
  const pipe = line.indexOf('|')
  if (pipe >= 0) {
    const key = line.slice(0, pipe).trim()
    const label = line.slice(pipe + 1).trim()
    return { iconKey: HIGHLIGHT_ICON_MAP[key] ? key : null, label }
  }
  return { iconKey: null, label: line }
}

/** Zwraca komponent ikony dla pozycji, z rotacją jako fallback. */
export function resolveHighlightIcon(iconKey: string | null, index: number): LucideIcon {
  if (iconKey && HIGHLIGHT_ICON_MAP[iconKey]) return HIGHLIGHT_ICON_MAP[iconKey]
  return HIGHLIGHT_FALLBACK_ICONS[index % HIGHLIGHT_FALLBACK_ICONS.length]
}
