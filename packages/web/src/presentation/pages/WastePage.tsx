import React, { useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { Trash2, TrendingDown, Plus, AlertCircle, DollarSign, Search } from 'lucide-react';
import type { WasteReason } from '@/types';
import { AIWasteAdvisor } from '@/presentation/components/waste/AIWasteAdvisor';

export const WastePage = () => {
  const { ingredients, wasteRecords, addWasteRecord, inventory, activeOutletId } = useStore();
  const [activeTab, setActiveTab] = useState<'log' | 'dashboard'>('log');

  // Form State
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<WasteReason>('DETERIORO');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIngredients = React.useMemo(() => {
    // Only show ingredients that exist in the current outlet's inventory
    return inventory
      .filter((item) => !activeOutletId || item.outletId === activeOutletId)
      .map((item) => {
        const master = ingredients.find((ing) => ing.id === item.ingredientId);
        return {
          ...master,
          ...item,
          name: master?.name || 'Desconocido',
          unit: master?.unit || 'un',
        };
      })
      .filter((ing) => ing.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [inventory, ingredients, activeOutletId, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredientId || !quantity) return;

    const ingredient = ingredients.find((i) => i.id === selectedIngredientId);
    if (!ingredient) return;

    addWasteRecord({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      ingredientId: selectedIngredientId,
      quantity: parseFloat(quantity),
      unit: ingredient.unit,
      costAtTime: ingredient.costPerUnit || 0,
      reason,
      notes,
    });

    // Reset
    setQuantity('');
    setNotes('');
    setSelectedIngredientId('');
    setSearchTerm('');

    // Show success feedback (could be toast, but for now just clear)
  };

  // Dashboard Calculations
  const totalWasteValue = wasteRecords.reduce((acc, r) => acc + r.quantity * r.costAtTime, 0);
  const wasteByReason = wasteRecords.reduce(
    (acc, r) => {
      acc[r.reason] = (acc[r.reason] || 0) + r.quantity * r.costAtTime;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-3">
            <Trash2 className="text-red-400" size={32} />
            Control de Mermas
          </h2>
          <p className="text-slate-400 mt-2">
            Gestiona y analiza las pérdidas en cocina para optimizar costes.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('log')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'log' ? 'bg-primary text-white' : 'bg-surface hover:bg-white/5'}`}
          >
            Registro Diario
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'bg-surface hover:bg-white/5'}`}
          >
            Análisis & KPIs
          </button>
        </div>
      </div>

      {activeTab === 'log' ? (
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface border border-white/5 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Plus className="text-primary" /> Nuevo Registro
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Ingredient Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Ingrediente</label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Buscar algo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary transition-colors"
                  />
                  {searchTerm && (
                    <div className="absolute z-10 w-full bg-surface border border-white/10 rounded-lg mt-1 max-h-48 overflow-y-auto shadow-xl">
                      {filteredIngredients.map((ing) => (
                        <button
                          key={ing.id}
                          type="button"
                          onClick={() => {
                            setSelectedIngredientId(ing.id);
                            setSearchTerm(ing.name);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-white/5 border-b border-white/5 last:border-0 flex justify-between"
                        >
                          <span>{ing.name}</span>
                          <span className="text-xs text-slate-500">
                            {ing.stock ?? 0} {ing.unit} disponibles
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedIngredientId && (
                  <div className="text-xs text-green-400 flex items-center gap-1">
                    Ingrediente seleccionado:{' '}
                    {ingredients.find((i) => i.id === selectedIngredientId)?.name}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Quantity */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Cantidad Perdida</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      {selectedIngredientId
                        ? ingredients.find((i) => i.id === selectedIngredientId)?.unit
                        : 'Unidad'}
                    </span>
                  </div>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Motivo</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as WasteReason)}
                    className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors text-slate-200"
                  >
                    <option value="CADUCIDAD">Caducidad</option>
                    <option value="ELABORACION">Error Elaboración</option>
                    <option value="DETERIORO">Deterioro / Mala Calidad</option>
                    <option value="EXCESO_PRODUCCION">Exceso Producción</option>
                    <option value="OTROS">Otros</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Notas Adicionales</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition-colors min-h-[100px]"
                  placeholder="Detalles sobre qué pasó..."
                />
              </div>

              <button
                type="submit"
                disabled={!selectedIngredientId || !quantity}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                Registrar Merma
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-lg bg-red-500/10 text-red-400">
                  <DollarSign size={24} />
                </div>
                <h4 className="text-slate-400 font-medium">Valor Total Perdido</h4>
              </div>
              <p className="text-3xl font-bold">{totalWasteValue.toFixed(2)} €</p>
            </div>

            <div className="bg-surface border border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-lg bg-orange-500/10 text-orange-400">
                  <AlertCircle size={24} />
                </div>
                <h4 className="text-slate-400 font-medium">Registros Totales</h4>
              </div>
              <p className="text-3xl font-bold">{wasteRecords.length}</p>
            </div>

            <div className="bg-surface border border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                  <TrendingDown size={24} />
                </div>
                <h4 className="text-slate-400 font-medium">Principal Causa</h4>
              </div>
              <p className="text-lg font-bold truncate">
                {Object.entries(wasteByReason).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
              </p>
            </div>
          </div>

          {/* AI Advisor Panel */}
          <AIWasteAdvisor />

          {/* Breakdown by Reason */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface border border-white/5 rounded-xl p-6">
              <h4 className="text-lg font-bold mb-4">Desglose por Motivo</h4>
              <div className="space-y-4">
                {Object.entries(wasteByReason).map(([reason, value]) => (
                  <div key={reason} className="group">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{reason}</span>
                      <span className="text-slate-400">{value.toFixed(2)} €</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500/50 group-hover:bg-red-500 transition-colors"
                        style={{ width: `${(value / totalWasteValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent History */}
            <div className="bg-surface border border-white/5 rounded-xl p-6">
              <h4 className="text-lg font-bold mb-4">Historial Reciente</h4>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {[...wasteRecords].reverse().map((record) => {
                  const ing = ingredients.find((i) => i.id === record.ingredientId);
                  return (
                    <div
                      key={record.id}
                      className="p-4 rounded-lg bg-background border border-white/5 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-white">{ing?.name || 'Desconocido'}</div>
                        <div className="text-xs text-slate-500 flex gap-2">
                          <span>{new Date(record.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="text-orange-400">{record.reason}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-400">
                          -{(record.quantity * record.costAtTime).toFixed(2)} €
                        </div>
                        <div className="text-xs text-slate-500">
                          {record.quantity} {record.unit}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {wasteRecords.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No hay registros aún</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
