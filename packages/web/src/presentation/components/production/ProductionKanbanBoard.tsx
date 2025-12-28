import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  Clock,
  Thermometer,
  Printer,
} from 'lucide-react';
import { printLabel } from '../printing/PrintService';
import { ProductionTask, ProductionTaskStatus } from '@culinaryos/core';

interface ColumnProps {
  id: ProductionTaskStatus;
  title: string;
  tasks: ProductionTask[];
  color: string;
  onDrop: (taskId: string, status: ProductionTaskStatus) => void;
  onToggleTimer: (taskId: string) => void;
  staff: any[];
  onAssignEmployee: (taskId: string, employeeId: string) => void;
}

const KanbanColumn: React.FC<ColumnProps> = ({
  id,
  title,
  tasks,
  color,
  onDrop,
  onToggleTimer,
  staff,
  onAssignEmployee,
}) => {
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
      <div
        className={`p-6 border-b border-white/5 flex items-center justify-between relative overflow-hidden ${
          id === ProductionTaskStatus.PENDING
            ? 'bg-white/[0.01]'
            : id === ProductionTaskStatus.IN_PROGRESS
              ? 'bg-primary/5'
              : 'bg-emerald-500/5'
        }`}
      >
        <div
          className="absolute left-0 top-0 w-1 h-full bg-current opacity-30"
          style={{
            color: color.includes('primary')
              ? '#3b82f6'
              : color.includes('green')
                ? '#10b981'
                : '#94a3b8',
          }}
        />
        <h3
          className={`font-black text-sm flex items-center gap-3 uppercase tracking-[0.2em] ${color}`}
        >
          {id === ProductionTaskStatus.PENDING && <AlertCircle size={18} />}
          {id === ProductionTaskStatus.IN_PROGRESS && <ChefHat size={18} />}
          {id === ProductionTaskStatus.COMPLETED && <CheckCircle size={18} />}
          {title}
        </h3>
        <span className="bg-black/40 px-3 py-1 rounded-lg text-[10px] font-black font-mono text-slate-500 border border-white/5 tracking-tighter">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
        {tasks.map((task) => (
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
              {id === ProductionTaskStatus.PENDING ? (
                <AlertCircle size={24} />
              ) : id === ProductionTaskStatus.IN_PROGRESS ? (
                <ChefHat size={24} />
              ) : (
                <CheckCircle size={24} />
              )}
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
  onAssignEmployee,
}: {
  task: ProductionTask;
  onToggleTimer: (id: string) => void;
  staff: any[];
  onAssignEmployee: (taskId: string, employeeId: string) => void;
}) => {
  // Local state for ticking timer
  const [elapsed, setElapsed] = useState((task.actualDuration || 0) * 60);

  useEffect(() => {
    setElapsed((task.actualDuration || 0) * 60);
  }, [task.actualDuration]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (task.startedAt && task.status === ProductionTaskStatus.IN_PROGRESS) {
      interval = setInterval(() => {
        const startTime = new Date(task.startedAt!).getTime();
        const currentSession = Math.floor((Date.now() - startTime) / 1000);
        const previousDurationSeconds = (task.actualDuration || 0) * 60;
        setElapsed(previousDurationSeconds + currentSession);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [task.startedAt, task.status, task.actualDuration]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isTimerRunning = task.status === ProductionTaskStatus.IN_PROGRESS && !!task.startedAt;

  return (
    <div
      className={`premium-glass p-5 rounded-3xl border transition-all duration-500 cursor-grab active:cursor-grabbing group relative overflow-hidden ${
        isTimerRunning
          ? 'border-primary/50 bg-primary/5 shadow-2xl shadow-primary/20 scale-[1.02]'
          : 'border-white/5 hover:border-white/20 bg-white/[0.02]'
      }`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
    >
      <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 blur-3xl -mr-12 -mt-12 group-hover:opacity-100 transition-opacity opacity-0" />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="space-y-1">
          <h4 className="font-black text-xs text-white uppercase tracking-tight group-hover:text-primary transition-colors">
            {task.fichaName}
          </h4>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
            {task.station}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {task.notes?.toLowerCase()?.includes('haccp') ||
          task.fichaName.toLowerCase().includes('temp') ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <Thermometer size={10} />
              <span className="text-[7px] font-black uppercase tracking-widest">
                HACCP Required
              </span>
            </div>
          ) : null}
          {/* Shift is not on ProductionTask entity yet, but let's assume usage of station or time as logic later. Removing shift display for now or mapping it if we had it. */}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 relative z-20">
        <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-xl flex flex-col">
          <span className="text-[7px] text-slate-600 font-black uppercase tracking-widest">
            Quantity
          </span>
          <span className="font-mono text-xs font-black text-white">
            {task.quantity.value}{' '}
            <span className="text-[8px] text-slate-500 font-sans">
              {task.quantity.unit.toString()}
            </span>
          </span>
        </div>

        <select
          value={task.assignedTo || ''}
          onChange={(e) => onAssignEmployee(task.id, e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all focus:border-primary/50 outline-none relative z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">👤 Unassigned</option>
          {staff.map((emp) => (
            <option key={emp.id} value={emp.id} className="bg-slate-900">
              {emp.name}
            </option>
          ))}
        </select>
      </div>

      {/* Timer Controls */}
      <div
        className={`flex items-center justify-between pt-4 border-t border-white/5 relative z-10 transition-colors ${isTimerRunning ? 'border-primary/20' : ''}`}
      >
        <div
          className={`flex items-center gap-3 font-mono text-sm font-black ${isTimerRunning ? 'text-primary animate-pulse' : 'text-slate-500'}`}
        >
          <div className={`p-1.5 rounded-lg ${isTimerRunning ? 'bg-primary/20' : 'bg-white/5'}`}>
            <Clock size={12} className={isTimerRunning ? 'animate-spin-slow' : ''} />
          </div>
          {formatTime(elapsed)}
        </div>
        {task.status !== ProductionTaskStatus.COMPLETED && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleTimer(task.id);
            }}
            className={`p-3 rounded-2xl transition-all duration-500 flex items-center gap-2 group/btn relative z-30 ${
              isTimerRunning
                ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20'
                : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
            }`}
          >
            {isTimerRunning ? (
              <>
                <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover:block">
                  Pause
                </span>
                <Pause size={14} fill="currentColor" />
              </>
            ) : (
              <>
                <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover:block">
                  Start
                </span>
                <Play size={14} fill="currentColor" />
              </>
            )}
          </button>
        )}
        {task.status === ProductionTaskStatus.COMPLETED && (
          <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl border border-emerald-500/20">
            <CheckCircle size={14} />
          </div>
        )}
        {/* Print Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            printLabel({
              title: task.fichaName,
              date: new Date(),
              type: 'PREP',
              quantity: `${task.quantity.value} ${task.quantity.unit.toString()}`,
              batchNumber: `TASK-${task.id.slice(-6)}`,
            });
          }}
          className="p-3 ml-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
          title="Print Label"
        >
          <Printer size={14} />
        </button>
      </div>

      {/* Progress Bar for Active Tasks */}
      {isTimerRunning && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
          <div
            className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-shimmer"
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  );
};

interface ProductionKanbanBoardProps {
  tasks: ProductionTask[];
  onTaskStatusChange: (taskId: string, newStatus: ProductionTaskStatus) => void;
  onToggleTimer: (taskId: string) => void;
  onAssignEmployee: (taskId: string, employeeId: string) => void;
  staff: any[];
}

export const ProductionKanbanBoard: React.FC<ProductionKanbanBoardProps> = ({
  tasks,
  onTaskStatusChange,
  onToggleTimer,
  onAssignEmployee,
  staff,
}) => {
  return (
    <div className="h-full flex flex-col space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
            Production Kanban
          </h2>
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Real-time Ops Flow
          </div>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Active Timers
            </span>
            <span className="font-mono text-white font-black">
              {tasks.filter((t) => t.status === ProductionTaskStatus.IN_PROGRESS).length}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-x-auto pb-6 pl-1 custom-scrollbar scroll-smooth">
        <KanbanColumn
          id={ProductionTaskStatus.PENDING}
          title="En Espera"
          tasks={tasks.filter((t) => t.status === ProductionTaskStatus.PENDING)}
          color="text-slate-400"
          onDrop={onTaskStatusChange}
          onToggleTimer={onToggleTimer}
          staff={staff}
          onAssignEmployee={onAssignEmployee}
        />
        <KanbanColumn
          id={ProductionTaskStatus.IN_PROGRESS}
          title="Despliegue"
          tasks={tasks.filter((t) => t.status === ProductionTaskStatus.IN_PROGRESS)}
          color="text-primary"
          onDrop={onTaskStatusChange}
          onToggleTimer={onToggleTimer}
          staff={staff}
          onAssignEmployee={onAssignEmployee}
        />
        <KanbanColumn
          id={ProductionTaskStatus.COMPLETED}
          title="Auditado"
          tasks={tasks.filter((t) => t.status === ProductionTaskStatus.COMPLETED)}
          color="text-emerald-400"
          onDrop={onTaskStatusChange}
          onToggleTimer={onToggleTimer}
          staff={staff}
          onAssignEmployee={onAssignEmployee}
        />
      </div>
    </div>
  );
};
