'use client';

import { useState } from 'react';
import { use } from 'react';
import { Search, Package, ArrowRight, Tag, Calendar, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useTraceLot } from '@/features/compliance/hooks/use-labels';
import { LABEL_TYPE_LABELS } from '@/features/compliance/types';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-bg-sidebar border-b border-border">
        <h3 className="text-sm font-semibold text-text-secondary">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MovementRow({ type, quantity, notes, date }: { type: string; quantity: number; notes: string | null; date: string }) {
  const typeLabel: Record<string, string> = {
    reception: 'Recepción', consumption: 'Consumo', waste: 'Merma',
    reservation: 'Reserva', adjustment: 'Ajuste', transfer: 'Transferencia',
  };
  const typeColor: Record<string, string> = {
    reception: 'text-success bg-bg-card',
    consumption: 'text-info bg-bg-card',
    waste: 'text-danger bg-bg-card',
    reservation: 'text-purple-700 bg-purple-50',
    adjustment: 'text-warning bg-bg-card',
    transfer: 'text-text-secondary bg-bg-hover',
  };
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor[type] ?? 'text-text-secondary bg-bg-hover'}`}>
        {typeLabel[type] ?? type}
      </span>
      <span className="font-mono text-sm text-text-secondary">{quantity > 0 ? `+${quantity}` : quantity}</span>
      {notes && <span className="text-xs text-text-muted">{notes}</span>}
      <span className="ml-auto text-xs text-text-muted">
        {new Date(date).toLocaleString('es-ES', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
      </span>
    </div>
  );
}

export default function TraceLotPage({ params }: { params: Promise<{ lot_id: string }> }) {
  const { lot_id } = use(params);

  const [searchInput, setSearchInput] = useState('');
  const [activeLotId, setActiveLotId] = useState<string | null>(
    lot_id !== 'search' ? lot_id : null
  );

  const { data: chain, isLoading, error } = useTraceLot(activeLotId);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchInput.trim()) setActiveLotId(searchInput.trim());
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-text-primary">Trazabilidad de lote</h1>
        <p className="text-sm text-text-muted mt-0.5">Recall completo: origen, movimientos, reservas y etiquetas</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="ID de lote o código de etiqueta…"
          className="flex-1 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-xl text-sm hover:bg-bg-card"
        >
          <Search className="h-4 w-4" />
          Trazar
        </button>
      </form>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-bg-hover rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-bg-card border border-danger/40 rounded-xl p-4 text-danger text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          No se encontró el lote. Verifica el ID e inténtalo de nuevo.
        </div>
      )}

      {/* Result */}
      {chain && (
        <div className="space-y-4">
          {/* Lot summary */}
          <div className="bg-accent text-white rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-5 w-5 text-text-muted" />
                  <span className="text-xs text-text-muted uppercase tracking-wide">Lote</span>
                </div>
                <h2 className="text-lg font-semibold">{chain.lot.product_name}</h2>
                {chain.lot.category && <p className="text-sm text-text-muted">{chain.lot.category}</p>}
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">{chain.lot.quantity} <span className="text-sm font-normal text-text-muted">{chain.lot.unit}</span></div>
                <div className="text-xs text-text-muted">Coste: {chain.lot.unit_cost} €/{chain.lot.unit}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-3 text-xs text-text-muted">
              <div>
                <div className="text-text-muted font-medium">Creado</div>
                {new Date(chain.lot.created_at).toLocaleDateString('es-ES')}
              </div>
              <div>
                <div className="text-text-muted font-medium">Caducidad</div>
                {chain.lot.expiry_date
                  ? new Date(chain.lot.expiry_date).toLocaleDateString('es-ES')
                  : 'Sin caducidad'}
              </div>
              <div>
                <div className="text-text-muted font-medium">Ubicación</div>
                {chain.lot.location ?? 'No especificada'}
              </div>
            </div>
          </div>

          {/* Flow indicators */}
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="px-2 py-1 bg-bg-card border border-success/40 rounded text-success">
              {chain.movements.filter(m => m.type === 'reception').length} recepción{chain.movements.filter(m => m.type === 'reception').length !== 1 ? 'es' : ''}
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-1 bg-purple-50 border border-purple-200 rounded text-purple-700">
              {chain.reservations.length} reserva{chain.reservations.length !== 1 ? 's' : ''}
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-1 bg-bg-card border border-info/40 rounded text-info">
              {chain.movements.filter(m => m.type === 'consumption').length} consumo{chain.movements.filter(m => m.type === 'consumption').length !== 1 ? 's' : ''}
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-1 bg-bg-hover border border-border rounded text-text-secondary">
              {chain.labels.length} etiqueta{chain.labels.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Movements */}
          {chain.movements.length > 0 && (
            <SectionCard title={`Movimientos (${chain.movements.length})`}>
              <div>
                {chain.movements.map(m => (
                  <MovementRow
                    key={m.id}
                    type={m.type}
                    quantity={m.quantity}
                    notes={m.notes}
                    date={m.created_at}
                  />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Reservations */}
          {chain.reservations.length > 0 && (
            <SectionCard title={`Reservas por evento (${chain.reservations.length})`}>
              <div className="space-y-2">
                {chain.reservations.map(r => (
                  <div key={r.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <Calendar className="h-4 w-4 text-text-muted" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">{r.event_name}</div>
                      <div className="text-xs text-text-muted">
                        Reservado: {r.qty_reserved} · Consumido: {r.qty_consumed}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === 'consumed' ? 'bg-bg-card text-success' :
                      r.status === 'released' ? 'bg-bg-hover text-text-secondary' :
                      'bg-bg-card text-warning'
                    }`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Labels */}
          {chain.labels.length > 0 && (
            <SectionCard title={`Etiquetas generadas (${chain.labels.length})`}>
              <div className="space-y-2">
                {chain.labels.map(l => (
                  <div key={l.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <Tag className="h-4 w-4 text-text-muted" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">{l.display_name}</div>
                      <div className="font-mono text-xs text-text-muted">{l.barcode}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-text-muted">
                        {LABEL_TYPE_LABELS[l.label_type]}
                      </div>
                      <div className="text-xs text-text-muted">
                        Cad: {new Date(l.expires_at).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.is_printed ? 'bg-bg-card text-success' : 'bg-bg-hover text-text-muted'}`}>
                      {l.is_printed ? 'Impresa' : 'Sin imprimir'}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Empty state */}
          {chain.movements.length === 0 && chain.reservations.length === 0 && chain.labels.length === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">
              Lote sin movimientos, reservas ni etiquetas registradas.
            </div>
          )}
        </div>
      )}

      {/* Default empty state */}
      {!activeLotId && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-3">
          <Search className="h-10 w-10" />
          <p className="text-sm">Introduce un ID de lote para ver su trazabilidad completa</p>
          <p className="text-xs">También puedes acceder desde el detalle de un lote en Inventario</p>
        </div>
      )}

      <div className="pt-2">
        <Link href="/compliance/labels" className="text-xs text-text-muted hover:text-text-secondary">
          ← Ver todas las etiquetas
        </Link>
      </div>
    </div>
  );
}
