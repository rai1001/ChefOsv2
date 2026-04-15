'use client'
// Todos los botones de descarga PDF — importan @react-pdf/renderer y los documentos de forma ESTÁTICA.
// Este módulo completo se importa con dynamic() + ssr:false desde las páginas.
// Esto garantiza que cuando PDFDownloadLink intente renderizar el documento,
// el componente ya está completamente cargado (no un LoadableComponent de Next.js).

import { PDFDownloadLink } from '@react-pdf/renderer'
import { TechSheetDocument } from './tech-sheet-document'
import { ProductionSheetDocument } from './production-sheet-document'
import { ShoppingListDocument } from './shopping-list-document'
import { KitchenBriefingDocument } from './kitchen-briefing-document'
import { WasteReportDocument } from './waste-report-document'
import { FoodCostDocument } from './food-cost-document'
import { APPCCBlankDocument } from './appcc-blank-document'
import { BeoDocument } from '@/features/commercial/components/beo-document'
import type { BeoData } from '@/features/commercial/types'
import { FileText, FileDown } from 'lucide-react'

import type { TechSheetData } from '../types'
import type { WorkflowDetail } from '@/features/production/types'
import type {
  ShoppingListDocData,
  KitchenBriefingData,
  WasteReportData,
  FoodCostReportData,
  APPCCBlankData,
} from '../types'

// ─── Shared classes ───────────────────────────────────────────────────────────

const btnClass =
  'flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-bg-hover'

// ─── Ficha técnica ────────────────────────────────────────────────────────────

export function TechSheetBtn({ data }: { data: TechSheetData }) {
  const name = data.recipe.name.replace(/\s+/g, '_')
  return (
    <PDFDownloadLink
      document={<TechSheetDocument data={data} />}
      fileName={`FichaTecnica_${name}.pdf`}
      className={btnClass}
    >
      {({ loading }) => (
        <>
          <FileText className="h-4 w-4" />
          {loading ? 'Preparando PDF…' : 'Descargar ficha técnica'}
        </>
      )}
    </PDFDownloadLink>
  )
}

// ─── Hoja de producción ───────────────────────────────────────────────────────

export function ProductionSheetBtn({ detail, hotelName }: { detail: WorkflowDetail; hotelName: string }) {
  const name = detail.name.replace(/\s+/g, '_')
  return (
    <PDFDownloadLink
      document={<ProductionSheetDocument data={detail} hotel_name={hotelName} />}
      fileName={`Produccion_${name}.pdf`}
      className={btnClass}
    >
      {({ loading }) => (
        <>
          <FileDown className="h-4 w-4" />
          {loading ? 'Preparando PDF…' : 'Descargar hoja'}
        </>
      )}
    </PDFDownloadLink>
  )
}

// ─── Lista de compras ─────────────────────────────────────────────────────────

export function ShoppingListBtn({ data }: { data: ShoppingListDocData }) {
  return (
    <PDFDownloadLink
      document={<ShoppingListDocument data={data} />}
      fileName={`ListaCompras_${data.date}.pdf`}
      className={btnClass}
    >
      {({ loading }) => (
        <>
          <FileText className="h-4 w-4" />
          {loading ? 'Preparando PDF…' : 'Descargar lista'}
        </>
      )}
    </PDFDownloadLink>
  )
}

// ─── Lista de compras (inline en shopping-list page) ─────────────────────────

export function ShoppingListBtnInline({ data }: { data: ShoppingListDocData }) {
  return (
    <PDFDownloadLink
      document={<ShoppingListDocument data={data} />}
      fileName={`ListaCompras_${data.date}.pdf`}
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-bg-hover"
    >
      {({ loading }) => (
        <>
          <FileDown className="h-4 w-4" />
          {loading ? 'Preparando PDF…' : 'Descargar PDF'}
        </>
      )}
    </PDFDownloadLink>
  )
}

// ─── Briefing de cocina ───────────────────────────────────────────────────────

export function KitchenBriefingBtn({ data }: { data: KitchenBriefingData }) {
  return (
    <PDFDownloadLink
      document={<KitchenBriefingDocument data={data} />}
      fileName={`Briefing_${data.date}.pdf`}
      className={btnClass}
    >
      {({ loading }) => (
        <>
          <FileText className="h-4 w-4" />
          {loading ? 'Preparando PDF…' : 'Descargar briefing de hoy'}
        </>
      )}
    </PDFDownloadLink>
  )
}

// ─── Informe de mermas ────────────────────────────────────────────────────────

export function WasteReportBtn({ data }: { data: WasteReportData }) {
  return (
    <PDFDownloadLink
      document={<WasteReportDocument data={data} />}
      fileName={`Mermas_${data.from}_${data.to}.pdf`}
      className={btnClass}
    >
      {({ loading }) => (
        <>
          <FileText className="h-4 w-4" />
          {loading ? 'Preparando PDF…' : 'Descargar informe'}
        </>
      )}
    </PDFDownloadLink>
  )
}

// ─── Informe food cost ────────────────────────────────────────────────────────

export function FoodCostBtn({ data }: { data: FoodCostReportData }) {
  return (
    <PDFDownloadLink
      document={<FoodCostDocument data={data} />}
      fileName={`FoodCost_${data.from}_${data.to}.pdf`}
      className={btnClass}
    >
      {({ loading }) => (
        <>
          <FileText className="h-4 w-4" />
          {loading ? 'Preparando PDF…' : 'Descargar informe'}
        </>
      )}
    </PDFDownloadLink>
  )
}

// ─── Plantilla APPCC ──────────────────────────────────────────────────────────

export function APPCCBlankBtn({ data }: { data: APPCCBlankData }) {
  return (
    <PDFDownloadLink
      document={<APPCCBlankDocument data={data} />}
      fileName={`APPCC_${data.date}.pdf`}
      className={btnClass}
    >
      {({ loading }) => (
        <>
          <FileText className="h-4 w-4" />
          {loading ? 'Preparando PDF…' : 'Descargar plantilla'}
        </>
      )}
    </PDFDownloadLink>
  )
}

// ─── BEO (Banquet Event Order) ────────────────────────────────────────────────

export function BeoBtn({ beo }: { beo: BeoData }) {
  const filename = `BEO_${beo.beo_number ?? beo.id.slice(0, 8)}.pdf`
  return (
    <PDFDownloadLink
      document={<BeoDocument beo={beo} />}
      fileName={filename}
      className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-hover"
    >
      {({ loading }) => (
        <>
          <FileDown className="h-4 w-4" />
          {loading ? 'Preparando PDF…' : 'Descargar BEO (PDF)'}
        </>
      )}
    </PDFDownloadLink>
  )
}
