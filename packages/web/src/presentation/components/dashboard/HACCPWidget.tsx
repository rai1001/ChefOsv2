import React, { useMemo } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { isSameDay, parseISO } from 'date-fns';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HACCPWidget: React.FC = () => {
    const { haccpLogs, haccpTasks, haccpTaskCompletions } = useStore();
    const navigate = useNavigate();
    const today = new Date();

    const alerts = useMemo(() => {
        const list = [];

        // 1. Check Daily Tasks
        const dailyTasks = haccpTasks.filter(t => t.frequency === 'DAILY' && t.isActive);
        const completedTaskIds = haccpTaskCompletions
            .filter(c => isSameDay(parseISO(c.completedAt), today))
            .map(c => c.taskId);

        const pendingTasks = dailyTasks.filter(t => !completedTaskIds.includes(t.id));

        if (pendingTasks.length > 0) {
            list.push({
                type: 'TASK',
                count: pendingTasks.length,
                message: `${pendingTasks.length} Tareas HACCP pendientes hoy`
            });
        }

        // 2. Check Critical Logs (Temperature violations today)
        const todaysLogs = haccpLogs.filter(l => isSameDay(parseISO(l.timestamp), today));
        const criticalLogs = todaysLogs.filter(l => l.status === 'CRITICAL');

        if (criticalLogs.length > 0) {
            list.push({
                type: 'CRITICAL',
                count: criticalLogs.length,
                message: `${criticalLogs.length} Registros Críticos hoy`
            });
        }

        // 3. Optional: Check if TEMP logs are missing? (e.g. Fridge check not done)
        // This requires PCC logic (e.g., active fridges must have 2 logs/day). skipping for now unless explicit.

        return list;
    }, [haccpLogs, haccpTasks, haccpTaskCompletions, today]);

    if (alerts.length === 0) return null; // Don't show if everything is OK? Or show "OK" state?
    // User asked for "HACCP Alerts", implying visibility only when alerting, or visible "Status".
    // Let's allow it to render generic "Safe" state if no alerts, but small. 
    // Or render big red box if alerts.

    return (
        <div className={`rounded-xl p-4 border flex items-center justify-between
            ${alerts.length > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/20'}
        `}>
            <div className="flex items-center gap-3">
                {alerts.length > 0 ? (
                    <div className="p-2 bg-red-500/20 rounded-full text-red-500 animate-pulse">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                ) : (
                    <div className="p-2 bg-emerald-500/20 rounded-full text-emerald-500">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                )}

                <div>
                    <h4 className={`font-bold ${alerts.length > 0 ? 'text-red-200' : 'text-emerald-200'}`}>
                        Estado HACCP
                    </h4>
                    {alerts.length > 0 ? (
                        <div className="text-sm text-red-300">
                            {alerts.map((a, i) => (
                                <div key={i}>{a.message}</div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-emerald-400">Todo correcto hoy</div>
                    )}
                </div>
            </div>

            <button
                onClick={() => navigate('/haccp')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${alerts.length > 0 ? 'bg-red-500/20 hover:bg-red-500/30 text-red-100' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100'}
                `}
            >
                Revisar
            </button>
        </div>
    );
};
