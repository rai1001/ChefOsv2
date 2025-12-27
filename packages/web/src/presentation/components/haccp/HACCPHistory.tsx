import React, { useState, useMemo } from 'react';
import { History, Download, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

type DateRange = '7d' | '30d' | '90d' | 'custom';
type StatusFilter = 'all' | 'CORRECT' | 'WARNING' | 'CRITICAL';

export const HACCPHistory: React.FC = () => {
    const { pccs, haccpLogs } = useStore();
    const [dateRange, setDateRange] = useState<DateRange>('7d');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedPCC, setSelectedPCC] = useState<string>('all');

    // Calculate date filter
    const dateFilter = useMemo(() => {
        const now = new Date();
        switch (dateRange) {
            case '7d': return subDays(now, 7);
            case '30d': return subDays(now, 30);
            case '90d': return subDays(now, 90);
            default: return subDays(now, 7);
        }
    }, [dateRange]);

    // Filter logs
    const filteredLogs = useMemo(() => {
        return haccpLogs
            .filter((log: import('@/types').HACCPLog) => {
                const logDate = new Date(log.timestamp);
                if (logDate < dateFilter) return false;
                if (statusFilter !== 'all' && log.status !== statusFilter) return false;
                if (selectedPCC !== 'all' && log.pccId !== selectedPCC) return false;
                return true;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [haccpLogs, dateFilter, statusFilter, selectedPCC]);

    // Stats
    const stats = useMemo(() => {
        const total = filteredLogs.length;
        const correct = filteredLogs.filter(l => l.status === 'CORRECT').length;
        const warnings = filteredLogs.filter(l => l.status === 'WARNING').length;
        const critical = filteredLogs.filter(l => l.status === 'CRITICAL').length;
        const complianceRate = total > 0 ? ((correct / total) * 100).toFixed(1) : '0';

        return { total, correct, warnings, critical, complianceRate };
    }, [filteredLogs]);

    // Get PCC name by ID
    const getPCCName = (pccId: string) => {
        return pccs.find(p => p.id === pccId)?.name || 'Desconocido';
    };

    // Export to Excel
    const handleExport = () => {
        const data = filteredLogs.map(log => ({
            'Fecha': format(new Date(log.timestamp), 'dd/MM/yyyy', { locale: es }),
            'Hora': format(new Date(log.timestamp), 'HH:mm', { locale: es }),
            'Punto Control': getPCCName(log.pccId),
            'Valor': log.value,
            'Estado': log.status === 'CORRECT' ? 'Correcto' : log.status === 'WARNING' ? 'Advertencia' : 'Crítico',
            'Notas': log.notes || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Registros HACCP');
        XLSX.writeFile(wb, `haccp-registros-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CORRECT': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
            case 'WARNING': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
            case 'CRITICAL': return 'text-red-400 bg-red-500/10 border-red-500/30';
            default: return 'text-slate-400 bg-slate-500/10';
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Header with Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-8 border-b border-white/5">
                <div>
                    <h3 className="text-3xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                        <History className="text-emerald-400" size={32} /> Registro Cronológico
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1 ml-11">Auditoría Permanente de Seguridad Alimentaria</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Date Range Selector */}
                    <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1.5 backdrop-blur-xl">
                        {(['7d', '30d', '90d'] as DateRange[]).map(range => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${dateRange === range
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'text-slate-500 hover:text-white'
                                    }`}
                            >
                                {range === '7d' ? '7 Días' : range === '30d' ? '30 Días' : '90 Días'}
                            </button>
                        ))}
                    </div>

                    <div className="h-10 w-px bg-white/5 hidden md:block" />

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="bg-black/40 border border-white/5 rounded-2xl px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer min-w-[180px]"
                    >
                        <option value="all">TODOS LOS NIVELES</option>
                        <option value="CORRECT">OPTIMO / CORRECTO</option>
                        <option value="WARNING">PRECAUCIÓN / AVISO</option>
                        <option value="CRITICAL">FALLA CRÍTICA</option>
                    </select>

                    {/* PCC Filter */}
                    <select
                        value={selectedPCC}
                        onChange={(e) => setSelectedPCC(e.target.value)}
                        className="bg-black/40 border border-white/5 rounded-2xl px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer min-w-[200px]"
                    >
                        <option value="all">FILTRAR POR PCC</option>
                        {pccs.map(pcc => (
                            <option key={pcc.id} value={pcc.id}>{pcc.name.toUpperCase()}</option>
                        ))}
                    </select>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-3 bg-white hover:bg-emerald-500 text-black hover:text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 shadow-xl group"
                    >
                        <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                        Exportar Reporte
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                {[
                    { label: 'Total Ingesta', value: stats.total, color: 'text-white' },
                    { label: 'Cumplimiento OK', value: stats.correct, color: 'text-emerald-400' },
                    { label: 'Desviaciones', value: stats.warnings, color: 'text-amber-400' },
                    { label: 'Incidencias', value: stats.critical, color: 'text-red-400' },
                    { label: 'Tasa Compliance', value: `${stats.complianceRate}%`, color: 'text-emerald-500' }
                ].map((stat, i) => (
                    <div key={i} className="premium-glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/[0.01] group-hover:bg-white/[0.03] transition-colors" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block relative z-10">{stat.label}</span>
                        <span className={`text-3xl font-black font-mono tracking-tighter relative z-10 ${stat.color}`}>{stat.value}</span>
                        <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 w-0 group-hover:w-full transition-all duration-700" style={{ color: stat.color.replace('text-', '') }} />
                    </div>
                ))}
            </div>

            {/* Logs Table */}
            <div className="premium-glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
                <div className="absolute inset-0 bg-white/[0.01] -z-10" />
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">Marca de Tiempo</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">Nodo de Control</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 text-center">Magnitud</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 text-center">Estado</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">Observaciones Técnicas</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 text-center">Docs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map(log => (
                                <tr key={log.id} className="group hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-0">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-white font-mono">{format(new Date(log.timestamp), 'dd MMM, yy', { locale: es }).toUpperCase()}</span>
                                            <span className="text-[10px] font-bold text-slate-500 mt-0.5">{format(new Date(log.timestamp), 'HH:mm:ss', { locale: es })}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                                            <span className="text-xs font-black text-white uppercase tracking-wider">{getPCCName(log.pccId)}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`text-lg font-black font-mono tracking-tighter ${log.status === 'CORRECT' ? 'text-emerald-400' :
                                            log.status === 'WARNING' ? 'text-amber-400' : 'text-red-400'
                                            }`}>{log.value}°C</span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-black/40 ${getStatusColor(log.status)} shadow-lg shadow-black/20`}>
                                            {log.status === 'CORRECT' ? (
                                                <CheckCircle className="w-3.5 h-3.5" />
                                            ) : (
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                            )}
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {log.status === 'CORRECT' ? 'Nivel Óptimo' : log.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-xs italic">
                                            {log.notes || 'No se registraron anomalías.'}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        {log.pdfUrl ? (
                                            <a
                                                href={log.pdfUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all mx-auto"
                                                title="Ver Certificado"
                                            >
                                                <FileText size={18} />
                                            </a>
                                        ) : (
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">N/A</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-20 h-20 bg-white/[0.02] rounded-3xl border border-white/5 flex items-center justify-center mb-6">
                                                <History className="text-slate-700 w-10 h-10" />
                                            </div>
                                            <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Sin Datos en el Período</h4>
                                            <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">No se han localizado registros bajo el criterio de búsqueda.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
