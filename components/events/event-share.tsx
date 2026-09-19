'use client'

import { useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
    </svg>
  )
}

export function EventShare({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  const currentUrl = () => (typeof window !== 'undefined' ? window.location.href : '')
  const shareText = `${title} — Gmina Jejkowice`

  const openShare = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Schowek niedostępny — cicho ignorujemy.
    }
  }

  const targets = [
    {
      label: 'Facebook',
      icon: FacebookIcon,
      className: 'text-primary',
      onClick: () =>
        openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl())}`),
    },
    {
      label: 'Messenger',
      icon: MessengerIcon,
      className: 'text-primary',
      onClick: () => openShare(`fb-messenger://share/?link=${encodeURIComponent(currentUrl())}`),
    },
    {
      label: 'WhatsApp',
      icon: WhatsAppIcon,
      className: 'text-eco',
      onClick: () =>
        openShare(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${currentUrl()}`)}`),
    },
  ]

  return (
    <div className="flex items-center gap-2">
      {targets.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={t.onClick}
          aria-label={`Udostępnij: ${t.label}`}
          title={t.label}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary"
        >
          <t.icon className={cn('size-5', t.className)} />
          <span className="sr-only">{t.label}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Kopiuj link"
        title="Kopiuj link"
        className={cn(
          'inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors',
          copied
            ? 'border-eco bg-eco text-eco-foreground'
            : 'border-border bg-card text-foreground hover:bg-secondary',
        )}
      >
        {copied ? <Check className="size-5" /> : <Link2 className="size-5" />}
        <span className="sr-only">{copied ? 'Skopiowano' : 'Kopiuj link'}</span>
      </button>
    </div>
  )
}
