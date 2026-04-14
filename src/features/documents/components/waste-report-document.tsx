// Informe de Mermas — @react-pdf/renderer
// Importar solo con dynamic() + ssr:false

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { WasteReportData } from '../types'

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
  // Summary stats
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    padding: '6px 10px',
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
  },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  summaryLabel: { fontSize: 7, color: '#888', marginTop: 1 },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottom: '0.3px solid #e5e5e5',
  },
  colProduct: { flex: 1 },
  colQty: { width: 70, textAlign: 'right' },
  colUnit: { width: 40, textAlign: 'right', color: '#888' },
  colIncidents: { width: 55, textAlign: 'right' },
  colValue: { width: 65, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  headerText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#555' },
  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
    paddingHorizontal: 6,
    paddingTop: 4,
    borderTop: '0.5px solid #ccc',
    gap: 8,
  },
  totalLabel: { fontSize: 8, color: '#666' },
  totalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', minWidth: 65, textAlign: 'right' },
  emptyText: { color: '#888', paddingVertical: 12, textAlign: 'center' },
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

function fmtEur(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  data: WasteReportData
}

export function WasteReportDocument({ data }: Props) {
  const generatedAt = new Date().toLocaleString('es-ES')
  const totalIncidents = data.entries.reduce((s, e) => s + e.incidents, 0)
  const totalValue = data.entries.reduce((s, e) => s + (e.est_value ?? 0), 0)

  return (
    <Document title={`Informe de Mermas — ${data.from} / ${data.to}`} author="ChefOS v2">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hotelName}>{data.hotel_name}</Text>
            <Text style={styles.docTitle}>Informe de Mermas</Text>
          </View>
          <View>
            <Text style={styles.mainTitle}>Mermas</Text>
            <Text style={styles.dateRange}>{fmtDate(data.from)} — {fmtDate(data.to)}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{data.entries.length}</Text>
            <Text style={styles.summaryLabel}>Productos afectados</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalIncidents}</Text>
            <Text style={styles.summaryLabel}>Registros totales</Text>
          </View>
          {totalValue > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{fmtEur(totalValue)}</Text>
              <Text style={styles.summaryLabel}>Valor estimado</Text>
            </View>
          )}
        </View>

        {/* Table */}
        <Text style={styles.sectionTitle}>Detalle por producto</Text>

        {data.entries.length === 0 ? (
          <Text style={styles.emptyText}>Sin registros de merma en el período seleccionado.</Text>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.colProduct, styles.headerText]}>Producto</Text>
              <Text style={[styles.colQty, styles.headerText]}>Cantidad total</Text>
              <Text style={[styles.colUnit, styles.headerText]}>Ud.</Text>
              <Text style={[styles.colIncidents, styles.headerText]}>Registros</Text>
              <Text style={[styles.colValue, styles.headerText]}>Valor est.</Text>
            </View>
            {data.entries.map((entry, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colProduct}>{entry.product_name}</Text>
                <Text style={styles.colQty}>
                  {new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 }).format(entry.total_qty)}
                </Text>
                <Text style={styles.colUnit}>{entry.unit ?? '—'}</Text>
                <Text style={styles.colIncidents}>{entry.incidents}</Text>
                <Text style={styles.colValue}>{fmtEur(entry.est_value)}</Text>
              </View>
            ))}
            {totalValue > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total estimado:</Text>
                <Text style={styles.totalValue}>{fmtEur(totalValue)}</Text>
              </View>
            )}
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
