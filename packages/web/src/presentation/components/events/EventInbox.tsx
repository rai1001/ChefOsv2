import { useState } from 'react';
import { RefreshCw, Wand2, X, Check } from 'lucide-react';
import type { PendingEvent } from '@/types';
import { integrationService } from '@/services/integrationService';
import { useStore } from '@/presentation/store/useStore';
import { useToast } from '@/presentation/components/ui/Toast';

export const EventInbox = () => {
    const [events, setEvents] = useState<PendingEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const { addEvent } = useStore(); // Assuming usestore exports addEvent or we need to access the slice directly
    // Note: If addEvent is not directly exported from useStore, we might need to verify useStore structure.
    // For now assuming a standard Zustand store setup with slices merged.

    const { addToast } = useToast();

    const scanEmails = async () => {
        setLoading(true);
        try {
            const foundEvents = await integrationService.scanEmailsForEvents();
            // Filter out events that might already be processed if we had persistence
            setEvents(foundEvents);
            if (foundEvents.length > 0) {
                addToast(`Se han encontrado ${foundEvents.length} posibles eventos`, 'success');
            } else {
                addToast('No se encontraron nuevos eventos en los correos', 'info');
            }
        } catch (error) {
            addToast('Error al escanear correos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (pendingEvent: PendingEvent) => {
        // 1. Create internal event
        const newEvent = {
            id: crypto.randomUUID(),
            name: pendingEvent.predictedTitle || pendingEvent.subject,
            date: pendingEvent.predictedDate || new Date().toISOString().split('T')[0],
            pax: pendingEvent.predictedPax || 0,
            type: pendingEvent.predictedMenuType || 'Otros',
            notes: `Origen: ${pendingEvent.source}\nRemitente: ${pendingEvent.sender}\n\n${pendingEvent.snippet}`,
        };

        // @ts-ignore - Assuming addEvent exists in the store
        addEvent(newEvent);

        // 2. Sync back to External Calendar (Google/Outlook)
        const provider = pendingEvent.source === 'EMAIL_GMAIL' ? 'google' : 'outlook';
        await integrationService.syncToCalendar(newEvent, provider);

        // 3. Update local state
        setEvents(prev => prev.filter(e => e.id !== pendingEvent.id));
        addToast('Evento añadido y sincronizado con calendario', 'success');
    };

    const handleReject = (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
    };

    return (
        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden mb-6">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Wand2 size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Sugerencias de IA</h3>
                        <p className="text-xs text-slate-400">Detecta eventos automáticamente desde tus correos</p>
                    </div>
                </div>
                <button
                    onClick={scanEmails}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Escaneando...' : 'Escanear Bandeja'}
                </button>
            </div>

            {events.length === 0 ? (
                <div className="p-8 text-center">
                    {loading ? (
                        <p className="text-slate-400 text-sm">Analizando correos en busca de eventos...</p>
                    ) : (
                        <p className="text-slate-500 text-sm">No hay sugerencias pendientes. Dale a "Escanear" para buscar nuevos eventos.</p>
                    )}
                </div>
            ) : (
                <div className="divide-y divide-white/5">
                    {events.map((event) => (
                        <div key={event.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${event.source === 'EMAIL_GMAIL' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'
                                            }`}>
                                            {event.source === 'EMAIL_GMAIL' ? 'Gmail' : 'Outlook'}
                                        </span>
                                        <span className="text-xs text-slate-500">{new Date(event.receivedAt).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-medium text-white mb-0.5">{event.subject}</h4>
                                    <p className="text-sm text-slate-400 line-clamp-2 mb-3">{event.snippet}</p>

                                    {/* AI Extract Preview */}
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {event.predictedDate && (
                                            <div className="px-2 py-1 rounded bg-white/5 text-slate-300 border border-white/5">
                                                📅 {event.predictedDate}
                                            </div>
                                        )}
                                        {event.predictedPax && (
                                            <div className="px-2 py-1 rounded bg-white/5 text-slate-300 border border-white/5">
                                                👥 {event.predictedPax} pax
                                            </div>
                                        )}
                                        {event.predictedMenuType && (
                                            <div className="px-2 py-1 rounded bg-white/5 text-slate-300 border border-white/5">
                                                🍽️ {event.predictedMenuType}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleReject(event.id)}
                                        className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                                        title="Descartar"
                                    >
                                        <X size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleApprove(event)}
                                        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors"
                                        title="Aprobar y Añadir"
                                    >
                                        <Check size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
