'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2, Wifi } from 'lucide-react'
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel'
import { useCreatePmsIntegration, useCreatePosIntegration, useTriggerPmsSync, useTriggerPosSync } from '@/features/integrations/hooks/use-integrations'
import {
  PMS_TYPE_LABELS, POS_TYPE_LABELS, PMS_CREDENTIAL_FIELDS, POS_CREDENTIAL_FIELDS,
  type PmsType, type PosType, type CredentialField,
} from '@/features/integrations/types'

type IntegrationCategory = 'pms' | 'pos'
type WizardStep = 'category' | 'type' | 'credentials' | 'config' | 'test' | 'done'

const PMS_TYPES = Object.entries(PMS_TYPE_LABELS) as [PmsType, string][]
const POS_TYPES = Object.entries(POS_TYPE_LABELS) as [PosType, string][]

const PMS_DESCRIPTIONS: Record<PmsType, string> = {
  mews:        'Mews PMS — cloud nativo, muy popular en hoteles boutique europeos',
  opera_cloud: 'Oracle OPERA Cloud — estándar del sector en grandes cadenas',
  cloudbeds:   'Cloudbeds — plataforma todo-en-uno para propiedades independientes',
  protel:      'Protel Air — solución europea con fuerte presencia en hoteles de lujo',
}

const POS_DESCRIPTIONS: Record<PosType, string> = {
  lightspeed: 'Lightspeed — líder en restaurantes y hoteles europeos',
  simphony:   'Oracle Simphony — estándar en grandes cadenas hoteleras',
  square:     'Square — solución moderna para propiedades medianas',
  revel:      'Revel Systems — robusta para operaciones de alto volumen',
}

