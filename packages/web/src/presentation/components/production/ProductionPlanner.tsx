import React, { useState } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { CalendarDays, ArrowRight, ArrowLeft, Plus, X, Trash2 } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import type { KanbanTask, ShiftType } from '@/types';

interface PlannerProps {
    tasks: KanbanTask[];
    eventId: string;
}

export const ProductionPlanner: React.FC<PlannerProps> = ({ tasks, eventId }) => {
    const { updateTaskSchedule, addProductionTask, deleteProductionTask } = useStore();
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const handlePreviousWeek = () => setWeekStart(prev => addDays(prev, -7));
    const handleNextWeek = () => setWeekStart(prev => addDays(prev, 7));

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDrop = (e: React.DragEvent, date: string, shift: ShiftType) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            updateTaskSchedule(eventId, taskId, { assignedDate: date, shift });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        const newTask: import('@/types').KanbanTask = {
            id: crypto.randomUUID(),
            title: newTaskTitle,
            quantity: 1,
            unit: 'serv',
            description: 'Tarea manual',
            status: 'todo',
            eventId
        };

        addProductionTask(eventId, newTask);
        setNewTaskTitle('');
        setIsNewTaskModalOpen(false);
    };

    const getTasksForSlot = (date: string, shift: ShiftType) => {
        return tasks.filter(t => t.assignedDate === date && t.shift === shift);
    };

    const unassignedTasks = tasks.filter(t => !t.assignedDate || !t.shift);

    return (
        <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex justify-between items-center premium-glass border border-white/5 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 blur-3xl -z-10" />
                <div>
                    <h3 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                        <CalendarDays className="text-primary animate-glow" size={28} /> Despliegue Semanal
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1 ml-11">Orquestación de Procesos</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner relative z-10">
                        <button onClick={handlePreviousWeek} className="p-3 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition-all duration-300 relative z-20">
                            <ArrowLeft size={18} />
                        </button>
                        <span className="text-[11px] font-black text-white uppercase tracking-[0.15em] px-4 min-w-[200px] text-center">
                            {format(weekStart, 'dd MMM')} <span className="text-slate-600 mx-2">—</span> {format(addDays(weekStart, 6), 'dd MMM')}
                        </span>
                        <button onClick={handleNextWeek} className="p-3 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition-all duration-300 relative z-20">
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-10 h-auto xl:h-[750px] overflow-hidden">
                {/* Unassigned Tasks (Sidebar) */}
                <div className="w-full xl:w-80 flex flex-col premium-glass border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl flex-none h-[400px] xl:h-auto group/sidebar">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
                        <div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Backlog Operativo</span>
                            <div className="flex items-center gap-3 mt-1">
                                <h4 className="font-black text-white text-sm uppercase tracking-wider">Tareas Disponibles</h4>
                                <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-lg border border-primary/20 font-mono italic">
                                    {unassignedTasks.length}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsNewTaskModalOpen(true)}
                            className="w-10 h-10 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-2xl transition-all duration-500 border border-primary/20 flex items-center justify-center shadow-lg hover:shadow-primary/40 group/btn relative z-10"
                            title="Nueva Tarea Manual"
                        >
                            <Plus size={20} className="group-hover/btn:rotate-90 transition-transform duration-500" />
                        </button>
                    </div>
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar-thin bg-black/10">
                        {unassignedTasks.map(task => (
                            <div
                                key={task.id}
                                draggable
                                onDragStart={e => handleDragStart(e, task.id)}
                                className="group relative bg-white/[0.02] hover:bg-white/[0.05] p-5 rounded-3xl border border-white/5 hover:border-primary/50 transition-all duration-500 cursor-grab active:cursor-grabbing shadow-sm overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/0 group-hover:bg-primary transition-all" />
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <h5 className="text-[11px] font-black text-white uppercase tracking-tight leading-relaxed line-clamp-2">{task.title}</h5>
                                    <button
                                        onClick={() => deleteProductionTask(eventId, task.id)}
                                        className="text-slate-600 hover:text-red-500 p-2 rounded-xl hover:bg-red-500/10 transition-all duration-300 xl:opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] font-black text-slate-500">
                                        {task.quantity} <span className="text-[8px] font-sans opacity-60 uppercase">{task.unit}</span>
                                    </span>
                                    <div className="w-5 h-5 rounded-lg border border-white/10 flex items-center justify-center bg-black/40">
                                        <Plus size={10} className="text-slate-600" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {unassignedTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                                <div className="w-16 h-16 rounded-[2rem] border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                                    <CalendarDays size={24} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Scheduler Vacío</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 overflow-x-auto premium-glass border border-white/10 rounded-[2.5rem] shadow-2xl relative">
                    <div className="grid grid-cols-7 gap-px bg-white/5 min-w-[1200px] h-full">
                        {weekDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                            return (
                                <div key={dateStr} className={`flex flex-col bg-white/[0.015] hover:bg-white/[0.025] transition-colors duration-500 ${isToday ? 'bg-primary/[0.03]' : ''}`}>
                                    <div className={`p-5 flex flex-col items-center border-b border-white/5 ${isToday ? 'bg-primary/5' : 'bg-black/20'}`}>
                                        <span className={`text-[9px] font-black uppercase tracking-[0.3em] mb-1 ${isToday ? 'text-primary' : 'text-slate-500'}`}>
                                            {format(day, 'EEEE')}
                                        </span>
                                        <span className={`text-2xl font-black tracking-tighter ${isToday ? 'text-primary' : 'text-white'}`}>
                                            {format(day, 'dd')}
                                        </span>
                                    </div>

                                    {/* Morning Shift */}
                                    <div
                                        className={`flex-1 border-b border-white/5 p-3 flex flex-col gap-3 min-h-[160px] transition-all duration-300 relative group/slot ${isToday ? 'bg-primary/[0.01]' : ''}`}
                                        onDragOver={handleDragOver}
                                        onDrop={e => handleDrop(e, dateStr, 'MORNING')}
                                    >
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500/50 shadow-[0_0_5px_rgba(249,115,22,0.3)]" />
                                            <span className="text-[9px] text-orange-400 font-black uppercase tracking-[0.2em]">Servicio AM</span>
                                        </div>
                                        <div className="space-y-2 relative z-10 flex-1">
                                            {getTasksForSlot(dateStr, 'MORNING').map(task => (
                                                <div key={task.id}
                                                    draggable
                                                    onDragStart={e => handleDragStart(e, task.id)}
                                                    className="bg-orange-500/5 hover:bg-orange-500/10 border border-orange-500/20 rounded-2xl px-3 py-2 text-[10px] font-black text-orange-200 cursor-grab active:cursor-grabbing hover:border-orange-500/40 transition-all duration-300 truncate group/task shadow-lg"
                                                    title={task.title}
                                                >
                                                    {task.title}
                                                </div>
                                            ))}
                                            {getTasksForSlot(dateStr, 'MORNING').length === 0 && (
                                                <div className="h-full border border-dashed border-white/5 rounded-2xl opacity-0 group-hover/slot:opacity-20 transition-opacity" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Afternoon Shift */}
                                    <div
                                        className={`flex-1 p-3 flex flex-col gap-3 min-h-[160px] transition-all duration-300 relative group/slot ${isToday ? 'bg-primary/[0.01]' : ''}`}
                                        onDragOver={handleDragOver}
                                        onDrop={e => handleDrop(e, dateStr, 'AFTERNOON')}
                                    >
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 shadow-[0_0_5px_rgba(99,102,241,0.3)]" />
                                            <span className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em]">Servicio PM</span>
                                        </div>
                                        <div className="space-y-2 relative z-10 flex-1">
                                            {getTasksForSlot(dateStr, 'AFTERNOON').map(task => (
                                                <div key={task.id}
                                                    draggable
                                                    onDragStart={e => handleDragStart(e, task.id)}
                                                    className="bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-3 py-2 text-[10px] font-black text-indigo-200 cursor-grab active:cursor-grabbing hover:border-indigo-500/40 transition-all duration-300 truncate group/task shadow-lg"
                                                    title={task.title}
                                                >
                                                    {task.title}
                                                </div>
                                            ))}
                                            {getTasksForSlot(dateStr, 'AFTERNOON').length === 0 && (
                                                <div className="h-full border border-dashed border-white/5 rounded-2xl opacity-0 group-hover/slot:opacity-20 transition-opacity" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* New Task Modal */}
            {isNewTaskModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="bg-[#0f1115] border border-white/10 rounded-[3rem] p-10 w-full max-w-md shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32" />

                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <h4 className="text-3xl font-black text-white uppercase tracking-tighter">Nueva Tarea</h4>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Manual Deployment</p>
                            </div>
                            <button
                                onClick={() => setIsNewTaskModalOpen(false)}
                                className="w-12 h-12 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-2xl transition-all duration-300 flex items-center justify-center border border-white/10"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTask} className="space-y-8 relative z-10">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Descripción del Proceso</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        placeholder="Ej: Mise en Place Salsas..."
                                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-5 text-white outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all duration-300 text-sm font-black uppercase tracking-wider"
                                    />
                                    <div className="absolute inset-0 rounded-2xl border border-primary/20 opacity-0 group-focus-within:opacity-100 blur-sm pointer-events-none transition-opacity" />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsNewTaskModalOpen(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-5 rounded-2xl transition-all duration-300 uppercase text-[10px] tracking-[0.2em] border border-white/5"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newTaskTitle.trim()}
                                    className="flex-[2] bg-primary hover:bg-blue-600 disabled:opacity-30 text-white font-black py-5 rounded-2xl transition-all duration-500 uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-primary/20 hover:shadow-primary/40 group relative overflow-hidden"
                                >
                                    <span className="relative z-10">Confirmar Protocolo</span>
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
