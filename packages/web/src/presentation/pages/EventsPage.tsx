import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/presentation/store/useStore';
import { Calendar, ChevronLeft, ChevronRight, Users, Import, Sparkles } from 'lucide-react';
import { parseISO } from 'date-fns';
import { normalizeDate } from '@/utils/date';
import type { EventType, GeneratedMenu, Event, Menu } from '@/types';
import { EventForm } from '@/presentation/components/events/EventForm';
import { EventImportModal } from '@/presentation/components/events/EventImportModal';
import { MenuGeneratorModal } from '@/presentation/components/ai/MenuGeneratorModal';
import { DayDetailsModal } from '@/presentation/components/schedule/DayDetailsModal';
import { EventsSkeleton } from '@/presentation/components/ui/Skeletons';
import { EventInbox } from '@/presentation/components/events/EventInbox';
import { ErrorState } from '@/presentation/components/ui/ErrorState';
import { addDocument } from '@/services/firestoreService';
import { collections } from '@/config/collections';

export const EventsPage: React.FC = () => {
    const { getFilteredEvents, fetchEventsRange, eventsLoading, activeOutletId, setSelectedProductionEventId, addMenu, deleteEvent } = useStore();
    const navigate = useNavigate();
    const events = getFilteredEvents(); // This returns the currently loaded events (filtered by outlet)
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined);
    const [prefillEventData, setPrefillEventData] = useState<Partial<Event> | undefined>(undefined);
    const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showMenuGenerator, setShowMenuGenerator] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const refreshEvents = () => {
        if (activeOutletId) {
            const year = currentDate.getFullYear();
            const monthVal = currentDate.getMonth();
            const startStr = `${year}-${String(monthVal + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(year, monthVal + 1, 0).getDate();
            const endStr = `${year}-${String(monthVal + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            fetchEventsRange(startStr, endStr);
        }
    };

    const handleOpenProduction = (event: any) => {
        setSelectedProductionEventId(event.id);
        navigate('/production');
        setShowDayDetailsModal(false);
    };


    useEffect(() => {
        if (activeOutletId) {
            // Calculate start and end of the month
            const year = currentDate.getFullYear();
            const monthVal = currentDate.getMonth();

            // Start: First day of month (Manual construction)
            const startMonth = String(monthVal + 1).padStart(2, '0');
            const startStr = `${year}-${startMonth}-01`;

            // End: Last day of month
            const lastDay = new Date(year, monthVal + 1, 0).getDate();
            const endMonth = String(monthVal + 1).padStart(2, '0');
            const endDay = String(lastDay).padStart(2, '0');
            // Check if end of month spans into next year (e.g. searching range) - actually here we just want the current month range.
            // standard Date(year, month + 1, 0) gives correct last day of *this* month.
            const endStr = `${year}-${endMonth}-${endDay}`;

            fetchEventsRange(startStr, endStr);
        }
    }, [currentDate, activeOutletId, fetchEventsRange]);


    const handleDayClick = (dateStr: string) => {
        setSelectedDate(dateStr);
        setShowDayDetailsModal(true);
    };

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Monday start (0=Mon, 6=Sun) or standard (0=Sun)? 
        // Let's use standard Monday start for Kitchen logic usually: 1=Mon...0=Sun
        // JS: 0=Sun. 
        // Kitchen often Monday. Let's stick to Monday start. 
        // If day 0 (Sun), return 6. If day 1 (Mon), return 0.
    };

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

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

    const handleApplyMenu = async (menu: GeneratedMenu, context: { eventType: string, pax: number }) => {
        try {
            // 1. Create the menu object
            const menuData: Omit<Menu, 'id'> = {
                name: menu.name,
                description: `${menu.description} \n\n${menu.dishes.map(d => `- [${d.category}] ${d.name}: ${d.description}`).join('\n')} `,
                recipeIds: [],
                sellPrice: menu.sellPrice,
                outletId: activeOutletId || undefined
            };

            // 2. Save to Firestore
            const newMenuId = await addDocument(collections.menus, menuData);

            // 3. Update local store
            addMenu({ ...menuData, id: newMenuId });

            // 4. Set prefill data and open event form
            setPrefillEventData({
                name: `${context.eventType} - ${menu.name} `,
                pax: context.pax,
                type: context.eventType as EventType,
                menuId: newMenuId
            });

            setShowMenuGenerator(false);
            setShowAddModal(true);
        } catch (error) {
            console.error("Error creating menu:", error);
            setError("Error al guardar el menú generado");
        }
    };

    if (!isMounted) return <EventsSkeleton />;
    // In a real app, we would check store.error here
    if (error) return <ErrorState message={error} onRetry={() => setError(null)} />;

    return (
        <div className="h-full flex flex-col p-6 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-primary" />
                    <h2 className="text-2xl font-bold text-white">Events Calendar</h2>
                    {eventsLoading && <span className="ml-2 text-sm text-slate-400 animate-pulse">Cargando...</span>}
                </div>

                <div className="flex gap-2 ml-auto">
                    <button
                        onClick={() => setShowMenuGenerator(true)}
                        className="flex items-center gap-2 bg-purple-500/20 text-purple-400 border border-purple-500/50 px-4 py-2 rounded-lg hover:bg-purple-500/30 transition-colors"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Asistente IA</span>
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-4 py-2 rounded-lg hover:bg-emerald-500/30 transition-colors"
                    >
                        <Import className="w-4 h-4" />
                        <span>Importar / Escanear</span>
                    </button>
                </div>

                <div className="flex items-center gap-4 bg-surface/50 rounded-lg p-1">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-md transition-colors text-slate-300">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-lg font-semibold text-white min-w-[150px] text-center">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-md transition-colors text-slate-300">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Event Inbox (AI Predictions) */}
            <EventInbox />

            {/* Calendar Grid */}
            <div className="flex-1 glass-card p-4 flex flex-col overflow-hidden">
                {/* Weekdays */}
                <div className="grid grid-cols-7 mb-2 border-b border-slate-700 pb-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="text-center text-slate-400 font-medium text-sm py-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-1 overflow-auto">
                    {/* Empty cells for padding */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty - ${i} `} className="bg-slate-900/30 rounded-lg" />
                    ))}

                    {/* Actual Days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        // Manual date string construction to avoid timezone shifts from new Date()
                        const year = currentDate.getFullYear();
                        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const day = String(dayNum).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        const dayEvents = events.filter(e => normalizeDate(e.date) === dateStr);

                        return (
                            <div
                                key={dateStr}
                                onClick={() => handleDayClick(dateStr)}
                                className="bg-slate-800/40 rounded-lg p-2 flex flex-col border border-transparent hover:border-slate-600 transition-colors min-h-[100px] cursor-pointer group"
                            >
                                <span className={`text - sm font - semibold mb - 1 ${dateStr === normalizeDate(new Date())
                                    ? 'bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center'
                                    : 'text-slate-400'
                                    } `}>
                                    {dayNum}
                                </span>

                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                                    {(() => {
                                        // Group events by name
                                        const grouped: Record<string, { event: Event, rooms: string[], totalPax: number, ids: string[] }> = {};
                                        dayEvents.forEach(e => {
                                            const key = e.name;
                                            if (!grouped[key]) {
                                                grouped[key] = { event: e, rooms: [], totalPax: 0, ids: [] };
                                            }
                                            if (e.room) grouped[key].rooms.push(e.room);
                                            grouped[key].totalPax += e.pax;
                                            grouped[key].ids.push(e.id);
                                        });

                                        return Object.values(grouped).map(({ event, rooms, totalPax }) => (
                                            <div
                                                key={event.id}
                                                className={`text-xs p-1.5 rounded border ${eventColors[event.type] || 'bg-slate-700 text-slate-300'} cursor-pointer hover:opacity-80 transition-opacity`}
                                            >
                                                <div className="font-semibold truncate">
                                                    {event.name}
                                                    {rooms.length > 1 && <span className="ml-1 text-[10px] opacity-70">({rooms.length} salones)</span>}
                                                </div>
                                                <div className="flex items-center justify-between mt-0.5 opacity-80">
                                                    <span className="flex items-center gap-0.5" title={rooms.length > 1 ? `Total PAX entre ${rooms.length} salones` : ''}>
                                                        <Users className="w-3 h-3" /> {totalPax}
                                                    </span>
                                                    <span className="uppercase text-[10px] truncate max-w-[40%] text-right">
                                                        {rooms.length === 1 ? rooms[0] : event.type}
                                                    </span>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-md">
                        <div onClick={e => e.stopPropagation()}>
                            <EventForm
                                initialDate={selectedDate || undefined}
                                initialData={editingEvent}
                                prefillData={prefillEventData}
                                onClose={() => {
                                    setShowAddModal(false);
                                    setEditingEvent(undefined);
                                    setPrefillEventData(undefined);
                                }}
                                onSuccess={refreshEvents}
                            />
                        </div>
                    </div>
                </div>
            )}
            {showImportModal && (
                <EventImportModal
                    onClose={() => setShowImportModal(false)}
                    onSave={() => {
                        // Refresh logic if needed, currently store reacts automatically
                    }}
                />
            )}

            <MenuGeneratorModal
                isOpen={showMenuGenerator}
                onClose={() => setShowMenuGenerator(false)}
                onApply={handleApplyMenu}
            />

            {showDayDetailsModal && selectedDate && (
                <DayDetailsModal
                    date={parseISO(selectedDate)}
                    events={events.filter(e => normalizeDate(e.date) === selectedDate)}
                    onClose={() => setShowDayDetailsModal(false)}
                    onAddEvent={() => {
                        setEditingEvent(undefined);
                        setShowDayDetailsModal(false);
                        setShowAddModal(true);
                    }}
                    onEditEvent={(event) => {
                        setEditingEvent(event);
                        setShowDayDetailsModal(false);
                        setShowAddModal(true);
                    }}
                    onOpenProduction={handleOpenProduction}
                    onDeleteEvent={deleteEvent}
                />
            )}
        </div>
    );
};


