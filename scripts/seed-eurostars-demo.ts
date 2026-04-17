/**
 * Seed determinista del HOTEL DEMO Eurostars Galicia.
 *
 * Crea un hotel separado del de Israel (`ec079cf6-…`) y del de tests
 * (`11111111-…`) con datos realistas Galicia para la demo a Iago
 * (Eurostars Ourense, sábado 19 abril 2026).
 *
 * Cubre el flujo del guion de venta:
 *   1. /events/[id]  → evento confirmed con menú+escandallo+BEO
 *   2. /escandallos  → catálogo con precios de albarán visibles
 *   3. /procurement  → PR aprobada → PO enviada → GR aceptada
 *   4. /dashboard    → KPIs + alertas (stock bajo, caducidad, food cost)
 *
 * Idempotente: borra todo lo previo del hotel demo antes de insertar.
 *
 * Uso:
 *   npm run db:seed:demo
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

// ─── env loading ─────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) process.env[m[1]] ||= m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* opcional */
  }
}
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─── UUIDs fijos ─────────────────────────────────────────────────────────────

const TENANT_ID = '10000000-2000-2000-2000-000000000001'
const HOTEL_ID  = '22222222-2222-2222-2222-222222222222'
const PWD       = 'Demo1234!'

type Role = 'admin' | 'head_chef' | 'commercial'

const USERS: Array<{ id: string; email: string; role: Role; full_name: string }> = [
  { id: '', email: 'demo-admin@eurostars-demo.es',      role: 'admin',      full_name: 'Demo Admin' },
  { id: '', email: 'demo-head-chef@eurostars-demo.es',  role: 'head_chef',  full_name: 'Demo Head Chef' },
  { id: '', email: 'demo-commercial@eurostars-demo.es', role: 'commercial', full_name: 'Demo Comercial' },
]

// ─── helpers ────────────────────────────────────────────────────────────────

function date(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10)
}

async function rpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(`rpc ${name}: ${error.message}`)
  return data as T
}

// ─── 1. cleanup ─────────────────────────────────────────────────────────────

async function cleanup() {
  console.log('🧹 Limpiando hotel demo anterior…')
  const tables = [
    'audit_logs', 'domain_events',
    'agent_suggestions', 'agent_configs',
    'automation_job_logs', 'automation_jobs',
    'notifications', 'notification_preferences',
    'labels', 'temperature_logs', 'appcc_records',
    'schedule_assignments', 'schedule_rules', 'shift_definitions', 'personnel',
    'integration_sync_logs', 'pos_integrations', 'pms_integrations',
    'kitchen_orders', 'mise_en_place_items', 'mise_en_place_lists',
    'workflow_tasks', 'workflows', 'production_plans',
    'stock_count_lines', 'stock_counts', 'stock_reservations',
    'waste_records',
    'stock_movements', 'stock_lots', 'storage_locations',
    'goods_receipt_lines', 'goods_receipts',
    'purchase_order_lines', 'purchase_orders',
    'purchase_request_lines', 'purchase_requests',
    'event_operational_impact',
    'event_menus', 'event_spaces', 'event_versions', 'events', 'clients',
    'recipe_ingredients', 'recipe_steps', 'recipe_sub_recipes', 'recipes',
    'menu_section_recipes', 'menu_sections', 'menus',
    'supplier_offers', 'product_aliases', 'products', 'categories',
    'suppliers', 'units_of_measure',
    'kpi_snapshots', 'alerts',
    'memberships',
  ]
  for (const t of tables) {
    await supabase.from(t).delete().eq('hotel_id', HOTEL_ID)
  }
  // Borrado SQL de usuarios demo (cascade auth.users)
  try {
    execSync(`npx supabase db query --linked`, {
      input: `delete from auth.users where email like 'demo-%@eurostars-demo.es';`,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (err) {
    console.warn('   (cleanup auth.users falló — continúo)')
  }
}

// ─── 2. tenant + hotel ──────────────────────────────────────────────────────

async function ensureTenantAndHotel() {
  console.log('🏨 Tenant + hotel…')
  const { error: t } = await supabase.from('tenants').upsert({
    id: TENANT_ID, name: 'Eurostars Demo Tenant',
  })
  if (t) throw new Error(`tenant: ${t.message}`)

  const { error: h } = await supabase.from('hotels').upsert({
    id: HOTEL_ID,
    tenant_id: TENANT_ID,
    name: 'Eurostars Hotel Demo Galicia',
    slug: 'eurostars-demo-galicia',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
  })
  if (h) throw new Error(`hotel: ${h.message}`)
}

// ─── 3. usuarios ────────────────────────────────────────────────────────────

async function createUsers() {
  console.log('👥 3 usuarios demo…')
  for (const u of USERS) {
    const { error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: PWD,
      email_confirm: true,
      user_metadata: { seed: 'demo', role: u.role, full_name: u.full_name },
    })
    if (error) throw new Error(`user ${u.email}: ${error.message}`)

    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 })
    const created = list?.users.find((x) => x.email === u.email)
    if (!created) throw new Error(`user ${u.email} no se encontró tras crear`)
    u.id = created.id

    await supabase.from('profiles').upsert({ id: u.id, full_name: u.full_name })
    const { error: m } = await supabase.from('memberships').insert({
      user_id: u.id, hotel_id: HOTEL_ID, tenant_id: TENANT_ID,
      role: u.role, is_active: true, is_default: true,
    })
    if (m) throw new Error(`membership ${u.email}: ${m.message}`)
    console.log(`   ✓ ${u.email}`)
  }
}

// ─── 4. seed defaults ───────────────────────────────────────────────────────

