import { useState, type FC } from 'react';
import { X, Calendar, Users, Plus, FileText, Trash2, Brain } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Event, EventType, SportsMenuData } from '@/types';
import { SportsMenuScanner } from '../scanner/SportsMenuScanner';
import { useStore } from '@/presentation/store/useStore';

interface DayDetailsModalProps {
    date: Date;
    events: Event[];
    onClose: () => void;
    onAddEvent: () => void;
    onEditEvent?: (event: Event) => void;
    onOpenProduction?: (event: Event) => void;
    onDeleteEvent?: (id: string) => void;
}

const eventColors: Record<EventType, string> = {
    'Comida': 'bg-orange-500/20 text-orange-300 border-orange-500/50',
    'Cena': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50',
    'Coctel': 'bg-pink-500/20 text-pink-300 border-pink-500/50',
    'Empresa': 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    'Mediodia': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
    'Noche': 'bg-purple-500/20 text-purple-300 border-purple-500/50',
    'Equipo Deportivo': 'bg-green-500/20 text-green-300 border-green-500/50',
    'Coffee Break': 'bg-stone-500/20 text-stone-300 border-stone-500/50',
    'Boda': 'bg-rose-500/20 text-rose-300 border-rose-500/50',
    'Otros': 'bg-gray-500/20 text-gray-300 border-gray-500/50',
};

export const DayDetailsModal: FC<DayDetailsModalProps> = ({
    date,
    events,
    onClose,
    onAddEvent,
    onEditEvent,
    onOpenProduction,
    onDeleteEvent
}) => {
    const { updateEvent } = useStore();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [scanningEventId, setScanningEventId] = useState<string | null>(null);

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
    };

    const confirmDelete = () => {
        if (deletingId && onDeleteEvent) {
            onDeleteEvent(deletingId);
            setDeletingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-surface border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 text-primary p-2 rounded-lg">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white capitalize">
                                {format(date, 'EEEE, d MMMM', { locale: es })}
                            </h3>
                            <p className="text-sm text-slate-400">
                                {events.length} {events.length === 1 ? 'Evento' : 'Eventos'} programados
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Event List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Calendar className="w-12 h-12 opacity-20 mb-3" />
                            <p>No hay eventos programados para este día.</p>
                        </div>
                    ) : (
                        (() => {
                            // 1. Group events by name
                            const grouped: Record<string, Event[]> = {};
                            events.forEach(e => {
                                if (!grouped[e.name]) grouped[e.name] = [];
                                grouped[e.name]!.push(e);
                            });

                            return Object.entries(grouped).map(([name, groupEvents]) => {
                                const firstEvent = groupEvents[0]!;
                                const totalPax = groupEvents.reduce((sum, e) => sum + e.pax, 0);

                                return (
                                    <div key={name} className="space-y-2">
                                        <div className={`p-3 rounded-t-xl border-x border-t ${eventColors[firstEvent.type] || 'bg-slate-700/50 border-slate-600'} flex justify-between items-center`}>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-lg">{name}</h4>
                                                {groupEvents.length > 1 && (
                                                    <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-medium">
                                                        {groupEvents.length} Salones
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm font-bold">
                                                <Users className="w-4 h-4" />
                                                <span>{totalPax} PAX Total</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {groupEvents.map(event => (
                                                <div
                                                    key={event.id}
                                                    className="bg-slate-800/50 border border-white/5 p-4 rounded-xl transition-all hover:bg-slate-800/80"
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                                                {event.room || 'Salón no especificado'}
                                                            </span>
                                                            <span className="text-sm opacity-70">
                                                                {event.type} • {event.pax} PAX
                                                            </span>
                                                        </div>
                                                        <span className="uppercase text-[9px] font-bold tracking-wider opacity-60 border border-current px-2 py-0.5 rounded-full">
                                                            Ref: {event.id.slice(0, 4)}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {event.menu && (
                                                            <div className="flex items-start gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
                                                                <FileText className="w-4 h-4 text-primary mt-1 shrink-0" />
                                                                <div className="min-w-0">
                                                                    <div className="text-sm font-semibold text-white truncate">{event.menu.name}</div>
                                                                    {event.menu.description && (
                                                                        <div className="text-[10px] text-slate-400 line-clamp-1">{event.menu.description}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {event.notes && (
                                                            <div className="text-xs opacity-60 italic py-1 border-l-2 border-white/10 pl-3 whitespace-pre-wrap">
                                                                {event.notes}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {onOpenProduction && (
                                                            <button
                                                                onClick={() => onOpenProduction(event)}
                                                                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 border border-white/5"
                                                            >
                                                                <Users className="w-3.5 h-3.5" /> KDS
                                                            </button>
                                                        )}
                                                        {event.type === 'Equipo Deportivo' && (
                                                            <button
                                                                onClick={() => setScanningEventId(event.id)}
                                                                className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary py-1.5 rounded-lg text-xs font-bold transition-colors border border-primary/30 flex items-center justify-center gap-2"
                                                            >
                                                                <Brain className="w-3.5 h-3.5" /> AI Scan
                                                            </button>
                                                        )}
                                                        {onEditEvent && (
                                                            <button
                                                                onClick={() => onEditEvent(event)}
                                                                className="px-3 bg-white/5 hover:bg-white/10 text-slate-300 py-1.5 rounded-lg text-xs font-medium transition-colors border border-white/5"
                                                                title="Editar Salón"
                                                            >
                                                                <FileText className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {onDeleteEvent && (
                                                            deletingId === event.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={confirmDelete}
                                                                        className="px-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 py-1.5 rounded-lg text-xs font-medium transition-colors border border-red-500/50"
                                                                    >
                                                                        Confirmar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDeletingId(null)}
                                                                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleDeleteClick(event.id)}
                                                                    className="px-3 bg-white/5 hover:bg-red-500/20 text-slate-400 py-1.5 rounded-lg text-xs font-medium transition-colors border border-white/5"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            });
                        })()
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/10 bg-white/5 shrink-0">
                    <button
                        onClick={onAddEvent}
                        className="w-full bg-primary hover:bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus className="w-5 h-5" /> Añadir Nuevo Evento
                    </button>
                </div>
            </div>

            {scanningEventId && (
                <SportsMenuScanner
                    event={events.find(e => e.id === scanningEventId)!}
                    onClose={() => setScanningEventId(null)}
                    onScanComplete={async (data: SportsMenuData) => {
                        const event = events.find(e => e.id === scanningEventId);
                        if (event) {
                            // Extract structured text for notes
                            const coursesText = data.courses?.map((c) => {
                                const category = (c.category || 'Sin Categoría').toUpperCase();
                                const items = c.items?.map((i) =>
                                    `- ${i.name || 'Sin nombre'}${i.notes ? ` (${i.notes})` : ''}${i.quantity ? ` [${i.quantity}]` : ''}${i.isHandwritten ? ' ✍️' : ''}`
                                ).join('\n') || 'Sin platos';
                                return `[${category}]\n${items}`;
                            }).join('\n\n') || '';

                            const finalNotes = `--- MENÚ ESCANEADO AI (${data.mealType}) ---\n${coursesText}\n\nNOTAS GLOBALES: ${data.globalNotes || 'N/A'}\nNOTAS MANUSCRITAS: ${data.handwrittenTranscriptions || 'N/A'}\n\n${event.notes || ''}`;

                            await updateEvent({
                                ...event,
                                notes: finalNotes
                            });
                        }
                        setScanningEventId(null);
                    }}
                />
            )}
        </div>
    );
};
