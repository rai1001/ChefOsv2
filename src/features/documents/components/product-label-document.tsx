// Etiqueta de Producto — @react-pdf/renderer
// 2 etiquetas por fila, formato tarjeta.
// Importar solo con dynamic() + ssr:false

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { LabelData } from '../types'

const ALLERGEN_ES: Record<string, string> = {
  gluten: 'Gluten', crustaceans: 'Crustáceos', eggs: 'Huevos',
  fish: 'Pescado', peanuts: 'Cacahuetes', soy: 'Soja',
  dairy: 'Lácteos', tree_nuts: 'Frutos secos', celery: 'Apio',
  mustard: 'Mostaza', sesame: 'Sésamo', sulfites: 'Sulfitos',
  lupin: 'Altramuces', mollusks: 'Moluscos',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1a1a1a',
    padding: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    width: '48%',
    border: '1px solid #333',
    borderRadius: 4,
    padding: 8,
    minHeight: 120,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  labelHeader: {
    borderBottom: '1px solid #333',
    paddingBottom: 4,
    marginBottom: 4,
  },
  productName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  hotelName: {
    fontSize: 7,
    color: '#888',
    marginTop: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  infoLabel: { color: '#888', fontSize: 7 },
  infoValue: { fontFamily: 'Helvetica-Bold', fontSize: 8 },
  expiryValue: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#c00' },
  allergenSection: {
    marginTop: 4,
    borderTop: '0.5px solid #ddd',
    paddingTop: 3,
  },
  allergenTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#856404', marginBottom: 2 },
  allergenText: { fontSize: 7, color: '#856404', lineHeight: 1.3 },
  storageText: { fontSize: 7, color: '#444', marginTop: 3, fontStyle: 'italic' },
  lotBadge: {
    fontSize: 7,
    color: '#888',
    marginTop: 4,
    borderTop: '0.3px solid #eee',
    paddingTop: 2,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#aaa',
    fontSize: 6,
  },
})

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface Props {
  labels: LabelData[]
}

export function ProductLabelDocument({ labels }: Props) {
  const generatedAt = new Date().toLocaleString('es-ES')
  const hotel = labels[0]?.hotel_name ?? 'ChefOS v2'

  return (
    <Document title="Etiquetas de producto" author="ChefOS v2">
      <Page size="A4" style={styles.page}>
        <View style={styles.grid}>
          {labels.map((label) => (
            <View key={label.lot_id} style={styles.label}>
              <View style={styles.labelHeader}>
                <Text style={styles.productName}>{label.product_name}</Text>
                <Text style={styles.hotelName}>{label.hotel_name}</Text>
              </View>

              {label.production_date && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Elaboración:</Text>
                  <Text style={styles.infoValue}>{fmtDate(label.production_date)}</Text>
                </View>
              )}
              {label.expiry_date && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Consumir antes de:</Text>
                  <Text style={styles.expiryValue}>{fmtDate(label.expiry_date)}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cantidad:</Text>
                <Text style={styles.infoValue}>
                  {new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 }).format(label.quantity)}
                  {label.unit ? ` ${label.unit}` : ''}
                </Text>
              </View>

              {label.allergens.length > 0 && (
                <View style={styles.allergenSection}>
                  <Text style={styles.allergenTitle}>ALÉRGENOS:</Text>
                  <Text style={styles.allergenText}>
                    {label.allergens.map((a) => ALLERGEN_ES[a] ?? a).join(', ')}
                  </Text>
                </View>
              )}

              {label.storage_instructions && (
                <Text style={styles.storageText}>{label.storage_instructions}</Text>
              )}

              {label.lot_number && (
                <Text style={styles.lotBadge}>Lote: {label.lot_number}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>ChefOS v2 — {hotel}</Text>
          <Text>Generado: {generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
