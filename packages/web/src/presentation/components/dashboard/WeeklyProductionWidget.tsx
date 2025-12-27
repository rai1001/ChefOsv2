import React, { useMemo } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChefHat, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WeeklyProductionWidget: React.FC = () => {
    const { productionTasks, events } = useStore(); // productionTasks is Record<eventId, KanbanTask[]>
    const navigate = useNavigate();
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const tasks = useMemo(() => {
        // 1. Filter and Aggregate Weekly Events
        const weekEventsFiltered = events.filter(e => {
            const d = parseISO(e.date);
            return isWithinInterval(d, { start: weekStart, end: weekEnd });
        });

        const aggregatedEventsMap = new Map<string, any>();
        weekEventsFiltered.forEach(event => {
            const key = `${event.date}_${event.name.trim().toLowerCase()}`;
            if (aggregatedEventsMap.has(key)) {
                aggregatedEventsMap.get(key).pax += event.pax;
                aggregatedEventsMap.get(key).ids.push(event.id);
            } else {
                aggregatedEventsMap.set(key, { ...event, ids: [event.id] });
            }
        });

        const allTasks: any[] = [];

        // 2. Process tasks for aggregated events
        aggregatedEventsMap.forEach(aggEvent => {
            // For each aggregated event, we might have multiple event IDs
            // We need to consolidated tasks that are the "same" across these IDs
            const consolidatedTasksMap = new Map<string, any>();

            aggEvent.ids.forEach((eventId: string) => {
                const eventTasks = productionTasks[eventId] || [];
                eventTasks.forEach(task => {
                    if (task.status !== 'done') {
                        const taskKey = `${task.recipeId || task.title}_${task.station}`;
                        if (consolidatedTasksMap.has(taskKey)) {
                            consolidatedTasksMap.get(taskKey).quantity += task.quantity;
                        } else {
                            consolidatedTasksMap.set(taskKey, {
                                ...task,
                                eventName: aggEvent.name,
                                eventDate: aggEvent.date
                            });
                        }
                    }
                });
            });

            allTasks.push(...Array.from(consolidatedTasksMap.values()));
        });

        return allTasks.sort((a, b) => {
            const dateA = a.assignedDate || a.eventDate;
            const dateB = b.assignedDate || b.eventDate;
            return new Date(dateA).getTime() - new Date(dateB).getTime();
        });
    }, [productionTasks, events, weekStart, weekEnd]);

    return (
        <div className="premium-glass p-0 flex flex-col h-full fade-in-up" style={{ animationDelay: '500ms' }}>
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="font-bold flex items-center gap-2 text-slate-100 uppercase tracking-tighter text-sm">
                    <ChefHat className="w-5 h-5 text-primary animate-glow" />
                    Producción Semanal
                </h3>
                <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-1 rounded-md border border-primary/20">
                    {tasks.length} TAREAS
                </span>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-2">
                {tasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                        <CheckCircle className="w-8 h-8 opacity-20" />
                        <p className="text-sm">Producción al día</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tasks.map((task, i) => (
                            <div
                                key={task.id}
                                className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/30 hover:bg-white/[0.05] transition-all duration-300 group relative overflow-hidden"
                                style={{ animationDelay: `${600 + (i * 50)}ms` }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-semibold text-slate-100 line-clamp-1 group-hover:text-primary transition-colors">{task.title}</div>
                                    <div className="text-[9px] uppercase font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                        {task.station || 'General'}
                                    </div>
                                </div>

                                <div className="text-[11px] text-slate-400 flex justify-between items-center">
                                    <span className="font-medium text-slate-300">{task.quantity} {task.unit}</span>
                                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <Clock className="w-3 h-3 text-primary" />
                                        <span className="font-mono">
                                            {format(parseISO(task.assignedDate || task.eventDate), 'EEE d', { locale: es })}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate mt-2 font-medium">
                                    EVENTO: {task.eventName?.toUpperCase()}
                                </div>
                                <div className="absolute left-0 top-0 w-0.5 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                <button
                    onClick={() => navigate('/production')}
                    className="w-full text-center text-[11px] font-bold text-slate-400 hover:text-primary uppercase tracking-widest transition-all duration-300"
                >
                    GESTIONAR TURNOS →
                </button>
            </div>
        </div>
    );
};
