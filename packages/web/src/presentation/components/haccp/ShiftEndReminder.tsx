import React, { useMemo, useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { AlertTriangle, CheckCircle2, Clock, X, CalendarDays, CalendarClock } from 'lucide-react';
import type { HACCPTask, HACCPTaskCompletion, HACCPTaskFrequency } from '@/types';

// Helper: Check if a task is due based on frequency and last completion
const isTaskDue = (task: HACCPTask, completions: HACCPTaskCompletion[]): boolean => {
  const taskCompletions = completions
    .filter((c) => c.taskId === task.id)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  if (taskCompletions.length === 0) return true; // Never completed

  const lastCompletion = new Date(taskCompletions[0]!.completedAt);
  const now = new Date();

  switch (task.frequency) {
    case 'DAILY':
      return lastCompletion.toDateString() !== now.toDateString();
    case 'WEEKLY': {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return lastCompletion < oneWeekAgo;
    }
    case 'MONTHLY': {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      return lastCompletion < oneMonthAgo;
    }
    default:
      return false;
  }
};

const frequencyLabels: Record<
  HACCPTaskFrequency,
  { label: string; icon: React.ReactNode; color: string }
> = {
  DAILY: {
    label: 'Diario',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  },
  WEEKLY: {
    label: 'Semanal',
    icon: <CalendarDays className="w-4 h-4" />,
    color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  },
  MONTHLY: {
    label: 'Mensual',
    icon: <CalendarClock className="w-4 h-4" />,
    color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  },
};

export const ShiftEndReminder: React.FC = () => {
  const { haccpTasks, haccpTaskCompletions, completeHACCPTask } = useStore();
  const [dismissed, setDismissed] = useState(false);

  const pendingTasks = useMemo(() => {
    return haccpTasks.filter((t) => t.isActive && isTaskDue(t, haccpTaskCompletions));
  }, [haccpTasks, haccpTaskCompletions]);

  const handleComplete = (task: HACCPTask) => {
    const completion: HACCPTaskCompletion = {
      id: (crypto as any).randomUUID?.() || Math.random().toString(36).substring(2, 11),
      taskId: task.id,
      completedAt: new Date().toISOString(),
      completedBy: 'current-user', // Placeholder
    };
    completeHACCPTask(completion);
  };

  if (dismissed || pendingTasks.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full animate-in slide-in-from-bottom-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-amber-200 dark:border-amber-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Controles HACCP Pendientes</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task List */}
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          {pendingTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${frequencyLabels[task.frequency].color}`}
                  >
                    {frequencyLabels[task.frequency].icon}
                    {frequencyLabels[task.frequency].label}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white truncate">{task.name}</h4>
                {task.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {task.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleComplete(task)}
                className="ml-3 flex-shrink-0 p-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg transition-colors"
                title="Marcar como completado"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 text-center text-sm text-gray-500">
          {pendingTasks.length} tarea{pendingTasks.length !== 1 ? 's' : ''} pendiente
          {pendingTasks.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};
