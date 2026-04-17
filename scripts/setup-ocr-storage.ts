/**
 * Crea el bucket "delivery-notes" en Supabase Storage para fotos de albaranes OCR.
 *
 * Decisiones:
 *  - Bucket PRIVADO (URLs firmadas con expiración corta para servir al frontend)
 *  - Path convention: "{hotel_id}/{receipt_id}-{timestamp}.{ext}"
 *  - Solo miembros del hotel pueden upload/read (vía RLS sobre objects)
 *
 * Idempotente: si el bucket existe, no falla.
 *
 * Uso: npm run db:setup-ocr
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) process.env[m[1]] ||= m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* opcional */ }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

async function main() {
  console.log('📦 Asegurando bucket delivery-notes...')

  const { data: existing } = await supabase.storage.listBuckets()
  const found = existing?.find((b) => b.name === 'delivery-notes')

  if (!found) {
    const { error } = await supabase.storage.createBucket('delivery-notes', {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024, // 10 MB por foto
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
    })
    if (error) throw new Error(`createBucket: ${error.message}`)
    console.log('   ✓ Bucket delivery-notes creado (privado, 10MB)')
  } else {
    console.log('   ✓ Bucket delivery-notes ya existe')
  }

  console.log('\n✅ Storage listo')
  console.log('   Path: {hotel_id}/{receipt_id}-{timestamp}.{ext}')
  console.log('   URLs: usar createSignedUrl(path, 3600) para servir al frontend')
}

main().catch((e) => { console.error(e); process.exit(1) })
