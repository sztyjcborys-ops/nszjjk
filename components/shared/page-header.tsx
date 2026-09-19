export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <header className="mb-6 md:mb-10">
      {eyebrow && (
        <span className="mb-2.5 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary md:mb-3 md:px-3 md:py-1 md:text-xs">
          {eyebrow}
        </span>
      )}
      <h1 className="text-pretty text-2xl font-bold tracking-tight md:text-4xl">{title}</h1>
      {description && (
        <p className="mt-2 max-w-2xl text-pretty text-sm text-muted-foreground md:mt-3 md:text-lg">{description}</p>
      )}
    </header>
  )
}
