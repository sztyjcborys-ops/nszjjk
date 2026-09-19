import Image from 'next/image'
import { cn } from '@/lib/utils'

export function ShieldMark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/herb-jejkowice.png"
      alt="Herb gminy Jejkowice"
      width={120}
      height={146}
      priority
      className={className}
    />
  )
}

export function BrandLogo({
  className,
  dark = false,
  compact = false,
}: {
  className?: string
  dark?: boolean
  compact?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <ShieldMark className="h-9 w-auto shrink-0" />
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            'text-lg font-extrabold tracking-tight',
            dark ? 'text-navy-foreground' : 'text-foreground',
          )}
        >
          JEJKOWICE
        </span>
        {!compact && (
          <span className="-mt-0.5 font-script text-sm leading-none text-gold">
            nasza gmina!
          </span>
        )}
      </div>
    </div>
  )
}
