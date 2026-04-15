import { test, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Cargar .env.local manualmente (Playwright no lo hace por defecto)
try {
  const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] ||= m[2].replace(/^["']|["']$/g, '')
  }
} catch {
  // OK, .env.local opcional
}

/**
 * Fase C — Tests de RLS y autorización (Codex audit 2026-04-15).
 *
 * No son E2E de browser: usan @supabase/supabase-js con la anon key y sesiones
 * autenticadas por rol (del seed). Verifican que los fixes de 00028 + 00029
 * bloquean los vectores que Codex identificó.
 *
 * Seed (Fase A): 7 usuarios con roles + 1 PMS + 2 POS integrations en hotel
 * 11111111-... Uno de los POS tiene config.push_kitchen_orders=false (para
 * probar defense-in-depth 00029).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const HOTEL_ID = '11111111-1111-1111-1111-111111111111'
const PMS_ID = 'a0000000-0000-0000-0000-000000000001'
const POS_PUSH_DISABLED = 'a0000000-0000-0000-0000-000000000002'
const POS_PUSH_ENABLED = 'a0000000-0000-0000-0000-000000000003'

// Cliente anon autenticado con un email/password del seed
async function signedClient(email: string): Promise<SupabaseClient> {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en env')
  }
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: 'Test1234!' })
  if (error) throw new Error(`Login ${email}: ${error.message}`)
  return client
}

test.describe('RLS — credentials de integraciones (Codex 00028 CRITICAL)', () => {
  test('cook no puede SELECT credentials de pms_integrations', async () => {
    const client = await signedClient('test-cook@chefos.test')
    const { data } = await client
      .from('pms_integrations')
      .select('credentials')
      .eq('hotel_id', HOTEL_ID)
    // Con la nueva policy admin-only, cook recibe 0 rows (no error, filtered silently)
    expect(data ?? []).toHaveLength(0)
  })

  test('admin SÍ puede SELECT credentials de pms_integrations', async () => {
    const client = await signedClient('test-admin@chefos.test')
    const { data, error } = await client
      .from('pms_integrations')
      .select('credentials')
      .eq('hotel_id', HOTEL_ID)
    expect(error).toBeNull()
    expect((data ?? []).length).toBeGreaterThan(0)
    // Las credentials del seed tienen api_token
    expect(data?.[0]?.credentials).toMatchObject({ api_token: expect.any(String) })
  })

  test('head_chef tampoco puede ver credentials (rol no admin)', async () => {
    const client = await signedClient('test-head-chef@chefos.test')
    const { data } = await client
      .from('pos_integrations')
      .select('credentials')
      .eq('hotel_id', HOTEL_ID)
    expect(data ?? []).toHaveLength(0)
  })
})

test.describe('RPCs sync — autorización (Codex 00028 HIGH #2)', () => {
  test('cook no puede llamar trigger_pos_sync', async () => {
    const client = await signedClient('test-cook@chefos.test')
    const { error } = await client.rpc('trigger_pos_sync', {
      p_hotel_id: HOTEL_ID,
      p_integration_id: POS_PUSH_ENABLED,
      p_sync_type: 'sync_sales',
    })
    // check_membership lanza P0002 (forbidden) o P0001 (no membership en hotel ajeno)
    expect(error).toBeTruthy()
    expect(error?.code).toMatch(/P000[12]/)
  })

  test('admin puede llamar trigger_pos_sync con sync_sales', async () => {
    const client = await signedClient('test-admin@chefos.test')
    const { data, error } = await client.rpc('trigger_pos_sync', {
      p_hotel_id: HOTEL_ID,
      p_integration_id: POS_PUSH_ENABLED,
      p_sync_type: 'sync_sales',
    })
    expect(error).toBeNull()
    // Devuelve el log_id (uuid)
    expect(data).toMatch(/^[0-9a-f-]{36}$/)
  })

  test('admin NO puede push_kitchen_orders (requiere direction+)', async () => {
    const client = await signedClient('test-admin@chefos.test')
    const { error } = await client.rpc('trigger_pos_sync', {
      p_hotel_id: HOTEL_ID,
      p_integration_id: POS_PUSH_ENABLED,
      p_sync_type: 'push_kitchen_orders',
    })
    expect(error).toBeTruthy()
    expect(error?.code).toBe('P0002')
  })

  test('direction SÍ puede push_kitchen_orders si config lo permite', async () => {
    const client = await signedClient('test-direction@chefos.test')
    const { data, error } = await client.rpc('trigger_pos_sync', {
      p_hotel_id: HOTEL_ID,
      p_integration_id: POS_PUSH_ENABLED,
      p_sync_type: 'push_kitchen_orders',
    })
    expect(error).toBeNull()
    expect(data).toMatch(/^[0-9a-f-]{36}$/)
  })
})

test.describe('Whitelist sync_type + config activa (Codex 00029)', () => {
  test('trigger_pos_sync rechaza sync_type "hack_attempt" (whitelist P0003)', async () => {
    const client = await signedClient('test-admin@chefos.test')
    const { error } = await client.rpc('trigger_pos_sync', {
      p_hotel_id: HOTEL_ID,
      p_integration_id: POS_PUSH_ENABLED,
      p_sync_type: 'hack_attempt',
    })
    expect(error).toBeTruthy()
    expect(error?.code).toBe('P0003')
  })

  test('push_kitchen_orders rechazado si config.push_kitchen_orders=false', async () => {
    const client = await signedClient('test-direction@chefos.test')
    // POS_PUSH_DISABLED tiene push_kitchen_orders=false en config
    const { error } = await client.rpc('trigger_pos_sync', {
      p_hotel_id: HOTEL_ID,
      p_integration_id: POS_PUSH_DISABLED,
      p_sync_type: 'push_kitchen_orders',
    })
    expect(error).toBeTruthy()
    expect(error?.message ?? '').toMatch(/deshabilitado en config/i)
  })
})
