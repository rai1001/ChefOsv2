import React, { useMemo } from 'react';
import { AlertTriangle, Bell, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import { format, subHours } from 'date-fns';
import { es } from 'date-fns/locale';

interface Alert {
    id: string;
    type: 'critical' | 'warning' | 'overdue' | 'info';
    title: string;
    description: string;
    timestamp: Date;
    pccId?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const HACCPAlerts: React.FC = () => {
    const { pccs, haccpLogs, haccpTasks, haccpTaskCompletions, notifications } = useStore();

    // Generate alerts based on current data
    const alerts = useMemo(() => {
        const alertList: Alert[] = [];
        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');

        // 1. Check for critical temperature readings in last 4 hours
        const recentLogs = haccpLogs.filter(log =>
            new Date(log.timestamp) > subHours(now, 4)
        );

        recentLogs.forEach(log => {
            if (log.status === 'CRITICAL') {
                const pcc = pccs.find(p => p.id === log.pccId);
                alertList.push({
                    id: `critical-${log.id}`,
                    type: 'critical',
                    title: `Temperatura Crítica: ${pcc?.name}`,
                    description: `Registrada ${log.value}°C a las ${format(new Date(log.timestamp), 'HH:mm')}. Rango permitido: ${pcc?.minTemp}°C - ${pcc?.maxTemp}°C`,
                    timestamp: new Date(log.timestamp),
                    pccId: log.pccId
                });
            } else if (log.status === 'WARNING') {
                const pcc = pccs.find(p => p.id === log.pccId);
                alertList.push({
                    id: `warning-${log.id}`,
                    type: 'warning',
                    title: `Advertencia: ${pcc?.name}`,
                    description: `Temperatura en límite (${log.value}°C) registrada a las ${format(new Date(log.timestamp), 'HH:mm')}`,
                    timestamp: new Date(log.timestamp),
                    pccId: log.pccId
                });
            }
        });

        // 2. Check for overdue tasks
        const activeTasks = haccpTasks.filter(t => t.isActive);
        activeTasks.forEach(task => {
            const completionsToday = haccpTaskCompletions.filter(
                c => c.taskId === task.id && c.completedAt.startsWith(today)
            );

            if (task.frequency === 'DAILY' && completionsToday.length === 0) {
                alertList.push({
                    id: `overdue-${task.id}`,
                    type: 'overdue',
                    title: `Tarea pendiente: ${task.name}`,
                    description: task.description || 'Esta tarea diaria aún no se ha completado hoy.',
                    timestamp: now
                });
            }
        });

        // 3. Check for PCCs without readings today
        pccs.filter(p => p.isActive).forEach(pcc => {
            const todayLogs = haccpLogs.filter(
                log => log.pccId === pcc.id && log.timestamp.startsWith(today)
            );

            if (todayLogs.length === 0) {
                alertList.push({
                    id: `no-reading-${pcc.id}`,
                    type: 'info',
                    title: `Sin registros: ${pcc.name}`,
                    description: 'No hay lecturas de temperatura registradas hoy para este punto de control.',
                    timestamp: now,
                    pccId: pcc.id
                });
            }
        });

        // 4. Add Backend/AI Notifications
        notifications.filter(n => !n.read && n.type === 'HACCP_ALERT').forEach(n => {
            alertList.push({
                id: n.id,
                type: 'critical', // Treat AI alerts as critical/warning based on message? defaulting to critical/warning style usually
                title: 'Alerta IA: Anomalía Detectada',
                description: n.message,
                timestamp: new Date(n.timestamp?.toDate ? n.timestamp.toDate() : n.timestamp), // Handle Firestore Timestamp
                pccId: n.pccId
            });
        });

        // Sort by type priority and timestamp
        return alertList.sort((a, b) => {
            const priority = { critical: 0, warning: 1, overdue: 2, info: 3 };
            if (priority[a.type] !== priority[b.type]) {
                return priority[a.type] - priority[b.type];
            }
            return b.timestamp.getTime() - a.timestamp.getTime();
        });
    }, [pccs, haccpLogs, haccpTasks, haccpTaskCompletions, notifications]);

    const getAlertStyle = (type: Alert['type']) => {
        switch (type) {
            case 'critical':
                return {
                    bg: 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15',
                    icon: <XCircle className="w-6 h-6 text-red-500 animate-pulse" />,
                    badge: 'bg-red-500 text-white shadow-lg shadow-red-500/20',
                    dot: 'bg-red-500'
                };
            case 'warning':
                return {
                    bg: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15',
                    icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
                    badge: 'bg-amber-500 text-white shadow-lg shadow-amber-500/20',
                    dot: 'bg-amber-500'
                };
            case 'overdue':
                return {
                    bg: 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15',
                    icon: <Clock className="w-6 h-6 text-orange-500" />,
                    badge: 'bg-orange-500 text-white shadow-lg shadow-orange-500/20',
                    dot: 'bg-orange-500'
                };
            default:
                return {
                    bg: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15',
                    icon: <Bell className="w-6 h-6 text-blue-500" />,
                    badge: 'bg-blue-500 text-white shadow-lg shadow-blue-500/20',
                    dot: 'bg-blue-500'
                };
        }
    };

    const criticalCount = alerts.filter(a => a.type === 'critical').length;
    const warningCount = alerts.filter(a => a.type === 'warning' || a.type === 'overdue').length;

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Status Radar / Summary Banner */}
            <div className={`relative p-8 rounded-[2.5rem] border overflow-hidden transition-all duration-700 shadow-2xl ${criticalCount > 0
                ? 'bg-red-500/5 border-red-500/20'
                : warningCount > 0
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-emerald-500/5 border-emerald-500/20'
                }`}>
                <div className={`absolute top-0 right-0 w-96 h-96 blur-[100px] -mr-48 -mt-48 pointer-events-none opacity-20 ${criticalCount > 0 ? 'bg-red-500' : warningCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className={`p-5 rounded-[2rem] border transition-transform duration-700 ${criticalCount > 0
                            ? 'bg-red-500/20 border-red-500/40 scale-110 rotate-3 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                            : warningCount > 0
                                ? 'bg-amber-500/20 border-amber-500/40 scale-105 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                : 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                            }`}>
                            {criticalCount > 0 ? (
                                <XCircle className="w-10 h-10 text-red-500 animate-pulse" />
                            ) : warningCount > 0 ? (
                                <AlertTriangle className="w-10 h-10 text-amber-500" />
                            ) : (
                                <CheckCircle className="w-10 h-10 text-emerald-500 animate-glow" />
                            )}
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-2 block ml-1">Estado de Auditoría Digital</span>
                            <h3 className={`text-4xl font-black uppercase tracking-tighter ${criticalCount > 0 ? 'text-red-500' : warningCount > 0 ? 'text-amber-500' : 'text-emerald-500'
                                }`}>
                                {criticalCount > 0
                                    ? `Alerta Crítica: ${criticalCount} anomalía(s)`
                                    : warningCount > 0
                                        ? `Atención: ${warningCount} controles vencidos`
                                        : 'Sistema en Óptimas Condiciones'}
                            </h3>
                            <div className="flex items-center gap-3 mt-2 ml-1">
                                <div className={`w-2 h-2 rounded-full animate-pulse ${criticalCount > 0 ? 'bg-red-500' : warningCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.1em]">
                                    Sincronizado vía Cloud AI — {format(new Date(), 'HH:mm', { locale: es })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="premium-glass px-6 py-4 rounded-3xl border border-white/5 flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center">Críticos</span>
                            <span className="text-2xl font-black font-mono text-white">{criticalCount}</span>
                        </div>
                        <div className="premium-glass px-6 py-4 rounded-3xl border border-white/5 flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center">Warnings</span>
                            <span className="text-2xl font-black font-mono text-white">{warningCount}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts List */}
            <div className="grid grid-cols-1 gap-4">
                {alerts.map(alert => {
                    const style = getAlertStyle(alert.type);
                    return (
                        <div
                            key={alert.id}
                            className={`group relative flex items-start gap-6 p-6 rounded-[2rem] border transition-all duration-500 animate-in slide-in-from-bottom-2 ${style.bg} hover:border-white/20`}
                        >
                            <div className={`p-3 rounded-2xl border transition-colors duration-500 ${alert.type === 'critical' ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
                                {style.icon}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <h4 className="text-sm font-black text-white uppercase tracking-wider">{alert.title}</h4>
                                    <span className={`text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-widest ${style.badge}`}>
                                        {alert.type}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-4xl tracking-wide">{alert.description}</p>
                            </div>

                            <div className="flex flex-col items-end gap-3 self-center">
                                <div className="px-4 py-2 bg-black/40 rounded-xl border border-white/5 flex items-center gap-2 group-hover:border-primary/50 transition-colors">
                                    <Clock size={12} className="text-slate-500" />
                                    <span className="text-[10px] font-black font-mono text-slate-400 group-hover:text-white">
                                        {format(alert.timestamp, 'HH:mm')}
                                    </span>
                                </div>
                            </div>

                            {/* Decorative line */}
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 rounded-full transition-all duration-500 group-hover:h-full ${style.dot}`} />
                        </div>
                    );
                })}

                {alerts.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center p-24 premium-glass border-dashed border-2 border-white/5 bg-white/[0.01] rounded-[3rem] text-center">
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mb-10 border border-emerald-500/20 relative group scale-110">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse" />
                            <CheckCircle size={40} className="text-emerald-500 relative z-10 group-hover:rotate-12 transition-transform duration-700" />
                        </div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Protocolos Asegurados</h3>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] leading-relaxed max-w-sm mx-auto">
                            No se detectan anomalías térmicas ni desviaciones operativas en los registros actuales.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