async function seedDefaults() {
  console.log('🌱 Unidades, categorías, ubicaciones…')
  // Inserts directos (las RPCs seed_default_* requieren check_membership tras 00034)

  // Units: 5 unidades fijas, 2 con base
  const { data: kg } = await supabase.from('units_of_measure').insert({
    hotel_id: HOTEL_ID, name: 'Kilogramo', abbreviation: 'kg', unit_type: 'weight', conversion_factor: 1, is_default: true,
  }).select('id').single()
  await supabase.from('units_of_measure').insert({
    hotel_id: HOTEL_ID, name: 'Gramo', abbreviation: 'g', unit_type: 'weight', conversion_factor: 0.001, base_unit_id: (kg as any).id,
  })
  const { data: l } = await supabase.from('units_of_measure').insert({
    hotel_id: HOTEL_ID, name: 'Litro', abbreviation: 'L', unit_type: 'volume', conversion_factor: 1, is_default: true,
  }).select('id').single()
  await supabase.from('units_of_measure').insert({
    hotel_id: HOTEL_ID, name: 'Mililitro', abbreviation: 'ml', unit_type: 'volume', conversion_factor: 0.001, base_unit_id: (l as any).id,
  })
  await supabase.from('units_of_measure').insert({
    hotel_id: HOTEL_ID, name: 'Unidad', abbreviation: 'ud', unit_type: 'count', conversion_factor: 1, is_default: true,
  })

  // Categorías
  await supabase.from('categories').insert([
    { hotel_id: HOTEL_ID, name: 'Carnes', sort_order: 1 },
    { hotel_id: HOTEL_ID, name: 'Pescados y mariscos', sort_order: 2 },
    { hotel_id: HOTEL_ID, name: 'Verduras y hortalizas', sort_order: 3 },
    { hotel_id: HOTEL_ID, name: 'Frutas', sort_order: 4 },
    { hotel_id: HOTEL_ID, name: 'Lácteos y huevos', sort_order: 5 },
    { hotel_id: HOTEL_ID, name: 'Especias y condimentos', sort_order: 6 },
    { hotel_id: HOTEL_ID, name: 'Aceites y vinagres', sort_order: 7 },
    { hotel_id: HOTEL_ID, name: 'Panadería y harinas', sort_order: 8 },
    { hotel_id: HOTEL_ID, name: 'Conservas y secos', sort_order: 9 },
    { hotel_id: HOTEL_ID, name: 'Bebidas', sort_order: 10 },
  ])

  // Storage locations
  await supabase.from('storage_locations').insert([
    { hotel_id: HOTEL_ID, name: 'Camara frigorifica', location_type: 'refrigerated', sort_order: 1 },
    { hotel_id: HOTEL_ID, name: 'Congelador', location_type: 'frozen', sort_order: 2 },
    { hotel_id: HOTEL_ID, name: 'Almacen seco', location_type: 'dry', sort_order: 3 },
    { hotel_id: HOTEL_ID, name: 'Economato', location_type: 'ambient', sort_order: 4 },
  ])
}

// ─── 5. catálogo Galicia ────────────────────────────────────────────────────

type Cat = { id: string; name: string }
type Unit = { id: string; abbreviation: string }
type Loc = { id: string; name: string }

async function getRefs() {
  const { data: cats } = await supabase
    .from('categories').select('id, name').eq('hotel_id', HOTEL_ID)
  const { data: units } = await supabase
    .from('units_of_measure').select('id, abbreviation').eq('hotel_id', HOTEL_ID)
  const { data: locs } = await supabase
    .from('storage_locations').select('id, name').eq('hotel_id', HOTEL_ID)
  return {
    cats: cats as Cat[],
    units: units as Unit[],
    locs: locs as Loc[],
  }
}

interface ProductSeed {
  name: string
  category: string
  unit: 'kg' | 'L' | 'ud'
  storage: 'ambient' | 'refrigerated' | 'frozen'
  price: number
  min?: number
  reorder?: number
  shelfDays?: number
}

const PRODUCTS_GALICIA: ProductSeed[] = [
  { name: 'Pulpo congelado',          category: 'Pescados y mariscos',  unit: 'kg', storage: 'frozen',       price: 18.0, min: 10, reorder: 15, shelfDays: 90 },
  { name: 'Lubina fresca',            category: 'Pescados y mariscos',  unit: 'kg', storage: 'refrigerated', price: 22.0, min: 5,  reorder: 8,  shelfDays: 5 },
  { name: 'Mejillón gallego',         category: 'Pescados y mariscos',  unit: 'kg', storage: 'refrigerated', price: 6.5,  min: 8,  reorder: 12, shelfDays: 4 },
  { name: 'Bacalao desalado',         category: 'Pescados y mariscos',  unit: 'kg', storage: 'refrigerated', price: 16.5, min: 4,  reorder: 6,  shelfDays: 7 },
  { name: 'Vieira fresca',            category: 'Pescados y mariscos',  unit: 'ud', storage: 'refrigerated', price: 3.5,  min: 20, reorder: 30, shelfDays: 3 },
  { name: 'Ternera gallega IGP',      category: 'Carnes',               unit: 'kg', storage: 'refrigerated', price: 24.0, min: 5,  reorder: 8,  shelfDays: 7 },
  { name: 'Cordero lechal',           category: 'Carnes',               unit: 'kg', storage: 'refrigerated', price: 19.5, min: 4,  reorder: 6,  shelfDays: 5 },
  { name: 'Cerdo ibérico',            category: 'Carnes',               unit: 'kg', storage: 'refrigerated', price: 21.0, min: 4,  reorder: 7,  shelfDays: 7 },
  { name: 'Pollo de corral',          category: 'Carnes',               unit: 'kg', storage: 'refrigerated', price: 8.5,  min: 6,  reorder: 10, shelfDays: 5 },
  { name: 'Queso tetilla DOP',        category: 'Lácteos y huevos',     unit: 'kg', storage: 'refrigerated', price: 13.5, min: 3,  reorder: 5,  shelfDays: 30 },
  { name: 'Queso San Simón',          category: 'Lácteos y huevos',     unit: 'kg', storage: 'refrigerated', price: 14.0, min: 3,  reorder: 5,  shelfDays: 45 },
  { name: 'Mantequilla',              category: 'Lácteos y huevos',     unit: 'kg', storage: 'refrigerated', price: 7.2,  min: 2,  reorder: 4,  shelfDays: 30 },
  { name: 'Leche entera',             category: 'Lácteos y huevos',     unit: 'L',  storage: 'refrigerated', price: 0.95, min: 10, reorder: 15, shelfDays: 7 },
  { name: 'Huevos camperos (docena)', category: 'Lácteos y huevos',     unit: 'ud', storage: 'refrigerated', price: 4.20, min: 20, reorder: 30, shelfDays: 21 },
  { name: 'Vino Albariño Rías Baixas',category: 'Bebidas',              unit: 'ud', storage: 'ambient',      price: 12.0, min: 24, reorder: 36 },
  { name: 'Vino Ribeiro tinto',       category: 'Bebidas',              unit: 'ud', storage: 'ambient',      price: 8.5,  min: 24, reorder: 36 },
  { name: 'Agua mineral 1L',          category: 'Bebidas',              unit: 'ud', storage: 'ambient',      price: 0.45, min: 50, reorder: 80 },
  { name: 'Estrella Galicia barril',  category: 'Bebidas',              unit: 'L',  storage: 'refrigerated', price: 2.8,  min: 30, reorder: 50 },
  { name: 'Aceite oliva virgen extra',category: 'Aceites y vinagres',   unit: 'L',  storage: 'ambient',      price: 7.5,  min: 5,  reorder: 8 },
  { name: 'Sal Marina Atlántica',     category: 'Especias y condimentos', unit: 'kg', storage: 'ambient',    price: 1.2,  min: 5,  reorder: 8 },
  { name: 'Pimentón de la Vera',      category: 'Especias y condimentos', unit: 'kg', storage: 'ambient',    price: 18.0, min: 1,  reorder: 2 },
  { name: 'Harina de trigo',          category: 'Panadería y harinas',  unit: 'kg', storage: 'ambient',      price: 1.1,  min: 10, reorder: 15, shelfDays: 90 },
  { name: 'Almendra Marcona molida',  category: 'Conservas y secos',    unit: 'kg', storage: 'ambient',      price: 14.0, min: 2,  reorder: 4,  shelfDays: 180 },
  { name: 'Patata gallega IGP',       category: 'Verduras y hortalizas',unit: 'kg', storage: 'ambient',      price: 1.4,  min: 25, reorder: 40, shelfDays: 30 },
  { name: 'Pimiento de Padrón',       category: 'Verduras y hortalizas',unit: 'kg', storage: 'refrigerated', price: 6.0,  min: 3,  reorder: 5,  shelfDays: 7 },
  { name: 'Cebolla',                  category: 'Verduras y hortalizas',unit: 'kg', storage: 'ambient',      price: 1.1,  min: 15, reorder: 25, shelfDays: 30 },
  { name: 'Grelos',                   category: 'Verduras y hortalizas',unit: 'kg', storage: 'refrigerated', price: 4.5,  min: 5,  reorder: 8,  shelfDays: 5 },
  { name: 'Limón',                    category: 'Frutas',               unit: 'kg', storage: 'refrigerated', price: 2.2,  min: 5,  reorder: 8,  shelfDays: 14 },
  { name: 'Manzana reineta',          category: 'Frutas',               unit: 'kg', storage: 'refrigerated', price: 2.8,  min: 8,  reorder: 12, shelfDays: 21 },
  { name: 'Café arábica grano',       category: 'Bebidas',              unit: 'kg', storage: 'ambient',      price: 16.0, min: 4,  reorder: 6,  shelfDays: 365 },
]

