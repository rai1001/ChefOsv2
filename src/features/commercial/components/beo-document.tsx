// BEO PDF Document — @react-pdf/renderer
// Importado SOLO con dynamic() + ssr:false para evitar problemas SSR.

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { BeoData } from '../types'
import { EVENT_TYPE_LABELS, SERVICE_TYPE_LABELS } from '../types'

const DEPT_LABELS: Record<string, string> = {
  cocina_caliente: 'Cocina Caliente',
  cocina_fria: 'Cocina Fría',
  pasteleria: 'Pastelería',
  panaderia: 'Panadería',
  bebidas: 'Bebidas',
  general: 'General',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  // Header
  header: {
    borderBottom: '2px solid #1a1a1a',
    paddingBottom: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  hotelName: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  beoLabel: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#333' },
  beoNumber: { fontSize: 10, color: '#555', textAlign: 'right' },
  // Section titles
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#555',
    marginBottom: 4,
    marginTop: 12,
    borderBottom: '0.5px solid #ccc',
    paddingBottom: 2,
  },
  // Grid rows
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 120, color: '#666' },
  value: { flex: 1, color: '#1a1a1a' },
  // Menu sections
  menuTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 2, marginTop: 6 },
  courseLabel: { color: '#666', fontStyle: 'italic', marginBottom: 1 },
  recipeRow: { flexDirection: 'row', marginBottom: 1, paddingLeft: 8 },
  recipeName: { flex: 1 },
  recipeCost: { width: 60, textAlign: 'right', color: '#444' },
  // Impact table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottom: '0.3px solid #e5e5e5',
  },
  colProduct: { flex: 1 },
  colQty: { width: 70, textAlign: 'right' },
  colUnit: { width: 50, textAlign: 'right', color: '#666' },
  // Dept header
  deptHeader: {
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#e8e8e8',
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginTop: 6,
    marginBottom: 2,
  },
  // Cost box
  costBox: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 32,
  },
  costItem: { alignItems: 'flex-end' },
  costLabel: { color: '#666', fontSize: 8 },
  costValue: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
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

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface Props {
  beo: BeoData
}

export function BeoDocument({ beo }: Props) {
  const generatedAt = new Date().toLocaleString('es-ES')

  return (
    <Document title={`BEO — ${beo.name}`} author="ChefOS v2">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hotelName}>{beo.hotel.name}</Text>
            <Text style={{ color: '#666', marginTop: 2 }}>Banquet Event Order</Text>
          </View>
          <View>
            <Text style={styles.beoLabel}>BEO</Text>
            {beo.beo_number && <Text style={styles.beoNumber}>{beo.beo_number}</Text>}
          </View>
        </View>

        {/* Evento */}
        <Text style={styles.sectionTitle}>Evento</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nombre</Text>
          <Text style={styles.value}>{beo.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fecha</Text>
          <Text style={styles.value}>{fmtDate(beo.event_date)}</Text>
        </View>
        {(beo.start_time || beo.end_time) && (
          <View style={styles.row}>
            <Text style={styles.label}>Horario</Text>
            <Text style={styles.value}>
              {beo.start_time?.slice(0, 5) ?? '—'} – {beo.end_time?.slice(0, 5) ?? '—'}
            </Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Comensales</Text>
          <Text style={styles.value}>{beo.guest_count}</Text>
        </View>
        {beo.venue && (
          <View style={styles.row}>
            <Text style={styles.label}>Espacio</Text>
            <Text style={styles.value}>{beo.venue}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Tipo</Text>
          <Text style={styles.value}>{EVENT_TYPE_LABELS[beo.event_type]}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Servicio</Text>
          <Text style={styles.value}>{SERVICE_TYPE_LABELS[beo.service_type]}</Text>
        </View>

        {/* Cliente */}
        {beo.client && (
          <>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Nombre</Text>
              <Text style={styles.value}>{beo.client.name}</Text>
            </View>
            {beo.client.company && (
              <View style={styles.row}>
                <Text style={styles.label}>Empresa</Text>
                <Text style={styles.value}>{beo.client.company}</Text>
              </View>
            )}
            {beo.client.email && (
              <View style={styles.row}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{beo.client.email}</Text>
              </View>
            )}
            {beo.client.phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Teléfono</Text>
                <Text style={styles.value}>{beo.client.phone}</Text>
              </View>
            )}
          </>
        )}

        {/* Menús */}
        {beo.menus.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Menús</Text>
            {beo.menus.map((menu) => (
              <View key={menu.id}>
                <Text style={styles.menuTitle}>{menu.menu_name}</Text>
                {menu.sections.map((section) => (
                  <View key={section.id}>
                    <Text style={styles.courseLabel}>{section.name}</Text>
                    {section.recipes.map((r) => (
                      <View key={r.id} style={styles.recipeRow}>
                        <Text style={styles.recipeName}>{r.name}</Text>
                        {r.unit_cost != null && (
                          <Text style={styles.recipeCost}>{fmt(r.unit_cost)} €/rac.</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Notas */}
        {beo.notes && (
          <>
            <Text style={styles.sectionTitle}>Observaciones</Text>
            <Text style={{ color: '#444' }}>{beo.notes}</Text>
          </>
        )}

        {/* Impacto operacional */}
        {beo.operational_impact.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Impacto Operacional — Necesidades por Departamento</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.colProduct}>Producto</Text>
              <Text style={styles.colQty}>Cantidad</Text>
              <Text style={styles.colUnit}>Unidad</Text>
            </View>
            {beo.operational_impact.map((dept) => (
              <View key={dept.department}>
                <Text style={styles.deptHeader}>
                  {DEPT_LABELS[dept.department] ?? dept.department}
                </Text>
                {dept.items.map((item, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.colProduct}>{item.product_name}</Text>
                    <Text style={styles.colQty}>{fmt(item.quantity_needed)}</Text>
                    <Text style={styles.colUnit}>{item.unit ?? '—'}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Coste estimado */}
        <View style={styles.costBox}>
          {beo.theoretical_cost != null && (
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Coste teórico</Text>
              <Text style={styles.costValue}>{fmt(beo.theoretical_cost)} €</Text>
            </View>
          )}
          {beo.actual_cost != null && (
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Coste real</Text>
              <Text style={styles.costValue}>{fmt(beo.actual_cost)} €</Text>
            </View>
          )}
          {beo.theoretical_cost != null && beo.guest_count > 0 && (
            <View style={styles.costItem}>
              <Text style={styles.costLabel}>Coste / comensal</Text>
              <Text style={styles.costValue}>
                {fmt(beo.theoretical_cost / beo.guest_count)} €
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>ChefOS v2 — {beo.hotel.name}</Text>
          <Text>Generado: {generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
