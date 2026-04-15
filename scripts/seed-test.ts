/**
 * Seed determinista del hotel de TEST — Fase A del testing roadmap.
 *
 * Crea un hotel aislado (UUID fijo) con 7 usuarios (uno por rol) + datos
 * mínimos para que los E2E y los tests RLS puedan correr contra un estado
 * conocido y reproducible.
 *
 * Idempotente: borra todo lo previo del hotel test antes de insertar.
 * NO toca el hotel de desarrollo (ec079cf6-...) de Israel.
 *
 * Requisitos:
 *   - NEXT_PUBLIC_SUPABASE_URL en .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY en .env.local (sacar de Supabase Dashboard
 *     → Project Settings → API → service_role key)
 *
 * Ejecutar:
 *   npx tsx scripts/seed-test.ts
 *   // o el alias npm:
 *   npm run db:seed
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

// ─── Cargar .env.local manualmente (Node no lo lee por defecto) ──────────────

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) process.env[m[1]] ||= m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // .env.local opcional — si no existe, usamos el env real
  }
}
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  console.error('   Añadir SUPABASE_SERVICE_ROLE_KEY a .env.local:')
  console.error('   (Supabase Dashboard → Project Settings → API → service_role)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─── UUIDs fijos (determinismo) ──────────────────────────────────────────────

const TENANT_ID = '10000000-1000-1000-1000-000000000001'
const HOTEL_ID  = '11111111-1111-1111-1111-111111111111'

type Role =
  | 'superadmin' | 'direction' | 'admin'
  | 'head_chef' | 'cook'
  | 'commercial' | 'warehouse'

const USERS: Array<{ id: string; email: string; role: Role }> = [
  { id: '20000000-0000-0000-0000-000000000001', email: 'test-superadmin@chefos.test', role: 'superadmin' },
  { id: '20000000-0000-0000-0000-000000000002', email: 'test-direction@chefos.test',  role: 'direction'  },
  { id: '20000000-0000-0000-0000-000000000003', email: 'test-admin@chefos.test',      role: 'admin'      },
  { id: '20000000-0000-0000-0000-000000000004', email: 'test-head-chef@chefos.test',  role: 'head_chef'  },
  { id: '20000000-0000-0000-0000-000000000005', email: 'test-cook@chefos.test',       role: 'cook'       },
  { id: '20000000-0000-0000-0000-000000000006', email: 'test-commercial@chefos.test', role: 'commercial' },
  { id: '20000000-0000-0000-0000-000000000007', email: 'test-warehouse@chefos.test',  role: 'warehouse'  },
]
const TEST_PASSWORD = 'Test1234!'

// ─── Paso 1: limpiar ────────────────────────────────────────────────────────

async function cleanup() {
  console.log('🧹 Limpiando contenido del hotel de test anterior...')

  // No borramos el hotel ni el tenant (el audit trigger crea un ciclo FK al
  // borrar hotel). Borramos CONTENIDO por hotel_id en orden (dependencias primero)
  // y usamos upsert al recrear.
  const tablesByHotel = [
    // Logs primero (FK hacia hotels)
    'audit_logs', 'domain_events',
    // Agentes, automation, notificaciones, compliance
    'agent_suggestions', 'agent_configs',
    'automation_job_logs', 'automation_jobs',
    'notifications', 'notification_preferences',
    'labels', 'temperature_logs', 'appcc_records',
    // HR, integraciones
    'schedule_assignments', 'schedule_rules', 'shift_definitions', 'personnel',
    'integration_sync_logs', 'pos_integrations', 'pms_integrations',
    // Producción, inventario, compras
    'kitchen_orders', 'mise_en_place_items', 'mise_en_place_lists',
    'workflow_tasks', 'workflows', 'production_plans',
    'stock_count_lines', 'stock_counts', 'stock_reservations',
    'waste_records',
    'stock_movements', 'stock_lots', 'storage_locations',
    'goods_receipt_lines', 'goods_receipts',
    'purchase_order_lines', 'purchase_orders',
    'purchase_request_lines', 'purchase_requests',
    // Recetas, menús, catálogo
    'recipe_ingredients', 'recipe_steps', 'recipe_sub_recipes', 'recipes',
    'menu_section_recipes', 'menu_sections', 'menus',
    'supplier_offers', 'product_aliases', 'products', 'categories',
    'suppliers', 'units_of_measure',
    // Comercial, eventos
    'event_menus', 'event_spaces', 'event_versions', 'events', 'clients',
    // Memberships (NO borrar usuarios todavía — las FKs son a auth.users)
    'memberships',
  ]
  for (const table of tablesByHotel) {
    const { error } = await supabase.from(table).delete().eq('hotel_id', HOTEL_ID)
    if (error && !/does not exist|no such/i.test(error.message)) {
      // ignore tables que no existen aún en este schema
    }
  }

  // Borrar usuarios de test por email vía SQL directo. La API admin.listUsers
  // / admin.deleteUser a veces deja usuarios huérfanos con emails duplicados
  // porque no ve todos los usuarios cuando el proyecto tiene >N cuentas.
  // SQL cascade en auth.users es determinista y borra identities + sessions.
  try {
    const sql = `delete from auth.users where email like 'test-%@chefos.test';`
    execSync(`npx supabase db query --linked`, {
      input: sql,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    console.log(`   (cleanup: usuarios test-*@chefos.test borrados vía SQL)`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('   (cleanup fallback falló:', msg.slice(0, 80), ')')
  }
}

// ─── Paso 2: tenant + hotel ─────────────────────────────────────────────────

async function createTenantAndHotel() {
  console.log('🏨 Asegurando tenant + hotel (upsert)...')
  const { error: tenantErr } = await supabase.from('tenants').upsert({
    id: TENANT_ID,
    name: 'Test Tenant (seed)',
  })
  if (tenantErr) throw new Error(`tenant: ${tenantErr.message}`)

  const { error: hotelErr } = await supabase.from('hotels').upsert({
    id: HOTEL_ID,
    tenant_id: TENANT_ID,
    name: 'Hotel Test (seed)',
    slug: 'hotel-test-seed',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
  })
  if (hotelErr) throw new Error(`hotel: ${hotelErr.message}`)
}

// ─── Paso 3: usuarios + memberships ─────────────────────────────────────────

async function createUsersAndMemberships() {
  console.log('👥 Creando 7 usuarios con sus roles...')
  for (const u of USERS) {
    const { error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { seed: true, role: u.role },
      // El id explícito no lo soporta admin.createUser — usa el generado
    })
    if (authErr) throw new Error(`user ${u.email}: ${authErr.message}`)

    // Recuperar el id real del usuario recién creado
    const { data: found } = await supabase.auth.admin.listUsers({ perPage: 200 })
    const created = found?.users.find((x) => x.email === u.email)
    if (!created) throw new Error(`user ${u.email} no encontrado tras crear`)

    // Profile + membership
    await supabase.from('profiles').insert({
      id: created.id,
      full_name: `Test ${u.role}`,
    })
    const { error: memErr } = await supabase.from('memberships').insert({
      user_id: created.id,
      hotel_id: HOTEL_ID,
      tenant_id: TENANT_ID,
      role: u.role,
      is_active: true,
      is_default: true,
    })
    if (memErr) throw new Error(`membership ${u.email}: ${memErr.message}`)

    // Guardar el id real para uso posterior (stamping)
    u.id = created.id
    console.log(`   ✓ ${u.email} [${u.role}] → ${created.id.slice(0, 8)}...`)
  }
}

// ─── Paso 4: datos de dominio ───────────────────────────────────────────────

async function createDomainData() {
  console.log('📦 Creando clientes, unidades, productos, proveedores, stock...')
  const admin = USERS.find((u) => u.role === 'admin')!

  // Clientes
  const clients = [
    { id: '30000000-0000-0000-0000-000000000001', hotel_id: HOTEL_ID, name: 'Cliente Corporativo Test', company: 'ACME Corp', email: 'corp@test.com', vip_level: 'gold' as const },
    { id: '30000000-0000-0000-0000-000000000002', hotel_id: HOTEL_ID, name: 'Cliente Boda Test',        company: 'García-López',  email: 'boda@test.com', vip_level: 'standard' as const },
  ]
  const { error: cliErr } = await supabase.from('clients').insert(clients)
  if (cliErr) throw new Error(`clients: ${cliErr.message}`)

  // Unidades de medida (kg y l)
  const units = [
    { id: '40000000-0000-0000-0000-000000000001', hotel_id: HOTEL_ID, name: 'kilogramo', abbreviation: 'kg', unit_type: 'weight' as const, conversion_factor: 1, is_default: true },
    { id: '40000000-0000-0000-0000-000000000002', hotel_id: HOTEL_ID, name: 'litro',     abbreviation: 'l',  unit_type: 'volume' as const, conversion_factor: 1, is_default: true },
    { id: '40000000-0000-0000-0000-000000000003', hotel_id: HOTEL_ID, name: 'unidad',    abbreviation: 'ud', unit_type: 'count' as const,  conversion_factor: 1, is_default: true },
  ]
  const { error: uomErr } = await supabase.from('units_of_measure').insert(units)
  if (uomErr) throw new Error(`units: ${uomErr.message}`)

  // Categoría base
  const { error: catErr } = await supabase.from('categories').insert({
    id: '50000000-0000-0000-0000-000000000001',
    hotel_id: HOTEL_ID,
    name: 'Alimentación',
    sort_order: 1,
  })
  if (catErr) throw new Error(`category: ${catErr.message}`)

  // 10 productos con stock
  const products = Array.from({ length: 10 }, (_, i) => ({
    id: `60000000-0000-0000-0000-00000000000${(i + 1).toString().padStart(1, '0')}`.padEnd(36, '0').slice(0, 36),
    hotel_id: HOTEL_ID,
    category_id: '50000000-0000-0000-0000-000000000001',
    name: `Producto Test ${i + 1}`,
    sku: `TEST-${(i + 1).toString().padStart(3, '0')}`,
    default_unit_id: '40000000-0000-0000-0000-000000000001',
    min_stock: 5,
    reorder_point: 10,
    storage_type: 'refrigerated' as const,
  }))
  // Fix UUIDs (el padding a veces es inválido) — generamos manualmente
  products.forEach((p, i) => {
    p.id = `60000000-0000-0000-0000-${(i + 1).toString().padStart(12, '0')}`
  })
  const { error: prodErr } = await supabase.from('products').insert(products)
  if (prodErr) throw new Error(`products: ${prodErr.message}`)

  // 2 proveedores
  const suppliers = [
    { id: '70000000-0000-0000-0000-000000000001', hotel_id: HOTEL_ID, name: 'Proveedor A (preferido)', payment_terms: '30d', rating: 4.5 },
    { id: '70000000-0000-0000-0000-000000000002', hotel_id: HOTEL_ID, name: 'Proveedor B (backup)',    payment_terms: '15d', rating: 3.8 },
  ]
  const { error: supErr } = await supabase.from('suppliers').insert(suppliers)
  if (supErr) throw new Error(`suppliers: ${supErr.message}`)

  // Ofertas: cada producto tiene 1 oferta del proveedor A (preferido)
  const offers = products.map((p) => ({
    hotel_id: HOTEL_ID,
    supplier_id: '70000000-0000-0000-0000-000000000001',
    product_id: p.id,
    unit_id: '40000000-0000-0000-0000-000000000001',
    unit_price: 5 + Math.random() * 20,
    is_preferred: true,
  }))
  const { error: offErr } = await supabase.from('supplier_offers').insert(offers)
  if (offErr) throw new Error(`offers: ${offErr.message}`)

  console.log(`   ✓ 2 clientes, 3 unidades, 1 categoría, 10 productos, 2 proveedores, 10 ofertas`)

  // Storage location + stock inicial (100 unidades por producto, unit_cost=precio oferta)
  const { error: locErr } = await supabase.from('storage_locations').insert({
    id: '90000000-0000-0000-0000-000000000001',
    hotel_id: HOTEL_ID,
    name: 'Almacén principal (seed)',
    location_type: 'refrigerated',
  })
  if (locErr) throw new Error(`storage_location: ${locErr.message}`)

  const { data: offersData } = await supabase.from('supplier_offers').select('product_id, unit_price').eq('hotel_id', HOTEL_ID)
  const priceByProduct = new Map((offersData ?? []).map((o) => [o.product_id, Number(o.unit_price)]))

  const stockLots = products.map((p, i) => ({
    hotel_id: HOTEL_ID,
    product_id: p.id,
    storage_location_id: '90000000-0000-0000-0000-000000000001',
    lot_number: `LOT-SEED-${i + 1}`,
    expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    initial_quantity: 100,
    current_quantity: 100,
    unit_cost: priceByProduct.get(p.id) ?? 10,
  }))
  const { error: lotErr } = await supabase.from('stock_lots').insert(stockLots)
  if (lotErr) throw new Error(`stock_lots: ${lotErr.message}`)
  console.log(`   ✓ 1 storage location, ${stockLots.length} stock_lots (100 ud cada uno)`)

  // 1 evento en estado draft (tests de transición lo harán avanzar)
  const { error: evErr } = await supabase.from('events').insert({
    id: '80000000-0000-0000-0000-000000000001',
    hotel_id: HOTEL_ID,
    client_id: clients[0].id,
    name: 'Evento Test (seed draft)',
    event_type: 'banquet',
    service_type: 'seated',
    event_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    guest_count: 50,
    status: 'draft',
    created_by: admin.id,
  })
  if (evErr) throw new Error(`event: ${evErr.message}`)
  console.log(`   ✓ 1 evento draft`)

  // Integraciones PMS/POS — necesarias para tests RLS/seguridad (Fase C).
  // Credenciales DUMMY: son valores de test, no tokens reales.
  const { error: pmsErr } = await supabase.from('pms_integrations').insert({
    id: 'a0000000-0000-0000-0000-000000000001',
    hotel_id: HOTEL_ID,
    pms_type: 'mews',
    name: 'Mews Test (seed)',
    status: 'active',
    credentials: { api_token: 'SEED_DUMMY_TOKEN', property_id: 'SEED_PROP', environment: 'demo' },
    config: { sync_interval_minutes: 60, sync_occupancy: true, sync_reservations: true },
    is_active: true,
    created_by: admin.id,
  })
  if (pmsErr) throw new Error(`pms_integration: ${pmsErr.message}`)

  // POS con push_kitchen_orders DESHABILITADO — test de whitelist + config activa
  const { error: pos1Err } = await supabase.from('pos_integrations').insert({
    id: 'a0000000-0000-0000-0000-000000000002',
    hotel_id: HOTEL_ID,
    pos_type: 'lightspeed',
    name: 'Lightspeed Test (seed, push disabled)',
    status: 'active',
    credentials: { client_id: 'SEED_DUMMY', client_secret: 'SEED_DUMMY', account_id: 'SEED_ACC' },
    config: { sync_interval_minutes: 30, sync_sales: true, push_kitchen_orders: false },
    is_active: true,
    created_by: admin.id,
  })
  if (pos1Err) throw new Error(`pos_integration (disabled): ${pos1Err.message}`)

  // POS con push_kitchen_orders HABILITADO — test del happy path
  const { error: pos2Err } = await supabase.from('pos_integrations').insert({
    id: 'a0000000-0000-0000-0000-000000000003',
    hotel_id: HOTEL_ID,
    pos_type: 'simphony',
    name: 'Simphony Test (seed, push enabled)',
    status: 'active',
    credentials: { server_url: 'https://seed.test', employee_id: 'SEED', password: 'SEED' },
    config: { sync_interval_minutes: 30, sync_sales: true, push_kitchen_orders: true },
    is_active: true,
    created_by: admin.id,
  })
  if (pos2Err) throw new Error(`pos_integration (enabled): ${pos2Err.message}`)

  console.log(`   ✓ 1 PMS + 2 POS integrations (para tests RLS/seguridad)`)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now()
  console.log(`🌱 Seed hotel TEST (${HOTEL_ID})`)
  await cleanup()
  await createTenantAndHotel()
  await createUsersAndMemberships()
  await createDomainData()
  console.log(`\n✅ Seed completo en ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`\n   Hotel test: ${HOTEL_ID}`)
  console.log(`   Login para tests: test-admin@chefos.test / ${TEST_PASSWORD}`)
}

main().catch((err) => {
  console.error('❌ Seed falló:', err.message)
  process.exit(1)
})