const SUPPLIERS = [
  { id: '70000000-0000-0000-0000-000000000a01', name: 'Pescados Nores SL',           contact: 'Manuel Nores',    email: 'pedidos@nores.example', phone: '+34981123456', terms: '30d', rating: 4.5, takes: ['Pescados y mariscos'] },
  { id: '70000000-0000-0000-0000-000000000a02', name: 'Carnes do Bandeira',          contact: 'Lourdes Bandeira', email: 'comercial@bandeira.example', phone: '+34982654321', terms: '15d', rating: 4.2, takes: ['Carnes'] },
  { id: '70000000-0000-0000-0000-000000000a03', name: 'Distribuciones Galicia Norte', contact: 'Xosé Couceiro',   email: 'ventas@dgn.example', phone: '+34988111222', terms: '21d', rating: 3.8, takes: ['Lácteos y huevos','Bebidas','Aceites y vinagres','Especias y condimentos','Panadería y harinas','Conservas y secos','Verduras y hortalizas','Frutas'] },
]

interface ProductRow { id: string; name: string; price: number }

async function createCatalog(refs: { cats: Cat[]; units: Unit[]; locs: Loc[] }): Promise<ProductRow[]> {
  console.log('📦 Catálogo (30 productos Galicia, 3 proveedores, ofertas)…')
  const catByName = new Map(refs.cats.map((c) => [c.name, c.id]))
  const unitByAbbr = new Map(refs.units.map((u) => [u.abbreviation, u.id]))

  // 30 productos
  const rows = PRODUCTS_GALICIA.map((p, i) => ({
    hotel_id: HOTEL_ID,
    category_id: catByName.get(p.category) ?? null,
    name: p.name,
    sku: `EUR-${(i + 1).toString().padStart(3, '0')}`,
    default_unit_id: unitByAbbr.get(p.unit) ?? null,
    min_stock: p.min ?? 5,
    reorder_point: p.reorder ?? 10,
    storage_type: p.storage,
    shelf_life_days: p.shelfDays ?? null,
    is_active: true,
  }))
  const { data: products, error: pErr } = await supabase
    .from('products').insert(rows).select('id, name, sku')
  if (pErr) throw new Error(`products: ${pErr.message}`)

  // 3 proveedores
  const supRows = SUPPLIERS.map((s) => ({
    id: s.id,
    hotel_id: HOTEL_ID,
    name: s.name,
    contact_name: s.contact,
    email: s.email,
    phone: s.phone,
    payment_terms: s.terms,
    rating: s.rating,
  }))
  const { error: sErr } = await supabase.from('suppliers').insert(supRows)
  if (sErr) throw new Error(`suppliers: ${sErr.message}`)

  // Ofertas: cada producto a 1 proveedor que cubra su categoría, preferida
  const offers: any[] = []
  for (let i = 0; i < products!.length; i++) {
    const seed = PRODUCTS_GALICIA[i]
    const supplier = SUPPLIERS.find((s) => s.takes.includes(seed.category)) ?? SUPPLIERS[2]
    offers.push({
      hotel_id: HOTEL_ID,
      supplier_id: supplier.id,
      product_id: products![i].id,
      unit_id: unitByAbbr.get(seed.unit),
      unit_price: seed.price,
      is_preferred: true,
    })
  }
  const { error: oErr } = await supabase.from('supplier_offers').insert(offers)
  if (oErr) throw new Error(`offers: ${oErr.message}`)

  console.log(`   ✓ ${products!.length} productos · ${SUPPLIERS.length} proveedores · ${offers.length} ofertas preferidas`)

  return products!.map((p, i) => ({
    id: p.id, name: p.name, price: PRODUCTS_GALICIA[i].price,
  }))
}

// ─── 6. stock inicial ───────────────────────────────────────────────────────

interface LotRef { id: string; product_id: string; product_name: string }

