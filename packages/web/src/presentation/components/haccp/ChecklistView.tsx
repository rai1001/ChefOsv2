import React, { useMemo } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { CheckCircle2, Circle, Clock, Calendar, CheckSquare, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/presentation/components/ui';
import type { HACCPTaskCompletion } from '@/types';

export const ChecklistView: React.FC = () => {
    const { haccpTasks, haccpTaskCompletions, completeHACCPTask, currentUser } = useStore();
    const { addToast } = useToast();

    const today = format(new Date(), 'yyyy-MM-dd');

    const tasksWithStatus = useMemo(() => {
        const activeTasks = haccpTasks.filter(t => t.isActive);

        return activeTasks.map(task => {
            const completionsToday = haccpTaskCompletions.filter(
                c => c.taskId === task.id && c.completedAt.startsWith(today)
            );

            return {
                ...task,
                isCompletedToday: completionsToday.length > 0,
                lastCompletion: haccpTaskCompletions
                    .filter(c => c.taskId === task.id)
                    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0]
            };
        });
    }, [haccpTasks, haccpTaskCompletions, today]);

    const handleToggleComplete = (taskId: string, currentStatus: boolean) => {
        if (currentStatus) {
            addToast('Esta tarea ya ha sido completada hoy', 'info');
            return;
        }

        const completion: HACCPTaskCompletion = {
            id: crypto.randomUUID(),
            taskId,
            completedAt: new Date().toISOString(),
            completedBy: currentUser?.name || 'Usuario',
            notes: 'Completado desde el panel de control'
        };

        completeHACCPTask(completion);
        addToast('Tarea completada correctamente', 'success');
    };

    const groupedTasks = {
        DAILY: tasksWithStatus.filter(t => t.frequency === 'DAILY'),
        WEEKLY: tasksWithStatus.filter(t => t.frequency === 'WEEKLY'),
        MONTHLY: tasksWithStatus.filter(t => t.frequency === 'MONTHLY'),
    };

    const stats = {
        total: tasksWithStatus.length,
        completed: tasksWithStatus.filter(t => t.isCompletedToday).length,
        pending: tasksWithStatus.filter(t => !t.isCompletedToday).length
    };

    const progressPercentage = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Progress Header */}
            <div className="premium-glass p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] -mr-48 -mt-48 transition-colors group-hover:bg-emerald-500/10" />

                <div className="relative flex flex-col lg:flex-row items-center gap-12 z-10">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                            <circle
                                cx="64" cy="64" r="58"
                                className="fill-none stroke-white/5"
                                strokeWidth="10"
                            />
                            <circle
                                cx="64" cy="64" r="58"
                                className="fill-none stroke-emerald-500 transition-all duration-1000 ease-out"
                                strokeWidth="10"
                                strokeDasharray={2 * Math.PI * 58}
                                strokeDashoffset={2 * Math.PI * 58 * (1 - progressPercentage / 100)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-white font-mono tracking-tighter">{Math.round(progressPercentage)}%</span>
                        </div>
                    </div>

                    <div className="flex-1 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-4 mb-2">
                            <CheckSquare className="text-emerald-400" size={24} />
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Status de Protocolos Diarios</h3>
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mb-4">Verificación de cumplimiento en tiempo real</p>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-md">
                            Se han detectado <span className="text-white font-black">{stats.total}</span> directivas operativas hoy.
                            {stats.pending > 0
                                ? ` Restan ${stats.pending} puntos de control crítico por verificar.`
                                : ' ¡Protocolo completado! El sistema se encuentra en estado de cumplimiento total.'}
                        </p>
                    </div>

                    <div className="flex gap-6">
                        <div className="premium-glass bg-black/40 px-8 py-6 rounded-[2rem] border border-white/5 flex flex-col items-center min-w-[140px]">
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Pendientes</span>
                            <span className="text-3xl font-black font-mono text-amber-500 tracking-tighter">{stats.pending}</span>
                        </div>
                        <div className="premium-glass bg-black/40 px-8 py-6 rounded-[2rem] border border-white/5 flex flex-col items-center min-w-[140px]">
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Ejecutadas</span>
                            <span className="text-3xl font-black font-mono text-emerald-400 tracking-tighter">{stats.completed}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Task Lists */}
            <div className="grid grid-cols-1 gap-12">
                {['DAILY', 'WEEKLY', 'MONTHLY'].map((freq) => {
                    const tasks = groupedTasks[freq as keyof typeof groupedTasks];
                    if (tasks.length === 0) return null;

                    return (
                        <div key={freq} className="space-y-8">
                            <div className="flex items-center gap-4 px-4">
                                <div className="text-emerald-500 p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    {freq === 'DAILY' ? <Clock size={16} /> : <Calendar size={16} />}
                                </div>
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">
                                    {freq === 'DAILY' ? 'Protocolos Diarios' : freq === 'WEEKLY' ? 'Protocolos Semanales' : 'Protocolos Mensuales'}
                                </h4>
                                <div className="h-px bg-white/5 flex-1" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {tasks.map(task => (
                                    <button
                                        key={task.id}
                                        onClick={() => handleToggleComplete(task.id, task.isCompletedToday)}
                                        className={`group relative flex flex-col p-8 rounded-[2.5rem] border transition-all duration-700 h-full text-left overflow-hidden ${task.isCompletedToday
                                            ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60'
                                            : 'premium-glass border-white/5 hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/10'
                                            }`}
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />

                                        <div className="flex items-start justify-between mb-6 relative z-10">
                                            <div className={`p-4 rounded-2xl border transition-all duration-700 ${task.isCompletedToday
                                                ? 'bg-emerald-500 text-white border-emerald-400'
                                                : 'bg-white/5 text-slate-600 border-white/10 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20'
                                                }`}>
                                                {task.isCompletedToday ? (
                                                    <CheckCircle2 size={24} className="animate-in zoom-in duration-500" />
                                                ) : (
                                                    <Circle size={24} />
                                                )}
                                            </div>
                                            {task.isCompletedToday && (
                                                <div className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-lg">
                                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Verificado</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 relative z-10">
                                            <h5 className={`text-lg font-black uppercase tracking-tight leading-tight mb-2 transition-all ${task.isCompletedToday ? 'text-emerald-400/50 line-through' : 'text-white group-hover:text-emerald-400'
                                                }`}>
                                                {task.name}
                                            </h5>
                                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic mb-6">
                                                {task.description || 'Sin especificacion técnica'}
                                            </p>
                                        </div>

                                        {task.lastCompletion && (
                                            <div className="mt-auto pt-6 border-t border-white/5 flex items-center gap-3 relative z-10">
                                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                                                    <CheckSquare size={12} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Última Auditoría</span>
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                        {format(new Date(task.lastCompletion.completedAt), 'HH:mm')} — {task.lastCompletion.completedBy.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {!task.isCompletedToday && (
                                            <div className="absolute top-1/2 right-8 -translate-y-1/2 text-[9px] font-black text-emerald-500 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-[0.3em] rotate-90 origin-right">
                                                Ejecutar Protocolo
                                            </div>
                                        )}

                                        {/* Decorative side accent */}
                                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 transition-all duration-500 rounded-full ${task.isCompletedToday ? 'bg-emerald-500/30' : 'bg-emerald-500/0 group-hover:bg-emerald-500/50'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {stats.total === 0 && (
                <div className="py-40 text-center premium-glass border-dashed border-2 border-white/5 rounded-[4rem] bg-white/[0.01]">
                    <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] border border-white/10 flex items-center justify-center mb-8 mx-auto relative group">
                        <div className="absolute inset-0 bg-emerald-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <ListTodo className="w-10 h-10 text-slate-700" />
                    </div>
                    <h4 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Pipeline Vacío</h4>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">
                        No se han localizado directivas programadas para el ciclo actual. El sistema se encuentra en estado pasivo.
                    </p>
                </div>
            )}
        </div>
    );
};
