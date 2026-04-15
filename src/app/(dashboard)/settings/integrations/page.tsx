'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Building2, Plus, RefreshCw, Loader2, AlertTriangle,
  CheckCircle, Clock, XCircle, Wifi, WifiOff, ShoppingBag,
} from 'lucide-react'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import {
  usePmsIntegrations, usePosIntegrations, useIntegrationSyncLogs,
  useDisablePmsIntegration, useDisablePosIntegration,
  useTriggerPmsSync, useTriggerPosSync,
} from '@/features/integrations/hooks/use-integrations'
import {
  PMS_TYPE_LABELS, POS_TYPE_LABELS,
  INTEGRATION_STATUS_LABELS, INTEGRATION_STATUS_COLORS,
  SYNC_LOG_STATUS_LABELS, SYNC_LOG_STATUS_COLORS,
  type PmsIntegration, type PosIntegration, type IntegrationSyncLog,
} from '@/features/integrations/types'

type Tab = 'pms' | 'pos' | 'logs'

function StatusBadge({ status }: { status: string }) {
  const colorClass = INTEGRATION_STATUS_COLORS[status as keyof typeof INTEGRATION_STATUS_COLORS]
    ?? 'text-text-muted bg-bg-hover'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {INTEGRATION_STATUS_LABELS[status as keyof typeof INTEGRATION_STATUS_LABELS] ?? status}
    </span>
  )
}

function SyncBadge({ status }: { status: string }) {
  const colorClass = SYNC_LOG_STATUS_COLORS[status as keyof typeof SYNC_LOG_STATUS_COLORS]
    ?? 'text-text-muted bg-bg-hover'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {status === 'running' && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
      {SYNC_LOG_STATUS_LABELS[status as keyof typeof SYNC_LOG_STATUS_LABELS] ?? status}
    </span>
  )
}

