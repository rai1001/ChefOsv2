import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Save, AlertTriangle, CheckCircle, Thermometer, Camera, Loader2, FileText, ClipboardList, Clock, Play, Trash2, ChefHat } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import { useToast } from '@/presentation/components/ui';
import type { HACCPLog, PCC, HACCPTimer } from '@/types';
import { scanHACCPLog } from '@/services/geminiService';
import { format, differenceInSeconds } from 'date-fns';

export const DailyRegisters: React.FC = () => {
    const { pccs, haccpLogs, addHACCPLog, haccpTimers, addHACCPTimer, deleteHACCPTimer, productionTasks } = useStore();
    const { addToast } = useToast();
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});

    // OCR State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isScanning, setIsScanning] = useState(false);

    // Timer Input State
    const [timerLabel, setTimerLabel] = useState('');
    const [timerDuration, setTimerDuration] = useState('60');

    const activePCCs = useMemo(() => pccs.filter(p => p.isActive), [pccs]);

    // Track elapsed time for active timers locally for smooth UI
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const getTodayLogs = (pccId: string) => {
        const today = new Date().toISOString().slice(0, 10);
        return haccpLogs
            .filter(log => log.pccId === pccId && log.timestamp.startsWith(today))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    const handleInputChange = (pccId: string, value: string) => {
        setInputs(prev => ({ ...prev, [pccId]: value }));
    };

    const handleNotesChange = (pccId: string, value: string) => {
        setNotes(prev => ({ ...prev, [pccId]: value }));
    };

    const handleScanClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        setIsScanning(true);
        const file = e.target.files[0];
        if (!file) return;

        try {
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
                reader.onerror = reject;
            });

            const result = await scanHACCPLog(base64Data);

            if (result.success && result.data) {
                const entries = result.data.entries || [];
                let matchedCount = 0;
                const newInputs = { ...inputs };

                entries.forEach((entry: any) => {
                    const scannedName = (entry.pccName || '').toLowerCase();
                    const match = activePCCs.find(p => {
                        const pName = p.name.toLowerCase();
                        return pName.includes(scannedName) || scannedName.includes(pName);
                    });

                    if (match && entry.value) {
                        newInputs[match.id] = String(entry.value);
                        matchedCount++;
                    }
                });

                setInputs(newInputs);
                addToast(`Se han autorellenado ${matchedCount} registros`, 'success');
            } else {
                addToast('No se pudieron extraer datos del registro', 'error');
            }
        } catch (error) {
            console.error(error);
            addToast('Error al procesar la imagen', 'error');
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = (pcc: PCC) => {
        const rawValue = inputs[pcc.id];
        if (!rawValue) return;

        const value = parseFloat(rawValue);

        let status: 'CORRECT' | 'WARNING' | 'CRITICAL' = 'CORRECT';
        if (pcc.minTemp !== undefined && pcc.maxTemp !== undefined) {
            if (value < pcc.minTemp || value > pcc.maxTemp) {
                status = 'CRITICAL';
            } else if (value === pcc.minTemp || value === pcc.maxTemp) {
                status = 'WARNING';
            }
        }

        const newLog: HACCPLog = {
            id: crypto.randomUUID(),
            pccId: pcc.id,
            value,
            timestamp: new Date().toISOString(),
            userId: 'current-user',
            status,
            notes: notes[pcc.id] || undefined,
            pdfUrl: pdfUrls[pcc.id] || undefined
        };

        addHACCPLog(newLog);

        if (status === 'CRITICAL') {
            addToast(`⚠️ Temperatura CRÍTICA registrada: ${value}°C`, 'error');
        } else if (status === 'WARNING') {
            addToast(`Advertencia: temperatura en límite (${value}°C)`, 'warning');
        } else {
            addToast(`Temperatura registrada: ${value}°C ✓`, 'success');
        }

        setInputs(prev => ({ ...prev, [pcc.id]: '' }));
        setNotes(prev => ({ ...prev, [pcc.id]: '' }));
        setPdfUrls(prev => ({ ...prev, [pcc.id]: '' }));
    };

    const startTimer = (pccId: string) => {
        const newTimer: HACCPTimer = {
            id: crypto.randomUUID(),
            pccId,
            startTime: new Date().toISOString(),
            duration: parseInt(timerDuration),
            label: timerLabel || 'Protocolo de Enfriamiento',
            status: 'ACTIVE'
        };
        addHACCPTimer(newTimer);
        setTimerLabel('');
        addToast('Cronómetro de seguridad iniciado', 'info');
    };

    const activeTimersOnPcc = (pccId: string) => haccpTimers.filter(t => t.pccId === pccId && t.status === 'ACTIVE');

    // Production Tasks Integration
    const relevantProductionTasks = useMemo(() => {
        const allTasks = Object.values(productionTasks).flat();
        return allTasks.filter(t => t.status === 'in-progress');
    }, [productionTasks]);

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 animate-in fade-in duration-700 h-full">
            {/* Input & Timers Section */}
            <div className="space-y-8 flex flex-col h-full">
                <div className="flex justify-between items-center premium-glass p-6 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 blur-3xl -z-10" />
                    <div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                            <Thermometer className="text-emerald-400 animate-glow" size={28} /> Despliegue de Registros
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1 ml-11">Entrada de Datos Críticos</p>
                    </div>
                    <button
                        onClick={handleScanClick}
                        disabled={isScanning}
                        className="group flex items-center gap-3 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white px-6 py-3 rounded-2xl border border-purple-500/20 transition-all duration-500 shadow-lg hover:shadow-purple-500/40"
                    >
                        {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5 group-hover:rotate-12 transition-transform duration-500" />}
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isScanning ? 'Escaneando...' : 'Inteligencia OCR'}</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                    />
                </div>

                {/* Active Timers Dashboard */}
                {haccpTimers.length > 0 && (
                    <div className="premium-glass p-6 rounded-[2rem] border border-orange-500/20 bg-orange-500/5 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="text-orange-500 animate-pulse" size={18} />
                            <h4 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.3em]">Protocolos de Tiempo en Curso</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {haccpTimers.map(timer => {
                                const totalSeconds = timer.duration * 60;
                                const elapsedSeconds = differenceInSeconds(now, new Date(timer.startTime));
                                const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
                                const progress = Math.min(100, (elapsedSeconds / totalSeconds) * 100);
                                const isExpired = remainingSeconds === 0;

                                const pccName = pccs.find(p => p.id === timer.pccId)?.name || 'PCC Desconocido';

                                return (
                                    <div key={timer.id} className={`p-4 rounded-2xl border transition-all duration-500 relative overflow-hidden ${isExpired ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{pccName}</p>
                                                <h5 className="text-[10px] font-black text-white uppercase truncate max-w-[120px]">{timer.label}</h5>
                                            </div>
                                            <button onClick={() => deleteHACCPTimer(timer.id)} className="text-slate-600 hover:text-red-500 transition-colors">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <div className="flex items-end justify-between mb-2 relative z-10">
                                            <span className={`text-xl font-black font-mono tracking-tighter ${isExpired ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                                                {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
                                            </span>
                                            <span className="text-[9px] font-black text-slate-600 uppercase">Faltan</span>
                                        </div>
                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden relative z-10">
                                            <div
                                                className={`h-full transition-all duration-1000 ${isExpired ? 'bg-red-500' : 'bg-orange-500'}`}
                                                style={{ width: `${100 - progress}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                    {/* Production Integration Banner */}
                    {relevantProductionTasks.length > 0 && (
                        <div className="premium-glass p-6 rounded-[2rem] border border-primary/20 bg-primary/5 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-primary group-hover:animate-bounce">
                                    <ChefHat size={20} />
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Sincronización de Producción</h4>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{relevantProductionTasks.length} Procesos Activos Requieren Monitoreo</p>
                                </div>
                            </div>
                            <div className="flex -space-x-2">
                                {relevantProductionTasks.slice(0, 3).map((task, i) => (
                                    <div key={task.id} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[8px] font-black text-primary shadow-lg" style={{ zIndex: 3 - i }}>
                                        {task.title.charAt(0)}
                                    </div>
                                ))}
                                {relevantProductionTasks.length > 3 && (
                                    <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[8px] font-black text-white shadow-lg" style={{ zIndex: 0 }}>
                                        +{relevantProductionTasks.length - 3}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activePCCs.map(pcc => (
                        <div key={pcc.id} className="group relative bg-white/[0.02] hover:bg-white/[0.04] p-8 rounded-[2.5rem] border border-white/5 hover:border-emerald-500/30 transition-all duration-500 shadow-sm overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />

                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div>
                                    <h4 className="text-lg font-black text-white uppercase tracking-wider mb-1">{pcc.name}</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/40 rounded-lg border border-white/5">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Rango Seguro:</span>
                                            <span className="text-[10px] font-black font-mono text-emerald-400">{pcc.minTemp}°C <span className="text-slate-600">to</span> {pcc.maxTemp}°C</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {getTodayLogs(pcc.id).length > 0 && (
                                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-4 py-1.5 rounded-full border border-emerald-400/20 font-mono italic">
                                            {getTodayLogs(pcc.id).length} REGISTROS
                                        </span>
                                    )}
                                    {activeTimersOnPcc(pcc.id).map(t => (
                                        <span key={t.id} className="text-[9px] font-black text-orange-400 bg-orange-400/10 px-4 py-1.5 rounded-full border border-orange-400/20 font-mono flex items-center gap-2">
                                            <Clock size={10} className="animate-spin-slow" /> TIMER ACTIVO
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div className="flex gap-4">
                                    <div className="relative flex-1 group/input">
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="00.0"
                                            value={inputs[pcc.id] || ''}
                                            onChange={(e) => handleInputChange(pcc.id, e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-2xl font-black text-white placeholder-slate-800 focus:outline-none focus:border-emerald-500/50 focus:bg-black/60 transition-all duration-300 font-mono"
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-black text-slate-800 group-focus-within/input:text-emerald-500/50 transition-colors">°C</span>
                                    </div>
                                    <button
                                        onClick={() => handleSave(pcc)}
                                        disabled={!inputs[pcc.id]}
                                        className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-10 disabled:grayscale text-white px-10 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 group/save"
                                    >
                                        <Save className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Observaciones..."
                                            value={notes[pcc.id] || ''}
                                            onChange={(e) => handleNotesChange(pcc.id, e.target.value)}
                                            className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-[11px] font-black text-white placeholder-slate-600 outline-none focus:border-white/20 transition-all uppercase tracking-wider"
                                        />
                                    </div>

                                    {/* Timer Controls on PCC */}
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <select
                                                value={timerDuration}
                                                onChange={(e) => setTimerDuration(e.target.value)}
                                                className="w-full h-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black text-slate-400 outline-none appearance-none hover:bg-white/[0.05] transition-all cursor-pointer"
                                            >
                                                <option value="30">30 MINS</option>
                                                <option value="60">60 MINS</option>
                                                <option value="120">120 MINS</option>
                                                <option value="240">4 HORAS</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                                                <Clock size={12} />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => startTimer(pcc.id)}
                                            className="bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white px-4 rounded-xl border border-orange-500/20 transition-all duration-500 flex items-center gap-2 group/timer"
                                        >
                                            <Play size={14} className="group-hover/timer:scale-110" />
                                            <span className="text-[9px] font-black uppercase tracking-widest hidden lg:block">Iniciar Protocolo</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative line */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 bg-emerald-500/0 group-hover:bg-emerald-500/50 transition-all duration-500 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Today's Logs */}
            <div className="space-y-8 flex flex-col h-full">
                <div className="flex justify-between items-center px-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <FileText className="text-slate-500" size={24} /> Auditoría Diaria <span className="text-slate-700 font-mono text-sm ml-2">[{format(new Date(), 'dd/MM/yyyy')}]</span>
                    </h3>
                </div>

                <div className="flex-1 premium-glass border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col relative">
                    <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pr-4 space-y-10 relative z-10">
                        {activePCCs.map(pcc => {
                            const logs = getTodayLogs(pcc.id);
                            if (logs.length === 0) return null;

                            return (
                                <div key={pcc.id} className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] whitespace-nowrap">{pcc.name}</h5>
                                        <div className="h-px bg-white/5 flex-1" />
                                    </div>
                                    <div className="space-y-3">
                                        {logs.map(log => (
                                            <div key={log.id} className="group relative flex justify-between items-center bg-white/[0.02] hover:bg-white/[0.05] p-5 rounded-3xl border border-white/5 transition-all duration-500 shadow-sm overflow-hidden">
                                                <div className="flex items-center gap-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black font-mono text-slate-600 uppercase tracking-widest mb-1">Registro TI</span>
                                                        <span className="text-xs font-black text-white font-mono">
                                                            {format(new Date(log.timestamp), 'HH:mm')}
                                                        </span>
                                                    </div>

                                                    <div className="h-10 w-px bg-white/5 mx-2" />

                                                    <div className="flex items-center gap-4">
                                                        <span className={`text-2xl font-black font-mono tracking-tighter ${log.status === 'CRITICAL' ? 'text-red-500 animate-pulse' :
                                                            log.status === 'WARNING' ? 'text-amber-500' : 'text-emerald-500'
                                                            }`}>
                                                            {log.value.toFixed(1)}°C
                                                        </span>

                                                        {log.notes && (
                                                            <div className="hidden md:flex flex-col">
                                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Nexo Operativo</span>
                                                                <span className="text-[10px] text-slate-400 font-medium italic truncate max-w-[150px]">
                                                                    "{log.notes}"
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {log.pdfUrl && (
                                                        <a
                                                            href={log.pdfUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-10 h-10 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl border border-primary/20 flex items-center justify-center transition-all duration-300 shadow-lg"
                                                            title="Ver Documento"
                                                        >
                                                            <FileText size={16} />
                                                        </a>
                                                    )}
                                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest shadow-xl transition-all duration-500 ${log.status === 'CORRECT' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
                                                        log.status === 'WARNING' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                                                            'text-red-500 bg-red-500/10 border-red-500/20 animate-pulse scale-105'
                                                        }`}>
                                                        {log.status === 'CORRECT' ? (
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                        )}
                                                        {log.status}
                                                    </div>
                                                </div>

                                                {/* Status line */}
                                                <div className={`absolute top-0 right-0 w-1 h-full opacity-50 ${log.status === 'CORRECT' ? 'bg-emerald-500' :
                                                    log.status === 'WARNING' ? 'bg-amber-500' : 'bg-red-500'
                                                    }`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {activePCCs.every(pcc => getTodayLogs(pcc.id).length === 0) && (
                            <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-20">
                                <div className="w-16 h-16 rounded-[2rem] border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                                    <ClipboardList size={24} />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Cero Registros Detectados</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


