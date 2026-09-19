import type { ReactNode } from "react"

export function LegalArticle({ children }: { children: ReactNode }) {
  return <article className="flex flex-col gap-8">{children}</article>
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 md:p-7">
      <h2 className="text-lg font-bold tracking-tight text-foreground md:text-xl">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground [&_a]:break-words [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5 md:text-base">
        {children}
      </div>
    </section>
  )
}