async function createInitialStock(products: ProductRow[], refs: { locs: Loc[] }): Promise<LotRef[]> {
  console.log('📥 Stock inicial (lotes con caducidades realistas)…')
  const camara = refs.locs.find((l) => l.name === 'Camara frigorifica')!.id
  const congelador = refs.locs.find((l) => l.name === 'Congelador')!.id
  const seco = refs.locs.find((l) => l.name === 'Almacen seco')!.id
  const economato = refs.locs.find((l) => l.name === 'Economato')!.id

  const locByStorage: Record<string, string> = {
    frozen: congelador, refrigerated: camara, ambient: seco,
  }

  const lots = products.map((p, i) => {
    const seed = PRODUCTS_GALICIA[i]
    // Casos especiales para que disparen alertas:
    // - Huevos (idx 13) y Mejillón (idx 2): stock crítico bajo (3 < min)
    // - Lubina (idx 1) y Grelos (idx 26): caducan en 3 días (alert expiry)
    // - Harina (idx 21): caduca en 5 días
    let qty = 100
    let expiryDays = seed.shelfDays ?? 60
    if (i === 13 || i === 2) qty = 3                     // stock crítico
    if (i === 1) { qty = 6; expiryDays = 3 }             // poco stock + caducidad
    if (i === 21) { qty = 50; expiryDays = 5 }           // caducidad cercana
    if (i === 26) { qty = 7; expiryDays = 2 }            // caducidad inminente

    return {
      hotel_id: HOTEL_ID,
      product_id: p.id,
      storage_location_id: locByStorage[seed.storage] ?? economato,
      lot_number: `LOT-DEMO-${(i + 1).toString().padStart(3, '0')}`,
      expiry_date: date(expiryDays),
      initial_quantity: qty,
      current_quantity: qty,
      unit_cost: p.price,
    }
  })

  const { data: inserted, error } = await supabase
    .from('stock_lots').insert(lots).select('id, product_id')
  if (error) throw new Error(`stock_lots: ${error.message}`)

  // Stock movements de reception (uno por lote, como si vinieran de un GR histórico)
  const { data: admin } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('hotel_id', HOTEL_ID)
    .eq('role', 'admin')
    .single()
  const adminUid = (admin as any).user_id

  const movs = inserted!.map((lot, i) => ({
    hotel_id: HOTEL_ID,
    product_id: lot.product_id,
    lot_id: lot.id,
    movement_type: 'reception',
    quantity: lots[i].initial_quantity,
    unit_cost: lots[i].unit_cost,
    reference_type: 'seed',
    notes: 'Stock inicial demo',
    created_by: adminUid,
  }))
  await supabase.from('stock_movements').insert(movs)

  console.log(`   ✓ ${inserted!.length} lotes (4 con stock crítico/caducidad inminente para alertas)`)

  return inserted!.map((l, i) => ({
    id: l.id, product_id: l.product_id, product_name: products[i].name,
  }))
}

// ─── 7. Recetas ─────────────────────────────────────────────────────────────

interface RecipeIng {
  productName: string  // nombre exacto en PRODUCTS_GALICIA
  qty: number
  waste: number
  unit: 'kg' | 'L' | 'ud'
}

interface RecipeSeed {
  name: string
  category: string
  servings: number
  ingredients: RecipeIng[]
  steps: string[]
}

const RECIPES: RecipeSeed[] = [
  {
    name: 'Pulpo á feira',
    category: 'fish',
    servings: 8,
    ingredients: [
      { productName: 'Pulpo congelado',          qty: 2.5,  waste: 30, unit: 'kg' },
      { productName: 'Patata gallega IGP',       qty: 2.0,  waste: 15, unit: 'kg' },
      { productName: 'Aceite oliva virgen extra',qty: 0.25, waste: 0,  unit: 'L' },
      { productName: 'Pimentón de la Vera',      qty: 0.04, waste: 0,  unit: 'kg' },
      { productName: 'Sal Marina Atlántica',     qty: 0.03, waste: 0,  unit: 'kg' },
    ],
    steps: [
      'Cocer el pulpo en agua hirviendo con sal durante 35 min. "Asustarlo" 3 veces antes.',
      'Cocer las patatas con piel en el mismo caldo, 20 min.',
      'Cortar el pulpo con tijera en rodajas de 1 cm sobre tabla de madera.',
      'Disponer sobre las patatas, sal gruesa, pimentón dulce y picante, regar con AOVE.',
    ],
  },
  {
    name: 'Lubina al horno con patatas panadera',
    category: 'fish',
    servings: 4,
    ingredients: [
      { productName: 'Lubina fresca',            qty: 1.6,  waste: 35, unit: 'kg' },
      { productName: 'Patata gallega IGP',       qty: 0.8,  waste: 15, unit: 'kg' },
      { productName: 'Cebolla',                  qty: 0.4,  waste: 10, unit: 'kg' },
      { productName: 'Limón',                    qty: 0.2,  waste: 0,  unit: 'kg' },
      { productName: 'Aceite oliva virgen extra',qty: 0.12, waste: 0,  unit: 'L' },
      { productName: 'Sal Marina Atlántica',     qty: 0.02, waste: 0,  unit: 'kg' },
    ],
    steps: [
      'Limpiar y descamar la lubina, hacer 3 cortes en cada flanco.',
      'Patatas y cebolla en juliana fina, dorar a fuego medio 12 min.',
      'Disponer las panaderas sobre bandeja, lubina encima con rodajas de limón.',
      'Horno 200°C durante 18 min. Reposar 3 min antes de servir.',
    ],
  },
  {
    name: 'Empanada de mariscos',
    category: 'hot_starters',
    servings: 12,
    ingredients: [
      { productName: 'Mejillón gallego',         qty: 1.0,  waste: 60, unit: 'kg' },
      { productName: 'Harina de trigo',          qty: 0.6,  waste: 0,  unit: 'kg' },
      { productName: 'Cebolla',                  qty: 0.5,  waste: 10, unit: 'kg' },
      { productName: 'Aceite oliva virgen extra',qty: 0.18, waste: 0,  unit: 'L' },
      { productName: 'Huevos camperos (docena)', qty: 1,    waste: 0,  unit: 'ud' },
      { productName: 'Pimentón de la Vera',      qty: 0.02, waste: 0,  unit: 'kg' },
      { productName: 'Sal Marina Atlántica',     qty: 0.01, waste: 0,  unit: 'kg' },
    ],
    steps: [
      'Sofrito de cebolla pochada con pimentón, 15 min a fuego suave.',
      'Mejillones al vapor, sacar de la valva y mezclar con el sofrito frío.',
      'Masa: harina + agua tibia + aceite del sofrito + sal. Reposar 30 min.',
      'Estirar 2 láminas, rellenar, cerrar y pintar con huevo.',
      'Horno 190°C durante 35 min hasta dorar.',
    ],
  },
  {
    name: 'Caldo gallego',
    category: 'soups_creams',
    servings: 10,
    ingredients: [
      { productName: 'Patata gallega IGP',       qty: 1.5,  waste: 15, unit: 'kg' },
      { productName: 'Grelos',                   qty: 0.8,  waste: 30, unit: 'kg' },
      { productName: 'Ternera gallega IGP',      qty: 0.4,  waste: 20, unit: 'kg' },
      { productName: 'Aceite oliva virgen extra',qty: 0.08, waste: 0,  unit: 'L' },
      { productName: 'Sal Marina Atlántica',     qty: 0.03, waste: 0,  unit: 'kg' },
    ],
    steps: [
      'Cocer la ternera con agua y sal, 90 min.',
      'Añadir patatas peladas en trozos grandes, 15 min.',
      'Añadir los grelos limpios, 10 min más.',
      'Rectificar de sal, hilo de aceite crudo al servir.',
    ],
  },
  {
    name: 'Tarta de Santiago',
    category: 'desserts',
    servings: 8,
    ingredients: [
      { productName: 'Almendra Marcona molida',  qty: 0.5,  waste: 0,  unit: 'kg' },
      { productName: 'Huevos camperos (docena)', qty: 0.5,  waste: 0,  unit: 'ud' },  // 6 huevos = 0.5 docena
      { productName: 'Mantequilla',              qty: 0.05, waste: 0,  unit: 'kg' },
      { productName: 'Limón',                    qty: 0.05, waste: 0,  unit: 'kg' },
    ],
    steps: [
      'Batir huevos con azúcar (no incluido aquí) hasta blanquear.',
      'Incorporar almendra molida y ralladura de limón.',
      'Verter en molde engrasado con mantequilla.',
      'Horno 180°C durante 30 min. Cruz de Santiago en azúcar glacé al desmoldar.',
    ],
  },
  {
    name: 'Queso tetilla con miel y manzana',
    category: 'cold_starters',
    servings: 4,
    ingredients: [
      { productName: 'Queso tetilla DOP',        qty: 0.4,  waste: 5,  unit: 'kg' },
      { productName: 'Manzana reineta',          qty: 0.3,  waste: 15, unit: 'kg' },
    ],
    steps: [
      'Cortar el queso en cuñas a temperatura ambiente.',
      'Manzana laminada fina con piel.',
      'Emplatar alternando queso y manzana, hilo de miel (no incluida).',
    ],
  },
]

