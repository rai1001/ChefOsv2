'use client'

import { useState } from 'react'
import {
  Bot, CheckCircle, XCircle, Clock, ChevronRight,
  Zap, RefreshCw, AlertTriangle, Info,
} from 'lucide-react'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import {
  useAgentSuggestions,
  useApproveSuggestion,
  useRejectSuggestion,
} from '@/features/agents/hooks/use-agents'
import {
  AGENT_LABELS,
  SUGGESTION_STATUS_LABELS,
  SUGGESTION_STATUS_VARIANT,
  ACTION_LABELS,
  type AgentSuggestion,
  type SuggestionStatus,
} from '@/features/agents/types'
import { cn } from '@/lib/utils'

const STATUS_TABS: { value: SuggestionStatus; label: string }[] = [
  { value: 'pending',  label: 'Pendientes' },
  { value: 'applied',  label: 'Aplicadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'expired',  label: 'Expiradas' },
]

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'ahora mismo'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

function ActionBadge({ action }: { action: AgentSuggestion['action'] }) {
  return (
    <span className="badge-status neutral">
      {ACTION_LABELS[action]}
    </span>
  )
}

function SuggestionCard({
  s,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  s: AgentSuggestion
  onApprove: (id: string) => void
  onReject:  (id: string, note?: string) => void
  approving: boolean
  rejecting: boolean
}) {
  const [rejectMode, setRejectMode] = useState(false)
  const [note, setNote] = useState('')
  const variant = SUGGESTION_STATUS_VARIANT[s.status]

  return (
    <div className={cn('alert-box p-4 flex flex-col gap-3', variant)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="h-4 w-4 text-text-muted shrink-0" />
          <div className="min-w-0">
            <p className="alert-title text-sm font-medium truncate">{s.title}</p>
            <p className="text-xs text-text-muted">
              {AGENT_LABELS[s.agent_type]} · {relativeTime(s.created_at)}
            </p>
          </div>
        </div>
        <span className={cn('badge-status shrink-0', variant)}>
          {SUGGESTION_STATUS_LABELS[s.status]}
        </span>
      </div>

      {/* Descripción */}
      <p className="text-sm text-text-secondary">{s.description}</p>

      {/* Acción + contexto */}
      <div className="flex items-center gap-2 flex-wrap">
        <ActionBadge action={s.action} />
        {s.context_type && s.context_id && (
          <span className="text-xs text-text-muted">
            contexto: {s.context_type}
          </span>
        )}
        {s.expires_at && s.status === 'pending' && (
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Clock className="h-3 w-3" />
            expira {relativeTime(s.expires_at)}
          </span>
        )}
      </div>

      {/* Acciones — solo para pendientes */}
      {s.status === 'pending' && (
        <>
          {!rejectMode ? (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onApprove(s.id)}
                disabled={approving || rejecting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-success/90 hover:bg-success text-white disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {approving ? 'Aplicando…' : 'Aprobar'}
              </button>
              <button
                onClick={() => setRejectMode(true)}
                disabled={approving || rejecting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-bg-hover hover:bg-bg-hover text-text-primary disabled:opacity-50 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Rechazar
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Motivo del rechazo (opcional)"
                rows={2}
                className="w-full px-3 py-2 rounded bg-bg-input border border-border text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { onReject(s.id, note || undefined); setRejectMode(false) }}
                  disabled={rejecting}
                  className="px-3 py-1.5 rounded text-sm bg-danger/80 hover:bg-danger text-white disabled:opacity-50 transition-colors"
                >
                  {rejecting ? 'Rechazando…' : 'Confirmar rechazo'}
                </button>
                <button
                  onClick={() => setRejectMode(false)}
                  className="px-3 py-1.5 rounded text-sm bg-bg-hover hover:bg-bg-hover text-text-primary transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Nota de rechazo */}
      {s.status === 'rejected' && s.review_note && (
        <p className="text-xs text-text-muted italic">Motivo: {s.review_note}</p>
      )}
    </div>
  )
}

export default function AgentsPage() {
  const { data: hotel } = useActiveHotel()
  const hotelId = hotel?.hotel_id ?? ''

  const [activeTab, setActiveTab] = useState<SuggestionStatus>('pending')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId]  = useState<string | null>(null)

  const { data: suggestions = [], isLoading, refetch } = useAgentSuggestions(hotelId, activeTab)
  const approveMut = useApproveSuggestion(hotelId)
  const rejectMut  = useRejectSuggestion(hotelId)

  const handleApprove = (id: string) => {
    setApprovingId(id)
    approveMut.mutate(id, { onSettled: () => setApprovingId(null) })
  }

  const handleReject = (id: string, note?: string) => {
    setRejectingId(id)
    rejectMut.mutate({ id, note }, { onSettled: () => setRejectingId(null) })
  }

  const pending = suggestions.filter(s => s.status === 'pending')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-text-primary" />
          <div>
            <h1 className="text-text-primary">Agentes</h1>
            <p className="text-sm text-text-secondary">
              10 agentes analizan tu operación y sugieren acciones. Tú decides.
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-bg-hover hover:bg-bg-hover text-text-primary transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </button>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pendientes', value: suggestions.filter(s => s.status === 'pending').length,  color: 'text-warning' },
          { label: 'Aplicadas',  value: suggestions.filter(s => s.status === 'applied').length,  color: 'text-success' },
          { label: 'Rechazadas', value: suggestions.filter(s => s.status === 'rejected').length, color: 'text-danger' },
          { label: 'Expiradas',  value: suggestions.filter(s => s.status === 'expired').length,  color: 'text-text-secondary' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-bg-card border border-border rounded-lg p-3 text-center">
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Banner informativo si hay pendientes */}
      {activeTab === 'pending' && pending.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <p className="text-sm text-warning">
            Tienes <strong>{pending.length}</strong> sugerencia{pending.length > 1 ? 's' : ''} pendiente{pending.length > 1 ? 's' : ''} de revisión.
            Los agentes nunca actúan solos — tú siempre confirmas.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === tab.value
                ? 'border-b-2 border-text-primary text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-lg skeleton" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Info className="h-10 w-10 text-text-muted mb-3" />
          <p className="text-text-secondary text-sm">
            {activeTab === 'pending'
              ? 'No hay sugerencias pendientes. Los agentes están monitorizando tu operación.'
              : `No hay sugerencias ${SUGGESTION_STATUS_LABELS[activeTab].toLowerCase()}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => (
            <SuggestionCard
              key={s.id}
              s={s}
              onApprove={handleApprove}
              onReject={handleReject}
              approving={approvingId === s.id}
              rejecting={rejectingId === s.id}
            />
          ))}
        </div>
      )}

      {/* Link a configuración */}
      <div className="flex items-center justify-end pt-2">
        <a
          href="/agents/config"
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <Zap className="h-3.5 w-3.5" />
          Configurar agentes
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}
