'use client';

import { useState } from 'react';
import { use } from 'react';
import { Search, Package, ArrowRight, Tag, Calendar, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useTraceLot } from '@/features/compliance/hooks/use-labels';
import { LABEL_TYPE_LABELS } from '@/features/compliance/types';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
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
    reception: 'text-green-700 bg-green-50',
    consumption: 'text-blue-700 bg-blue-50',
    waste: 'text-red-700 bg-red-50',
    reservation: 'text-purple-700 bg-purple-50',
    adjustment: 'text-yellow-700 bg-yellow-50',
    transfer: 'text-gray-700 bg-gray-100',
  };
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className={`text-xs px-2 py-0.5 rounded-full ${typeColor[type] ?? 'text-gray-600 bg-gray-100'}`}>
        {typeLabel[type] ?? type}
      </span>
      <span className="font-mono text-sm text-gray-700">{quantity > 0 ? `+${quantity}` : quantity}</span>
      {notes && <span className="text-xs text-gray-500">{notes}</span>}
      <span className="ml-auto text-xs text-gray-400">
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
        <h1 className="text-xl font-semibold text-gray-900">Trazabilidad de lote</h1>
        <p className="text-sm text-gray-500 mt-0.5">Recall completo: origen, movimientos, reservas y etiquetas</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="ID de lote o código de etiqueta…"
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          type="submit"
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-800"
        >
          <Search className="h-4 w-4" />
          Trazar
        </button>
      </form>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          No se encontró el lote. Verifica el ID e inténtalo de nuevo.
        </div>
      )}

      {/* Result */}
      {chain && (
        <div className="space-y-4">
          {/* Lot summary */}
          <div className="bg-gray-900 text-white rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-5 w-5 text-gray-300" />
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Lote</span>
                </div>
                <h2 className="text-lg font-semibold">{chain.lot.product_name}</h2>
                {chain.lot.category && <p className="text-sm text-gray-400">{chain.lot.category}</p>}
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">{chain.lot.quantity} <span className="text-sm font-normal text-gray-400">{chain.lot.unit}</span></div>
                <div className="text-xs text-gray-400">Coste: {chain.lot.unit_cost} €/{chain.lot.unit}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-3 gap-3 text-xs text-gray-400">
              <div>
                <div className="text-gray-300 font-medium">Creado</div>
                {new Date(chain.lot.created_at).toLocaleDateString('es-ES')}
              </div>
              <div>
                <div className="text-gray-300 font-medium">Caducidad</div>
                {chain.lot.expiry_date
                  ? new Date(chain.lot.expiry_date).toLocaleDateString('es-ES')
                  : 'Sin caducidad'}
              </div>
              <div>
                <div className="text-gray-300 font-medium">Ubicación</div>
                {chain.lot.location ?? 'No especificada'}
              </div>
            </div>
          </div>

          {/* Flow indicators */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 bg-green-50 border border-green-200 rounded text-green-700">
              {chain.movements.filter(m => m.type === 'reception').length} recepción{chain.movements.filter(m => m.type === 'reception').length !== 1 ? 'es' : ''}
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-1 bg-purple-50 border border-purple-200 rounded text-purple-700">
              {chain.reservations.length} reserva{chain.reservations.length !== 1 ? 's' : ''}
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-blue-700">
              {chain.movements.filter(m => m.type === 'consumption').length} consumo{chain.movements.filter(m => m.type === 'consumption').length !== 1 ? 's' : ''}
            </span>
            <ArrowRight className="h-3 w-3" />
            <span className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600">
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
                  <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{r.event_name}</div>
                      <div className="text-xs text-gray-500">
                        Reservado: {r.qty_reserved} · Consumido: {r.qty_consumed}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === 'consumed' ? 'bg-green-50 text-green-700' :
                      r.status === 'released' ? 'bg-gray-100 text-gray-600' :
                      'bg-yellow-50 text-yellow-700'
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
                  <div key={l.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{l.display_name}</div>
                      <div className="font-mono text-xs text-gray-500">{l.barcode}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {LABEL_TYPE_LABELS[l.label_type]}
                      </div>
                      <div className="text-xs text-gray-400">
                        Cad: {new Date(l.expires_at).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.is_printed ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {l.is_printed ? 'Impresa' : 'Sin imprimir'}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Empty state */}
          {chain.movements.length === 0 && chain.reservations.length === 0 && chain.labels.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Lote sin movimientos, reservas ni etiquetas registradas.
            </div>
          )}
        </div>
      )}

      {/* Default empty state */}
      {!activeLotId && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Search className="h-10 w-10" />
          <p className="text-sm">Introduce un ID de lote para ver su trazabilidad completa</p>
          <p className="text-xs">También puedes acceder desde el detalle de un lote en Inventario</p>
        </div>
      )}

      <div className="pt-2">
        <Link href="/compliance/labels" className="text-xs text-gray-400 hover:text-gray-600">
          ← Ver todas las etiquetas
        </Link>
      </div>
    </div>
  );
}
