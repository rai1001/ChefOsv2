// Registro APPCC — Plantilla en blanco para imprimir
// @react-pdf/renderer — importar solo con dynamic() + ssr:false

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { APPCCBlankData } from '../types'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1a1a1a',
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 36,
  },
  header: {
    borderBottom: '2px solid #1a1a1a',
    paddingBottom: 6,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  hotelName: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  docTitle: { fontSize: 9, color: '#666', marginTop: 2 },
  mainTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  dateField: { fontSize: 8, textAlign: 'right', color: '#555', marginTop: 2 },
  // Metadata row
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    borderBottom: '0.5px solid #ccc',
    paddingBottom: 6,
  },
  metaField: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center' },
  metaLabel: { fontSize: 7, color: '#888', flexShrink: 0 },
  metaLine: { flex: 1, borderBottom: '0.5px solid #999', height: 10 },
  // Section
  sectionHeader: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 8,
    marginBottom: 0,
  },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#fff' },
  // Check table
  checkTable: { borderLeft: '0.5px solid #ccc', borderRight: '0.5px solid #ccc' },
  checkHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottom: '0.5px solid #ccc',
  },
  checkRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: '0.3px solid #e0e0e0',
    minHeight: 22,
  },
  headerText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#555' },
  colConcept: { flex: 1 },
  colHour: { width: 36, textAlign: 'center' },
  colTemp: { width: 44, textAlign: 'center' },
  colResult: { width: 50, textAlign: 'center' },
  colCorr: { width: 80, textAlign: 'center' },
  colFirma: { width: 44, textAlign: 'center' },
  // Signature block
  signBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 16,
  },
  signField: { flex: 1, borderTop: '0.5px solid #999', paddingTop: 4, alignItems: 'center' },
  signLabel: { fontSize: 7, color: '#888' },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#aaa',
    fontSize: 6,
    borderTop: '0.3px solid #ddd',
    paddingTop: 3,
  },
})

const RECEPTION_CHECKS = [
  'Temperatura recepción (°C)',
  'Estado embalaje / etiquetado',
  'Fecha caducidad correcta',
  'Aspecto visual adecuado',
  'Olor / color correcto',
]

const STORAGE_CHECKS = [
  'Temperatura cámara frigorífica (°C)',
  'Temperatura congelador (°C)',
  'Temperatura almacén seco (°C)',
  'Orden y limpieza almacén',
]

const COOKING_CHECKS = [
  'Temperatura interna cocción (≥70°C)',
  'Temperatura servicio caliente (≥65°C)',
  'Temperatura servicio frío (≤8°C)',
  'Temperatura enfriamiento rápido (≤10°C en 2h)',
]

const CLEANING_CHECKS = [
  'Limpieza superficies contacto alimentos',
  'Limpieza equipos cocina',
  'Desinfección cámaras / almacén',
  'Control plagas (sin indicios)',
]

interface CheckSectionProps {
  title: string
  items: string[]
}

function CheckSection({ title, items }: CheckSectionProps) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.checkTable}>
        <View style={styles.checkHeader}>
          <Text style={[styles.colConcept, styles.headerText]}>Control</Text>
          <Text style={[styles.colHour, styles.headerText]}>Hora</Text>
          <Text style={[styles.colTemp, styles.headerText]}>Valor</Text>
          <Text style={[styles.colResult, styles.headerText]}>Resultado</Text>
          <Text style={[styles.colCorr, styles.headerText]}>Acción correctora</Text>
          <Text style={[styles.colFirma, styles.headerText]}>Firma</Text>
        </View>
        {items.map((item) => (
          <View key={item} style={styles.checkRow}>
            <Text style={styles.colConcept}>{item}</Text>
            <Text style={styles.colHour} />
            <Text style={styles.colTemp} />
            <Text style={styles.colResult} />
            <Text style={styles.colCorr} />
            <Text style={styles.colFirma} />
          </View>
        ))}
      </View>
    </>
  )
}

interface Props {
  data: APPCCBlankData
}

export function APPCCBlankDocument({ data }: Props) {
  const fmtDate = new Date(data.date).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Document title={`Registro APPCC — ${data.date}`} author="ChefOS v2">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hotelName}>{data.hotel_name}</Text>
            <Text style={styles.docTitle}>Sistema APPCC — Registro diario</Text>
          </View>
          <View>
            <Text style={styles.mainTitle}>Registro APPCC</Text>
            <Text style={styles.dateField}>{fmtDate}</Text>
          </View>
        </View>

        {/* Metadata */}
        <View style={styles.metaRow}>
          <View style={styles.metaField}>
            <Text style={styles.metaLabel}>Turno:</Text>
            <View style={styles.metaLine} />
          </View>
          <View style={styles.metaField}>
            <Text style={styles.metaLabel}>Responsable:</Text>
            <View style={styles.metaLine} />
          </View>
          <View style={styles.metaField}>
            <Text style={styles.metaLabel}>Servicio:</Text>
            <View style={styles.metaLine} />
          </View>
          <View style={styles.metaField}>
            <Text style={styles.metaLabel}>Revisado por:</Text>
            <View style={styles.metaLine} />
          </View>
        </View>

        <CheckSection title="1. Recepción de mercancía" items={RECEPTION_CHECKS} />
        <CheckSection title="2. Control de almacenamiento (temperaturas)" items={STORAGE_CHECKS} />
        <CheckSection title="3. Control de cocción y temperatura de servicio" items={COOKING_CHECKS} />
        <CheckSection title="4. Limpieza y desinfección" items={CLEANING_CHECKS} />

        {/* Observations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Observaciones / Incidencias</Text>
        </View>
        <View style={{ border: '0.5px solid #ccc', minHeight: 40, padding: 4 }} />

        {/* Signatures */}
        <View style={styles.signBlock}>
          <View style={styles.signField}>
            <Text style={styles.signLabel}>Firma responsable cocina</Text>
          </View>
          <View style={styles.signField}>
            <Text style={styles.signLabel}>Firma responsable APPCC</Text>
          </View>
          <View style={styles.signField}>
            <Text style={styles.signLabel}>Visto bueno dirección</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>ChefOS v2 — {data.hotel_name} · Conforme Reglamento CE 852/2004 y RD 191/2011</Text>
          <Text render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
