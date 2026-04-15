'use client'

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Thermometer,
} from 'lucide-react'

/**
 * Design System Preview — ChefOS v2
 *
 * Página de referencia viva del design system. Accesible en /design-system.
 * Reproduce DESIGN.md usando exclusivamente los tokens y utility classes
 * definidos en globals.css. Si algo aquí se rompe, DESIGN.md está desalineado.
 */
export default function DesignSystemPreview() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="mx-auto max-w-5xl px-8 py-16">
        {/* Hero */}
        <header className="mb-20">
          <p className="mb-6" style={eyebrowStyle}>
            ChefOS v2 · Design System Preview · 2026
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '56px',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
            }}
          >
            Industrial Control
            <br />
            Surface for Kitchens
          </h1>
          <p className="mt-6 max-w-xl text-text-secondary">
            Software de operaciones de cocina para hoteles, catering y eventos. Dark mode nativo. Diseñado para jefes de cocina en turnos de 16 horas.
          </p>
        </header>

        {/* 01 — Tipografía */}
        <Section number="01" title="Tipografía">
          <TypeRow
            font="Syne"
            meta="Display · 700 · 48px"
            note="Módulos, headings"
            sample={
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                Control de Turno
                <br />
                Evento: Gala 200 cubiertos
              </div>
            }
          />
          <TypeRow
            font="Syne"
            meta="Section header · 600 · 22px"
            sample={
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600 }}>
                Gestión de Inventario · Módulo M5
              </div>
            }
          />
          <TypeRow
            font="DM Sans"
            meta="Body · 400 · 17.6px"
            note="Formularios, párrafos"
            sample={
              <p className="text-text-primary max-w-xl">
                El plan de producción genera automáticamente las tareas asignadas a cada partida. Los jefes de cocina reciben notificaciones cuando una tarea lleva más de 15 minutos sin actualizar su progreso.
              </p>
            }
          />
          <TypeRow
            font="DM Sans"
            meta="Caption · 400 · 14px"
            sample={
              <p className="text-sm text-text-secondary">
                Última sincronización: hace 4 minutos · Proveedor: Makro Madrid · Albarán n.º GR-2024-0892
              </p>
            }
          />
          <TypeRow
            font="DM Mono"
            meta="KPI · 500 · 32px"
            note="Números dominantes"
            sample={
              <div className="flex items-baseline gap-10">
                <KpiInline value="23.4%" label="food cost" />
                <KpiInline value="142 kg" label="stock salmón" />
                <KpiInline value="4.2°C" label="+0.3 tendencia" />
              </div>
            }
          />
          <TypeRow
            font="JetBrains Mono"
            meta="Badges · 500 · 11px"
            note="IDs, códigos, audit"
            sample={
              <div className="flex flex-wrap gap-2">
                <span className="badge-status success">Confirmado</span>
                <span className="badge-status urgent">Stock bajo</span>
                <span className="badge-status warning">En revisión</span>
                <span className="badge-status neutral">Borrador</span>
                <span className="text-xs font-code text-text-muted">LOT-2024-0912</span>
                <span className="text-xs font-code text-text-muted">OC-2026-0892</span>
                <span className="text-xs font-code text-text-muted">GR-2024-0445</span>
              </div>
            }
          />
        </Section>

        {/* 02 — Sistema de color */}
        <Section number="02" title="Sistema de color">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
            <Swatch hex="#1a1a1a" name="bg" />
            <Swatch hex="#242424" name="surface" />
            <Swatch hex="#1e1e1e" name="surface-2" />
            <Swatch hex="#2e2e2e" name="border" />
            <Swatch hex="#d4d4d4" name="text-primary" light />
            <Swatch hex="#a0a0a0" name="text-secondary" light />
            <Swatch hex="#e8e4dc" name="accent" light />
            <Swatch hex="#c0392b" name="urgent" />
            <Swatch hex="#b87333" name="warning (copper)" />
            <Swatch hex="#5a7a5a" name="success" />
          </div>
          <p className="mt-6 max-w-2xl text-sm text-text-secondary">
            Regla de uso: el color es estado, no decoración. <span className="text-accent">Accent</span> solo para CTA primario o elemento activo. El resto es funcional: <span className="text-danger">rojo</span> = acción urgente, <span className="text-warning">cobre</span> = atención, <span className="text-success">verde apagado</span> = confirmación silenciosa.
          </p>
        </Section>

        {/* 03 — Botones y controles */}
        <Section number="03" title="Botones y controles">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="rounded-md bg-accent px-4 py-2 text-sm font-medium">
              Confirmar evento
            </button>
            <button type="button" className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-hover" style={{ borderColor: 'var(--border-strong)' }}>
              Ver detalle
            </button>
            <button type="button" className="rounded-md px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover">
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{
                color: '#e88070',
                background: 'var(--urgent-bg)',
                border: '1px solid var(--urgent-border)',
              }}
            >
              Eliminar orden
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-6">
            <Toggle label="Notificaciones activas" defaultOn />
            <Toggle label="Sincronización PMS" />
          </div>
        </Section>

        {/* 04 — Alertas y estado */}
        <Section number="04" title="Alertas y estado">
          <div className="space-y-3">
            <StatusItem
              variant="urgent"
              icon={<AlertTriangle className="h-5 w-5" style={{ color: 'var(--color-danger)' }} />}
              title="Stock crítico: Salmón atlántico"
              detail="2.3 kg disponibles · Mínimo operativo: 5 kg · Evento Gala en 6 horas"
            />
            <StatusItem
              variant="warning"
              icon={<Thermometer className="h-5 w-5" style={{ color: 'var(--color-warning)' }} />}
              title="Temperatura en límite: Cámara frigorífica B"
              detail="4.2°C · Tendencia ascendente +0.3°C en 30 min · Límite APPCC: 4°C"
            />
            <StatusItem
              variant="success"
              icon={<CheckCircle2 className="h-5 w-5" style={{ color: 'var(--color-success)' }} />}
              title="Recepción confirmada: OC-2024-0892"
              detail="Makro Madrid · 23 líneas recibidas sin incidencias · Inventario actualizado"
            />
            <StatusItem
              variant="info"
              icon={<Sparkles className="h-5 w-5" style={{ color: 'var(--color-info)' }} />}
              title="Sugerencia del agente: optimización de compras"
              detail="3 proveedores tienen oferta activa esta semana que reduce coste en 5.4%. Revisar antes de generar PO."
            />
          </div>
        </Section>

        {/* 05 — Banda de mando + KPIs (dashboard) */}
        <Section number="05" title="Dashboard · banda de mando + left-border system">
          <div className="grid gap-4 md:grid-cols-3">
            <CommandCard
              eyebrow="Turno activo"
              title="García · 08:00–14:00"
              detail="Hotel Eurostars Torre · Cocina central"
            />
            <CommandCard
              eyebrow="Servicio activo"
              title="Gala Salón A (200p)"
              detail="14:00 · Menú degustación 8 platos"
            />
            <CommandCard
              eyebrow="Siguiente acción"
              title="Confirmar recepción OC-0234"
              detail="Makro · Salmón + Lubina + vieiras · Hace 35 min"
              action="Mise en place"
              extraMeta="4 tareas sin asignar"
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <BandKpi value="28.4%" label="food cost" sub="+1.2% vs objetivo" />
            <BandKpi value="2.3kg" label="stock salmón" sub="Mínimo: 5kg" />
            <BandKpi value="68%" label="mise en place" sub="4h restantes" />
            <BandKpi value="3" label="pax urgencias" sub="Sin urgencias" />
          </div>

          <p className="mt-4 text-sm text-text-secondary">
            Left-border status system — el rail de 3px es el estado. Sin badges.
          </p>
          <div className="mt-3 space-y-2">
            <InlineRail variant="urgent" left="Salmón atlántico — STOCK BAJO" leftSub="LOT-2024-0412 · Cámara A · Cámara B" right="2.3 kg" rightSub="Mínimo: 5 kg" />
            <InlineRail variant="warning" left="Temperatura cámara B — ATENCIÓN" leftSub="Límite lectura: 4.2°C · Tendencia +0.3°C/30min" right="4.2°C" rightSub="Límite: 4°C" />
            <InlineRail variant="success" left="OC-2024-0891 — Recibida y verificada" leftSub="Makro Madrid · 18 líneas · hace 2h" right="€ 1.243" rightSub="Importe total" />
            <InlineRail variant="info" left="PO-2024-0034 — Enviada al proveedor" leftSub="Distribuciones García · Entrega prevista mañana 09:00" right="€ 342" rightSub="pendiente recepción" />
          </div>
        </Section>

        {/* 06 — Tabla de inventario */}
        <Section number="06" title="Tabla de inventario — el rail va en el &lt;tr&gt;, sin badges">
          <div className="overflow-hidden rounded-md border border-border bg-bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border-strong)', fontFamily: 'var(--font-code)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Lote</th>
                  <th className="px-4 py-3 font-medium text-right">Stock</th>
                  <th className="px-4 py-3 font-medium text-right">Caducidad</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                <InventoryRow variant="urgent" name="Salmón atlántico" sub="Fresco · Cámara A" lot="LOT-0412" stock="2.3 kg" exp="5.0 kg" value="€ 18.40" status="URGENTE" />
                <InventoryRow variant="warning" name="Lubina europea" sub="Fresco · Cámara A" lot="LOT-0398" stock="8.1 kg" exp="8.0 kg" value="€ 14.28" status="ATENCIÓN" />
                <InventoryRow variant="neutral" name="Vieiras gallegas" sub="Congelado · Congelador 1" lot="LOT-0401" stock="24.0 kg" exp="5.0 kg" value="€ 22.50" status="OK" />
                <InventoryRow variant="neutral" name="Aceite de oliva EVOO" sub="seco · Almacén" lot="LOT-0388" stock="18.0 L" exp="6.0 L" value="€ 6.80" status="OK" />
              </tbody>
            </table>
          </div>
        </Section>

        {/* 07 — Fichas de receta */}
        <Section number="07" title="Fichas de receta — foto opcional">
          <div className="grid gap-4 md:grid-cols-3">
            <RecipeCard name="Salmón en costra de hierbas" servings={6} time="60 min" cost="€ 4.20" fc="28.4%" />
            <RecipeCard name="Risotto de trufa negra" servings={4} time="35 min" cost="€ 7.80" fc="41.2%" />
            <RecipeCard name="Vieiras con parmentier" servings={4} time="25 min" cost="€ 9.10" fc="22.1%" />
          </div>
        </Section>
      </div>
    </div>
  )
}

