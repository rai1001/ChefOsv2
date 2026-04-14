// Lista de Compras — @react-pdf/renderer
// Importar solo con dynamic() + ssr:false

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ShoppingListDocData } from '../types'

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
  dateText: { fontSize: 9, color: '#666', textAlign: 'right', marginTop: 2 },
  // Summary
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
  // Supplier block
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
  },
  supplierName: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#fff' },
  supplierCount: { fontSize: 8, color: '#ccc' },
  // Items table
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
  colNeeded: { width: 60, textAlign: 'right' },
  colAvail: { width: 60, textAlign: 'right', color: '#888' },
  colOrder: { width: 65, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  colPrice: { width: 60, textAlign: 'right', color: '#444' },
  headerText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#555' },
  // Total row
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderTop: '0.5px solid #ccc',
    gap: 8,
  },
  totalLabel: { fontSize: 8, color: '#666' },
  totalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', minWidth: 60, textAlign: 'right' },
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

function fmtN(n: number, d = 3) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)
}

function fmtEur(n: number) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' €'
}

interface Props {
  data: ShoppingListDocData
}

export function ShoppingListDocument({ data }: Props) {
  const generatedAt = new Date().toLocaleString('es-ES')
  const fmtDate = new Date(data.date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const totalItems = data.groups.reduce((s, g) => s + g.items.length, 0)
  const totalSuppliers = data.groups.length
  const totalEst = data.groups.reduce((s, g) =>
    s + g.items.reduce((ss, i) => ss + (i.unit_price != null ? i.qty_to_order * i.unit_price : 0), 0), 0
  )

  return (
    <Document title={`Lista de Compras — ${data.date}`} author="ChefOS v2">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hotelName}>{data.hotel_name}</Text>
            <Text style={styles.docTitle}>Lista de Compras</Text>
          </View>
          <View>
            <Text style={styles.mainTitle}>Compras del día</Text>
            <Text style={styles.dateText}>{fmtDate}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalItems}</Text>
            <Text style={styles.summaryLabel}>Productos</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalSuppliers}</Text>
            <Text style={styles.summaryLabel}>Proveedores</Text>
          </View>
          {totalEst > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{fmtEur(totalEst)}</Text>
              <Text style={styles.summaryLabel}>Coste est.</Text>
            </View>
          )}
        </View>

        {/* Per supplier */}
        {data.groups.map((group, idx) => {
          const groupEst = group.items.reduce(
            (s, i) => s + (i.unit_price != null ? i.qty_to_order * i.unit_price : 0), 0
          )
          return (
            <View key={group.supplier_id ?? idx}>
              <View style={styles.supplierHeader}>
                <Text style={styles.supplierName}>
                  {group.supplier_name ?? 'Sin proveedor asignado'}
                </Text>
                <Text style={styles.supplierCount}>
                  {group.items.length} producto{group.items.length !== 1 ? 's' : ''}
                  {groupEst > 0 ? ` · ~${fmtEur(groupEst)}` : ''}
                </Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={[styles.colProduct, styles.headerText]}>Producto</Text>
                <Text style={[styles.colNeeded, styles.headerText]}>Necesario</Text>
                <Text style={[styles.colAvail, styles.headerText]}>Disponible</Text>
                <Text style={[styles.colOrder, styles.headerText]}>A pedir</Text>
                <Text style={[styles.colPrice, styles.headerText]}>Coste est.</Text>
              </View>
              {group.items.map((item) => {
                const lineEst = item.unit_price != null ? item.qty_to_order * item.unit_price : null
                return (
                  <View key={item.product_id} style={styles.tableRow}>
                    <Text style={styles.colProduct}>{item.product_name}</Text>
                    <Text style={styles.colNeeded}>
                      {fmtN(item.qty_needed)} {item.unit ?? ''}
                    </Text>
                    <Text style={styles.colAvail}>
                      {fmtN(item.qty_available)} {item.unit ?? ''}
                    </Text>
                    <Text style={styles.colOrder}>
                      {fmtN(item.qty_to_order)} {item.unit ?? ''}
                    </Text>
                    <Text style={styles.colPrice}>
                      {lineEst != null ? fmtEur(lineEst) : '—'}
                    </Text>
                  </View>
                )
              })}
            </View>
          )
        })}

        {/* Grand total */}
        {totalEst > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total estimado:</Text>
            <Text style={styles.totalValue}>{fmtEur(totalEst)}</Text>
          </View>
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
