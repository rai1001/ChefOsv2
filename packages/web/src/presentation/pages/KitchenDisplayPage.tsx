import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/presentation/store/useStore';
import { Check, Clock, ChefHat, ArrowLeft, LayoutDashboard, Timer, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const KitchenDisplayPage: React.FC = () => {
    const { events, productionTasks: storeProductionTasks, updateTaskStatus, activeOutletId } = useStore();
    const navigate = useNavigate();
    const [selectedStation, setSelectedStation] = useState<'all' | 'hot' | 'cold' | 'dessert'>('all');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every minute
    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Shift Logic
    const currentShift = useMemo(() => {
        const hour = currentTime.getHours();
        if (hour >= 6 && hour < 14) return 'MORNING';
        if (hour >= 14 && hour < 22) return 'AFTERNOON';
        return 'NIGHT';
    }, [currentTime]);

    const shiftLabel = {
        'MORNING': 'Turno Mañana',
        'AFTERNOON': 'Turno Tarde',
        'NIGHT': 'Turno Noche'
    }[currentShift];

    const todayStr = format(currentTime, 'yyyy-MM-dd');

    // Filtered & Aggregated Tasks
    const kdsTasks = useMemo(() => {
        const taskMap = new Map<string, any>();

        // Flatten tasks from all events
        Object.keys(storeProductionTasks).forEach(eventId => {
            const eventTasks = storeProductionTasks[eventId] || [];
            const event = events.find(e => e.id === eventId);

            eventTasks.forEach(task => {
                // Filter by outlet if needed
                if (activeOutletId && task.outletId !== activeOutletId) return;

                // Station filter
                if (selectedStation !== 'all' && task.station !== selectedStation) return;

                // Priority Filtering: Same day and shift
                const isToday = task.assignedDate === todayStr;
                const isSameShift = task.shift === currentShift;

                // Also include tasks from events happening today if not explicitly assigned
                const isEventToday = event?.date === todayStr;

                if ((isToday && isSameShift) || (isEventToday && !task.shift)) {
                    // Aggregation Key: EventName + Date + TaskTitle + Station
                    // We normalize event name to group "Boda A" and "Boda a" if desired, or keep strict.
                    // User wanted grouping by name.
                    const eventName = event?.name?.trim() || 'General';
                    const eventDate = event?.date || todayStr;
                    const key = `${eventDate}_${eventName.toLowerCase()}_${task.title}_${task.station}`;

                    if (taskMap.has(key)) {
                        const existing = taskMap.get(key);
                        existing.quantity += task.quantity;
                        existing.references.push({ eventId, taskId: task.id });
                        // If any is todo, the aggregate is todo (unless all are done? KDS usually shows todo/done)
                        // If mixed status, what to show? 
                        // Simplicity: If ANY is not done, show as todo. If ALL are done, show as done.
                        if (task.status !== 'done') existing.status = 'todo';
                    } else {
                        taskMap.set(key, {
                            ...task,
                            id: `agg_${eventId}_${task.id}`, // specific ID doesnt matter for display, just unique key
                            eventName,
                            eventPax: event?.pax || 0,
                            references: [{ eventId, taskId: task.id }],
                            // If base task is 'todo', aggregate is 'todo'.
                        });
                    }
                }
            });
        });

        const allTasks = Array.from(taskMap.values());

        return allTasks.sort((a, b) => {
            // Priority to incomplete "todo" -> "in-progress" -> "done"
            const statusOrder: Record<string, number> = { 'todo': 0, 'in-progress': 1, 'done': 2 };
            const statusA = a.status as keyof typeof statusOrder;
            const statusB = b.status as keyof typeof statusOrder;
            return (statusOrder[statusA] || 0) - (statusOrder[statusB] || 0);
        });
    }, [storeProductionTasks, activeOutletId, selectedStation, todayStr, currentShift, events]);

    const completedCount = kdsTasks.filter(t => t.status === 'done').length;
    const progress = kdsTasks.length > 0 ? (completedCount / kdsTasks.length) * 100 : 0;

    const handleToggleComplete = async (task: any) => {
        // Toggle based on current aggregate status
        const newStatus = task.status === 'done' ? 'todo' : 'done';

        // Update ALL referenced real tasks
        // We can do this in parallel
        await Promise.all(task.references.map((ref: any) =>
            updateTaskStatus(ref.eventId, ref.taskId, newStatus)
        ));
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
            {/* Header - optimized for touch & premium aesthetics */}
            <div className="flex items-center justify-between p-8 bg-black/40 border-b border-white/5 backdrop-blur-3xl relative overflow-hidden flex-none">
                <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full -left-20 -top-20 opacity-50" />

                <div className="flex items-center gap-10 relative z-10">
                    <button
                        onClick={() => navigate('/production')}
                        className="p-5 bg-white/5 rounded-[1.5rem] border border-white/10 active:scale-95 transition-all shadow-2xl hover:bg-white/10"
                    >
                        <ArrowLeft size={32} className="text-primary" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <h1 className="text-4xl font-black uppercase tracking-tighter">Kitchen Display</h1>
                        </div>
                        <p className="text-xl text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center gap-3">
                            {format(currentTime, 'EEEE, dd MMMM', { locale: es })}
                            <span className="text-slate-800">|</span>
                            <span className="text-primary/80 flex items-center gap-2">
                                <Timer size={18} /> {format(currentTime, 'HH:mm')}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3 relative z-10">
                    <div className="flex gap-4">
                        {(['all', 'hot', 'cold', 'dessert'] as const).map(station => (
                            <button
                                key={station}
                                onClick={() => setSelectedStation(station)}
                                className={`px-10 py-5 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] transition-all border ${selectedStation === station
                                    ? 'bg-primary border-primary text-white shadow-2xl shadow-primary/40 scale-[1.05]'
                                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                {station === 'all' ? 'Todas' :
                                    station === 'hot' ? 'Caliente' :
                                        station === 'cold' ? 'Frío' : 'Postres'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 w-full max-w-md">
                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-[100px] text-right">
                            {shiftLabel} · {completedCount}/{kdsTasks.length} Done
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content - Improved Grid */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]">
                {kdsTasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 scale-125">
                        <LayoutDashboard size={120} className="mb-8" />
                        <h2 className="text-4xl font-black uppercase tracking-widest">Pipeline Limpio</h2>
                        <p className="text-xl font-bold uppercase tracking-[0.3em] mt-4">No hay tareas pendientes en este turno</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                        {kdsTasks.map(task => {
                            const isCompleted = task.status === 'done';

                            return (
                                <div
                                    key={task.id}
                                    className={`flex flex-col h-full rounded-[2.5rem] border-2 transition-all duration-500 relative overflow-hidden group/card ${isCompleted
                                        ? 'bg-emerald-950/20 border-emerald-500/30 opacity-60'
                                        : 'premium-glass border-white/5 hover:border-white/20'
                                        }`}
                                >
                                    {/* Glass reflection */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                                    {/* Ticket Header */}
                                    <div className={`p-8 border-b relative z-10 ${isCompleted ? 'border-emerald-500/20' : 'border-white/5'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-inner ${task.station === 'hot' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                task.station === 'cold' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    'bg-pink-500/10 text-pink-400 border-pink-500/20'
                                                }`}>
                                                {task.station}
                                            </span>
                                            <div className="flex items-center gap-2 text-slate-500 font-mono text-xl font-black">
                                                <Clock size={20} className="text-primary/50" />
                                                <span>{task.estimatedTime ? `${task.estimatedTime}'` : '--'}</span>
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-black leading-none mb-3 uppercase tracking-tighter group-hover/card:text-primary transition-colors">
                                            {task.title}
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            <div className="px-3 py-1 bg-black/40 rounded-lg border border-white/5">
                                                <span className="text-[14px] font-black font-mono text-white">x{task.quantity}</span>
                                                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest ml-1">{task.unit}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest truncate">
                                                {task.eventName}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description / Instructions */}
                                    <div className="flex-1 p-8 relative z-10">
                                        <div className="flex items-center gap-2 mb-4 text-primary/40">
                                            <Activity size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Instrucciones</span>
                                        </div>
                                        <p className="text-lg text-slate-300 font-medium leading-relaxed italic">
                                            {task.description || 'Procedimiento estándar según ficha técnica.'}
                                        </p>
                                    </div>

                                    {/* Action Button - Massive touch target */}
                                    <div className="p-4 relative z-20">
                                        <button
                                            onClick={() => handleToggleComplete(task)}
                                            className={`w-full py-8 rounded-[1.8rem] text-xl font-black uppercase tracking-[0.15em] flex items-center justify-center gap-5 transition-all active:scale-[0.9] border-2 ${isCompleted
                                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                                                : 'bg-primary border-primary/50 text-white shadow-[0_15px_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] hover:shadow-primary/50'
                                                }`}
                                        >
                                            {isCompleted ? (
                                                <>
                                                    <Check size={36} strokeWidth={3} />
                                                    <span>Revertir</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ChefHat size={36} strokeWidth={3} />
                                                    <span>Hecho</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Background numbers for industrial aesthetics */}
                                    <div className="absolute -right-2 top-10 opacity-[0.02] text-9xl font-black text-white pointer-events-none select-none italic">
                                        #{task.id.slice(-2)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