function PmsCard({
  integration,
  hotelId,
}: {
  integration: PmsIntegration
  hotelId: string
}) {
  const disable     = useDisablePmsIntegration(hotelId)
  const triggerSync = useTriggerPmsSync(hotelId)
  const [syncing, setSyncing] = useState(false)

  async function handleSync(syncType: 'test_connection' | 'sync_occupancy' | 'sync_reservations') {
    setSyncing(true)
    try {
      await triggerSync.mutateAsync({ integration_id: integration.id, sync_type: syncType })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-info" />
          </div>
          <div>
            <div className="font-medium text-text-primary">{integration.name}</div>
            <div className="text-xs text-text-muted mt-0.5">
              {PMS_TYPE_LABELS[integration.pms_type] ?? integration.pms_type}
            </div>
          </div>
        </div>
        <StatusBadge status={integration.status} />
      </div>

      {integration.last_sync_at && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-text-muted">
          <Clock className="h-3.5 w-3.5" />
          Último sync: {new Date(integration.last_sync_at).toLocaleString('es-ES')}
        </div>
      )}

      {integration.last_error && (
        <div className="mt-3 flex items-start gap-2 bg-bg-card border border-danger/40 rounded-lg p-3 text-xs text-danger">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {integration.last_error}
        </div>
      )}

      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <button
          onClick={() => handleSync('test_connection')}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-bg-sidebar disabled:opacity-50"
        >
          {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
          Test
        </button>
        <button
          onClick={() => handleSync('sync_occupancy')}
          disabled={syncing || !integration.is_active}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-bg-sidebar disabled:opacity-50"
        >
          <RefreshCw className="h-3 w-3" /> Sync ocupación
        </button>
        <button
          onClick={() => handleSync('sync_reservations')}
          disabled={syncing || !integration.is_active}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-bg-sidebar disabled:opacity-50"
        >
          <RefreshCw className="h-3 w-3" /> Sync reservas
        </button>
        {integration.is_active && (
          <button
            onClick={() => disable.mutate(integration.id)}
            disabled={disable.isPending}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-danger border border-danger/40 hover:bg-bg-card disabled:opacity-50"
          >
            <WifiOff className="h-3 w-3" /> Deshabilitar
          </button>
        )}
      </div>
    </div>
  )
}

function PosCard({
  integration,
  hotelId,
}: {
  integration: PosIntegration
  hotelId: string
}) {
  const disable     = useDisablePosIntegration(hotelId)
  const triggerSync = useTriggerPosSync(hotelId)
  const [syncing, setSyncing] = useState(false)

  async function handleSync(syncType: 'test_connection' | 'sync_sales' | 'push_kitchen_orders') {
    setSyncing(true)
    try {
      await triggerSync.mutateAsync({ integration_id: integration.id, sync_type: syncType })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <div className="font-medium text-text-primary">{integration.name}</div>
            <div className="text-xs text-text-muted mt-0.5">
              {POS_TYPE_LABELS[integration.pos_type] ?? integration.pos_type}
            </div>
          </div>
        </div>
        <StatusBadge status={integration.status} />
      </div>

      {integration.last_sync_at && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-text-muted">
          <Clock className="h-3.5 w-3.5" />
          Último sync: {new Date(integration.last_sync_at).toLocaleString('es-ES')}
        </div>
      )}

      {integration.last_error && (
        <div className="mt-3 flex items-start gap-2 bg-bg-card border border-danger/40 rounded-lg p-3 text-xs text-danger">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {integration.last_error}
        </div>
      )}

      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <button
          onClick={() => handleSync('test_connection')}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-bg-sidebar disabled:opacity-50"
        >
          {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
          Test
        </button>
        <button
          onClick={() => handleSync('sync_sales')}
          disabled={syncing || !integration.is_active}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-bg-sidebar disabled:opacity-50"
        >
          <RefreshCw className="h-3 w-3" /> Sync ventas
        </button>
        <button
          onClick={() => handleSync('push_kitchen_orders')}
          disabled={syncing || !integration.is_active || !(integration.config as { push_kitchen_orders?: boolean }).push_kitchen_orders}
          title={!(integration.config as { push_kitchen_orders?: boolean }).push_kitchen_orders ? 'Habilitar en config' : ''}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-bg-sidebar disabled:opacity-50"
        >
          <RefreshCw className="h-3 w-3" /> Push comandas
        </button>
        {integration.is_active && (
          <button
            onClick={() => disable.mutate(integration.id)}
            disabled={disable.isPending}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-danger border border-danger/40 hover:bg-bg-card disabled:opacity-50"
          >
            <WifiOff className="h-3 w-3" /> Deshabilitar
          </button>
        )}
      </div>
    </div>
  )
}

function SyncLogRow({ log }: { log: IntegrationSyncLog }) {
  const duration = log.completed_at
    ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
    : null

  return (
    <tr className="border-b border-border hover:bg-bg-sidebar">
      <td className="py-3 px-4 text-sm text-text-secondary whitespace-nowrap">
        {new Date(log.started_at).toLocaleString('es-ES')}
      </td>
      <td className="py-3 px-4">
        <span className="text-xs font-mono bg-bg-hover px-2 py-0.5 rounded text-text-secondary">
          {log.sync_type}
        </span>
      </td>
      <td className="py-3 px-4">
        <SyncBadge status={log.status} />
      </td>
      <td className="py-3 px-4 text-sm text-text-secondary text-right">
        {log.status === 'running' ? '—' : `${log.records_synced} / ${log.records_synced + log.records_failed}`}
      </td>
      <td className="py-3 px-4 text-sm text-text-muted">
        {duration !== null ? `${duration}s` : '…'}
      </td>
      <td className="py-3 px-4">
        {log.error_message && (
          <span className="text-xs text-danger truncate max-w-[200px] block" title={log.error_message}>
            {log.error_message}
          </span>
        )}
      </td>
    </tr>
  )
}

export default function IntegrationsPage() {
  const { data: hotel } = useActiveHotel()
  const hotelId = hotel?.hotel_id ?? ''
  const [tab, setTab] = useState<Tab>('pms')

  const pmsQuery  = usePmsIntegrations(hotelId)
  const posQuery  = usePosIntegrations(hotelId)
  const logsQuery = useIntegrationSyncLogs(hotelId)

  const loading = pmsQuery.isLoading || posQuery.isLoading

  const pmsCount  = pmsQuery.data?.length ?? 0
  const posCount  = posQuery.data?.length ?? 0
  const activeCount = [
    ...(pmsQuery.data ?? []).filter((i) => i.status === 'active'),
    ...(posQuery.data ?? []).filter((i) => i.status === 'active'),
  ].length
  const errorCount = [
    ...(pmsQuery.data ?? []).filter((i) => i.status === 'error'),
    ...(posQuery.data ?? []).filter((i) => i.status === 'error'),
  ].length

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary">Integraciones</h1>
          <p className="text-sm text-text-muted mt-1">
            Conecta tu PMS y POS para sincronizar ocupación, reservas y ventas
          </p>
        </div>
        <Link
          href="/settings/integrations/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nueva integración
        </Link>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total conectadas', value: pmsCount + posCount, icon: <Wifi className="h-4 w-4 text-blue-500" /> },
          { label: 'Activas',          value: activeCount,          icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
          { label: 'Con error',        value: errorCount,           icon: <XCircle className="h-4 w-4 text-red-500" /> },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            {kpi.icon}
            <div>
              <div className="text-text-primary">{kpi.value}</div>
              <div className="text-xs text-text-muted">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {([
            ['pms',  `PMS (${pmsCount})`],
            ['pos',  `POS (${posCount})`],
            ['logs', 'Historial de sync'],
          ] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-info'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: PMS */}
      {tab === 'pms' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
            </div>
          ) : pmsQuery.data?.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No hay PMS configurados</p>
              <Link href="/settings/integrations/new" className="mt-3 inline-block text-sm text-info hover:underline">
                Conectar PMS
              </Link>
            </div>
          ) : (
            pmsQuery.data!.map((integration) => (
              <PmsCard key={integration.id} integration={integration} hotelId={hotelId} />
            ))
          )}
        </div>
      )}

      {/* Tab: POS */}
      {tab === 'pos' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
            </div>
          ) : posQuery.data?.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No hay POS configurados</p>
              <Link href="/settings/integrations/new" className="mt-3 inline-block text-sm text-info hover:underline">
                Conectar POS
              </Link>
            </div>
          ) : (
            posQuery.data!.map((integration) => (
              <PosCard key={integration.id} integration={integration} hotelId={hotelId} />
            ))
          )}
        </div>
      )}

      {/* Tab: Logs */}
      {tab === 'logs' && (
        <div>
          {logsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
            </div>
          ) : logsQuery.data?.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">Aún no hay registros de sincronización</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 px-4 text-xs font-medium text-text-muted">Inicio</th>
                    <th className="pb-3 px-4 text-xs font-medium text-text-muted">Tipo</th>
                    <th className="pb-3 px-4 text-xs font-medium text-text-muted">Estado</th>
                    <th className="pb-3 px-4 text-xs font-medium text-text-muted text-right">Registros OK/Total</th>
                    <th className="pb-3 px-4 text-xs font-medium text-text-muted">Duración</th>
                    <th className="pb-3 px-4 text-xs font-medium text-text-muted">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logsQuery.data!.map((log) => (
                    <SyncLogRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
