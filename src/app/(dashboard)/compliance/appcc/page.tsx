'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, RefreshCw, ClipboardList } from 'lucide-react';
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel';
import { useAppccRecords, useCreateAppccRecord, useSeedAppccDefaults } from '@/features/compliance/hooks/use-appcc';
import {
  APPCC_CATEGORIES, APPCC_CATEGORY_LABELS,
  APPCC_RECORD_STATUSES, APPCC_STATUS_LABELS, APPCC_STATUS_COLORS,
  type AppccCategory, type AppccRecordStatus, type AppccRecord,
} from '@/features/compliance/types';

const STATUS_ICONS: Record<AppccRecordStatus, React.ReactNode> = {
  ok:        <CheckCircle2 className="h-4 w-4 text-green-600" />,
  deviation: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  corrected: <CheckCircle2 className="h-4 w-4 text-blue-600" />,
  critical:  <XCircle className="h-4 w-4 text-red-600" />,
  na:        <MinusCircle className="h-4 w-4 text-gray-400" />,
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AppccPage() {
  const { data: hotel } = useActiveHotel();
  const hotelId = hotel?.hotel_id ?? '';

  const [date, setDate] = useState(todayIso());
  const [category, setCategory] = useState<AppccCategory | undefined>(undefined);
  const [editingRecord, setEditingRecord] = useState<AppccRecord | null>(null);
  const [formState, setFormState] = useState<{
    status: AppccRecordStatus;
    value_measured: string;
    observations: string;
    corrective_action_taken: string;
  }>({ status: 'ok', value_measured: '', observations: '', corrective_action_taken: '' });

  const { data: records = [], isLoading } = useAppccRecords(hotelId, date, category);
  const createRecord = useCreateAppccRecord(hotelId);
  const seedDefaults = useSeedAppccDefaults(hotelId);

  const total     = records.length;
  const ok        = records.filter(r => r.status === 'ok').length;
  const deviations = records.filter(r => r.status === 'deviation').length;
  const critical  = records.filter(r => r.status === 'critical').length;
  const pending   = records.filter(r => !r.record_id).length;

  function openEdit(record: AppccRecord) {
    setEditingRecord(record);
    setFormState({
      status:                  record.status ?? 'ok',
      value_measured:          record.value_measured ?? '',
      observations:            record.observations ?? '',
      corrective_action_taken: record.corrective_action_taken ?? '',
    });
  }

  async function handleSave() {
    if (!editingRecord) return;
    await createRecord.mutateAsync({
      template_id:             editingRecord.template_id,
      status:                  formState.status,
      value_measured:          formState.value_measured || undefined,
      observations:            formState.observations || undefined,
      corrective_action_taken: formState.corrective_action_taken || undefined,
      record_date:             date,
    });
    setEditingRecord(null);
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Registros APPCC</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control de puntos críticos del día</p>
        </div>
        {records.length === 0 && (
          <button
            onClick={() => seedDefaults.mutate()}
            disabled={seedDefaults.isPending}
            className="flex items-center gap-2 text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${seedDefaults.isPending ? 'animate-spin' : ''}`} />
            Cargar plantillas por defecto
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(undefined)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${!category ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            Todas
          </button>
          {APPCC_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat === category ? undefined : cat)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${category === cat ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              {APPCC_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total',      value: total,     color: 'text-gray-900' },
          { label: 'Conformes',  value: ok,         color: 'text-green-600' },
          { label: 'Pendientes', value: pending,    color: 'text-gray-500' },
          { label: 'Desviaciones', value: deviations, color: 'text-yellow-600' },
          { label: 'Críticos',   value: critical,  color: 'text-red-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Records table */}
      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <ClipboardList className="h-10 w-10" />
          <p className="text-sm">No hay plantillas APPCC. Carga las plantillas por defecto.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Control</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Límite crítico</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Valor medido</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map(record => (
                <tr key={record.template_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{record.template_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{APPCC_CATEGORY_LABELS[record.category]}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-xs">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{record.critical_limit}</span>
                  </td>
                  <td className="px-4 py-3">
                    {record.record_id ? (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${APPCC_STATUS_COLORS[record.status!]}`}>
                        {STATUS_ICONS[record.status!]}
                        {APPCC_STATUS_LABELS[record.status!]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Sin registrar</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                    {record.value_measured ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(record)}
                      className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {record.record_id ? 'Editar' : 'Registrar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{editingRecord.template_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{editingRecord.control_point}</p>
              <p className="text-xs text-gray-400 mt-1">Límite: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{editingRecord.critical_limit}</span></p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                <div className="flex flex-wrap gap-2">
                  {APPCC_RECORD_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => setFormState(f => ({ ...f, status: s }))}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${formState.status === s ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                      {APPCC_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valor medido (opcional)</label>
                <input
                  type="text"
                  value={formState.value_measured}
                  onChange={e => setFormState(f => ({ ...f, value_measured: e.target.value }))}
                  placeholder="Ej: 4.2 °C"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={formState.observations}
                  onChange={e => setFormState(f => ({ ...f, observations: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
              </div>

              {(formState.status === 'deviation' || formState.status === 'corrected' || formState.status === 'critical') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Acción correctora tomada</label>
                  <textarea
                    rows={2}
                    value={formState.corrective_action_taken}
                    onChange={e => setFormState(f => ({ ...f, corrective_action_taken: e.target.value }))}
                    placeholder={editingRecord.corrective_action}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingRecord(null)}
                className="flex-1 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={createRecord.isPending}
                className="flex-1 py-2 bg-gray-900 text-white rounded-xl text-sm hover:bg-gray-800 disabled:opacity-50"
              >
                {createRecord.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
