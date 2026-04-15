'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSupplier, useSupplierOffers, useAddOffer } from '@/features/catalog/hooks/use-suppliers'
import {
  useSupplierConfig,
  useUpsertSupplierConfig,
  useSupplierIncidents,
  useRecordSupplierIncident,
  useSupplierMetrics,
} from '@/features/catalog/hooks/use-supplier-extended'
import { useProducts } from '@/features/catalog/hooks/use-products'
import { useUnits } from '@/features/recipes/hooks/use-units'
import {
  INCIDENT_TYPES,
  INCIDENT_TYPE_LABELS,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
  WEEKDAY_LABELS,
  type IncidentType,
  type IncidentSeverity,
} from '@/features/catalog/types'
import { ArrowLeft, Plus, Star, AlertTriangle, TrendingUp, Settings, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'info' | 'offers' | 'config' | 'incidents' | 'metrics'

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function SupplierDetailPage() {
  const params = useParams()
  const supplierId = params.id as string

  const [tab, setTab] = useState<Tab>('info')
  const { data: supplier, isLoading } = useSupplier(supplierId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="h-64 skeleton rounded-lg" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="p-12 text-center">
        <p className="text-text-secondary">Proveedor no encontrado</p>
        <Link href="/catalog/suppliers" className="mt-4 text-accent hover:underline">
          Volver
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/catalog/suppliers"
          className="rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-text-primary">{supplier.name}</h1>
          {supplier.contact_name && (
            <p className="text-sm text-text-muted">{supplier.contact_name}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <TabButton active={tab === 'info'} onClick={() => setTab('info')} icon={<Package className="h-4 w-4" />}>
          Info
        </TabButton>
        <TabButton active={tab === 'offers'} onClick={() => setTab('offers')} icon={<Star className="h-4 w-4" />}>
          Ofertas
        </TabButton>
        <TabButton active={tab === 'config'} onClick={() => setTab('config')} icon={<Settings className="h-4 w-4" />}>
          Configuración
        </TabButton>
        <TabButton
          active={tab === 'incidents'}
          onClick={() => setTab('incidents')}
          icon={<AlertTriangle className="h-4 w-4" />}
        >
          Incidencias
        </TabButton>
        <TabButton
          active={tab === 'metrics'}
          onClick={() => setTab('metrics')}
          icon={<TrendingUp className="h-4 w-4" />}
        >
          Métricas
        </TabButton>
      </div>

      {tab === 'info' && <InfoTab supplier={supplier} />}
      {tab === 'offers' && <OffersTab supplierId={supplierId} />}
      {tab === 'config' && <ConfigTab supplierId={supplierId} />}
      {tab === 'incidents' && <IncidentsTab supplierId={supplierId} />}
      {tab === 'metrics' && <MetricsTab supplierId={supplierId} />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-accent text-text-primary'
          : 'border-transparent text-text-muted hover:text-text-secondary',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

// ==================== INFO TAB ====================

function InfoTab({ supplier }: { supplier: NonNullable<ReturnType<typeof useSupplier>['data']> }) {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
      <h2 className="font-semibold text-text-primary">Datos del proveedor</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <Field label="Teléfono" value={supplier.phone} />
        <Field label="Email" value={supplier.email} />
        <Field label="CIF/NIF" value={supplier.tax_id} />
        <Field label="Condiciones" value={supplier.payment_terms} />
        <Field
          label="Pedido mínimo"
          value={supplier.min_order_amount ? `${supplier.min_order_amount.toFixed(2)} EUR` : null}
        />
        <Field
          label="Rating"
          value={
            supplier.rating > 0 ? (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                {supplier.rating}
              </span>
            ) : null
          }
        />
      </div>
      {supplier.address && <Field label="Dirección" value={supplier.address} />}
      {supplier.notes && <Field label="Notas" value={supplier.notes} />}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-text-primary">{value ?? '—'}</p>
    </div>
  )
}

// ==================== OFFERS TAB ====================

function OffersTab({ supplierId }: { supplierId: string }) {
  const { data: offers } = useSupplierOffers(supplierId)
  const { data: products } = useProducts()
  const { data: units } = useUnits()
  const addOffer = useAddOffer()

  const [showForm, setShowForm] = useState(false)
  const [productId, setProductId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [price, setPrice] = useState('')
  const [minQty, setMinQty] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || !price) return
    addOffer.mutate(
      {
        supplier_id: supplierId,
        product_id: productId,
        unit_id: unitId || undefined,
        unit_price: parseFloat(price),
        min_quantity: minQty ? parseFloat(minQty) : undefined,
      },
      {
        onSuccess: () => {
          setProductId('')
          setUnitId('')
          setPrice('')
          setMinQty('')
          setShowForm(false)
        },
      },
    )
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-text-primary">Ofertas</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
        >
          <Plus className="h-3 w-3" />
          Añadir
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-2 border-b border-border pb-4">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm"
          >
            <option value="">Seleccionar producto *</option>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Precio *"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm"
            />
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm"
            >
              <option value="">Unidad</option>
              {units?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.abbreviation}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Mín. cant."
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
              className="rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={addOffer.isPending}
            className="w-full rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {addOffer.isPending ? 'Añadiendo...' : 'Añadir oferta'}
          </button>
        </form>
      )}

      {!offers || offers.length === 0 ? (
        <p className="text-sm text-text-muted">Sin ofertas todavía.</p>
      ) : (
        <div className="space-y-2">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className={cn(
                'flex items-center justify-between rounded-md border p-3',
                offer.is_preferred ? 'border-success bg-success/5' : 'border-border/50',
              )}
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{offer.product?.name ?? 'Producto'}</p>
                <p className="text-xs text-text-muted">
                  {offer.unit_price.toFixed(2)} EUR/{offer.unit?.abbreviation ?? 'ud'}
                </p>
              </div>
              {offer.is_preferred && (
                <span className="flex items-center gap-1 text-xs font-medium text-success">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Preferido
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== CONFIG TAB ====================

function ConfigTab({ supplierId }: { supplierId: string }) {
  const { data: config, isLoading } = useSupplierConfig(supplierId)
  const upsert = useUpsertSupplierConfig()

  const [deliveryDays, setDeliveryDays] = useState<string[]>(config?.delivery_days ?? [])
  const [cutoff, setCutoff] = useState(config?.cutoff_time ?? '')
  const [leadTime, setLeadTime] = useState(config?.lead_time_hours?.toString() ?? '')
  const [minAmount, setMinAmount] = useState(config?.min_order_amount?.toString() ?? '')
  const [minUnits, setMinUnits] = useState(config?.min_order_units?.toString() ?? '')
  const [recvStart, setRecvStart] = useState(config?.reception_window_start ?? '')
  const [recvEnd, setRecvEnd] = useState(config?.reception_window_end ?? '')
  const [urgent, setUrgent] = useState(config?.allows_urgent_delivery ?? false)

  // Sync on load
  if (config && deliveryDays.length === 0 && config.delivery_days.length > 0) {
    setDeliveryDays(config.delivery_days)
  }

  function toggleDay(day: string) {
    setDeliveryDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    upsert.mutate({
      supplier_id: supplierId,
      delivery_days: deliveryDays,
      cutoff_time: cutoff || null,
      lead_time_hours: leadTime ? parseInt(leadTime) : null,
      min_order_amount: minAmount ? parseFloat(minAmount) : null,
      min_order_units: minUnits ? parseFloat(minUnits) : null,
      reception_window_start: recvStart || null,
      reception_window_end: recvEnd || null,
      allows_urgent_delivery: urgent,
    })
  }

  if (isLoading) return <div className="h-48 skeleton rounded-lg" />

  return (
    <form onSubmit={handleSave} className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
      <h2 className="font-semibold text-text-primary">Configuración de entregas y pedidos</h2>

      <div>
        <label className="text-xs text-text-muted uppercase tracking-wider">Días de entrega</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs transition-colors',
                deliveryDays.includes(day)
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-muted hover:bg-bg-hover',
              )}
            >
              {WEEKDAY_LABELS[day]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldInput label="Hora de corte" type="time" value={cutoff} onChange={setCutoff} />
        <FieldInput label="Lead time (horas)" type="number" value={leadTime} onChange={setLeadTime} />
        <FieldInput label="Pedido mínimo (EUR)" type="number" step="0.01" value={minAmount} onChange={setMinAmount} />
        <FieldInput label="Pedido mínimo (unidades)" type="number" step="0.01" value={minUnits} onChange={setMinUnits} />
        <FieldInput label="Recepción desde" type="time" value={recvStart} onChange={setRecvStart} />
        <FieldInput label="Recepción hasta" type="time" value={recvEnd} onChange={setRecvEnd} />
      </div>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
        Permite entrega urgente
      </label>

      <button
        type="submit"
        disabled={upsert.isPending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {upsert.isPending ? 'Guardando...' : 'Guardar configuración'}
      </button>
      {upsert.isSuccess && <span className="ml-3 text-xs text-success">Guardado</span>}
    </form>
  )
}

function FieldInput({
  label,
  type,
  value,
  onChange,
  step,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  step?: string
}) {
  return (
    <div>
      <label className="text-xs text-text-muted uppercase tracking-wider">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
      />
    </div>
  )
}

// ==================== INCIDENTS TAB ====================

function IncidentsTab({ supplierId }: { supplierId: string }) {
  const { data: incidents } = useSupplierIncidents(supplierId)
  const record = useRecordSupplierIncident()

  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<IncidentType>('delay')
  const [severity, setSeverity] = useState<IncidentSeverity>('warning')
  const [description, setDescription] = useState('')

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    record.mutate(
      { supplier_id: supplierId, incident_type: type, severity, description },
      {
        onSuccess: () => {
          setDescription('')
          setType('delay')
          setSeverity('warning')
          setShowForm(false)
        },
      },
    )
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-text-primary">Incidencias</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
        >
          <Plus className="h-3 w-3" />
          Registrar
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="space-y-2 border-b border-border pb-4">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as IncidentType)}
              className="rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm"
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {INCIDENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
              className="rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm"
            >
              {INCIDENT_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {INCIDENT_SEVERITY_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Descripción *"
            rows={2}
            className="w-full rounded-md border border-border bg-bg-input px-2 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
          />
          <button
            type="submit"
            disabled={record.isPending}
            className="w-full rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {record.isPending ? 'Guardando...' : 'Registrar incidencia'}
          </button>
        </form>
      )}

      {!incidents || incidents.length === 0 ? (
        <p className="text-sm text-text-muted">Sin incidencias registradas.</p>
      ) : (
        <div className="space-y-2">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className={cn(
                'rounded-md border p-3',
                inc.severity === 'critical' && 'border-danger/60 bg-danger/5',
                inc.severity === 'warning' && 'border-warning/60 bg-warning/5',
                inc.severity === 'info' && 'border-border/50',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {INCIDENT_TYPE_LABELS[inc.incident_type]}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    inc.severity === 'critical' && 'text-danger',
                    inc.severity === 'warning' && 'text-warning',
                    inc.severity === 'info' && 'text-text-muted',
                  )}
                >
                  {INCIDENT_SEVERITY_LABELS[inc.severity]}
                </span>
              </div>
              {inc.description && <p className="mt-1 text-xs text-text-secondary">{inc.description}</p>}
              <p className="mt-1 text-xs text-text-muted">{new Date(inc.occurred_at).toLocaleString('es-ES')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== METRICS TAB ====================

function MetricsTab({ supplierId }: { supplierId: string }) {
  const { data: metrics, isLoading } = useSupplierMetrics(supplierId)

  if (isLoading) return <div className="h-32 skeleton rounded-lg" />
  if (!metrics) return null

  const rate = metrics.completion_rate_pct
  const rateColor =
    rate === null ? 'text-text-muted' : rate >= 90 ? 'text-success' : rate >= 70 ? 'text-warning' : 'text-danger'

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <KpiCard label="Pedidos totales" value={metrics.total_orders} />
      <KpiCard label="Pedidos recibidos" value={metrics.completed_orders} />
      <KpiCard
        label="Tasa completado"
        value={rate === null ? '—' : `${rate.toFixed(1)}%`}
        valueClassName={rateColor}
      />
      <KpiCard
        label="Incidencias 30d"
        value={metrics.incidents_30d}
        valueClassName={metrics.critical_incidents_30d > 0 ? 'text-danger' : 'text-text-primary'}
        hint={metrics.critical_incidents_30d > 0 ? `${metrics.critical_incidents_30d} críticas` : undefined}
      />
    </div>
  )
}

function KpiCard({
  label,
  value,
  valueClassName,
  hint,
}: {
  label: string
  value: React.ReactNode
  valueClassName?: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-4">
      <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
      <p className={cn('mt-2 text-2xl font-bold text-text-primary', valueClassName)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  )
}
