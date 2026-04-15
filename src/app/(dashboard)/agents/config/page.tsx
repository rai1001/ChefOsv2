'use client'

import { useState } from 'react'
import { Bot, ToggleLeft, ToggleRight, Save, ChevronLeft } from 'lucide-react'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import { useAgentConfigs, useUpsertAgentConfig } from '@/features/agents/hooks/use-agents'
import {
  AGENT_LABELS,
  AGENT_DESCRIPTIONS,
  AGENT_GROUP,
  AGENT_CONFIG_FIELDS,
  AGENT_DEFAULT_CONFIG,
  AGENT_TYPES_AUTOMEJORA,
  AGENT_TYPES_EVENTO,
  type AgentType,
  type AgentConfig,
} from '@/features/agents/types'

function AgentRow({
  config,
  onSave,
  saving,
}: {
  config: AgentConfig
  onSave: (agentType: AgentType, isActive: boolean, cfg: Record<string, unknown>) => void
  saving: boolean
}) {
  const fields = AGENT_CONFIG_FIELDS[config.agent_type]
  const defaults = AGENT_DEFAULT_CONFIG[config.agent_type]

  const [isActive, setIsActive] = useState(config.is_active)
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(
    Object.keys(defaults).length > 0
      ? { ...defaults, ...config.config }
      : {}
  )
  const [dirty, setDirty] = useState(false)
  const [prevConfig, setPrevConfig] = useState(config)

  // Reset local state when parent pushes new config (React 19 idiom — adjust state during render)
  if (prevConfig !== config) {
    setPrevConfig(config)
    setIsActive(config.is_active)
    setLocalConfig(Object.keys(defaults).length > 0 ? { ...defaults, ...config.config } : {})
    setDirty(false)
  }

  const handleToggle = () => {
    const next = !isActive
    setIsActive(next)
    setDirty(true)
  }

  const handleFieldChange = (key: string, value: string) => {
    setLocalConfig(prev => ({ ...prev, [key]: Number(value) }))
    setDirty(true)
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Bot className="h-4 w-4 text-neutral-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">{AGENT_LABELS[config.agent_type]}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{AGENT_DESCRIPTIONS[config.agent_type]}</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className="shrink-0 transition-colors"
          title={isActive ? 'Desactivar agente' : 'Activar agente'}
        >
          {isActive
            ? <ToggleRight className="h-6 w-6 text-green-500" />
            : <ToggleLeft className="h-6 w-6 text-neutral-500" />
          }
        </button>
      </div>

      {/* Campos de configuración */}
      {fields.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {fields.map(field => (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">{field.label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={String(localConfig[field.key] ?? defaults[field.key] ?? '')}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  className="w-20 px-2 py-1 rounded bg-bg-subtle border border-border text-sm text-text-primary focus:outline-none focus:border-neutral-500"
                />
                {field.suffix && (
                  <span className="text-xs text-neutral-500">{field.suffix}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón guardar — solo si hay cambios */}
      {dirty && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => {
              onSave(config.agent_type, isActive, localConfig)
              setDirty(false)
            }}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-neutral-700 hover:bg-neutral-600 text-neutral-200 disabled:opacity-50 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function AgentsConfigPage() {
  const { data: hotel } = useActiveHotel()
  const hotelId = hotel?.hotel_id ?? ''

  const { data: configs = [], isLoading } = useAgentConfigs(hotelId)
  const upsert = useUpsertAgentConfig(hotelId)
  const [savingAgent, setSavingAgent] = useState<AgentType | null>(null)

  const handleSave = (agentType: AgentType, isActive: boolean, config: Record<string, unknown>) => {
    setSavingAgent(agentType)
    upsert.mutate(
      { agentType, isActive, config },
      { onSettled: () => setSavingAgent(null) }
    )
  }

  const automejora = configs.filter(c => AGENT_TYPES_AUTOMEJORA.includes(c.agent_type))
  const evento     = configs.filter(c => AGENT_TIPOS_EVENTO_includes(c.agent_type))

  function AGENT_TIPOS_EVENTO_includes(t: AgentType) {
    return AGENT_TYPES_EVENTO.includes(t)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <a
          href="/agents"
          className="p-1.5 rounded hover:bg-neutral-700 transition-colors"
          title="Volver"
        >
          <ChevronLeft className="h-4 w-4 text-neutral-400" />
        </a>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Configuración de Agentes</h1>
          <p className="text-sm text-neutral-400">
            Activa/desactiva agentes y ajusta sus umbrales por hotel.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 rounded-lg bg-bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Grupo A */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
              Grupo A — Automejora (periódicos)
            </h2>
            {automejora.map(cfg => (
              <AgentRow
                key={cfg.agent_type}
                config={cfg}
                onSave={handleSave}
                saving={savingAgent === cfg.agent_type}
              />
            ))}
          </section>

          {/* Grupo B */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
              Grupo B — Coordinación de Evento (por transición)
            </h2>
            {evento.map(cfg => (
              <AgentRow
                key={cfg.agent_type}
                config={cfg}
                onSave={handleSave}
                saving={savingAgent === cfg.agent_type}
              />
            ))}
          </section>
        </>
      )}
    </div>
  )
}
