// Hoja de Producción (Workflow) — @react-pdf/renderer
// Importar solo con dynamic() + ssr:false

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { WorkflowDetail } from '@/features/production/types'
import { DEPARTMENT_LABELS, TASK_STATUS_LABELS } from '@/features/production/types'

const STATUS_SYMBOLS: Record<string, string> = {
  todo: '○',
  in_progress: '►',
  blocked: '✕',
  done: '✓',
  cancelled: '—',
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
  workflowName: { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  eventInfo: { fontSize: 8, color: '#666', textAlign: 'right', marginTop: 2 },
  // Progress summary
  progressBox: {
    flexDirection: 'row',
    gap: 16,
    padding: '6px 10px',
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    marginBottom: 12,
    alignItems: 'center',
  },
  progressStat: { alignItems: 'center' },
  progressValue: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  progressLabel: { fontSize: 7, color: '#888', marginTop: 1 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#e0e0e0', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: '#1a1a1a', borderRadius: 3 },
  // Dept section
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
  deptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  deptName: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  deptCount: { fontSize: 8, color: '#666' },
  // Task row
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottom: '0.3px solid #e5e5e5',
    gap: 6,
  },
  taskSymbol: { width: 12, fontSize: 10, textAlign: 'center', flexShrink: 0 },
  taskTitle: { flex: 1 },
  taskStatus: { width: 55, textAlign: 'right', fontSize: 8, color: '#888' },
  taskMeta: { width: 50, textAlign: 'right', fontSize: 8, color: '#aaa' },
  // MeP summary
  mepRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottom: '0.3px solid #e5e5e5',
  },
  mepDept: { flex: 1 },
  mepProgress: { width: 80, textAlign: 'right', color: '#666' },
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
  data: WorkflowDetail
  hotel_name: string
}

export function ProductionSheetDocument({ data, hotel_name }: Props) {
  const generatedAt = new Date().toLocaleString('es-ES')
  const pct = data.tasks_total > 0 ? Math.round((data.tasks_done / data.tasks_total) * 100) : 0

  return (
    <Document title={`Hoja de Producción — ${data.name}`} author="ChefOS v2">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hotelName}>{hotel_name}</Text>
            <Text style={styles.docTitle}>Hoja de Producción</Text>
          </View>
          <View>
            <Text style={styles.workflowName}>{data.name}</Text>
            {data.event && (
              <Text style={styles.eventInfo}>
                {data.event.name} · {new Date(data.event.event_date).toLocaleDateString('es-ES')} · {data.event.guest_count} pax
              </Text>
            )}
          </View>
        </View>

        {/* Progress summary */}
        <View style={styles.progressBox}>
          <View style={styles.progressStat}>
            <Text style={styles.progressValue}>{data.tasks_done}</Text>
            <Text style={styles.progressLabel}>Hechas</Text>
          </View>
          <View style={styles.progressStat}>
            <Text style={styles.progressValue}>{data.tasks_total - data.tasks_done}</Text>
            <Text style={styles.progressLabel}>Pendientes</Text>
          </View>
          {data.tasks_blocked > 0 && (
            <View style={styles.progressStat}>
              <Text style={[styles.progressValue, { color: '#c00' }]}>{data.tasks_blocked}</Text>
              <Text style={styles.progressLabel}>Bloqueadas</Text>
            </View>
          )}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', minWidth: 36, textAlign: 'right' }}>
            {pct}%
          </Text>
        </View>

        {/* Tasks by department */}
        {data.by_department.map((dept) => {
          const deptDone = dept.tasks.filter((t) => t.status === 'done').length
          return (
            <View key={dept.department}>
              <View style={styles.deptHeader}>
                <Text style={styles.deptName}>
                  {DEPARTMENT_LABELS[dept.department]}
                </Text>
                <Text style={styles.deptCount}>
                  {deptDone}/{dept.tasks.length} tareas
                </Text>
              </View>
              {dept.tasks.map((task) => (
                <View key={task.id} style={styles.taskRow}>
                  <Text style={styles.taskSymbol}>
                    {STATUS_SYMBOLS[task.status] ?? '○'}
                  </Text>
                  <View style={styles.taskTitle}>
                    <Text style={task.status === 'done' ? { color: '#aaa', textDecoration: 'line-through' } : {}}>
                      {task.title}
                    </Text>
                    {task.blocked_reason && (
                      <Text style={{ fontSize: 8, color: '#c00', marginTop: 1 }}>
                        Bloqueada: {task.blocked_reason}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.taskStatus}>
                    {TASK_STATUS_LABELS[task.status]}
                  </Text>
                  <Text style={styles.taskMeta}>
                    {task.estimated_minutes ? `${task.estimated_minutes} min` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )
        })}

        {/* MeP summary */}
        {data.mise_en_place.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Mise en place</Text>
            {data.mise_en_place.map((mep) => {
              const mpct = mep.total > 0 ? Math.round((mep.done / mep.total) * 100) : 0
              return (
                <View key={mep.list_id} style={styles.mepRow}>
                  <Text style={styles.mepDept}>{DEPARTMENT_LABELS[mep.department]} — {mep.title}</Text>
                  <Text style={styles.mepProgress}>{mep.done}/{mep.total} ({mpct}%)</Text>
                </View>
              )
            })}
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>ChefOS v2 — {hotel_name}</Text>
          <Text>Generado: {generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
