import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { generateMonthSchedule, ScheduleState, checkConstraints } from '@/utils/scheduler/solver';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  Play,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  Printer,
  Download,
  Trash2,
  Sun,
  Moon,
  AlertTriangle,
  CheckCircle,
  Database,
} from 'lucide-react';
import { getRoleLabel } from '@/utils/labels';
import { normalizeDate } from '@/utils/date';
import * as XLSX from 'xlsx';
import { ShiftTable } from '@/presentation/components/schedule/ShiftTable';
import { EmptyState } from '@/presentation/components/ui/EmptyState';

export const SchedulePage: React.FC = () => {
  const {
    staff,
    schedule,
    updateSchedule,
    events,
    updateShift,
    removeShift,
    saveSchedule,
    fetchSchedule,
  } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [generating, setGenerating] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: string;
    employeeId: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const monthKey = format(currentDate, 'yyyy-MM');

  // Fetch schedule on month change
  useEffect(() => {
    fetchSchedule(monthKey);
  }, [monthKey, fetchSchedule]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate displayed days based on view mode
  const days = React.useMemo(() => {
    if (viewMode === 'month') {
      return eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      });
    } else {
      // Weekly view - Start on Monday
      return eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      });
    }
  }, [currentDate, viewMode]);

  const currentSchedule = schedule[monthKey]?.shifts || [];

  const handleGenerate = async () => {
    setGenerating(true);
    setDebugLog([]);
    // Artificial delay for UX
    await new Promise((r) => setTimeout(r, 500));

    try {
      // Get History (Previous Month)
      const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
      const prevMonthKey = format(prevDate, 'yyyy-MM');
      const historyShifts = schedule[prevMonthKey]?.shifts || [];

      const { schedule: newShifts, debug } = await generateMonthSchedule(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        staff,
        historyShifts
      );

      updateSchedule(monthKey, {
        date: monthKey,
        shifts: newShifts,
        staffingStatus: 'OK',
      });
      setDebugLog(debug);
    } catch (e) {
      console.error(e);
      setDebugLog((prev) => [...prev, `Error: ${e}`]);
    } finally {
      setGenerating(false);
    }
  };

  const getShift = (day: Date, employeeId: string) => {
    return currentSchedule.find(
      (s) => isSameDay(new Date(s.date), day) && s.employeeId === employeeId
    );
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = normalizeDate(date);
    return events.filter((e) => normalizeDate(e.date) === dateStr);
  };

  const onCellClick = (e: React.MouseEvent, day: Date, employeeId: string) => {
    e.stopPropagation();
    const dateStr = normalizeDate(day);

    // Calculate position relative to viewport to prevent overflow
    const x = e.clientX;
    const y = e.clientY;

    setContextMenu({
      x,
      y,
      date: dateStr,
      employeeId,
    });
  };

  const handleShiftAction = (type: import('@/types').ShiftType | 'DELETE') => {
    if (!contextMenu) return;
    if (type === 'DELETE') {
      removeShift(contextMenu.date, contextMenu.employeeId);
    } else {
      updateShift(contextMenu.date, contextMenu.employeeId, type as import('@/types').ShiftType);
    }
    setContextMenu(null);
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(
        (d) => new Date(d.getFullYear(), d.getMonth() + (direction === 'next' ? 1 : -1))
      );
    } else {
      setCurrentDate((d) => (direction === 'next' ? addWeeks(d, 1) : subWeeks(d, 1)));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const rows = staff.map((emp) => {
      const row: any = { Empleado: emp.name, Puesto: getRoleLabel(emp.role) };
      days.forEach((day) => {
        const shift = getShift(day, emp.id);
        row[format(day, 'yyyy-MM-dd')] = shift ? (shift.type === 'MORNING' ? 'M' : 'T') : ''; // Simple export logic
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horario');
    XLSX.writeFile(wb, `Horario_${format(currentDate, 'yyyy-MM')}.xlsx`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSchedule(monthKey);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Derived Roster for Selected Date
  const roster = React.useMemo(() => {
    if (!selectedDate) return { morning: [], afternoon: [], off: [], events: [], available: [] };

    const morning: typeof staff = [];
    const afternoon: typeof staff = [];
    const off: typeof staff = [];

    // Build ScheduleState for Validation
    const prevMonthKey = format(subMonths(selectedDate, 1), 'yyyy-MM');
    const currentMonthKey = format(selectedDate, 'yyyy-MM');
    const historyShifts = (schedule[prevMonthKey]?.shifts || []) as any[];
    const currentShifts = (schedule[currentMonthKey]?.shifts || []) as any[];
    const allShifts = [...historyShifts, ...currentShifts];

    const state = new ScheduleState(allShifts);

    staff.forEach((emp) => {
      const shift = getShift(selectedDate, emp.id);
      if (shift?.type === 'MORNING') morning.push(emp);
      else if (shift?.type === 'AFTERNOON') afternoon.push(emp);
      else off.push(emp);
    });

    const available = off.map((emp) => {
      const check = checkConstraints(emp, selectedDate, 'MORNING', state);
      return {
        ...emp,
        validation: check,
      };
    });

    const daysEvents = getEventsForDay(selectedDate);
    return { morning, afternoon, off, events: daysEvents, available };
  }, [selectedDate, currentSchedule, staff, events, schedule]);

  return (
    <div className="flex bg-background h-screen overflow-hidden">
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden relative transition-all duration-300 ${selectedDate ? 'mr-0' : ''}`}
      >
        {/* Context Menu */}
        {contextMenu && (
          <div
            ref={menuRef}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 w-48 bg-surface border border-white/10 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200"
          >
            <div className="p-2 border-b border-white/5 text-xs font-semibold text-slate-500 uppercase">
              Editar Turno
            </div>
            <button
              onClick={() => handleShiftAction('MORNING')}
              className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-white/5 flex items-center gap-2"
            >
              <Sun className="w-4 h-4 text-amber-400" />
              Turno Mañana
            </button>
            <button
              onClick={() => handleShiftAction('AFTERNOON')}
              className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-white/5 flex items-center gap-2"
            >
              <Moon className="w-4 h-4 text-indigo-400" />
              Turno Tarde
            </button>
            <button
              onClick={() => handleShiftAction('VACATION')}
              className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-white/5 flex items-center gap-2"
            >
              <Sun className="w-4 h-4 text-emerald-400" />
              Vacaciones
            </button>
            <button
              onClick={() => handleShiftAction('SICK_LEAVE')}
              className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-white/5 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Baja / Indispuesto
            </button>
            <div className="border-t border-white/5 my-1"></div>
            <button
              onClick={() => handleShiftAction('DELETE')}
              className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-white/5 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar / Libre
            </button>
          </div>
        )}

        {/* Header */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-surface/50 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2 capitalize">
              <CalendarIcon className="text-primary" />
              {viewMode === 'month'
                ? format(currentDate, 'MMMM yyyy', { locale: es })
                : days && days[0]
                  ? `Semana del ${format(days[0], 'd MMM', { locale: es })}`
                  : ''}
            </h2>

            <div className="flex bg-surface rounded-lg p-1 border border-white/5">
              <button
                onClick={() => navigate('prev')}
                className="px-2 py-1 hover:bg-white/5 rounded text-slate-400"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 hover:bg-white/5 rounded text-sm text-slate-400"
              >
                Hoy
              </button>
              <button
                onClick={() => navigate('next')}
                className="px-2 py-1 hover:bg-white/5 rounded text-slate-400"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex bg-surface rounded-lg p-1 border border-white/5">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded text-sm transition-colors ${viewMode === 'month' ? 'bg-primary/20 text-primary font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Mes
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded text-sm transition-colors ${viewMode === 'week' ? 'bg-primary/20 text-primary font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Semana
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="bg-surface hover:bg-white/10 text-slate-300 p-2 rounded-lg transition-colors border border-white/5"
              title="Exportar Excel"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="bg-surface hover:bg-white/10 text-slate-300 p-2 rounded-lg transition-colors border border-white/5"
              title="Imprimir"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !schedule[monthKey]}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-lg
                                ${isSaving ? 'bg-white/5 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'}
                            `}
            >
              {isSaving ? (
                <RefreshCw className="animate-spin w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Guardar Horario
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
            >
              {generating ? (
                <RefreshCw className="animate-spin w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Generar Horario
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 pb-20">
          {staff.length === 0 ? (
            <EmptyState
              title="Sin personal"
              message="No hay empleados registrados. Añade personal en la sección de Equipo para gestionar turnos."
              action={
                <button className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold">
                  Ir a Equipo
                </button>
              }
            />
          ) : (
            <div className="space-y-8">
              <ShiftTable
                days={days}
                staff={staff}
                shifts={currentSchedule}
                events={events}
                selectedDate={selectedDate}
                onDayClick={setSelectedDate}
                onCellClick={onCellClick}
              />

              {/* Monthly Summary Section */}
              <div className="bg-surface/30 border border-white/5 rounded-xl p-6 backdrop-blur-sm shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Resumen de Turnos Mensual
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff.map((emp) => {
                    const shifts = currentSchedule.filter((s) => s.employeeId === emp.id);
                    const total = shifts.length;
                    const morning = shifts.filter((s) => s.type === 'MORNING').length;
                    const afternoon = shifts.filter((s) => s.type === 'AFTERNOON').length;
                    const vacations = shifts.filter((s) => s.type === 'VACATION').length;

                    const vacationEnjoyed = emp.vacationDates?.length || 0;
                    const vacationPending = (emp.vacationDaysTotal || 30) - vacationEnjoyed;

                    return (
                      <div
                        key={emp.id}
                        className="bg-black/20 rounded-lg p-4 border border-white/5 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-200">{emp.name}</div>
                          <div className="text-xs text-slate-500">{getRoleLabel(emp.role)}</div>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="text-[10px] text-slate-500 uppercase">Vacaciones:</div>
                            <div className="flex gap-1.5">
                              <span title="Disfrutadas" className="text-emerald-400 font-bold">
                                {vacationEnjoyed}
                              </span>
                              <span className="text-slate-700">/</span>
                              <span title="Pendientes" className="text-amber-400 font-bold">
                                {vacationPending}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white mb-1">{total}</div>
                          <div className="flex gap-2 text-xs">
                            <span className="text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              M: {morning}
                            </span>
                            <span className="text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                              T: {afternoon}
                            </span>
                            {vacations > 0 && (
                              <span className="text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                V: {vacations}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Debug Logs */}
              {debugLog.length > 0 && (
                <div className="bg-black/50 rounded-xl p-4 font-mono text-xs text-slate-400 max-h-64 overflow-auto border border-white/10">
                  <h3 className="text-slate-200 font-bold mb-2 sticky top-0 bg-black/50 p-1">
                    Registro del Algoritmo
                  </h3>
                  {debugLog.slice(0, 100).map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.includes('[FAIL]')
                          ? 'text-red-400'
                          : line.includes('[WARNING]')
                            ? 'text-yellow-400'
                            : ''
                      }
                    >
                      {line}
                    </div>
                  ))}
                  {debugLog.length > 100 && (
                    <div className="text-slate-500 italic">
                      ... {debugLog.length - 100} líneas más ...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side Panel - Roster & Actions */}
      <div
        className={`w-80 border-l border-white/10 bg-surface/50 backdrop-blur-xl transition-all duration-300 ease-in-out transform ${selectedDate ? 'translate-x-0' : 'translate-x-full hidden absolute right-0 top-0 bottom-0 z-40'}`}
      >
        {selectedDate && (
          <div className="h-full flex flex-col p-6 bg-[#0f1218]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="text-primary w-5 h-5" />
                Turno Diario
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5 text-center">
              <div className="text-2xl font-bold text-white mb-1">{format(selectedDate, 'd')}</div>
              <div className="text-sm text-primary uppercase font-bold tracking-wider">
                {format(selectedDate, 'MMMM, EEEE', { locale: es })}
              </div>
            </div>

            <div className="flex-1 overflow-auto space-y-6 custom-scrollbar">
              {/* Available Staff Section */}
              {roster.available.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-slate-300 mb-3 px-2">
                    <Database className="w-4 h-4" />
                    <span className="text-sm font-bold uppercase tracking-wider">
                      Disponibles ({roster.available.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {roster.available.map((emp) => {
                      const isValid = emp.validation.valid;
                      return (
                        <div
                          key={emp.id}
                          className={`p-3 rounded-lg border flex items-center justify-between group cursor-pointer transition-colors
                                                    ${
                                                      isValid
                                                        ? 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30'
                                                        : 'bg-amber-500/5 border-amber-500/10 hover:border-amber-500/30'
                                                    }
                                                `}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
                                                            ${isValid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}
                                                        `}
                            >
                              {emp.name[0]}
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`font-medium text-sm truncate ${isValid ? 'text-emerald-300' : 'text-amber-300'}`}
                              >
                                {emp.name}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {getRoleLabel(emp.role)}
                              </div>
                            </div>
                          </div>

                          {isValid ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 opacity-50" />
                          ) : (
                            <div
                              className="flex items-center gap-1.5"
                              title={emp.validation.reason}
                            >
                              <AlertTriangle className="w-4 h-4 text-amber-500 opacity-50 shrink-0" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Morning Shift */}
              <div>
                <div className="flex items-center gap-2 text-amber-300 mb-3 px-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-bold uppercase tracking-wider">Mañana</span>
                  <span className="ml-auto bg-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                    {roster.morning.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {roster.morning.map((emp) => (
                    <div
                      key={emp.id}
                      className="p-3 rounded-lg bg-surface border border-white/5 hover:border-amber-500/30 transition-colors group cursor-pointer flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 font-bold text-xs">
                        {emp.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-200 text-sm">{emp.name}</div>
                        <div className="text-[10px] text-slate-500">{getRoleLabel(emp.role)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Afternoon Shift */}
              <div className="mt-6">
                <div className="flex items-center gap-2 text-indigo-300 mb-3 px-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-bold uppercase tracking-wider">Tarde</span>
                  <span className="ml-auto bg-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                    {roster.afternoon.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {roster.afternoon.map((emp) => (
                    <div
                      key={emp.id}
                      className="p-3 rounded-lg bg-surface border border-white/5 hover:border-indigo-500/30 transition-colors group cursor-pointer flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-xs">
                        {emp.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-200 text-sm">{emp.name}</div>
                        <div className="text-[10px] text-slate-500">{getRoleLabel(emp.role)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-[10px] text-slate-500 text-center uppercase tracking-wide">
                Clic derecho en el calendario para editar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
