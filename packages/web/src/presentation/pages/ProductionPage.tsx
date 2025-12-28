import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/presentation/store/useStore';
import type { EventType } from '@/types';
import { calculateShoppingList } from '@/utils/production';
import {
  ShoppingCart,
  Calendar,
  Users,
  Plus,
  Printer,
  Download,
  Tag,
  Clock,
  ChefHat,
  LayoutDashboard,
} from 'lucide-react';
import { printLabel, formatLabelData } from '@/presentation/components/printing/PrintService';
import * as XLSX from 'xlsx';
import {
  format,
  parseISO,
  isBefore,
  startOfToday,
  endOfWeek,
  isAfter,
  endOfMonth,
  isWithinInterval,
} from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ProductionKanbanBoard } from '@/presentation/components/production/ProductionKanbanBoard';
import { ProductionPlanner } from '@/presentation/components/production/ProductionPlanner';
import { useProduction } from '@/presentation/hooks/useProduction';
import { ProductionTaskStatus, ProductionTask } from '@culinaryos/core';

export const ProductionPage: React.FC = () => {
  // New Store Props
  const {
    menus,
    events,
    setEvents,
    activeOutletId,
    selectedProductionEventId,
    setSelectedProductionEventId,
    staff,
  } = useStore();

  const {
    tasks: productionTasks,
    loading: _loading,
    fetchTasks,
    generateTasksForEvent,
    updateStatus,
    assignTask,
    createTask,
    scheduleTask,
    deleteTask,
  } = useProduction();

  // Fetch tasks when activeOutletId changes
  useEffect(() => {
    if (activeOutletId) {
      fetchTasks(activeOutletId);
    }
  }, [activeOutletId, fetchTasks]);

  // Local state for event creation
  const [eventForm, setEventForm] = useState({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    pax: 10,
    menuId: '',
  });
  const [activeTab, setActiveTab] = useState<'shopping' | 'mise-en-place' | 'kanban' | 'planning'>(
    'kanban'
  );

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    past: true,
    week: false,
    month: false,
    future: false,
  });

  // Aggregation Logic (Group same events by name and date)
  const aggregatedEvents = useMemo(() => {
    const filtered = events.filter((e) => !activeOutletId || e.outletId === activeOutletId);
    const map = new Map<string, any>();

    filtered.forEach((event) => {
      const key = `${event.date}_${event.name.trim().toLowerCase()}`;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.pax += event.pax;
        // Track all representative IDs for task aggregation
        existing.ids.push(event.id);
      } else {
        map.set(key, { ...event, ids: [event.id] });
      }
    });

    return Array.from(map.values());
  }, [events, activeOutletId]);

  // UI Grouping Logic by Timeframe
  const groupedEventsByTime = useMemo(() => {
    const today = startOfToday();
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthEnd = endOfMonth(today);

    const groups = {
      past: [] as typeof aggregatedEvents,
      week: [] as typeof aggregatedEvents,
      month: [] as typeof aggregatedEvents,
      future: [] as typeof aggregatedEvents,
    };

    aggregatedEvents.forEach((event) => {
      const eventDate = parseISO(event.date);
      if (isBefore(eventDate, today)) {
        groups.past.push(event);
      } else if (isWithinInterval(eventDate, { start: today, end: weekEnd })) {
        groups.week.push(event);
      } else if (
        isWithinInterval(eventDate, { start: weekEnd, end: monthEnd }) ||
        (isAfter(eventDate, weekEnd) && isBefore(eventDate, monthEnd))
      ) {
        groups.month.push(event);
      } else {
        groups.future.push(event);
      }
    });

    // Sort each group by date
    Object.keys(groups).forEach((key) => {
      (groups as any)[key].sort(
        (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });

    return groups;
  }, [aggregatedEvents]);

  // Resolving Selected Event (Aggregated)
  const selectedEvent = useMemo(() => {
    if (!selectedProductionEventId) return null;
    const original = events.find((e) => e.id === selectedProductionEventId);
    if (!original) return null;
    // Find the aggregated version that includes this event
    return aggregatedEvents.find(
      (ae) =>
        ae.date === original.date &&
        ae.name.trim().toLowerCase() === original.name.trim().toLowerCase()
    );
  }, [selectedProductionEventId, aggregatedEvents, events]);

  // Consolidating Tasks for Selected Aggregated Event
  const eventTasks = useMemo(() => {
    if (!selectedEvent) return [];
    const consolidatedMap = new Map<string, ProductionTask>();

    // We filter from the ALL productionTasks fetched by hook, looking for tasks belonging to any ID in selectedEvent.ids
    const relevantTasks = productionTasks.filter((task) =>
      selectedEvent.ids.includes(task.eventId || '')
    );

    relevantTasks.forEach((task) => {
      const taskKey = `${task.fichaId}_${task.station}`;
      if (consolidatedMap.has(taskKey)) {
        const existing = consolidatedMap.get(taskKey)!;
        // Add quantity (returns new Quantity)
        const newQty = existing.quantity.add(task.quantity);
        consolidatedMap.set(taskKey, { ...existing, quantity: newQty });
      } else {
        consolidatedMap.set(taskKey, { ...task });
      }
    });

    return Array.from(consolidatedMap.values());
  }, [selectedEvent, productionTasks]);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.menuId) return;

    const menu = menus.find((m) => m.id === eventForm.menuId);
    if (!menu) return;

    const event = {
      id: crypto.randomUUID(),
      name: eventForm.name || `Evento ${events.length + 1}`,
      date: eventForm.date,
      pax: eventForm.pax,
      type: 'Comida' as EventType,
      menuId: eventForm.menuId,
      menu: menu,
      outletId: activeOutletId || undefined,
    };

    setEvents([...events, event]);
    setSelectedProductionEventId(event.id);
    setEventForm({ name: '', date: format(new Date(), 'yyyy-MM-dd'), pax: 10, menuId: '' });
  };

  const shoppingList = useMemo(() => {
    if (!selectedEvent?.menu) return [];
    return calculateShoppingList(selectedEvent.menu, selectedEvent.pax);
  }, [selectedEvent]);

  const totalCost = shoppingList.reduce((sum, item) => sum + item.totalCost, 0);

  // Calculate Labor Cost
  const laborCost = useMemo(() => {
    if (!eventTasks) return 0;
    return eventTasks.reduce((sum, task) => {
      if (!task.assignedTo || !task.actualDuration) return sum;
      const emp = staff.find((e) => e.id === task.assignedTo);
      if (!emp?.hourlyRate) return sum;
      // actualDuration is in minutes? Core says minutes.
      const hours = task.actualDuration / 60;
      return sum + hours * emp.hourlyRate;
    }, 0);
  }, [eventTasks, staff]);

  const primeCost = totalCost + laborCost;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!selectedEvent) return;
    const rows = shoppingList.map((item) => ({
      Ingrediente: item.ingredientName,
      Cantidad: item.totalQuantity,
      Unidad: item.unit,
      CosteUnitario: item.totalQuantity > 0 ? item.totalCost / item.totalQuantity : 0,
      CosteTotal: item.totalCost,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Compra');
    XLSX.writeFile(wb, `Produccion_${selectedEvent.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleGenerateTasks = async () => {
    if (selectedEvent) {
      await generateTasksForEvent(selectedEvent);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: ProductionTaskStatus) => {
    await updateStatus(taskId, newStatus);
  };

  const handleToggleTimer = async (taskId: string) => {
    const task = productionTasks.find((t) => t.id === taskId);
    if (!task) return;

    // Simple toggle logic: If IN_PROGRESS -> PENDING. If PENDING/COMPLETED -> IN_PROGRESS.
    const newStatus =
      task.status === ProductionTaskStatus.IN_PROGRESS
        ? ProductionTaskStatus.PENDING
        : ProductionTaskStatus.IN_PROGRESS;

    await updateStatus(taskId, newStatus);
  };

  const handleAssignEmployee = async (taskId: string, employeeId: string) => {
    await assignTask(taskId, employeeId);
  };

  return (
    <div className="flex h-full bg-background animate-in fade-in duration-700">
      {/* Event List / Sidebar */}
      <div className="w-80 border-r border-white/5 bg-white/[0.02] p-6 flex flex-col overflow-hidden backdrop-blur-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/20 p-2 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.2)]">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Eventos</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
              Planificación de Producción
            </p>
          </div>
        </div>

        {/* New Event Form */}
        <form
          onSubmit={handleCreateEvent}
          className="premium-glass p-5 space-y-4 mb-8 flex-none border border-white/10 group"
        >
          <input
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary/50 transition-all placeholder:text-slate-600 font-bold uppercase tracking-widest"
            placeholder="Nombre del Evento"
            value={eventForm.name}
            onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              type="date"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
              value={eventForm.date}
              onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
            />
            <input
              type="number"
              className="w-20 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-center font-mono"
              placeholder="PAX"
              value={eventForm.pax}
              onChange={(e) => setEventForm({ ...eventForm, pax: Number(e.target.value) })}
            />
          </div>
          <select
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] text-slate-300 font-black uppercase tracking-[0.15em] focus:border-primary/50"
            value={eventForm.menuId}
            onChange={(e) => setEventForm({ ...eventForm, menuId: e.target.value })}
            required
          >
            <option value="">Seleccionar Menú...</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/80 text-white py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group-hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" /> Crear Evento
          </button>
        </form>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
          {events.length === 0 && (
            <div className="text-center py-12 opacity-30">
              <Calendar className="w-12 h-12 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Sin agendas activas
              </p>
            </div>
          )}

          {[
            {
              id: 'week',
              label: 'Esta Semana',
              items: groupedEventsByTime.week,
              color: 'text-primary',
            },
            {
              id: 'month',
              label: 'Este Mes',
              items: groupedEventsByTime.month,
              color: 'text-indigo-400',
            },
            {
              id: 'future',
              label: 'Próximos',
              items: groupedEventsByTime.future,
              color: 'text-slate-400',
            },
            {
              id: 'past',
              label: 'Finalizados',
              items: groupedEventsByTime.past,
              color: 'text-slate-600',
            },
          ].map(
            (section) =>
              section.items.length > 0 && (
                <div key={section.id} className="space-y-3">
                  <button
                    onClick={() =>
                      setCollapsedSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }))
                    }
                    className="flex items-center justify-between w-full px-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-white"
                  >
                    <span className={`flex items-center gap-2 ${section.color}`}>
                      <div className="w-1 h-1 rounded-full bg-current" />
                      {section.label}
                    </span>
                    {collapsedSections[section.id] ? (
                      <ChevronRight size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                  </button>

                  {!collapsedSections[section.id] && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                      {section.items.map((event: any) => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedProductionEventId(event.id)}
                          className={`p-5 rounded-2xl cursor-pointer border transition-all duration-500 relative overflow-hidden group z-10 ${
                            selectedProductionEventId === event.id
                              ? 'premium-glass border-primary/50 bg-primary/5 shadow-2xl shadow-primary/10'
                              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="font-black text-xs text-white uppercase tracking-tight relative z-20 group-hover:text-primary transition-colors">
                            {event.name}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex justify-between mt-3 relative z-20">
                            <span className="flex items-center gap-1.5 font-mono">
                              <Clock className="w-3 h-3 text-primary/50" /> {event.date}
                            </span>
                            <span className="bg-white/5 px-2 py-0.5 rounded text-primary">
                              {event.pax} PAX
                            </span>
                          </div>
                          {selectedProductionEventId === event.id && (
                            <div className="absolute left-0 top-0 w-1 h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)] z-20" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
          )}
        </div>
      </div>

      {/* Main Content: Production Sheet */}
      <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
        {selectedEvent ? (
          <div className="max-w-7xl mx-auto space-y-10">
            <header className="flex flex-col xl:flex-row xl:items-start justify-between gap-8 pb-8 border-b border-white/5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-[9px] font-black uppercase tracking-widest border border-primary/20">
                    {selectedEvent.menu?.name}
                  </span>
                  <span className="text-white/10 font-thin">|</span>
                  <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-3 h-3" /> {selectedEvent.pax} Invitados
                  </span>
                </div>
                <h1 className="text-6xl font-black text-white tracking-tighter uppercase leading-none">
                  {selectedEvent.name}
                </h1>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" /> Command Center Production v2.1
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex justify-end gap-3 print:hidden">
                  <button
                    onClick={handleExport}
                    className="premium-glass hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl transition-all border border-white/5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Download className="w-4 h-4" /> Export
                  </button>
                  <button
                    onClick={handlePrint}
                    className="premium-glass hover:bg-white/10 text-slate-300 px-4 py-2 rounded-xl transition-all border border-white/5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Printer className="w-4 h-4" /> Print PDF
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white/[0.01] p-6 rounded-[2rem] border border-white/5">
                  <div className="flex flex-col items-center sm:items-end justify-center px-4">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">
                      Food Cost
                    </p>
                    <p className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                      <span className="text-emerald-400 text-sm">€</span>
                      {totalCost.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center sm:items-end justify-center px-4 border-x border-white/5">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">
                      Labor Cost
                    </p>
                    <p className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                      <span className="text-blue-400 text-sm">€</span>
                      {laborCost.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center sm:items-end justify-center px-4 relative group">
                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <p className="text-[10px] text-primary font-black uppercase tracking-[0.25em] mb-2 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                      Prime Total
                    </p>
                    <p className="text-4xl font-black text-white font-mono flex items-baseline gap-1 relative z-10 tracking-tighter">
                      <span className="text-primary text-xl font-thin animate-pulse">€</span>
                      {primeCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 p-1 premium-glass border border-white/5 rounded-2xl w-fit print:hidden relative">
              {[
                { id: 'kanban', label: 'Kanban Board', icon: LayoutDashboard },
                { id: 'planning', label: 'Weekly Plan', icon: Calendar },
                { id: 'shopping', label: 'Shopping Index', icon: ShoppingCart },
                { id: 'mise-en-place', label: 'Mise en Place', icon: ChefHat },
              ].map((tab: any) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 relative z-10
                                        ${
                                          activeTab === tab.id
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.05]'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                        }`}
                >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-glow' : ''}`} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content with Animations */}
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
              {activeTab === 'shopping' ? (
                <div className="premium-glass border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/20 rounded-2xl">
                        <ShoppingCart className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">
                          Shopping Index
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          Requerimientos de Materia Prima
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="overflow-hidden border border-white/5 rounded-3xl">
                      <table className="w-full text-left">
                        <thead className="text-[10px] font-black uppercase bg-white/[0.03] text-slate-500 tracking-[0.2em]">
                          <tr>
                            <th className="px-8 py-5">Suministro / Ingrediente</th>
                            <th className="px-8 py-5 text-right">Cant. Necesaria</th>
                            <th className="px-8 py-5 text-right">Impacto Económico</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          {shoppingList.map((item) => (
                            <tr
                              key={item.ingredientId}
                              className="hover:bg-white/[0.015] transition-colors group"
                            >
                              <td className="px-8 py-6 font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                                {item.ingredientName}
                              </td>
                              <td className="px-8 py-6 text-right font-mono text-lg font-black text-white">
                                {item.totalQuantity.toFixed(2)}{' '}
                                <span className="text-[9px] text-slate-600 font-sans uppercase tracking-widest ml-1">
                                  {item.unit}
                                </span>
                              </td>
                              <td className="px-8 py-6 text-right font-black font-mono text-emerald-400 text-lg">
                                €{item.totalCost.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          {shoppingList.length === 0 && (
                            <tr>
                              <td
                                colSpan={3}
                                className="p-16 text-center text-slate-500 font-black uppercase tracking-widest text-xs opacity-50"
                              >
                                No supply data available for this configuration.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : activeTab === 'kanban' ? (
                <div className="h-[750px] flex flex-col">
                  {eventTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-24 premium-glass border-dashed border-2 border-white/5 border-spacing-4 rounded-[4rem]">
                      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-10 border border-primary/20 relative animate-pulse">
                        <div className="absolute inset-0 bg-primary/10 blur-3xl" />
                        <LayoutDashboard size={40} className="text-primary" />
                      </div>
                      <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
                        Pipeline Vacío
                      </h3>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] leading-relaxed max-w-sm mx-auto text-center mb-10">
                        No se han detectado flujos de trabajo de producción activos. Inicie la
                        propagación de tareas desde los KDS configurados.
                      </p>
                      <button
                        onClick={handleGenerateTasks}
                        className="px-10 py-5 bg-primary hover:bg-primary/80 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary/30 flex items-center gap-4 hover:scale-105"
                      >
                        <Plus size={20} /> Deploy Production KDS
                      </button>
                    </div>
                  ) : (
                    <ProductionKanbanBoard
                      tasks={eventTasks}
                      onTaskStatusChange={handleTaskStatusChange}
                      onToggleTimer={handleToggleTimer}
                      onAssignEmployee={handleAssignEmployee}
                      staff={staff}
                    />
                  )}
                </div>
              ) : activeTab === 'planning' ? (
                <ProductionPlanner
                  tasks={eventTasks}
                  eventId={selectedEvent.id}
                  outletId={activeOutletId || undefined}
                  onCreateTask={createTask}
                  onScheduleTask={scheduleTask}
                  onDeleteTask={deleteTask}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* Mise en Place by Station */}
                  {['hot', 'cold', 'dessert'].map((station) => {
                    const stationRecipes = (selectedEvent?.menu?.recipes || []).filter(
                      (r: any) => r.station === station
                    );
                    if (stationRecipes.length === 0) return null;

                    const stationLabels: Record<string, string> = {
                      hot: 'Partida Caliente',
                      cold: 'Partida Fría',
                      dessert: 'Repostería',
                    };
                    const stationGlow: Record<string, string> = {
                      hot: 'shadow-red-500/20',
                      cold: 'shadow-blue-500/20',
                      dessert: 'shadow-purple-500/20',
                    };

                    return (
                      <div
                        key={station}
                        className={`premium-glass border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl ${stationGlow[station]} flex flex-col group`}
                      >
                        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">
                              {stationLabels[station]}
                            </h3>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                              {stationRecipes.length} Procedimientos
                            </p>
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center font-black text-slate-400 font-mono text-sm border border-white/5">
                            {stationRecipes.length}
                          </div>
                        </div>
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                          {stationRecipes.map((recipe: any) => (
                            <div
                              key={recipe.id}
                              className="p-6 bg-white/[0.015] rounded-3xl border border-white/5 hover:border-white/20 transition-all duration-500 group/recipe overflow-hidden relative"
                            >
                              <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 group-hover/recipe:opacity-100 transition-opacity opacity-0" />
                              <div className="flex items-center justify-between mb-4 relative z-10">
                                <span className="text-white font-black uppercase tracking-tight text-sm group-hover/recipe:text-primary transition-colors">
                                  {recipe.name}
                                </span>
                                <button
                                  onClick={() =>
                                    printLabel(formatLabelData(recipe, 'PREP', selectedEvent!.pax))
                                  }
                                  className="p-2 bg-white/5 rounded-xl hover:bg-primary/20 hover:text-primary transition-all group-hover/recipe:scale-110"
                                  title="Imprimir Etiqueta Producción"
                                >
                                  <Tag size={16} />
                                </button>
                              </div>
                              <div className="flex items-center gap-4 mb-4 relative z-10">
                                <div className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl">
                                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">
                                    Carga Trabajo
                                  </p>
                                  <p className="font-mono text-xl font-black text-white">
                                    {selectedEvent!.pax}
                                  </p>
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-2/3 shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                                  </div>
                                  <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest text-right">
                                    65% Readiness
                                  </p>
                                </div>
                              </div>
                              <div className="bg-black/40 rounded-2xl p-4 space-y-1 my-2 border border-white/5 relative z-10">
                                {recipe.ingredients.map((ri: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between text-xs items-center py-1"
                                  >
                                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                                      {ri.ingredient?.name}
                                    </span>
                                    <span className="font-mono text-white font-black text-sm">
                                      {(ri.quantity * selectedEvent!.pax).toFixed(1)}{' '}
                                      <span className="text-[9px] text-slate-600 uppercase font-sans tracking-tighter">
                                        {ri.ingredient?.unit}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 premium-glass border-dashed border-2 border-white/5 bg-white/[0.01] rounded-[4rem] p-24 text-center">
            <div className="w-32 h-32 bg-blue-500/10 rounded-[2.5rem] flex items-center justify-center mb-10 border border-blue-500/20 relative group scale-110 rotate-3">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <LayoutDashboard
                size={48}
                className="text-primary relative z-10 group-hover:rotate-12 transition-transform duration-700"
              />
            </div>
            <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-6 leading-tight">
              Gestión Operativa de Producción
            </h3>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-[0.3em] leading-relaxed max-w-md mx-auto">
              Inicie un despliegue operativo seleccionando un evento programado desde el panel de
              control lateral para orquestar los flujos de cocina.
            </p>
            <div className="mt-12 flex gap-4">
              <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 group hover:text-white transition-colors">
                <span className="text-primary mr-2">•</span> Pending Events
              </div>
              <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 group hover:text-white transition-colors">
                <span className="text-emerald-500 mr-2">•</span> KDS Connected
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
