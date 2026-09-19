/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nie zdradzaj stacku: usuwa nagłówek `X-Powered-By: Next.js`, który ułatwia
  // atakującemu dobór exploitów pod konkretny framework.
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
    // Optymalizacja włączona (mniejszy transfer), ale mocno ograniczamy
    // liczbę generowanych wariantów i wydłużamy cache, aby zredukować
    // liczbę requestów do /_next/image (były to setki w Observability).
    formats: ['image/webp'],
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [128, 256, 384],
    // Zoptymalizowane obrazy cache'owane przez rok — kolejne wejścia
    // i nawigacja nie generują ponownych transformacji/requestów.
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        // Zasoby serwowane wprost z /public (svg, og-image dla crawlerów).
        // Rok cache => brak ponownych pobrań przy każdym wejściu.
        source: '/:file(og-image.jpg|og-image-v2.jpg|favicon.svg|icon.svg)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Bezpieczne nagłówki bazowe (bez wpływu na wygląd i działanie).
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Wymuś HTTPS na 2 lata (produkcja i tak jest po HTTPS).
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          // Wyłącz funkcje przeglądarki, których serwis nie używa (pogodę bierzemy
          // ze stałych współrzędnych po stronie serwera — geolokalizacja zbędna).
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Zapobiega clickjackingowi (osadzeniu panelu/strony w cudzym <iframe>).
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ]
  },
}

export default nextConfig