interface RecipeRow { id: string; name: string }

async function createRecipes(products: ProductRow[]): Promise<RecipeRow[]> {
  console.log('📖 Recetas Galicia (6 recetas con ingredientes y pasos)…')
  const headChef = USERS.find((u) => u.role === 'head_chef')!
  const productByName = new Map(products.map((p) => [p.name, p.id]))
  const productPriceByName = new Map(products.map((p) => [p.name, p.price]))

  const { data: units } = await supabase
    .from('units_of_measure').select('id, abbreviation').eq('hotel_id', HOTEL_ID)
  const unitByAbbr = new Map((units as any[]).map((u) => [u.abbreviation, u.id]))

  const result: RecipeRow[] = []
  for (const r of RECIPES) {
    // Calcular total_cost (sum quantity_net * unit_cost)
    let totalCost = 0
    for (const ing of r.ingredients) {
      const price = productPriceByName.get(ing.productName) ?? 0
      const net = ing.qty * (1 - ing.waste / 100)
      totalCost += net * price
    }
    const costPerServing = totalCost / r.servings

    // Insert recipe
    const { data: rec, error: rErr } = await supabase
      .from('recipes')
      .insert({
        hotel_id: HOTEL_ID,
        name: r.name,
        category: r.category,
        servings: r.servings,
        difficulty: 'medium',
        status: 'approved',
        total_cost: totalCost,
        cost_per_serving: costPerServing,
        unit_cost: costPerServing,    // columna añadida en 00035
        yield_pct: 100,                // columna añadida en 00035
        food_cost_pct: 0,
        allergens: r.name.includes('Empanada') ? ['gluten','molluscs','egg'] :
                   r.name.includes('Tarta') ? ['nuts','egg','dairy'] :
                   r.name.includes('Queso') ? ['dairy'] : [],
        dietary_tags: [],
        approved_by: headChef.id,
        approved_at: new Date().toISOString(),
        created_by: headChef.id,
      })
      .select('id, name')
      .single()
    if (rErr) throw new Error(`recipe ${r.name}: ${rErr.message}`)

    // Ingredients
    const ingRows = r.ingredients.map((ing, idx) => {
      const productId = productByName.get(ing.productName) ?? null
      const price = productPriceByName.get(ing.productName) ?? 0
      return {
        recipe_id: rec!.id,
        hotel_id: HOTEL_ID,
        ingredient_name: ing.productName,
        product_id: productId,
        unit_id: unitByAbbr.get(ing.unit) ?? null,
        quantity_gross: ing.qty,
        waste_pct: ing.waste,
        unit_cost: price,
        sort_order: idx,
      }
    })
    const { error: iErr } = await supabase.from('recipe_ingredients').insert(ingRows)
    if (iErr) throw new Error(`ingredients ${r.name}: ${iErr.message}`)

    // Steps
    const stepRows = r.steps.map((s, idx) => ({
      recipe_id: rec!.id, hotel_id: HOTEL_ID, step_number: idx + 1, instruction: s,
    }))
    const { error: sErr } = await supabase.from('recipe_steps').insert(stepRows)
    if (sErr) throw new Error(`steps ${r.name}: ${sErr.message}`)

    result.push(rec!)
    console.log(`   ✓ ${r.name} (€${totalCost.toFixed(2)} total · €${costPerServing.toFixed(2)}/pax)`)
  }
  return result
}

// ─── 8. Menús ───────────────────────────────────────────────────────────────

interface MenuRow { id: string; name: string }

