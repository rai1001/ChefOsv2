'use client';

import { useState } from 'react';
import { Tag, Clock, Printer, Plus, AlertTriangle } from 'lucide-react';
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel';
import { useLabels, useCreateLabel, usePrintLabel } from '@/features/compliance/hooks/use-labels';
import {
  LABEL_TYPES, LABEL_TYPE_LABELS,
  TREATMENT_TYPES, TREATMENT_LABELS,
  type LabelType, type TreatmentType,
} from '@/features/compliance/types';

function expiryBadge(hours: number) {
  if (hours < 0)  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-danger">Caducado</span>;
  if (hours < 24) return <span className="text-xs px-2 py-0.5 rounded-full bg-bg-card text-danger">{Math.round(hours)}h</span>;
  if (hours < 72) return <span className="text-xs px-2 py-0.5 rounded-full bg-bg-card text-warning">{Math.round(hours)}h</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-bg-hover text-text-secondary">{Math.round(hours / 24)}d</span>;
}

function addHours(h: number): string {
  return new Date(Date.now() + h * 3600 * 1000).toISOString();
}

const EXPIRY_PRESETS: { label: string; hours: number }[] = [
  { label: '24 h',  hours: 24 },
  { label: '48 h',  hours: 48 },
  { label: '72 h',  hours: 72 },
  { label: '5 días', hours: 120 },
  { label: '7 días', hours: 168 },
];

export default function LabelsPage() {
  const { data: hotel } = useActiveHotel();
  const hotelId = hotel?.hotel_id ?? '';

  const [showForm, setShowForm] = useState(false);
  const [labelType, setLabelType] = useState<LabelType>('preparacion');
  const [treatment, setTreatment] = useState<TreatmentType>('none');
  const [nameFree, setNameFree] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('kg');
  const [location, setLocation] = useState('');
  const [expiresAt, setExpiresAt] = useState(addHours(72).slice(0, 16)); // datetime-local
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);

  const { data: labels = [], isLoading } = useLabels(hotelId);
  const createLabel = useCreateLabel(hotelId);
  const printLabel = usePrintLabel(hotelId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const result = await createLabel.mutateAsync({
      label_type:  labelType,
      expires_at:  new Date(expiresAt).toISOString(),
      quantity:    parseFloat(quantity),
      unit,
      treatment,
      name_free:   nameFree || undefined,
      location:    location || undefined,
      origin:      'manual',
    });
    setLastBarcode(result.barcode);
    setNameFree('');
    setShowForm(false);
  }

  const expiringSoon = labels.filter(l => l.hours_to_expiry < 24 && l.hours_to_expiry >= 0).length;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary">Etiquetado</h1>
          <p className="text-sm text-text-muted mt-0.5">Etiquetas de preparaciones, productos y trazabilidad</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-md text-sm hover:bg-accent-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva etiqueta
        </button>
      </div>

      {/* Last barcode generated */}
      {lastBarcode && (
        <div className="bg-bg-card border border-info/40 rounded-md p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-info mb-1">Etiqueta generada</div>
            <div className="font-mono text-sm font-bold text-blue-900">{lastBarcode}</div>
          </div>
          <button onClick={() => setLastBarcode(null)} className="text-blue-500 hover:text-info text-sm">✕</button>
        </div>
      )}

      {/* Alert expiring soon */}
      {expiringSoon > 0 && (
        <div className="flex items-center gap-2 bg-bg-card border border-danger/40 rounded-md px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4" />
          <strong>{expiringSoon}</strong> etiqueta{expiringSoon > 1 ? 's' : ''} caducan en menos de 24h
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-bg-card border border-border rounded-md p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Nueva etiqueta</h2>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {LABEL_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLabelType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${labelType === t ? 'bg-accent text-white border-accent' : 'border-border hover:bg-bg-sidebar'}`}
                >
                  {LABEL_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Nombre del producto / preparación</label>
              <input
                type="text"
                value={nameFree}
                onChange={e => setNameFree(e.target.value)}
                placeholder="Ej: Salsa romesco"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Quantity + unit */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Cantidad</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Unidad</label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="kg / L / uds"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Treatment */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">Tratamiento</label>
              <div className="flex flex-wrap gap-2">
                {TREATMENT_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTreatment(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${treatment === t ? 'bg-accent text-white border-accent' : 'border-border hover:bg-bg-sidebar'}`}
                  >
                    {TREATMENT_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Fecha caducidad</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {EXPIRY_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setExpiresAt(addHours(p.hours).slice(0, 16))}
                    className="text-xs px-2 py-0.5 border border-border rounded hover:bg-bg-sidebar"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Ubicación (opcional)</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Ej: Cámara 2"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-border rounded-md text-sm hover:bg-bg-sidebar">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createLabel.isPending}
              className="flex-1 py-2 bg-accent text-white rounded-md text-sm hover:bg-accent-hover disabled:opacity-50"
            >
              {createLabel.isPending ? 'Generando…' : 'Crear etiqueta'}
            </button>
          </div>
        </form>
      )}

      {/* Labels table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({length: 5}).map((_,i) => <div key={i} className="h-10 skeleton" />)}</div>
      ) : labels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-3">
          <Tag className="h-10 w-10" />
          <p className="text-sm">Sin etiquetas creadas esta semana</p>
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-sidebar border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Producto</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Código</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Cant.</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">
                  <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Caduca</div>
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {labels.map(label => (
                <tr key={label.id} className={`hover:bg-bg-sidebar transition-colors ${label.hours_to_expiry < 24 ? 'bg-bg-card/40' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">{label.display_name}</div>
                    {label.location && <div className="text-xs text-text-muted">{label.location}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{label.barcode}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-bg-hover text-text-secondary">
                      {LABEL_TYPE_LABELS[label.label_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{label.quantity} {label.unit}</td>
                  <td className="px-4 py-3">{expiryBadge(label.hours_to_expiry)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => printLabel.mutate(label.id)}
                      disabled={printLabel.isPending || label.is_printed}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg transition-colors ${
                        label.is_printed
                          ? 'border-border text-text-muted cursor-default'
                          : 'border-border hover:bg-bg-sidebar'
                      }`}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {label.is_printed ? 'Impresa' : 'Imprimir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
