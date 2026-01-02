import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/presentation/store/useStore';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Import,
  Sparkles,
  LayoutGrid,
  List as ListIcon,
  Filter,
  Coffee,
  Wine,
  Briefcase,
  Utensils,
  Moon,
  Sun,
  Trophy,
  Heart,
  MoreHorizontal,
} from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizeDate } from '@/utils/date';
import type { EventType, GeneratedMenu, Event, Menu } from '@/types';
import { EventForm } from '@/presentation/components/events/EventForm';
import { EventImportModal } from '@/presentation/components/events/EventImportModal';
import { UniversalImporter } from '@/presentation/components/common/UniversalImporter';
import { MenuGeneratorModal } from '@/presentation/components/ai/MenuGeneratorModal';
import { DayDetailsModal } from '@/presentation/components/schedule/DayDetailsModal';
import { EventsSkeleton } from '@/presentation/components/ui/Skeletons';
import { EventInbox } from '@/presentation/components/events/EventInbox';
import { ErrorState } from '@/presentation/components/ui/ErrorState';
import { addDocument } from '@/services/firestoreService';
import { collections } from '@/config/collections';

// --- Configuration & Helpers ---

const EVENT_TYPE_ICONS: Record<EventType, React.ReactNode> = {
  Comida: <Utensils size={14} />,
  Cena: <Moon size={14} />,
  Coctel: <Wine size={14} />,
  Empresa: <Briefcase size={14} />,
  Mediodia: <Sun size={14} />,
  Noche: <Moon size={14} />,
  'Equipo Deportivo': <Trophy size={14} />,
  'Coffee Break': <Coffee size={14} />,
  Boda: <Heart size={14} />,
  Otros: <MoreHorizontal size={14} />,
};

const EVENT_COLORS: Record<EventType, string> = {
  Comida: 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20',
  Cena: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20',
  Coctel: 'bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/20',
  Empresa: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
  Mediodia: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
  Noche: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20',
  'Equipo Deportivo':
    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
  'Coffee Break': 'bg-stone-500/10 text-stone-400 border-stone-500/20 hover:bg-stone-500/20',
  Boda: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20',
  Otros: 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20',
};

type ViewMode = 'month' | 'list';

