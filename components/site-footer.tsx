import Link from 'next/link'
import Image from 'next/image'
import { Phone, Heart, MapPin, Mail, Info } from 'lucide-react'
import { ShieldMark } from '@/components/brand-logo'

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3V13h2.6v8h3.6Z" />
  </svg>
)

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22 8.2a2.6 2.6 0 0 0-1.8-1.8C18.6 6 12 6 12 6s-6.6 0-8.2.4A2.6 2.6 0 0 0 2 8.2 27 27 0 0 0 1.6 12 27 27 0 0 0 2 15.8a2.6 2.6 0 0 0 1.8 1.8C5.4 18 12 18 12 18s6.6 0 8.2-.4a2.6 2.6 0 0 0 1.8-1.8c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8ZM10 15V9l5 3-5 3Z" />
  </svg>
)

const socials = [
  { label: 'Facebook', href: 'https://www.facebook.com/share/1BtasxWuWD/', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/gminajejkowice', Icon: InstagramIcon },
  { label: 'YouTube', href: '#', Icon: YoutubeIcon },
]

function Dot() {
  return <span aria-hidden className="size-1.5 rounded-full bg-gold" />
}

export function SiteFooter() {
  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-16">
        {/* Brand + skyline */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 md:gap-4">
            <ShieldMark className="h-10 w-auto shrink-0 md:h-16" />
            <div className="flex flex-col leading-none">
              <span className="text-xl font-extrabold tracking-tight md:text-3xl">
                JEJKOWICE
              </span>
              <span className="-mt-0.5 font-script text-base leading-none text-gold md:text-xl">
                nasza gmina!
              </span>
            </div>
          </div>
          <Image
            src="/images/burger-skyline.png"
            alt=""
            aria-hidden
            width={520}
            height={180}
            className="hidden h-20 w-auto opacity-40 invert sm:block md:h-24"
          />
        </div>

        {/* Disclaimer */}
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:mt-12 md:gap-4 md:p-5">
          <Info className="mt-0.5 size-6 shrink-0 text-primary md:size-7" />
          <p className="text-xs leading-relaxed text-navy-foreground/70 md:text-sm">
            Portal naszejejkowice.pl jest nieoficjalnym serwisem informacyjnym
            tworzonym przez mieszkańców. Nie jesteśmy częścią administracji
            samorządowej.
          </p>
        </div>

        <hr className="mt-6 border-white/10 md:mt-8" />

        {/* Socials */}
        <div className="mt-6 flex justify-center gap-3 md:mt-8 md:gap-4">
          {socials.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="flex size-10 items-center justify-center rounded-full border border-white/20 text-navy-foreground transition-colors hover:border-white/40 hover:bg-white/10 md:size-12"
            >
              <Icon className="size-4 md:size-5" />
            </a>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs md:mt-8 md:gap-x-4 md:gap-y-3 md:text-sm">
          <span className="inline-flex items-center gap-2 text-navy-foreground/85">
            <MapPin className="size-4 text-primary" />
            Urząd Gminy Jejkowice
          </span>
          <Dot />
          <a
            href="tel:+48324302002"
            className="inline-flex items-center gap-2 text-navy-foreground/85 transition-colors hover:text-navy-foreground"
          >
            <Phone className="size-4 text-primary" />
            32 430 20 02
          </a>
          <Dot />
          <a
            href="mailto:ug@jejkowice.pl"
            className="inline-flex items-center gap-2 text-navy-foreground/85 transition-colors hover:text-navy-foreground"
          >
            <Mail className="size-4 text-primary" />
            ug@jejkowice.pl
          </a>
        </div>

        <hr className="mt-6 border-white/10 md:mt-8" />

        {/* Legal */}
        <div className="mt-6 flex items-center justify-center gap-3 text-xs md:mt-8 md:gap-4 md:text-sm">
          <Link
            href="/polityka-prywatnosci"
            prefetch={false}
            className="text-navy-foreground/80 transition-colors hover:text-navy-foreground"
          >
            Polityka prywatności
          </Link>
          <Dot />
          <Link
            href="/regulamin"
            prefetch={false}
            className="text-navy-foreground/80 transition-colors hover:text-navy-foreground"
          >
            Regulamin
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-navy-foreground/55 md:mt-5 md:text-sm">
          {'\u00A9'} 2026{' '}
          <a
            href="https://www.naszejejkowice.pl"
            className="font-semibold text-navy-foreground/75 underline-offset-2 transition-colors hover:text-navy-foreground hover:underline"
          >
            naszejejkowice.pl
          </a>
        </p>

        <p className="mt-1 inline-flex w-full items-center justify-center gap-1 text-[10px] text-navy-foreground/60 md:mt-1.5 md:text-xs">
          stworzono z
          <Heart aria-hidden className="animate-heartbeat size-3 fill-gold text-gold" />
          dla naszej społeczności
        </p>
      </div>
    </footer>
  )
}