async function createMenus(recipes: RecipeRow[]): Promise<MenuRow[]> {
  console.log('🍽  Menús (Banquete Bodas Galicia + Cóctel bienvenida)…')
  const recByName = new Map(recipes.map((r) => [r.name, r.id]))

  const headChef = USERS.find((u) => u.role === 'head_chef')!

  // 1) Banquete Bodas Galicia
  const { data: m1, error: m1Err } = await supabase
    .from('menus').insert({
      hotel_id: HOTEL_ID,
      name: 'Banquete Bodas Galicia',
      description: 'Menú completo banquete clásico gallego, 3 pases',
      menu_type: 'seated',
      target_food_cost_pct: 32,
      is_active: true,
      created_by: headChef.id,
    }).select('id, name').single()
  if (m1Err) throw new Error(`menu1: ${m1Err.message}`)

  const sections1 = await supabase.from('menu_sections').insert([
    { menu_id: m1!.id, hotel_id: HOTEL_ID, name: 'Entrante',  course_type: 'entrante',  sort_order: 1 },
    { menu_id: m1!.id, hotel_id: HOTEL_ID, name: 'Principal', course_type: 'principal', sort_order: 2 },
    { menu_id: m1!.id, hotel_id: HOTEL_ID, name: 'Postre',    course_type: 'postre',    sort_order: 3 },
  ]).select('id, name')
  if (sections1.error) throw new Error(`sections1: ${sections1.error.message}`)

  const sec1ByName = new Map((sections1.data as any[]).map((s) => [s.name, s.id]))
  await supabase.from('menu_section_recipes').insert([
    { section_id: sec1ByName.get('Entrante'),  hotel_id: HOTEL_ID, recipe_id: recByName.get('Pulpo á feira'),                       sort_order: 1 },
    { section_id: sec1ByName.get('Principal'), hotel_id: HOTEL_ID, recipe_id: recByName.get('Lubina al horno con patatas panadera'), sort_order: 1 },
    { section_id: sec1ByName.get('Postre'),    hotel_id: HOTEL_ID, recipe_id: recByName.get('Tarta de Santiago'),                    sort_order: 1 },
  ])

  // 2) Cóctel
  const { data: m2 } = await supabase
    .from('menus').insert({
      hotel_id: HOTEL_ID,
      name: 'Cóctel de bienvenida',
      menu_type: 'cocktail',
      target_food_cost_pct: 28,
      is_active: true,
      created_by: headChef.id,
    }).select('id, name').single()

  const sections2 = await supabase.from('menu_sections').insert([
    { menu_id: m2!.id, hotel_id: HOTEL_ID, name: 'Aperitivos', course_type: 'aperitivo', sort_order: 1 },
  ]).select('id, name')

  const sec2ByName = new Map((sections2.data as any[]).map((s) => [s.name, s.id]))
  await supabase.from('menu_section_recipes').insert([
    { section_id: sec2ByName.get('Aperitivos'), hotel_id: HOTEL_ID, recipe_id: recByName.get('Empanada de mariscos'),       sort_order: 1 },
    { section_id: sec2ByName.get('Aperitivos'), hotel_id: HOTEL_ID, recipe_id: recByName.get('Queso tetilla con miel y manzana'), sort_order: 2 },
  ])

  console.log(`   ✓ ${m1!.name} (3 secciones) · ${m2!.name} (1 sección)`)
  return [m1!, m2!]
}

// ─── 9. Eventos + clientes + impacto operacional ────────────────────────────

interface EventRow { id: string; name: string; status: string }

async function createEvents(menus: MenuRow[]): Promise<EventRow[]> {
  console.log('🎉 Eventos (4 en distintos estados, 1 confirmed con menús)…')
  const commercial = USERS.find((u) => u.role === 'commercial')!
  const banquete = menus.find((m) => m.name === 'Banquete Bodas Galicia')!
  const coctel   = menus.find((m) => m.name === 'Cóctel de bienvenida')!

  // Clientes
  const { data: clients, error: cErr } = await supabase.from('clients').insert([
    { hotel_id: HOTEL_ID, name: 'García-López Bodas',          company: 'Familia García-López', email: 'maria.garcia@example.es', phone: '+34666111222', vip_level: 'gold' },
    { hotel_id: HOTEL_ID, name: 'ACME Galicia SL',             company: 'ACME Galicia',         email: 'eventos@acme-galicia.example', phone: '+34981999888', vip_level: 'silver' },
    { hotel_id: HOTEL_ID, name: 'Rodríguez Cumpleaños',        company: null,                   email: 'pedro.rodriguez@example.es', phone: '+34666333444', vip_level: 'standard' },
    { hotel_id: HOTEL_ID, name: 'Banca Galicia Asesores',      company: 'Banca Galicia',        email: 'eventos@banca-galicia.example', phone: '+34988777666', vip_level: 'platinum' },
  ]).select('id, name')
  if (cErr) throw new Error(`clients: ${cErr.message}`)

  const clByName = new Map((clients as any[]).map((c) => [c.name, c.id]))

  // 4 eventos
  const events = [
    {
      hotel_id: HOTEL_ID,
      client_id: clByName.get('García-López Bodas'),
      name: 'Bodas García-López',
      event_type: 'banquet',
      service_type: 'seated',
      event_date: date(7),
      start_time: '20:00',
      end_time: '02:00',
      guest_count: 80,
      venue: 'Salón Atlántico',
      status: 'confirmed',
      beo_number: `BEO-${date(7).replace(/-/g, '')}-0001`,
      notes: 'Boda con cóctel de bienvenida en terraza + banquete principal en salón',
      created_by: commercial.id,
    },
    {
      hotel_id: HOTEL_ID,
      client_id: clByName.get('ACME Galicia SL'),
      name: 'Reunión anual ACME',
      event_type: 'cocktail',
      service_type: 'cocktail',
      event_date: date(12),
      start_time: '19:00',
      end_time: '22:30',
      guest_count: 40,
      venue: 'Terraza Río Miño',
      status: 'pending_confirmation',
      beo_number: `BEO-${date(12).replace(/-/g, '')}-0001`,
      created_by: commercial.id,
    },
    {
      hotel_id: HOTEL_ID,
      client_id: clByName.get('Rodríguez Cumpleaños'),
      name: 'Cumpleaños 50 pax',
      event_type: 'banquet',
      service_type: 'seated',
      event_date: date(19),
      guest_count: 50,
      status: 'draft',
      beo_number: `BEO-${date(19).replace(/-/g, '')}-0001`,
      created_by: commercial.id,
    },
    {
      hotel_id: HOTEL_ID,
      client_id: clByName.get('Banca Galicia Asesores'),
      name: 'Catering corporativo Q1',
      event_type: 'catering',
      service_type: 'buffet',
      event_date: date(-5),
      start_time: '14:00',
      end_time: '17:00',
      guest_count: 60,
      venue: 'Sala Conferencias',
      status: 'completed',
      beo_number: `BEO-${date(-5).replace(/-/g, '')}-0001`,
      theoretical_cost: 1500,
      actual_cost: 1620,
      created_by: commercial.id,
    },
  ]

  const { data: evRows, error: evErr } = await supabase
    .from('events').insert(events).select('id, name, status')
  if (evErr) throw new Error(`events: ${evErr.message}`)

  // Espacios para el evento confirmed
  const evConfirmed = (evRows as any[]).find((e) => e.name === 'Bodas García-López')
  await supabase.from('event_spaces').insert([
    { event_id: evConfirmed.id, hotel_id: HOTEL_ID, space_name: 'Terraza Río Miño', setup_type: 'cóctel',     setup_style: 'cabaret',  capacity: 80,  notes: 'Recepción 19:30-20:30' },
    { event_id: evConfirmed.id, hotel_id: HOTEL_ID, space_name: 'Salón Atlántico',  setup_type: 'banquete',   setup_style: 'imperial', capacity: 120, notes: 'Mesa imperial T para 80' },
  ])

  // event_menus para el evento confirmed: cóctel + banquete
  await supabase.from('event_menus').insert([
    { event_id: evConfirmed.id, hotel_id: HOTEL_ID, menu_id: coctel.id,   menu_name: coctel.name,   sort_order: 1 },
    { event_id: evConfirmed.id, hotel_id: HOTEL_ID, menu_id: banquete.id, menu_name: banquete.name, sort_order: 2 },
  ])

  console.log(`   ✓ 4 eventos (1 confirmed con 2 menús + 2 espacios + cliente VIP)`)
  return evRows as EventRow[]
}

