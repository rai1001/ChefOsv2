import React, { useState, useEffect } from 'react';
import { ChefHat, AlertCircle, CheckCircle, Play, Pause, Clock, Thermometer, Printer } from 'lucide-react';
import { printLabel } from '../printing/PrintService';
import type { KanbanTask, KanbanTaskStatus } from '@/types';
import { useStore } from '@/presentation/store/useStore';

interface ColumnProps {
    id: KanbanTaskStatus;
    title: string;
    tasks: KanbanTask[];
    color: string;
    onDrop: (taskId: string, status: KanbanTaskStatus) => void;
    onToggleTimer: (taskId: string) => void;
    staff: any[];
    onAssignEmployee: (taskId: string, employeeId: string) => void;
}

const KanbanColumn: React.FC<ColumnProps> = ({ id, title, tasks, color, onDrop, onToggleTimer, staff, onAssignEmployee }) => {
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            onDrop(taskId, id);
        }
    };

    return (
        <div
            className="flex flex-col h-full min-w-[340px] w-full bg-white/[0.02] rounded-[2rem] border border-white/5 overflow-hidden backdrop-blur-3xl animate-in fade-in slide-in-from-right-10 duration-700"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className={`p-6 border-b border-white/5 flex items-center justify-between relative overflow-hidden ${id === 'todo' ? 'bg-white/[0.01]' :
                id === 'in-progress' ? 'bg-primary/5' : 'bg-emerald-500/5'
                }`}>
                <div className="absolute left-0 top-0 w-1 h-full bg-current opacity-30" style={{ color: color.includes('primary') ? '#3b82f6' : color.includes('green') ? '#10b981' : '#94a3b8' }} />
                <h3 className={`font-black text-sm flex items-center gap-3 uppercase tracking-[0.2em] ${color}`}>
                    {id === 'todo' && <AlertCircle size={18} />}
                    {id === 'in-progress' && <ChefHat size={18} />}
                    {id === 'done' && <CheckCircle size={18} />}
                    {title}
                </h3>
                <span className="bg-black/40 px-3 py-1 rounded-lg text-[10px] font-black font-mono text-slate-500 border border-white/5 tracking-tighter">
                    {tasks.length}
                </span>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onToggleTimer={onToggleTimer}
                        staff={staff}
                        onAssignEmployee={onAssignEmployee}
                    />
                ))}
                {tasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20 group">
                        <div className="w-16 h-16 rounded-3xl border-2 border-dashed border-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            {id === 'todo' ? <AlertCircle size={24} /> : id === 'in-progress' ? <ChefHat size={24} /> : <CheckCircle size={24} />}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Queue Cleared</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const TaskCard = ({
    task,
    onToggleTimer,
    staff,
    onAssignEmployee
}: {
    task: KanbanTask,
    onToggleTimer: (id: string) => void,
    staff: any[],
    onAssignEmployee: (taskId: string, employeeId: string) => void
}) => {
    // Local state for ticking timer
    const [elapsed, setElapsed] = useState(task.totalTimeSpent || 0);

    useEffect(() => {
        setElapsed(task.totalTimeSpent || 0);
    }, [task.totalTimeSpent]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (task.timerStart) {
            interval = setInterval(() => {
                const currentSession = Math.floor((Date.now() - task.timerStart!) / 1000);
                setElapsed((task.totalTimeSpent || 0) + currentSession);
            }, 100); // More frequent update for smoother UI
        }
        return () => clearInterval(interval);
    }, [task.timerStart, task.totalTimeSpent]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className={`premium-glass p-5 rounded-3xl border transition-all duration-500 cursor-grab active:cursor-grabbing group relative overflow-hidden ${task.timerStart ? 'border-primary/50 bg-primary/5 shadow-2xl shadow-primary/20 scale-[1.02]' : 'border-white/5 hover:border-white/20 bg-white/[0.02]'
                }`}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
        >
            <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 blur-3xl -mr-12 -mt-12 group-hover:opacity-100 transition-opacity opacity-0" />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="space-y-1">
                    <h4 className="font-black text-xs text-white uppercase tracking-tight group-hover:text-primary transition-colors">{task.title}</h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{task.description}</p>
                </div>
                <div className="flex items-center gap-2">
                    {task.description.toLowerCase().includes('haccp') || task.title.toLowerCase().includes('temp') ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <Thermometer size={10} />
                            <span className="text-[7px] font-black uppercase tracking-widest">HACCP Requerido</span>
                        </div>
                    ) : null}
                    {task.shift && (
                        <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest border ${task.shift === 'MORNING' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            }`}>
                            {task.shift === 'MORNING' ? 'Day' : 'Night'}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-center mb-6 relative z-20">
                <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-xl flex flex-col">
                    <span className="text-[7px] text-slate-600 font-black uppercase tracking-widest">Capacidad</span>
                    <span className="font-mono text-xs font-black text-white">
                        {task.quantity} <span className="text-[8px] text-slate-500 font-sans">{task.unit}</span>
                    </span>
                </div>

                <select
                    value={task.assignedEmployeeId || ''}
                    onChange={(e) => onAssignEmployee(task.id, e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all focus:border-primary/50 outline-none relative z-30"
                    onClick={(e) => e.stopPropagation()}
                >
                    <option value="">👤 Unassigned</option>
                    {staff.map(emp => (
                        <option key={emp.id} value={emp.id} className="bg-slate-900">{emp.name}</option>
                    ))}
                </select>
            </div>

            {/* Timer Controls */}
            <div className={`flex items-center justify-between pt-4 border-t border-white/5 relative z-10 transition-colors ${task.timerStart ? 'border-primary/20' : ''}`}>
                <div className={`flex items-center gap-3 font-mono text-sm font-black ${task.timerStart ? 'text-primary animate-pulse' : 'text-slate-500'}`}>
                    <div className={`p-1.5 rounded-lg ${task.timerStart ? 'bg-primary/20' : 'bg-white/5'}`}>
                        <Clock size={12} className={task.timerStart ? 'animate-spin-slow' : ''} />
                    </div>
                    {formatTime(elapsed)}
                </div>
                {task.status !== 'done' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleTimer(task.id); }}
                        className={`p-3 rounded-2xl transition-all duration-500 flex items-center gap-2 group/btn relative z-30 ${task.timerStart
                            ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20'
                            : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                            }`}
                    >
                        {task.timerStart ? (
                            <>
                                <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover:block">Interrumpir</span>
                                <Pause size={14} fill="currentColor" />
                            </>
                        ) : (
                            <>
                                <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover:block">Iniciar</span>
                                <Play size={14} fill="currentColor" />
                            </>
                        )}
                    </button>
                )}
                {task.status === 'done' && (
                    <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl border border-emerald-500/20">
                        <CheckCircle size={14} />
                    </div>
                )}
                {/* Print Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        printLabel({
                            title: task.title,
                            date: new Date(),
                            type: 'PREP',
                            quantity: `${task.quantity} ${task.unit}`,
                            batchNumber: `TASK-${task.id.slice(-6)}`
                        });
                    }}
                    className="p-3 ml-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
                    title="Imprimir Etiqueta"
                >
                    <Printer size={14} />
                </button>
            </div>

            {/* Progress Bar for Active Tasks */}
            {task.timerStart && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                    <div className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-shimmer" style={{ width: '100%' }} />
                </div>
            )}
        </div>
    );
};

interface ProductionKanbanBoardProps {
    tasks: KanbanTask[];
    onTaskStatusChange: (taskId: string, newStatus: KanbanTaskStatus) => void;
}

export const ProductionKanbanBoard: React.FC<ProductionKanbanBoardProps> = ({ tasks, onTaskStatusChange }) => {
    const { toggleTaskTimer, selectedProductionEventId, staff, updateTaskSchedule } = useStore();

    const handleUpdateStatus = (taskId: string, status: KanbanTaskStatus) => {
        onTaskStatusChange(taskId, status);
    };

    const handleToggleTimer = (taskId: string) => {
        if (selectedProductionEventId) {
            toggleTaskTimer(selectedProductionEventId, taskId);
        }
    };

    const handleAssignEmployee = (taskId: string, employeeId: string) => {
        if (selectedProductionEventId) {
            updateTaskSchedule(selectedProductionEventId, taskId, { assignedEmployeeId: employeeId });
        }
    };

    return (
        <div className="h-full flex flex-col space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Production Kanban</h2>
                    <div className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Real-time Ops Flow
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Timers</span>
                        <span className="font-mono text-white font-black">{tasks.filter(t => t.timerStart).length}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-8 overflow-x-auto pb-6 pl-1 custom-scrollbar scroll-smooth">
                <KanbanColumn
                    id="todo"
                    title="En Espera"
                    tasks={tasks.filter(t => t.status === 'todo')}
                    color="text-slate-400"
                    onDrop={handleUpdateStatus}
                    onToggleTimer={handleToggleTimer}
                    staff={staff}
                    onAssignEmployee={handleAssignEmployee}
                />
                <KanbanColumn
                    id="in-progress"
                    title="Despliegue"
                    tasks={tasks.filter(t => t.status === 'in-progress')}
                    color="text-primary"
                    onDrop={handleUpdateStatus}
                    onToggleTimer={handleToggleTimer}
                    staff={staff}
                    onAssignEmployee={handleAssignEmployee}
                />
                <KanbanColumn
                    id="done"
                    title="Auditado"
                    tasks={tasks.filter(t => t.status === 'done')}
                    color="text-emerald-400"
                    onDrop={handleUpdateStatus}
                    onToggleTimer={handleToggleTimer}
                    staff={staff}
                    onAssignEmployee={handleAssignEmployee}
                />
            </div>
        </div>
    );
};