export default function NewIntegrationPage() {
  const router = useRouter()
  const { data: hotel } = useActiveHotel()
  const hotelId = hotel?.hotel_id ?? ''

  const [step, setStep]         = useState<WizardStep>('category')
  const [category, setCategory] = useState<IntegrationCategory | null>(null)
  const [pmsType, setPmsType]   = useState<PmsType | null>(null)
  const [posType, setPosType]   = useState<PosType | null>(null)
  const [name, setName]         = useState('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [config, setConfig]     = useState({ sync_interval_minutes: 60 })

  const [createdId, setCreatedId]   = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle')
  const [testMsg, setTestMsg]       = useState('')

  const createPms = useCreatePmsIntegration(hotelId)
  const createPos = useCreatePosIntegration(hotelId)
  const triggerPms = useTriggerPmsSync(hotelId)
  const triggerPos = useTriggerPosSync(hotelId)

  const isPms = category === 'pms'
  const fields: CredentialField[] = isPms
    ? (pmsType ? PMS_CREDENTIAL_FIELDS[pmsType] : [])
    : (posType ? POS_CREDENTIAL_FIELDS[posType] : [])

  async function handleCreate() {
    if (!name.trim()) return
    try {
      if (isPms && pmsType) {
        const id = await createPms.mutateAsync({ pms_type: pmsType, name, credentials })
        setCreatedId(id)
      } else if (!isPms && posType) {
        const id = await createPos.mutateAsync({ pos_type: posType, name, credentials })
        setCreatedId(id)
      }
      setStep('test')
    } catch (e) {
      console.error(e)
    }
  }

  async function handleTestConnection() {
    if (!createdId) return
    setTestStatus('running')
    try {
      if (isPms) {
        await triggerPms.mutateAsync({ integration_id: createdId, sync_type: 'test_connection' })
        setTestMsg('Conexión iniciada — el worker verificará las credenciales en segundos.')
        setTestStatus('ok')
      } else {
        await triggerPos.mutateAsync({ integration_id: createdId, sync_type: 'test_connection' })
        setTestMsg('Conexión iniciada — el worker verificará las credenciales en segundos.')
        setTestStatus('ok')
      }
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : 'Error al lanzar test')
      setTestStatus('fail')
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push('/settings/integrations')}
          className="p-2 rounded-lg hover:bg-bg-hover text-text-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-text-primary">Nueva integración</h1>
          <p className="text-sm text-text-muted">Conecta tu PMS o POS en 4 pasos</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['category', 'type', 'credentials', 'test'] as const).map((s, i) => {
          const stepOrder: WizardStep[] = ['category', 'type', 'credentials', 'config', 'test', 'done']
          const current = stepOrder.indexOf(step)
          const thisIdx = stepOrder.indexOf(s)
          const done    = current > thisIdx
          const active  = current === thisIdx
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                done   ? 'bg-green-500 text-white' :
                active ? 'bg-blue-600 text-white'  :
                         'bg-border text-text-muted'
              }`}>
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < 3 && <div className={`h-0.5 w-6 ${done ? 'bg-green-300' : 'bg-border'}`} />}
            </div>
          )
        })}
      </div>

      {/* PASO 1: Categoría */}
      {step === 'category' && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-text-primary">¿Qué tipo de sistema quieres conectar?</h2>
          {(['pms', 'pos'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setStep('type') }}
              className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-blue-400 hover:bg-bg-card transition-colors"
            >
              <div className="font-medium text-text-primary">
                {cat === 'pms' ? 'PMS — Property Management System' : 'POS — Point of Sale'}
              </div>
              <div className="text-sm text-text-muted mt-0.5">
                {cat === 'pms'
                  ? 'Sincroniza ocupación, reservas y previsión de pax'
                  : 'Sincroniza ventas y empuja comandas de cocina'}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* PASO 2: Tipo de sistema */}
      {step === 'type' && (
        <div className="space-y-3">
          <h2 className="text-base font-medium text-text-primary">
            Selecciona el {isPms ? 'PMS' : 'POS'}
          </h2>
          {(isPms ? PMS_TYPES : POS_TYPES).map(([type, label]) => (
            <button
              key={type}
              onClick={() => {
                if (isPms) setPmsType(type as PmsType)
                else setPosType(type as PosType)
                setStep('credentials')
              }}
              className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-blue-400 hover:bg-bg-card transition-colors"
            >
              <div className="font-medium text-text-primary">{label}</div>
              <div className="text-sm text-text-muted mt-0.5">
                {isPms
                  ? PMS_DESCRIPTIONS[type as PmsType]
                  : POS_DESCRIPTIONS[type as PosType]}
              </div>
            </button>
          ))}
          <button onClick={() => setStep('category')} className="text-sm text-text-muted hover:text-text-secondary mt-2">
            ← Volver
          </button>
        </div>
      )}

      {/* PASO 3: Credenciales */}
      {step === 'credentials' && (
        <div className="space-y-5">
          <h2 className="text-base font-medium text-text-primary">Credenciales de acceso</h2>
          <div className="bg-bg-card border border-warning/40 rounded-lg p-3 text-sm text-warning">
            Las credenciales se almacenan de forma segura y nunca se devuelven al frontend.
          </div>

          {/* Nombre de la integración */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Nombre (para identificarla)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isPms ? 'Mews Hotel Principal' : 'Lightspeed Restaurante'}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Campos dinámicos por tipo */}
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  value={credentials[field.key] ?? ''}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={credentials[field.key] ?? ''}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              )}
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep('type')} className="text-sm text-text-muted hover:text-text-secondary">
              ← Volver
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || createPms.isPending || createPos.isPending}
              className="ml-auto flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {(createPms.isPending || createPos.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar y continuar <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {(createPms.isError || createPos.isError) && (
            <p className="text-sm text-danger">
              {(createPms.error ?? createPos.error) instanceof Error
                ? (createPms.error ?? createPos.error)!.message
                : 'Error al guardar'}
            </p>
          )}
        </div>
      )}

      {/* PASO 4: Test de conexión */}
      {step === 'test' && (
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
            <Wifi className="h-8 w-8 text-info" />
          </div>
          <div>
            <h2 className="text-base font-medium text-text-primary">Integración creada</h2>
            <p className="text-sm text-text-muted mt-1">
              Pulsa &ldquo;Probar conexión&rdquo; para verificar que las credenciales son correctas.
              El test se ejecuta en background (puede tardar 5–10 s).
            </p>
          </div>

          {testStatus === 'idle' && (
            <button
              onClick={handleTestConnection}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 mx-auto"
            >
              <Wifi className="h-4 w-4" /> Probar conexión
            </button>
          )}

          {testStatus === 'running' && (
            <div className="flex items-center justify-center gap-2 text-info text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Iniciando test...
            </div>
          )}

          {testStatus === 'ok' && (
            <div className="bg-bg-card border border-success/40 rounded-lg p-4 text-sm text-success text-left">
              <div className="font-medium mb-1">Test encolado correctamente</div>
              <div>{testMsg}</div>
              <div className="mt-3 text-xs text-success">
                Revisa el historial de sync en la página de integraciones para ver el resultado.
              </div>
            </div>
          )}

          {testStatus === 'fail' && (
            <div className="bg-bg-card border border-danger/40 rounded-lg p-4 text-sm text-danger text-left">
              <div className="font-medium mb-1">Error al iniciar test</div>
              <div>{testMsg}</div>
            </div>
          )}

          <button
            onClick={() => router.push('/settings/integrations')}
            className="text-sm text-info hover:text-info font-medium"
          >
            Ir a Integraciones →
          </button>
        </div>
      )}
    </div>
  )
}
