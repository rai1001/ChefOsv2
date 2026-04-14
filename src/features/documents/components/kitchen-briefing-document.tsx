// Briefing de Cocina — @react-pdf/renderer
// Importar solo con dynamic() + ssr:false

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { KitchenBriefingData } from '../types'

const EVENT_STATUS_ES: Record<string, string> = {
  draft: 'Borrador',
  pending_confirmation: 'Pendiente',
  confirmed: 'Confirmado',
  in_preparation: 'En preparación',
  in_operation: 'En operación',
  completed: 'Completado',
  cancelled: 'Cancelado',
  archived: 'Archivado',
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
  dateText: { fontSize: 10, color: '#666', textAlign: 'right', marginTop: 2 },
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
  // Stats grid
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  statBox: {
    flex: 1,
    border: '0.5px solid #ddd',
    borderRadius: 4,
    padding: '6px 8px',
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  statLabel: { fontSize: 7, color: '#888', marginTop: 2, textAlign: 'center' },
  statWarning: { color: '#c00' },
  // Event table
  eventRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottom: '0.3px solid #e5e5e5',
    gap: 4,
  },
  eventName: { flex: 1, fontFamily: 'Helvetica-Bold' },
  eventPax: { width: 40, textAlign: 'right', color: '#444' },
  eventTime: { width: 50, textAlign: 'right', color: '#888' },
  eventStatus: { width: 70, textAlign: 'right', color: '#444' },
  // Production bar
  prodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: '6px 10px',
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
  },
  prodBar: { flex: 1, height: 8, backgroundColor: '#e0e0e0', borderRadius: 4 },
  prodFill: { height: 8, backgroundColor: '#1a1a1a', borderRadius: 4 },
  prodText: { fontSize: 10, fontFamily: 'Helvetica-Bold', minWidth: 40, textAlign: 'right' },
  // Alerts row
  alertsGrid: { flexDirection: 'row', gap: 8 },
  alertBox: {
    flex: 1,
    padding: '6px 8px',
    borderRadius: 4,
    border: '0.5px solid #ddd',
    alignItems: 'center',
  },
  alertValue: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  alertLabel: { fontSize: 7, color: '#888', marginTop: 1, textAlign: 'center' },
  alertWarning: { color: '#c00', borderColor: '#f5c2c2', backgroundColor: '#fff5f5' },
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

interface Props {
  data: KitchenBriefingData
}

export function KitchenBriefingDocument({ data }: Props) {
  const generatedAt = new Date().toLocaleString('es-ES')
  const fmtDate = new Date(data.date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const prodPct = data.production_total > 0
    ? Math.round((data.production_done / data.production_total) * 100)
    : 0

  return (
    <Document title={`Briefing de Cocina — ${data.date}`} author="ChefOS v2">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hotelName}>{data.hotel_name}</Text>
            <Text style={styles.docTitle}>Briefing de Cocina</Text>
          </View>
          <View>
            <Text style={styles.mainTitle}>Briefing del Día</Text>
            <Text style={styles.dateText}>{fmtDate}</Text>
          </View>
        </View>

        {/* Overview stats */}
        <Text style={styles.sectionTitle}>Resumen</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.events_today.length}</Text>
            <Text style={styles.statLabel}>Eventos hoy</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.events_upcoming_7d}</Text>
            <Text style={styles.statLabel}>Próximos 7 días</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.total_pax_7d}</Text>
            <Text style={styles.statLabel}>Pax semana</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{data.pending_orders}</Text>
            <Text style={[styles.statLabel, data.pending_orders > 0 ? styles.statWarning : {}]}>
              Pedidos pendientes
            </Text>
          </View>
        </View>

        {/* Eventos de hoy */}
        {data.events_today.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Eventos de hoy</Text>
            <View style={{ backgroundColor: '#f0f0f0', paddingVertical: 2, paddingHorizontal: 6 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Text style={[styles.eventName, { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#555' }]}>Evento</Text>
                <Text style={[styles.eventPax, { fontSize: 7, color: '#555' }]}>Pax</Text>
                <Text style={[styles.eventTime, { fontSize: 7, color: '#555' }]}>Hora inicio</Text>
                <Text style={[styles.eventStatus, { fontSize: 7, color: '#555' }]}>Estado</Text>
              </View>
            </View>
            {data.events_today.map((ev) => (
              <View key={ev.id} style={styles.eventRow}>
                <Text style={styles.eventName}>{ev.name}</Text>
                <Text style={styles.eventPax}>{ev.guest_count}</Text>
                <Text style={styles.eventTime}>
                  {ev.start_time ? ev.start_time.slice(0, 5) : '—'}
                </Text>
                <Text style={styles.eventStatus}>
                  {EVENT_STATUS_ES[ev.status] ?? ev.status}
                </Text>
              </View>
            ))}
          </>
        )}

        {data.events_today.length === 0 && (
          <>
            <Text style={styles.sectionTitle}>Eventos de hoy</Text>
            <Text style={{ color: '#888', paddingVertical: 8 }}>Sin eventos programados para hoy.</Text>
          </>
        )}

        {/* Producción */}
        <Text style={styles.sectionTitle}>Estado producción</Text>
        {data.production_total > 0 ? (
          <View style={styles.prodBox}>
            <Text style={{ fontSize: 9, minWidth: 80 }}>
              {data.production_done}/{data.production_total} tareas
            </Text>
            <View style={styles.prodBar}>
              <View style={[styles.prodFill, { width: `${prodPct}%` }]} />
            </View>
            <Text style={styles.prodText}>{prodPct}%</Text>
            {data.production_status && (
              <Text style={{ fontSize: 8, color: '#888', minWidth: 60, textAlign: 'right' }}>
                {data.production_status}
              </Text>
            )}
          </View>
        ) : (
          <Text style={{ color: '#888', paddingVertical: 4 }}>Sin plan de producción activo.</Text>
        )}

        {/* Alertas */}
        <Text style={styles.sectionTitle}>Alertas de inventario</Text>
        <View style={styles.alertsGrid}>
          <View style={[styles.alertBox, data.low_stock_count > 0 ? styles.alertWarning : {}]}>
            <Text style={[styles.alertValue, data.low_stock_count > 0 ? { color: '#c00' } : {}]}>
              {data.low_stock_count}
            </Text>
            <Text style={styles.alertLabel}>Stock bajo</Text>
          </View>
          <View style={[styles.alertBox, data.expiring_7d > 0 ? styles.alertWarning : {}]}>
            <Text style={[styles.alertValue, data.expiring_7d > 0 ? { color: '#c00' } : {}]}>
              {data.expiring_7d}
            </Text>
            <Text style={styles.alertLabel}>Caducan 7d</Text>
          </View>
          <View style={styles.alertBox}>
            <Text style={styles.alertValue}>{data.waste_count_7d}</Text>
            <Text style={styles.alertLabel}>Mermas 7d</Text>
          </View>
        </View>

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
