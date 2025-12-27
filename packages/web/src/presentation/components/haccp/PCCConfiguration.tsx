import React, { useState } from 'react';
import { Plus, Trash2, Edit2, ThermometerSnowflake, Save } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import type { PCC, PCCType } from '@/types';

export const PCCConfiguration: React.FC = () => {
    const { pccs, addPCC, updatePCC, deletePCC } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<PCC>>({
        type: 'FRIDGE',
        isActive: true,
        minTemp: 0,
        maxTemp: 5
    });

    const resetForm = () => {
        setFormData({
            type: 'FRIDGE',
            isActive: true,
            minTemp: 0,
            maxTemp: 5,
            name: '',
            description: ''
        });
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        if (editingId) {
            updatePCC({ ...formData, id: editingId } as PCC);
        } else {
            addPCC({
                ...formData,
                id: crypto.randomUUID(),
                isActive: true
            } as PCC);
        }
        resetForm();
    };

    const handleEdit = (pcc: PCC) => {
        setFormData(pcc);
        setEditingId(pcc.id);
        setIsAdding(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Estás seguro de eliminar este punto crítico?')) {
            deletePCC(id);
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                        <ThermometerSnowflake className="text-emerald-400" size={32} /> Central de Configuración PCC
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1 ml-11">Parametrización de Puntos Críticos de Control</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black uppercase tracking-widest transition-all duration-500 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                        Añadir Nuevo Nodo
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="premium-glass p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />

                    <form onSubmit={handleSubmit} className="relative z-10">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                {editingId ? 'Modificar Registro Existente' : 'Protocolo de Nuevo Nodo'}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Identificador del PCC</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-slate-700 outline-none focus:border-emerald-500/50 transition-all font-bold"
                                    placeholder="EJ: CÁMARA FRIGORÍFICA 01"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Categoría Operativa</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as PCCType })}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500/50 transition-all font-bold appearance-none cursor-pointer"
                                >
                                    <option value="FRIDGE">NEVERA / CÁMARA</option>
                                    <option value="FREEZER">CONGELADOR</option>
                                    <option value="HOT_HOLDING">MANTENIMIENTO EN CALIENTE</option>
                                    <option value="COOLING">ABATIMIENTO</option>
                                    <option value="OTHER">ESPECIFICACIÓN ÚNICA</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Umbral Mín (°C)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.minTemp}
                                        onChange={e => setFormData({ ...formData, minTemp: parseFloat(e.target.value) })}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-emerald-400 font-mono outline-none focus:border-emerald-500/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Umbral Máx (°C)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.maxTemp}
                                        onChange={e => setFormData({ ...formData, maxTemp: parseFloat(e.target.value) })}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl font-black text-red-400 font-mono outline-none focus:border-emerald-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Localización / Notas Técnicas</label>
                                <input
                                    type="text"
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-slate-700 outline-none focus:border-emerald-500/50 transition-all font-medium"
                                    placeholder="ZONA DE PRODUCCIÓN - SECCIÓN B"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-12">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors"
                            >
                                Abortar Operación
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-3 px-10 py-4 bg-white text-black hover:bg-emerald-500 hover:text-white rounded-2xl font-black uppercase tracking-widest transition-all duration-500 shadow-xl"
                            >
                                <Save size={18} />
                                {editingId ? 'Confirmar Cambios' : 'Desplegar PCC'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
                {pccs.map((pcc) => (
                    <div key={pcc.id} className="group relative premium-glass p-8 rounded-[2.5rem] border border-white/5 hover:border-emerald-500/30 transition-all duration-500 shadow-lg overflow-hidden flex flex-col h-full">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] -mr-24 -mt-24 group-hover:bg-emerald-500/10 transition-colors" />

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all duration-500">
                                    <ThermometerSnowflake size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight leading-tight mb-1 group-hover:text-emerald-400 transition-colors">{pcc.name}</h3>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                                        {pcc.type}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                                <button
                                    onClick={() => handleEdit(pcc)}
                                    className="w-10 h-10 bg-white/5 hover:bg-emerald-500 text-slate-400 hover:text-white rounded-xl border border-white/10 flex items-center justify-center transition-all"
                                    aria-label={`Editar ${pcc.name}`}
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(pcc.id)}
                                    className="w-10 h-10 bg-white/5 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl border border-white/10 flex items-center justify-center transition-all"
                                    aria-label={`Eliminar ${pcc.name}`}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {pcc.description && (
                            <p className="text-xs text-slate-500 font-medium ml-1 leading-relaxed mb-8 flex-1">
                                {pcc.description}
                            </p>
                        )}

                        <div className="mt-auto pt-6 border-t border-white/5 flex justify-between items-center relative z-10">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Rango Operacional</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-black font-mono text-white tracking-tighter">
                                        {pcc.minTemp}° <span className="text-slate-700">~</span> {pcc.maxTemp}°C
                                    </span>
                                </div>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${pcc.isActive ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-slate-700 animate-pulse'}`} />
                        </div>

                        {/* Decorative side accent */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-emerald-500/0 group-hover:bg-emerald-500/50 transition-all duration-500 rounded-full" />
                    </div>
                ))}

                {pccs.length === 0 && !isAdding && (
                    <div className="col-span-full py-32 text-center premium-glass border-dashed border-2 border-white/5 rounded-[4rem] bg-white/[0.01]">
                        <div className="w-24 h-24 bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/10 flex items-center justify-center mb-8 mx-auto relative group">
                            <div className="absolute inset-0 bg-emerald-500/10 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
                            <ThermometerSnowflake className="w-10 h-10 text-emerald-500/30" />
                        </div>
                        <h4 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Sin Infraestructura de Control</h4>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">
                            No se han detectado nodos de control crítico en la base de datos perimetral. Inicie el despliegue de PCCs.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
