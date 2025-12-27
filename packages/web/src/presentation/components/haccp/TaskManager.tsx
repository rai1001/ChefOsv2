import React, { useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { Plus, Trash2, Edit2, ClipboardCheck, Save, Clock, CalendarDays, CalendarClock } from 'lucide-react';
import type { HACCPTask, HACCPTaskFrequency } from '@/types';

const frequencyOptions: { value: HACCPTaskFrequency; label: string; icon: React.ReactNode }[] = [
    { value: 'DAILY', label: 'Diario', icon: <Clock className="w-4 h-4" /> },
    { value: 'WEEKLY', label: 'Semanal', icon: <CalendarDays className="w-4 h-4" /> },
    { value: 'MONTHLY', label: 'Mensual', icon: <CalendarClock className="w-4 h-4" /> },
];

export const TaskManager: React.FC = () => {
    const { haccpTasks, addHACCPTask, updateHACCPTask, deleteHACCPTask } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<HACCPTask>>({
        frequency: 'DAILY',
        isActive: true
    });

    const resetForm = () => {
        setFormData({ frequency: 'DAILY', isActive: true, name: '', description: '' });
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        if (editingId) {
            updateHACCPTask({ ...formData, id: editingId } as HACCPTask);
        } else {
            addHACCPTask({
                ...formData,
                id: crypto.randomUUID(),
                isActive: true
            } as HACCPTask);
        }
        resetForm();
    };

    const handleEdit = (task: HACCPTask) => {
        setFormData(task);
        setEditingId(task.id);
        setIsAdding(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Eliminar esta tarea HACCP?')) {
            deleteHACCPTask(id);
        }
    };

    const groupedTasks = {
        DAILY: haccpTasks.filter(t => t.frequency === 'DAILY'),
        WEEKLY: haccpTasks.filter(t => t.frequency === 'WEEKLY'),
        MONTHLY: haccpTasks.filter(t => t.frequency === 'MONTHLY'),
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                        <ClipboardCheck className="text-emerald-400" size={32} /> Gestor de Tareas HACCP
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1 ml-11">Programación y Protocolos de Verificación</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black uppercase tracking-widest transition-all duration-500 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                        Añadir Protocolo
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
                                {editingId ? 'Refinar Protocolo Operativo' : 'Iniciación de Nueva Directiva'}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nombre Descriptivo</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-slate-700 outline-none focus:border-emerald-500/50 transition-all font-bold"
                                    placeholder="EJ: VERIFICACIÓN DE TEMPERATURAS"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Frecuencia de Auditoría</label>
                                <div className="flex gap-4">
                                    {frequencyOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, frequency: opt.value })}
                                            className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border transition-all duration-500 ${formData.frequency === opt.value
                                                ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                                                : 'bg-black/40 border-white/5 text-slate-500 hover:border-white/20'
                                                }`}
                                        >
                                            <div className={`${formData.frequency === opt.value ? 'text-white' : 'text-slate-600'}`}>
                                                {opt.icon}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Instrucciones / Notas de Campo</label>
                                <input
                                    type="text"
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-slate-700 outline-none focus:border-emerald-500/50 transition-all font-medium"
                                    placeholder="DETALLES SOBRE LOS PUNTOS DE MEDICIÓN Y CRITERIOS DE ACEPCIÓN"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-12">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-3 px-10 py-4 bg-white text-black hover:bg-emerald-500 hover:text-white rounded-2xl font-black uppercase tracking-widest transition-all duration-500 shadow-xl"
                            >
                                <Save size={18} />
                                {editingId ? 'Guardar Cambios' : 'Activar Tarea'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Task Groups */}
            <div className="grid grid-cols-1 gap-12">
                {Object.entries(groupedTasks).map(([freq, tasks]) => {
                    const freqInfo = frequencyOptions.find(o => o.value === freq);
                    return (
                        <div key={freq} className="space-y-6">
                            <div className="flex items-center gap-4 px-4">
                                <div className="text-emerald-500 p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    {freqInfo?.icon}
                                </div>
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">
                                    Directivas {freqInfo?.label}s
                                </h3>
                                <div className="h-px bg-white/5 flex-1" />
                                <span className="bg-black/40 border border-white/5 text-slate-500 font-mono text-[10px] px-3 py-1 rounded-full">
                                    {tasks.length} ACTIVAS
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {tasks.map(task => (
                                    <div key={task.id} className="group relative premium-glass p-8 rounded-[2.5rem] border border-white/5 hover:border-emerald-500/30 transition-all duration-500 shadow-lg overflow-hidden flex flex-col h-full">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />

                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/10 transition-all duration-500">
                                                    <ClipboardCheck size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{task.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Protocolo Activo</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                                                <button
                                                    onClick={() => handleEdit(task)}
                                                    className="w-9 h-9 bg-white/5 hover:bg-emerald-500 text-slate-400 hover:text-white rounded-xl border border-white/10 flex items-center justify-center transition-all"
                                                    aria-label="Editar"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(task.id)}
                                                    className="w-9 h-9 bg-white/5 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl border border-white/10 flex items-center justify-center transition-all"
                                                    aria-label="Eliminar"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {task.description && (
                                            <p className="text-[11px] text-slate-500 font-medium ml-1 leading-relaxed mb-4 flex-1">
                                                {task.description}
                                            </p>
                                        )}

                                        <div className="mt-auto flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Clock size={12} className="text-slate-700" />
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Ejecución {freqInfo?.label}</span>
                                            </div>
                                            <div className="h-px bg-white/5 flex-1 mx-4" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                                        </div>

                                        {/* Decorative side accent */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-emerald-500/0 group-hover:bg-emerald-500/50 transition-all duration-500 rounded-full" />
                                    </div>
                                ))}
                                {tasks.length === 0 && (
                                    <div className="col-span-full py-16 text-center premium-glass border-dashed border-2 border-white/5 rounded-[3rem] bg-white/[0.01]">
                                        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">Cero directivas programadas en esta categoría</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

