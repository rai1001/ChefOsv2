// M10 Documents — Shared types for PDF rendering

import type { Recipe, RecipeIngredient, RecipeStep } from '@/features/recipes/types'
import type { WorkflowDetail, ShoppingListGroup } from '@/features/production/types'
import type { FoodCostByEvent, FoodCostByService } from '@/features/reporting/types'

// ─── Ficha técnica de receta ──────────────────────────────────────────────────

export interface TechSheetData {
  recipe: Recipe
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  hotel_name: string
}

// ─── Hoja de producción (workflow) ───────────────────────────────────────────

export type { WorkflowDetail as ProductionSheetData }

// ─── Lista de compras ─────────────────────────────────────────────────────────

export interface ShoppingListDocData {
  hotel_name: string
  date: string
  groups: ShoppingListGroup[]
}

// ─── Briefing de cocina ───────────────────────────────────────────────────────

export interface BriefingEvent {
  id: string
  name: string
  guest_count: number
  status: string
  start_time: string | null
}

export interface KitchenBriefingData {
  hotel_name: string
  date: string
  events_today: BriefingEvent[]
  events_upcoming_7d: number
  total_pax_7d: number
  production_status: string | null
  production_done: number
  production_total: number
  pending_orders: number
  low_stock_count: number
  expiring_7d: number
  waste_count_7d: number
}

// ─── Informe de mermas ────────────────────────────────────────────────────────

export interface WasteReportEntry {
  product_name: string
  total_qty: number
  unit: string | null
  incidents: number
  est_value: number | null
}

export interface WasteReportData {
  hotel_name: string
  from: string
  to: string
  entries: WasteReportEntry[]
}

// ─── Informe de food cost ─────────────────────────────────────────────────────

export interface FoodCostReportData {
  hotel_name: string
  from: string
  to: string
  by_event: FoodCostByEvent[]
  by_service: FoodCostByService[]
}

// ─── Etiqueta de producto ─────────────────────────────────────────────────────

export interface LabelData {
  lot_id: string
  product_name: string
  lot_number: string | null
  quantity: number
  unit: string | null
  production_date: string | null
  expiry_date: string | null
  allergens: string[]
  storage_instructions: string | null
  hotel_name: string
}

// ─── Registro APPCC (plantilla en blanco) ────────────────────────────────────

export interface APPCCBlankData {
  hotel_name: string
  date: string
}