// ─── 10. Impacto operacional + cost estimate (manual SQL) ───────────────────

async function generateImpactAndCost(events: EventRow[]) {
  console.log('🧮 Generando impacto operacional + theoretical_cost…')
  const ev = events.find((e) => e.name === 'Bodas García-López')!

  // Llamamos los RPCs vía service_role. check_membership va a fallar por
  // auth.uid()=null, así que llamamos directo a la SQL agregada usando una
  // función puente: ejecutamos el INSERT/UPDATE directamente con SQL.
  const sql = `
    -- Impacto operacional (replicando lógica de generate_event_operational_impact)
    delete from public.event_operational_impact where event_id = '${ev.id}';

    insert into public.event_operational_impact (
      hotel_id, event_id, product_id, product_name, quantity_needed, unit, department
    )
    select
      '${HOTEL_ID}'::uuid,
      '${ev.id}'::uuid,
      ri.product_id,
      coalesce(p.name, ri.ingredient_name),
      round(sum(
        ri.quantity_gross
        * coalesce(em.servings_override, e.guest_count, 1)::numeric
        * coalesce(msr.servings_override, 1)::numeric
        / nullif(r.servings, 0)::numeric
      )::numeric, 3),
      u.abbreviation,
      public.category_to_department(r.category)
    from public.event_menus em
    join public.events e on e.id = em.event_id
    join public.menus m on m.id = em.menu_id
    join public.menu_sections ms on ms.menu_id = m.id
    join public.menu_section_recipes msr on msr.section_id = ms.id
    join public.recipes r on r.id = msr.recipe_id
    join public.recipe_ingredients ri on ri.recipe_id = r.id
    left join public.products p on p.id = ri.product_id
    left join public.units_of_measure u on u.id = ri.unit_id
    where em.event_id = '${ev.id}'
      and r.status = 'approved'
      and ri.quantity_gross > 0
    group by ri.product_id, coalesce(p.name, ri.ingredient_name), u.abbreviation, public.category_to_department(r.category);

    -- Theoretical cost
    update public.events
    set theoretical_cost = (
      select coalesce(round(sum(
        ri.unit_cost
        * ri.quantity_gross
        * coalesce(em.servings_override, e2.guest_count, 1)::numeric
        * coalesce(msr.servings_override, 1)::numeric
        / nullif(r.servings, 0)::numeric
      )::numeric, 2), 0)
      from public.event_menus em
      join public.events e2 on e2.id = em.event_id
      join public.menus m on m.id = em.menu_id
      join public.menu_sections ms on ms.menu_id = m.id
      join public.menu_section_recipes msr on msr.section_id = ms.id
      join public.recipes r on r.id = msr.recipe_id
      join public.recipe_ingredients ri on ri.recipe_id = r.id
      where em.event_id = events.id
        and r.status = 'approved'
        and ri.unit_cost > 0
    )
    where id = '${ev.id}';
  `
  execSync(`npx supabase db query --linked`, {
    input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  })
  console.log(`   ✓ event_operational_impact + theoretical_cost calculados`)
}

// ─── 11. Procurement: PR → PO → GR ──────────────────────────────────────────

async function createProcurementChain(products: ProductRow[]) {
  console.log('🛒 Cadena de compras (PR aprobada → PO sent → GR aceptada)…')
  const admin = USERS.find((u) => u.role === 'admin')!
  const headChef = USERS.find((u) => u.role === 'head_chef')!

  const productByName = new Map(products.map((p) => [p.name, { id: p.id, price: p.price }]))
  const lineProds = ['Pulpo congelado', 'Lubina fresca', 'Mejillón gallego']

  // PR aprobada
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const { data: pr, error: prErr } = await supabase
    .from('purchase_requests').insert({
      hotel_id: HOTEL_ID,
      request_number: `PR-${today}-0001`,
      requested_by: headChef.id,
      status: 'consolidated',
      urgency: 'normal',
      notes: 'Reposición pescado para banquetes próximos',
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    }).select('id').single()
  if (prErr) throw new Error(`pr: ${prErr.message}`)

  const prLines = lineProds.map((name, i) => ({
    request_id: pr!.id,
    hotel_id: HOTEL_ID,
    product_id: productByName.get(name)!.id,
    quantity_requested: i === 0 ? 10 : i === 1 ? 8 : 12,
    sort_order: i,
  }))
  await supabase.from('purchase_request_lines').insert(prLines)

  // PO sent (proveedor preferido: Pescados Nores)
  const { data: po, error: poErr } = await supabase
    .from('purchase_orders').insert({
      hotel_id: HOTEL_ID,
      supplier_id: SUPPLIERS[0].id,
      order_number: `PO-${today}-0001`,
      status: 'confirmed_by_supplier',
      expected_delivery_date: date(2),
      total_amount: 0, // se actualiza tras crear lines
      payment_terms: '30d',
      created_by: admin.id,
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
    }).select('id').single()
  if (poErr) throw new Error(`po: ${poErr.message}`)

  const poLines = lineProds.map((name, i) => {
    const p = productByName.get(name)!
    return {
      order_id: po!.id, hotel_id: HOTEL_ID, product_id: p.id,
      quantity_ordered: i === 0 ? 10 : i === 1 ? 8 : 12,
      unit_price: p.price,
      sort_order: i,
    }
  })
  const { data: poLineRows } = await supabase
    .from('purchase_order_lines').insert(poLines).select('id, product_id, quantity_ordered, unit_price')

  const total = (poLineRows as any[]).reduce((acc, l) => acc + Number(l.quantity_ordered) * Number(l.unit_price), 0)
  await supabase.from('purchase_orders').update({ total_amount: total }).eq('id', po!.id)

  // GR (recepción aceptada — el trigger crea stock_lots automáticamente)
  const { data: gr, error: grErr } = await supabase
    .from('goods_receipts').insert({
      order_id: po!.id,
      hotel_id: HOTEL_ID,
      receipt_number: `GR-${today}-0001`,
      delivery_note_number: 'ALB-NORES-2026-04812',
      temperature_check: true,
      received_by: admin.id,
      notes: 'Recepción Pescados Nores — temperatura conforme',
    }).select('id').single()
  if (grErr) throw new Error(`gr: ${grErr.message}`)

  const grLines = (poLineRows as any[]).map((pol) => ({
    receipt_id: gr!.id,
    order_line_id: pol.id,
    hotel_id: HOTEL_ID,
    quantity_received: pol.quantity_ordered, // total
    lot_number: `LOT-NORES-${today}`,
    expiry_date: date(7),
    unit_cost: pol.unit_price,
    quality_status: 'accepted',
  }))
  await supabase.from('goods_receipt_lines').insert(grLines)

  // El trigger trg_auto_stock_on_receipt actualiza el stock y crea lots+movements
  console.log(`   ✓ PR (3 líneas) · PO ${total.toFixed(2)} EUR · GR aceptada (trigger crea lotes)`)
}