/* ─── building blocks ──────────────────────────────────────────────────── */

const eyebrowStyle: React.CSSProperties = {
  fontFamily: 'var(--font-code)',
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <p className="mb-6" style={eyebrowStyle}>
        {number} · {title}
      </p>
      {children}
    </section>
  )
}

function TypeRow({ font, meta, note, sample }: { font: string; meta: string; note?: string; sample: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-8 border-b border-border py-6 last:border-0">
      <div>
        <p className="text-xs font-medium text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>{font}</p>
        <p className="mt-1" style={eyebrowStyle}>{meta}</p>
        {note && <p className="mt-1 text-xs text-text-muted">{note}</p>}
      </div>
      <div>{sample}</div>
    </div>
  )
}

function KpiInline({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label mt-1">{label}</div>
    </div>
  )
}

function Swatch({ hex, name, light }: { hex: string; name: string; light?: boolean }) {
  return (
    <div
      className="rounded-md border p-4"
      style={{
        background: hex,
        borderColor: 'var(--color-border)',
        color: light ? '#1a1a1a' : '#d4d4d4',
        minHeight: 80,
      }}
    >
      <p className="text-xs font-medium">{name}</p>
      <p className="mt-1 text-xs font-code">{hex}</p>
    </div>
  )
}

function Toggle({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-text-primary">
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full"
        style={{
          background: defaultOn ? 'var(--color-accent)' : 'var(--color-bg-hover)',
          border: '1px solid var(--color-border)',
        }}
      >
        <span
          className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
          style={{
            background: defaultOn ? 'var(--accent-fg)' : 'var(--color-text-secondary)',
            transform: defaultOn ? 'translateX(18px)' : 'translateX(3px)',
          }}
        />
      </span>
      {label}
    </label>
  )
}