export const EventsPage: React.FC = () => {
  // --- Store & Hooks ---
  const {
    getFilteredEvents,
    fetchEventsRange,
    eventsLoading,
    activeOutletId,
    setSelectedProductionEventId,
    addMenu,
    deleteEvent,
  } = useStore();
  const navigate = useNavigate();
  const allEvents = getFilteredEvents();

  // --- Local State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filterType, setFilterType] = useState<EventType | 'All'>('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined);
  const [prefillEventData, setPrefillEventData] = useState<Partial<Event> | undefined>(undefined);
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMenuGenerator, setShowMenuGenerator] = useState(false);

  // Status
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Lifecycle ---
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch Events on Date/Outlet Change
  useEffect(() => {
    if (activeOutletId) {
      const year = currentDate.getFullYear();
      const monthVal = currentDate.getMonth();
      const startStr = `${year}-${String(monthVal + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, monthVal + 1, 0).getDate();
      const endStr = `${year}-${String(monthVal + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Just ensure we have a wider range for list view if needed, but per month is fine
      fetchEventsRange(startStr, endStr);
    }
  }, [currentDate, activeOutletId, fetchEventsRange]);

  // --- Actions ---
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

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowDayDetailsModal(true);
  };

  const handleApplyMenu = async (
    menu: GeneratedMenu,
    context: { eventType: string; pax: number }
  ) => {
    try {
      const menuData: Omit<Menu, 'id'> = {
        name: menu.name,
        description: `${menu.description} \n\n${menu.dishes.map((d) => `- [${d.category}] ${d.name}: ${d.description}`).join('\n')} `,
        recipeIds: [],
        sellPrice: menu.sellPrice,
        outletId: activeOutletId || undefined,
      };

      const newMenuId = await addDocument(collections.menus, menuData);
      addMenu({ ...menuData, id: newMenuId });

      setPrefillEventData({
        name: `${context.eventType} - ${menu.name} `,
        pax: context.pax,
        type: context.eventType as EventType,
        menuId: newMenuId,
      });

      setShowMenuGenerator(false);
      setShowAddModal(true);
    } catch (error) {
      console.error('Error creating menu:', error);
      setError('Error al guardar el menú generado');
    }
  };

  // --- Data Processing ---

  // Filter events
  const displayedEvents = useMemo(() => {
    return allEvents.filter((e) => filterType === 'All' || e.type === filterType);
  }, [allEvents, filterType]);

  // Calendar Grid Logic
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from Monday (adjust if needed, assumes 1=Mon...0=Sun logic)
    // JS getDay(): 0=Sun, 1=Mon.
    // We want grid to start Monday.
    const startDayOfWeek = firstDay.getDay();
    const paddingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const daysInMonth = lastDay.getDate();

    return { paddingDays, daysInMonth, year, month };
  }, [currentDate]);

  // --- Renders ---

  if (!isMounted) return <EventsSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => setError(null)} />;

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden bg-[#0f1218]">
      {/* Header & Controls */}
      <div className="flex flex-col gap-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl text-primary border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Calendario</h2>
              <p className="text-sm text-slate-400 font-medium">Gestión de eventos y banquetes</p>
            </div>
            {eventsLoading && (
              <span className="ml-2 px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-slate-400 animate-pulse">
                ACTUALIZANDO...
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowMenuGenerator(true)}
              className="flex items-center gap-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-4 py-2.5 rounded-xl hover:bg-purple-500/20 transition-all text-xs font-bold uppercase tracking-wider"
            >
              <Sparkles className="w-4 h-4" />
              <span>Asistente IA</span>
            </button>
            <div className="flex gap-2 bg-[#1a2234] p-1 rounded-xl border border-white/5">
              <UniversalImporter
                buttonLabel="Imp."
                defaultType="event"
                onCompleted={refreshEvents}
              />
              <div className="w-px bg-white/10 my-1" />
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Importación Avanzada"
              >
                <Import className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* View Controls */}
          <div className="flex items-center gap-4">
            {/* Month Nav */}
            <div className="flex items-center gap-1 bg-[#1a2234] rounded-xl p-1 border border-white/5 shadow-sm">
              <button
                onClick={() =>
                  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
                }
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-300"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-black text-white px-4 min-w-[140px] text-center uppercase tracking-wider">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </span>
              <button
                onClick={() =>
                  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
                }
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-300"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex p-1 bg-[#1a2234] rounded-xl border border-white/5">
              <button
                onClick={() => setViewMode('month')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'month' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
              >
                <ListIcon size={18} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative group z-20">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[#1a2234] border border-white/5 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-wider">
                <Filter size={14} />
                {filterType === 'All' ? 'Todos los tipos' : filterType}
              </button>
              {/* Simple Dropdown for filters */}
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a2234] border border-white/10 rounded-xl shadow-xl p-1 hidden group-hover:block">
                <button
                  onClick={() => setFilterType('All')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-xs font-bold text-slate-300"
                >
                  Todos
                </button>
                {Object.keys(EVENT_TYPE_ICONS).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type as EventType)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-xs text-slate-400 hover:text-white truncate"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setEditingEvent(undefined);
                setPrefillEventData(undefined);
                setShowAddModal(true);
              }}
              className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2 uppercase tracking-wide text-xs"
            >
              Nuevo Evento
            </button>
          </div>
        </div>
      </div>

      {/* Event Inbox (AI Predictions) */}
      <EventInbox />

      {/* Content Area */}
      <div className="flex-1 min-h-0 bg-[#12161f] border border-white/5 rounded-2xl overflow-hidden shadow-Inner flex flex-col">
        {viewMode === 'month' ? (
          <>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-white/5 bg-[#1a2234]">
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(
                (day) => (
                  <div
                    key={day}
                    className="py-3 text-center text-xs font-black text-slate-500 uppercase tracking-widest"
                  >
                    {day.slice(0, 3)}
                  </div>
                )
              )}
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-px bg-white/5 overflow-y-auto custom-scrollbar">
              {/* Empty Padding Days */}
              {Array.from({ length: calendarDays.paddingDays }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-[#0f1218]" />
              ))}

              {/* Actual Days */}
              {Array.from({ length: calendarDays.daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const year = calendarDays.year;
                const month = String(calendarDays.month + 1).padStart(2, '0');
                const day = String(dayNum).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                const dayEvents = displayedEvents.filter((e) => normalizeDate(e.date) === dateStr);
                const isToday = normalizeDate(new Date()) === dateStr;

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleDayClick(dateStr)}
                    className={`bg-[#0f1218] min-h-[120px] p-2 flex flex-col transition-colors cursor-pointer group hover:bg-[#161b26] ${
                      isToday ? 'bg-[#161b26] ring-inset ring-1 ring-primary/30' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                          isToday
                            ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                            : 'text-slate-500 group-hover:text-white'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-mono text-slate-600 font-bold group-hover:text-slate-400">
                          {dayEvents.reduce((acc, e) => acc + e.pax, 0)}p
                        </span>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5 px-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={`px-2 py-1.5 rounded-lg border text-xs font-medium truncate flex items-center gap-1.5 transition-all ${EVENT_COLORS[event.type] || EVENT_COLORS['Otros']}`}
                        >
                          <span className="shrink-0 opacity-70">
                            {EVENT_TYPE_ICONS[event.type]}
                          </span>
                          <span className="truncate flex-1 font-bold">{event.name}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-500 text-center uppercase hover:text-white transition-colors">
                          +{dayEvents.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          // List View
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {calendarDays.daysInMonth > 0 ? (
              Array.from({ length: calendarDays.daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const year = calendarDays.year;
                const month = String(calendarDays.month + 1).padStart(2, '0');
                const day = String(dayNum).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                const dateObj = parseISO(dateStr);

                const dayEvents = displayedEvents.filter((e) => normalizeDate(e.date) === dateStr);
                if (dayEvents.length === 0) return null;

                return (
                  <div
                    key={dateStr}
                    className="flex gap-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group cursor-pointer"
                    onClick={() => handleDayClick(dateStr)}
                  >
                    {/* Date Column */}
                    <div className="flex flex-col items-center justify-center w-20 shrink-0 border-r border-white/10 pr-6">
                      <span className="text-3xl font-black text-slate-200">{dayNum}</span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {format(dateObj, 'EEE', { locale: es })}
                      </span>
                    </div>

                    {/* Events Column */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`p-3 rounded-xl border flex items-center gap-3 ${EVENT_COLORS[event.type]}`}
                        >
                          <div className="p-2 rounded-lg bg-black/10">
                            {EVENT_TYPE_ICONS[event.type]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{event.name}</p>
                            <p className="text-xs opacity-70 flex items-center gap-2">
                              <span>{event.pax} PAX</span>
                              {event.room && <span>• {event.room}</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 text-slate-500">No hay eventos cargados.</div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
      )}

      {showImportModal && (
        <EventImportModal
          onClose={() => setShowImportModal(false)}
          onSave={() => refreshEvents()}
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
          events={allEvents.filter((e) => normalizeDate(e.date) === selectedDate)}
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
