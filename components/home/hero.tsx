import Image from 'next/image'
import { Heart } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative -mt-16 min-h-[92svh] overflow-hidden md:min-h-[88vh] lg:min-h-screen">
      {/* Panorama Jejkowic — pełne tło hero */}
      <Image
        src="/images/hero-panorama.jpg"
        alt="Panorama Jejkowic z lotu ptaka — kościół, zabudowa i pola o zachodzie słońca"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_65%]"
      />
      {/* Rozjaśnienie górnej części pod nagłówek + delikatne przyciemnienie dołu */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-sky-100/70 via-transparent to-navy/25"
      />

      {/* Jasny clipart panoramy przy dolnej krawędzi hero — powiększony */}
      <img
        src="/images/skyline-clipart.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-4 right-[-10%] z-10 w-[54%] max-w-none opacity-90 md:right-[-12%] md:bottom-8 md:w-[74%] lg:bottom-8 lg:right-[-10%] lg:w-[76%]"
      />

      {/* Treść */}
      <div className="relative z-20 mx-auto flex min-h-[92svh] w-full max-w-6xl flex-col px-5 pb-40 pt-28 md:min-h-[88vh] md:px-8 md:pt-36 lg:min-h-screen lg:pb-48 lg:pt-40">
        {/* Nagłówek */}
        <div className="max-w-xl">
          <h1 className="text-5xl font-extrabold leading-[0.95] tracking-tight text-navy md:text-6xl lg:text-7xl">
            Jejkowice.
            <span className="mt-1 block font-script text-5xl font-bold text-gold md:text-6xl lg:text-7xl">
              Na co dzień.
            </span>
          </h1>
          <p className="mt-3 max-w-md text-base font-medium leading-relaxed text-navy/80 text-pretty md:text-lg">
            Wszystko, co ważne w naszej gminie — blisko Ciebie.
          </p>
        </div>

        {/* Dolny blok — I ❤ Jejkowice (handwritten, po ukosie, z podkreśleniem) */}
        <div className="mt-auto">
          <span className="relative inline-block -rotate-[7deg]">
            <span className="inline-flex items-baseline gap-1.5 font-script text-3xl font-medium text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.45)] md:text-5xl">
              I
              <Heart
                className="size-5 translate-y-1 fill-gold text-gold md:size-8"
                aria-hidden="true"
              />
              Jejkowice
            </span>
            {/* Odręczne podkreślenie */}
            <svg
              className="absolute -bottom-2.5 left-1 w-[108%] text-white/90 drop-shadow-[0_1px_4px_rgba(15,23,42,0.35)] md:-bottom-3"
              viewBox="0 0 300 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 10 C 70 3, 150 3, 296 7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>
      </div>

      {/* Handwritten „Przejdź dalej" ze strzałką i animacją przewijania */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-14 z-30 flex flex-col items-center gap-1.5 md:bottom-28"
      >
        <span className="font-script text-base font-bold tracking-wide text-white drop-shadow-[0_2px_8px_rgba(15,23,42,0.6)] md:text-2xl">
          Przejdź dalej
        </span>
        <svg
          className="h-5 w-5 animate-bounce text-gold drop-shadow-[0_2px_6px_rgba(15,23,42,0.5)] md:h-9 md:w-9"
          viewBox="0 0 48 60"
          fill="none"
        >
          <path
            d="M24 6 L 24 42"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M14 33 L 24 44 L 34 33"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Fala oddzielająca hero od sekcji treści */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-20">
        <svg
          className="block h-16 w-full md:h-20 lg:h-24"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,64 C240,120 480,16 720,40 C960,64 1200,120 1440,72 L1440,120 L0,120 Z"
            className="fill-background"
          />
          <path
            d="M0,64 C240,120 480,16 720,40 C960,64 1200,120 1440,72"
            className="fill-none stroke-gold"
            strokeWidth="3"
          />
        </svg>
      </div>
    </section>
  )
}