function StatusItem({ variant, icon, title, detail }: { variant: 'urgent' | 'warning' | 'success' | 'info'; icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className={`status-rail ${variant} flex items-start gap-3 rounded-r-md bg-bg-card p-4`}>
      <div className="shrink-0 pt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="mt-0.5 text-xs text-text-secondary">{detail}</p>
      </div>
    </div>
  )
}

function CommandCard({ eyebrow, title, detail, action, extraMeta }: { eyebrow: string; title: string; detail: string; action?: string; extraMeta?: string }) {
  return (
    <div className="rounded-md border border-border bg-bg-card p-4">
      <p style={eyebrowStyle}>{eyebrow}</p>
      <p className="mt-2" style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</p>
      <p className="mt-1 text-xs text-text-secondary">{detail}</p>
      {action && (
        <div className="mt-3 flex items-center gap-3">
          <button type="button" className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium">
            {action}
          </button>
          {extraMeta && <span className="text-xs text-text-muted">{extraMeta}</span>}
        </div>
      )}
    </div>
  )
}

function BandKpi({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="rounded-md border border-border bg-bg-card p-4">
      <div className="kpi-value">{value}</div>
      <div className="kpi-label mt-1">{label}</div>
      <p className="mt-2 text-xs text-text-muted">{sub}</p>
    </div>
  )
}

