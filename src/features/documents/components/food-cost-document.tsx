// Informe de Food Cost — @react-pdf/renderer
// Importar solo con dynamic() + ssr:false

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { FoodCostReportData } from '../types'
import { SERVICE_TYPE_LABELS } from '@/features/commercial/types'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  header: {
    borderBottom: '2px solid #1a1a1a',
    paddingBottom: 8,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  hotelName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  docTitle: { fontSize: 9, color: '#666', marginTop: 2 },
  mainTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  dateRange: { fontSize: 8, color: '#666', textAlign: 'right', marginTop: 2 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#555',
    marginBottom: 6,
    marginTop: 14,
    borderBottom: '0.5px solid #ccc',
    paddingBottom: 2,
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottom: '0.3px solid #e5e5e5',
  },
  headerText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#555' },
  // Event table cols
  colEventName: { flex: 1 },
  colDate: { width: 50, textAlign: 'right' },
  colPax: { width: 30, textAlign: 'right' },
  colTeorico: { width: 65, textAlign: 'right' },
  colReal: { width: 65, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  colVariance: { width: 55, textAlign: 'right' },
  colPerPax: { width: 55, textAlign: 'right', color: '#444' },
  // Service table cols
  colService: { width: 80 },
  colCount: { width: 40, textAlign: 'right' },
  colTotalPax: { width: 50, textAlign: 'right' },
  colTotalTeo: { width: 70, textAlign: 'right' },
  colTotalReal: { width: 70, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  colAvgPax: { width: 60, textAlign: 'right' },
  colAvgVar: { width: 55, textAlign: 'right' },
  // variance colors
  varOver: { color: '#c00' },
  varUnder: { color: '#006621' },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#888',
    fontSize: 7,
    borderTop: '0.5px solid #ccc',
    paddingTop: 4,
  },
})

function fmtEur(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €'
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  data: FoodCostReportData
}

export function FoodCostDocument({ data }: Props) {
  const generatedAt = new Date().toLocaleString('es-ES')

  return (
    <Document title={`Informe Food Cost — ${data.from} / ${data.to}`} author="ChefOS v2">
      <Page size="A4" style={styles.page} orientation="landscape">

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hotelName}>{data.hotel_name}</Text>
            <Text style={styles.docTitle}>Informe de Food Cost</Text>
          </View>
          <View>
            <Text style={styles.mainTitle}>Food Cost</Text>
            <Text style={styles.dateRange}>{fmtDateLong(data.from)} — {fmtDateLong(data.to)}</Text>
          </View>
        </View>

        {/* By event */}
        <Text style={styles.sectionTitle}>Por evento ({data.by_event.length})</Text>
        {data.by_event.length === 0 ? (
          <Text style={{ color: '#888', paddingVertical: 4 }}>Sin eventos con datos en el período.</Text>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.colEventName, styles.headerText]}>Evento</Text>
              <Text style={[styles.colDate, styles.headerText]}>Fecha</Text>
              <Text style={[styles.colPax, styles.headerText]}>Pax</Text>
              <Text style={[styles.colTeorico, styles.headerText]}>Teórico</Text>
              <Text style={[styles.colReal, styles.headerText]}>Real</Text>
              <Text style={[styles.colVariance, styles.headerText]}>Varianza</Text>
              <Text style={[styles.colPerPax, styles.headerText]}>€/pax real</Text>
            </View>
            {data.by_event.map((row) => {
              const isOver = (row.variance_pct ?? 0) > 0
              return (
                <View key={row.event_id} style={styles.tableRow}>
                  <Text style={styles.colEventName}>{row.event_name}</Text>
                  <Text style={styles.colDate}>{fmtDate(row.event_date)}</Text>
                  <Text style={styles.colPax}>{row.guest_count}</Text>
                  <Text style={styles.colTeorico}>{fmtEur(row.theoretical_cost)}</Text>
                  <Text style={styles.colReal}>{fmtEur(row.actual_cost)}</Text>
                  <Text style={[styles.colVariance, isOver ? styles.varOver : styles.varUnder]}>
                    {fmtPct(row.variance_pct)}
                  </Text>
                  <Text style={styles.colPerPax}>{fmtEur(row.cost_per_pax_actual)}</Text>
                </View>
              )
            })}
          </>
        )}

        {/* By service */}
        {data.by_service.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Por tipo de servicio</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.colService, styles.headerText]}>Servicio</Text>
              <Text style={[styles.colCount, styles.headerText]}>Eventos</Text>
              <Text style={[styles.colTotalPax, styles.headerText]}>Pax total</Text>
              <Text style={[styles.colTotalTeo, styles.headerText]}>Coste teórico</Text>
              <Text style={[styles.colTotalReal, styles.headerText]}>Coste real</Text>
              <Text style={[styles.colAvgPax, styles.headerText]}>€/pax medio</Text>
              <Text style={[styles.colAvgVar, styles.headerText]}>Var. media</Text>
            </View>
            {data.by_service.map((row) => {
              const isOver = (row.avg_variance_pct ?? 0) > 0
              return (
                <View key={row.service_type} style={styles.tableRow}>
                  <Text style={styles.colService}>
                    {SERVICE_TYPE_LABELS[row.service_type as keyof typeof SERVICE_TYPE_LABELS] ?? row.service_type}
                  </Text>
                  <Text style={styles.colCount}>{row.event_count}</Text>
                  <Text style={styles.colTotalPax}>{row.total_pax}</Text>
                  <Text style={styles.colTotalTeo}>{fmtEur(row.total_theoretical_cost)}</Text>
                  <Text style={styles.colTotalReal}>{fmtEur(row.total_actual_cost)}</Text>
                  <Text style={styles.colAvgPax}>{fmtEur(row.avg_cost_per_pax)}</Text>
                  <Text style={[styles.colAvgVar, isOver ? styles.varOver : styles.varUnder]}>
                    {fmtPct(row.avg_variance_pct)}
                  </Text>
                </View>
              )
            })}
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>ChefOS v2 — {data.hotel_name}</Text>
          <Text>Generado: {generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
