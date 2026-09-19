'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

export function ShareButton({
  title,
  disabled,
}: {
  title: string
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (disabled) return
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // user cancelled — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={disabled}
      className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary disabled:cursor-default disabled:opacity-60"
    >
      {copied ? <Check className="size-4 text-eco" /> : <Share2 className="size-4" />}
      {copied ? 'Skopiowano link' : 'Udostępnij'}
    </button>
  )
}
