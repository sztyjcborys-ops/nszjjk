import 'server-only'

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3'

/**
 * Cloudflare R2 przez API zgodne z S3 (@aws-sdk/client-s3).
 *
 * Wszystkie klucze R2 (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)
 * są używane WYŁĄCZNIE po stronie serwera — `import 'server-only'` gwarantuje,
 * że ten moduł nigdy nie trafi do bundla klienta. Bucket pozostaje prywatny;
 * pliki serwujemy przez proxy (`/api/gallery/image/...`), więc nie musimy
 * ustawiać publicznego dostępu ani domeny publicznej R2.
 */

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? ''

let client: S3Client | null = null

export function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey || !R2_BUCKET) {
    throw new Error(
      'Brak konfiguracji R2: ustaw R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY oraz R2_BUCKET_NAME.',
    )
  }

  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return client
}

/** Ścieżka proxy, pod którą prywatny obiekt R2 jest serwowany na stronie. */
export function r2KeyToPublicPath(key: string): string {
  return `/api/gallery/image/${key}`
}

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
  const s3 = getR2Client()
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

/**
 * Usuwa obiekt z R2. Rzuca wyjątek, gdy operacja się nie powiedzie —
 * wywołujący (odrzucenie zdjęcia) polega na tym, aby NIE kasować rekordu z bazy,
 * jeśli pliku nie udało się usunąć.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const s3 = getR2Client()
  await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
}

export async function getR2Object(key: string): Promise<GetObjectCommandOutput> {
  const s3 = getR2Client()
  return s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }))
}
