'use client';

import { useState } from 'react';
import { Thermometer, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { useActiveHotel } from '@/features/identity/hooks/use-active-hotel';
import { useTemperatureLogs, useLogTemperature } from '@/features/compliance/hooks/use-temperatures';
import type { TemperatureLog } from '@/features/compliance/types';

const COMMON_LOCATIONS = [
  'Cámara refrigeración 1',
  'Cámara refrigeración 2',
  'Congelador 1',
  'Abatidor',
  'Almacén seco',
  'Vitrina buffet frío',
  'Línea caliente',
];

function formatTemp(log: TemperatureLog) {
  return `${log.temperature} ${log.unit}`;
}

function TempBadge({ log }: { log: TemperatureLog }) {
  if (log.is_within_range === null)
    return <span className="text-lg font-mono font-bold text-gray-700">{formatTemp(log)}</span>;
  if (log.is_within_range)
    return (
      <span className="inline-flex items-center gap-1 text-green-700 font-mono font-bold">
        <CheckCircle2 className="h-4 w-4" /> {formatTemp(log)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-red-600 font-mono font-bold">
      <XCircle className="h-4 w-4" /> {formatTemp(log)}
    </span>
  );
}

export default function TemperaturesPage() {
  const { data: hotel } = useActiveHotel();
  const hotelId = hotel?.hotel_id ?? '';

  const now = new Date();
  const from24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [location, setLocation] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [temperature, setTemperature] = useState('');
  const [minAllowed, setMinAllowed] = useState('');
  const [maxAllowed, setMaxAllowed] = useState('');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: logs = [], isLoading } = useTemperatureLogs(
    hotelId, filterLocation || undefined, from24h, now.toISOString(),
  );
  const logTemp = useLogTemperature(hotelId);

  const outOfRange = logs.filter(l => l.is_within_range === false).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await logTemp.mutateAsync({
      location,
      temperature: parseFloat(temperature),
      min_allowed: minAllowed ? parseFloat(minAllowed) : undefined,
      max_allowed: maxAllowed ? parseFloat(maxAllowed) : undefined,
      notes: notes || undefined,
    });
    setTemperature('');
    setNotes('');
    setShowForm(false);
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Registro de temperaturas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Últimas 24 horas</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Registrar temperatura
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
          <div className="text-xs text-gray-500 mt-1">Registros (24h)</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{logs.filter(l => l.is_within_range === true).length}</div>
          <div className="text-xs text-gray-500 mt-1">En rango</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className={`text-2xl font-bold ${outOfRange > 0 ? 'text-red-600' : 'text-gray-400'}`}>{outOfRange}</div>
          <div className="text-xs text-gray-500 mt-1">Fuera de rango</div>
        </div>
      </div>

      {/* Quick log form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Nueva lectura de temperatura</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Ubicación</label>
              <input
                list="locations-list"
                value={location}
                onChange={e => setLocation(e.target.value)}
                required
                placeholder="Selecciona o escribe ubicación"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <datalist id="locations-list">
                {COMMON_LOCATIONS.map(l => <option key={l} value={l} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Temperatura (°C)</label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={e => setTemperature(e.target.value)}
                required
                placeholder="Ej: 3.5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mín. permitida</label>
                <input
                  type="number"
                  step="0.1"
                  value={minAllowed}
                  onChange={e => setMinAllowed(e.target.value)}
                  placeholder="Ej: 0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Máx. permitida</label>
                <input
                  type="number"
                  step="0.1"
                  value={maxAllowed}
                  onChange={e => setMaxAllowed(e.target.value)}
                  placeholder="Ej: 5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observaciones"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={logTemp.isPending}
              className="flex-1 py-2 bg-gray-900 text-white rounded-xl text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {logTemp.isPending ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </form>
      )}

      {/* Location filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterLocation('')}
          className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${!filterLocation ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:bg-gray-50'}`}
        >
          Todas las ubicaciones
        </button>
        {[...new Set(logs.map(l => l.location))].map(loc => (
          <button
            key={loc}
            onClick={() => setFilterLocation(loc === filterLocation ? '' : loc)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${filterLocation === loc ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            {loc}
          </button>
        ))}
      </div>

      {/* Logs table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({length: 5}).map((_,i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Thermometer className="h-10 w-10" />
          <p className="text-sm">Sin registros en las últimas 24 horas</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Hora</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ubicación</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Temperatura</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Rango</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <tr key={log.id} className={`${log.is_within_range === false ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">
                    {new Date(log.logged_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{log.location}</td>
                  <td className="px-4 py-3"><TempBadge log={log} /></td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {log.min_allowed !== null || log.max_allowed !== null
                      ? `${log.min_allowed ?? '—'} / ${log.max_allowed ?? '—'} °C`
                      : <span className="text-gray-300">Sin límites</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{log.notes ?? <span className="text-gray-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