function InlineRail({ variant, left, leftSub, right, rightSub }: { variant: 'urgent' | 'warning' | 'success' | 'info'; left: string; leftSub: string; right: string; rightSub: string }) {
  return (
    <div className={`status-rail ${variant} flex items-center justify-between rounded-r-md bg-bg-card px-4 py-3`}>
      <div>
        <p className="text-sm font-medium text-text-primary">{left}</p>
        <p className="mt-0.5 text-xs text-text-muted">{leftSub}</p>
      </div>
      <div className="text-right">
        <p className="font-data text-base text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>{right}</p>
        <p className="text-xs text-text-muted">{rightSub}</p>
      </div>
    </div>
  )
}

function InventoryRow({ variant, name, sub, lot, stock, exp, value, status }: { variant: 'urgent' | 'warning' | 'success' | 'neutral'; name: string; sub: string; lot: string; stock: string; exp: string; value: string; status: string }) {
  return (
    <tr className={`status-rail ${variant} border-b border-border last:border-0`}>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-text-primary">{name}</p>
        <p className="text-xs text-text-muted">{sub}</p>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted font-code">{lot}</td>
      <td className="px-4 py-3 text-sm text-text-primary font-data text-right">{stock}</td>
      <td className="px-4 py-3 text-sm text-text-secondary font-data text-right">{exp}</td>
      <td className="px-4 py-3 text-sm text-text-primary font-data text-right">{value}</td>
      <td className="px-4 py-3">
        <span className={`badge-status ${variant === 'neutral' ? 'neutral' : variant}`}>{status}</span>
      </td>
    </tr>
  )
}

function RecipeCard({ name, servings, time, cost, fc }: { name: string; servings: number; time: string; cost: string; fc: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-bg-card">
      <div className="flex h-32 items-center justify-center bg-bg-sidebar text-text-muted">
        <span className="text-xs font-code">[ foto del plato ]</span>
      </div>
      <div className="p-4">
        <p className="text-sm font-medium text-text-primary">{name}</p>
        <p className="mt-1 text-xs text-text-muted">{servings} raciones · {time} · FC: <span className="text-text-secondary">Aprobada</span></p>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-lg font-data text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>{cost}</p>
            <p className="text-xs text-text-muted">coste · ración</p>
          </div>
          <p className="font-data text-text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>{fc}</p>
        </div>
      </div>
    </div>
  )
}

// Unused import guard (next/image not strictly required here — placeholder block)
void ArrowRight
