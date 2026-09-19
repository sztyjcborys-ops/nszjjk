/**
 * Template remontuje się przy każdej zmianie trasy, więc animacja CSS
 * odtwarza się na wejściu każdej (także statycznej) strony.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>
}