// ─── 12. Alertas + KPI snapshot manual ──────────────────────────────────────

async function createAlertsAndKpi() {
  console.log('🔔 Alertas activas + KPI snapshot…')
  const today = new Date().toISOString().slice(0, 10)

  await supabase.from('alerts').insert([
    {
      hotel_id: HOTEL_ID,
      alert_type: 'low_stock',
      severity: 'critical',
      title: '2 productos en stock crítico',
      message: 'Huevos camperos y Mejillón gallego por debajo del mínimo. Generar pedido urgente.',
      details: { count: 2, products: ['Huevos camperos (docena)', 'Mejillón gallego'] },
    },
    {
      hotel_id: HOTEL_ID,
      alert_type: 'expiring_soon',
      severity: 'warning',
      title: '3 lotes caducan en menos de 5 días',
      message: 'Lubina, Grelos y Harina próximos a caducar. Revisar consumo o donar.',
      details: { count: 3 },
    },
    {
      hotel_id: HOTEL_ID,
      alert_type: 'cost_overrun',
      severity: 'warning',
      title: 'Cost overrun: Catering corporativo Q1',
      message: 'Coste real superó el teórico en 8%. Revisar consumo de mariscos.',
      details: { theoretical: 1500, actual: 1620, overrun_pct: 8.0 },
      related_entity_type: 'event',
    },
    {
      hotel_id: HOTEL_ID,
      alert_type: 'pending_approvals',
      severity: 'info',
      title: '1 evento pendiente de confirmación',
      message: 'Reunión anual ACME esperando confirmación cliente.',
    },
  ])

  // KPI snapshot de los últimos 7 días (para gráficos del dashboard)
  const snapshots = []
  for (let d = 6; d >= 0; d--) {
    snapshots.push({
      hotel_id: HOTEL_ID,
      snapshot_date: date(-d),
      events_completed: d === 5 ? 1 : 0,
      events_total_pax: d === 5 ? 60 : 0,
      total_theoretical_cost: d === 5 ? 1500 : 0,
      total_actual_cost: d === 5 ? 1620 : 0,
      avg_cost_per_pax: d === 5 ? 27 : null,
      inventory_value: 8500 - d * 50,
      low_stock_products: 2,
      expiring_lots: 3,
      waste_records_7d: 4,
      pending_orders: 1,
    })
  }
  await supabase.from('kpi_snapshots').insert(snapshots)

  console.log(`   ✓ 4 alerts (1 critical + 2 warning + 1 info) · 7 KPI snapshots`)
}

// ─── 13. Notification de bienvenida ─────────────────────────────────────────

async function createNotifications() {
  console.log('🔔 Notificaciones demo…')
  const headChef = USERS.find((u) => u.role === 'head_chef')!
  const admin = USERS.find((u) => u.role === 'admin')!

  await supabase.from('notifications').insert([
    {
      hotel_id: HOTEL_ID,
      user_id: admin.id,
      notification_type: 'event_confirmed',
      title: 'Bodas García-López confirmada',
      message: 'Cliente firmó contrato. Activar producción.',
      is_read: false,
      data: { event_name: 'Bodas García-López' },
    },
    {
      hotel_id: HOTEL_ID,
      user_id: headChef.id,
      notification_type: 'low_stock',
      title: 'Stock crítico: 2 productos',
      message: 'Huevos y Mejillón por debajo del mínimo.',
      is_read: false,
    },
    {
      hotel_id: HOTEL_ID,
      user_id: headChef.id,
      notification_type: 'expiring_soon',
      title: '3 lotes caducan esta semana',
      message: 'Revisar mise en place para consumir antes de caducidad.',
      is_read: true,
      read_at: new Date().toISOString(),
    },
  ])
  console.log(`   ✓ 3 notificaciones (1 admin + 2 head_chef)`)
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now()
  console.log(`🌱 Seed Eurostars Hotel Demo Galicia (${HOTEL_ID})\n`)
  await cleanup()
  await ensureTenantAndHotel()
  await createUsers()
  await seedDefaults()
  const refs = await getRefs()
  const products = await createCatalog(refs)
  await createInitialStock(products, refs)
  const recipes = await createRecipes(products)
  const menus = await createMenus(recipes)
  const events = await createEvents(menus)
  await generateImpactAndCost(events)
  await createProcurementChain(products)
  await createAlertsAndKpi()
  await createNotifications()
  console.log(`\n✅ Seed completo en ${((Date.now() - t0) / 1000).toFixed(1)}s\n`)
  console.log(`   Hotel demo: Eurostars Hotel Demo Galicia`)
  console.log(`   UUID:       ${HOTEL_ID}`)
  console.log(`   Login:      demo-head-chef@eurostars-demo.es / ${PWD}`)
  console.log(`   Otros:      demo-admin@…  ·  demo-commercial@…`)
}

main().catch((err) => {
  console.error('\n❌ Seed falló:', err.message)
  process.exit(1)
})
