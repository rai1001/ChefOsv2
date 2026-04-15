'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRecipes } from '@/features/recipes/hooks/use-recipes'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import { useDashboard } from '@/features/reporting/hooks/use-dashboard'
import { useFoodCostByEvent, useFoodCostByService } from '@/features/reporting/hooks/use-kpis'
import { useShoppingList } from '@/features/production/hooks/use-shopping-list'
import { useTechSheet } from '@/features/documents/hooks/use-tech-sheet'
import { useWasteReport } from '@/features/documents/hooks/use-waste-report'
import {
  ChefHat,
  ShoppingCart,
  BarChart3,
  ClipboardList,
  AlertTriangle,
  Tag,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import type {
  TechSheetData,
  ShoppingListDocData,
  KitchenBriefingData,
  WasteReportData,
  FoodCostReportData,
  APPCCBlankData,
} from '@/features/documents/types'

// ─── PDF buttons — MUST be loaded as one bundle via dynamic() ─────────────────
// Each button statically imports PDFDownloadLink + its document, so react-pdf's
// reconciler always receives a real Document element, never a LoadableComponent.

const TechSheetBtn = dynamic(
  () => import('@/features/documents/components/pdf-buttons').then((m) => m.TechSheetBtn),
  { ssr: false, loading: () => null }
)
const ShoppingListBtn = dynamic(
  () => import('@/features/documents/components/pdf-buttons').then((m) => m.ShoppingListBtn),
  { ssr: false, loading: () => null }
)
const KitchenBriefingBtn = dynamic(
  () => import('@/features/documents/components/pdf-buttons').then((m) => m.KitchenBriefingBtn),
  { ssr: false, loading: () => null }
)
const WasteReportBtn = dynamic(
  () => import('@/features/documents/components/pdf-buttons').then((m) => m.WasteReportBtn),
  { ssr: false, loading: () => null }
)
const FoodCostBtn = dynamic(
  () => import('@/features/documents/components/pdf-buttons').then((m) => m.FoodCostBtn),
  { ssr: false, loading: () => null }
)
const APPCCBlankBtn = dynamic(
  () => import('@/features/documents/components/pdf-buttons').then((m) => m.APPCCBlankBtn),
  { ssr: false, loading: () => null }
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoStr(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function DocCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-accent/10 p-2">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}

// ─── Ficha Técnica ────────────────────────────────────────────────────────────

function TechSheetCard({ hotelName }: { hotelName: string }) {
  const { data: recipes = [], isLoading } = useRecipes()
  const [recipeId, setRecipeId] = useState<string>('')
  const { data: techSheet, isFetching } = useTechSheet(recipeId || null)

  return (
    <DocCard
      icon={ChefHat}
      title="Ficha Técnica de Receta"
      description="Ingredientes, elaboración, alérgenos y coste por ración."
    >
      <div className="flex gap-2">
        <select
          value={recipeId}
          onChange={(e) => setRecipeId(e.target.value)}
          className="flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">Seleccionar receta…</option>
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-text-muted self-center" />}
      </div>
      {techSheet && (
        <div className="mt-2">
          <TechSheetBtn data={techSheet as TechSheetData} />
        </div>
      )}
      {isLoading && <p className="text-xs text-text-muted">Cargando recetas…</p>}
    </DocCard>
  )
}

// ─── Lista de Compras ─────────────────────────────────────────────────────────

function ShoppingListCard({ hotelName }: { hotelName: string }) {
  const [date, setDate] = useState(todayStr())
  const [queryDate, setQueryDate] = useState<string | undefined>(undefined)
  const { data: groups, isLoading } = useShoppingList(queryDate)

  const docData: ShoppingListDocData | null = groups && queryDate
    ? { hotel_name: hotelName, date: queryDate, groups }
    : null

  return (
    <DocCard
      icon={ShoppingCart}
      title="Lista de Compras"
      description="Ingredientes necesarios menos stock disponible, agrupados por proveedor."
    >
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={() => setQueryDate(date)}
          disabled={isLoading}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-bg-hover disabled:opacity-50"
        >
          {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Calcular
        </button>
      </div>
      {docData && (
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {docData.groups.length} proveedores · {docData.groups.reduce((s, g) => s + g.items.length, 0)} productos
          </span>
          <ShoppingListBtn data={docData} />
        </div>
      )}
    </DocCard>
  )
}

// ─── Briefing de cocina ───────────────────────────────────────────────────────

function BriefingCard({ hotelName }: { hotelName: string }) {
  const { data: dash } = useDashboard()

  const briefingData: KitchenBriefingData | null = dash
    ? {
        hotel_name: hotelName,
        date: todayStr(),
        events_today: dash.events.today,
        events_upcoming_7d: dash.events.upcoming_7d,
        total_pax_7d: dash.events.total_pax_7d,
        production_status: dash.production.status ?? null,
        production_done: dash.production.done ?? 0,
        production_total: dash.production.total ?? 0,
        pending_orders: dash.procurement.pending_orders,
        low_stock_count: dash.inventory.low_stock_count,
        expiring_7d: dash.inventory.expiring_7d,
        waste_count_7d: dash.waste.count_7d,
      }
    : null

  return (
    <DocCard
      icon={Calendar}
      title="Briefing de Cocina"
      description="Resumen del día: eventos, producción, alertas de stock."
    >
      {briefingData ? (
        <KitchenBriefingBtn data={briefingData} />
      ) : (
        <p className="text-xs text-text-muted">Cargando datos del dashboard…</p>
      )}
    </DocCard>
  )
}

// ─── Informe de mermas ────────────────────────────────────────────────────────

function WasteCard({ hotelName }: { hotelName: string }) {
  const [from, setFrom] = useState(daysAgoStr(30))
  const [to, setTo] = useState(todayStr())
  const [queryFrom, setQueryFrom] = useState<string | undefined>(undefined)
  const [queryTo, setQueryTo] = useState<string | undefined>(undefined)
  const { data: entries, isLoading } = useWasteReport(queryFrom, queryTo)

  const docData: WasteReportData | null = entries && queryFrom && queryTo
    ? { hotel_name: hotelName, from: queryFrom, to: queryTo, entries }
    : null

  return (
    <DocCard
      icon={AlertTriangle}
      title="Informe de Mermas"
      description="Mermas registradas en el período, agrupadas por producto con valor estimado."
    >
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">Desde</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          onClick={() => { setQueryFrom(from); setQueryTo(to) }}
          disabled={isLoading}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-bg-hover disabled:opacity-50"
        >
          {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Calcular
        </button>
      </div>
      {docData && (
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-text-muted">{docData.entries.length} productos</span>
          <WasteReportBtn data={docData} />
        </div>
      )}
    </DocCard>
  )
}

// ─── Food Cost ────────────────────────────────────────────────────────────────

function FoodCostCard({ hotelName }: { hotelName: string }) {
  const [from, setFrom] = useState(daysAgoStr(30))
  const [to, setTo] = useState(todayStr())
  const [queryFrom, setQueryFrom] = useState(daysAgoStr(30))
  const [queryTo, setQueryTo] = useState(todayStr())
  const { data: byEvent = [], isLoading: loadingEvent } = useFoodCostByEvent(queryFrom, queryTo)
  const { data: byService = [], isLoading: loadingService } = useFoodCostByService(queryFrom, queryTo)
  const isLoading = loadingEvent || loadingService

  const docData: FoodCostReportData = {
    hotel_name: hotelName,
    from: queryFrom,
    to: queryTo,
    by_event: byEvent,
    by_service: byService,
  }

  return (
    <DocCard
      icon={BarChart3}
      title="Informe Food Cost"
      description="Coste teórico vs. real por evento y por tipo de servicio."
    >
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">Desde</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          onClick={() => { setQueryFrom(from); setQueryTo(to) }}
          disabled={isLoading}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-bg-hover disabled:opacity-50"
        >
          {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Aplicar
        </button>
      </div>
      {!isLoading && (
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-text-muted">{byEvent.length} eventos</span>
          <FoodCostBtn data={docData} />
        </div>
      )}
    </DocCard>
  )
}

// ─── Plantilla APPCC ──────────────────────────────────────────────────────────

function APPCCCard({ hotelName }: { hotelName: string }) {
  const [date, setDate] = useState(todayStr())

  const appccData: APPCCBlankData = { hotel_name: hotelName, date }

  return (
    <DocCard
      icon={ClipboardList}
      title="Plantilla APPCC"
      description="Registro diario en blanco: recepción, almacenamiento, cocción y limpieza."
    >
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <APPCCBlankBtn data={appccData} />
      </div>
    </DocCard>
  )
}

// ─── Etiquetas ────────────────────────────────────────────────────────────────
// Placeholder: M9 (compliance/etiquetado) no está implementado aún.

function LabelsCard() {
  return (
    <DocCard
      icon={Tag}
      title="Etiquetas de Producto"
      description="Etiquetas de lote con alérgenos, fecha de caducidad y trazabilidad."
    >
      <p className="text-xs text-text-muted italic">
        Disponible cuando M9 (Compliance/Etiquetado) esté implementado.
      </p>
    </DocCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { data: hotel } = useActiveHotel()
  const hotelName = hotel?.hotel_id ?? 'ChefOS v2'

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Documentos</h1>
        <p className="text-sm text-text-muted">
          Genera y descarga documentos operativos en PDF.
          Para BEO y hojas de producción, abre el evento o workflow correspondiente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TechSheetCard hotelName={hotelName} />
        <ShoppingListCard hotelName={hotelName} />
        <BriefingCard hotelName={hotelName} />
        <WasteCard hotelName={hotelName} />
        <FoodCostCard hotelName={hotelName} />
        <APPCCCard hotelName={hotelName} />
        <LabelsCard />
      </div>

      <div className="rounded-lg border border-border bg-bg-card p-4 text-sm text-text-muted space-y-1">
        <p className="font-medium text-text-secondary">Documentos contextuales</p>
        <p>BEO → página de detalle del evento (botón &ldquo;Descargar BEO&rdquo;)</p>
        <p>Hoja de producción → página del workflow (botón &ldquo;Descargar PDF&rdquo;)</p>
        <p>Lista de compras → también disponible en la página de Compras con PDF integrado</p>
      </div>
    </div>
  )
}
