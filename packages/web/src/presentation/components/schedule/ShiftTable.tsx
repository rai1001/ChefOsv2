import React from 'react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { getRoleLabel } from '@/utils/labels';
import { normalizeDate } from '@/utils/date';
import type { Event, Shift, Employee } from '@/types';

interface ShiftTableProps {
  days: Date[];
  staff: Employee[];
  shifts: Shift[];
  events: Event[];
  selectedDate: Date | null;
  onDayClick: (date: Date) => void;
  onCellClick: (e: React.MouseEvent, date: Date, employeeId: string) => void;
}

export const ShiftTable: React.FC<ShiftTableProps> = ({
  days,
  staff,
  shifts,
  events,
  selectedDate,
  onDayClick,
  onCellClick,
}) => {
  // Helpers
  const getShift = (day: Date, employeeId: string) => {
    const dateStr = normalizeDate(day);
    return shifts.find((s) => s.date === dateStr && s.employeeId === employeeId);
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = normalizeDate(date);
    return events.filter((e) => normalizeDate(e.date) === dateStr);
  };

  const getEmployeeStats = (employeeId: string) => {
    const empShifts = shifts.filter((s) => s.employeeId === employeeId);
    return empShifts.length;
  };

  const getDayStats = (date: Date) => {
    const dateStr = normalizeDate(date);
    const dayShifts = shifts.filter((s) => s.date === dateStr);
    return dayShifts.length;
  };

  return (
    <div className="bg-surface/30 border border-white/5 rounded-xl shadow-2xl inline-block min-w-full overflow-hidden">
      {/* Header Row */}
      <div className="flex border-b border-white/10 bg-surface/95 z-20 backdrop-blur sticky top-0 min-w-max">
        <div className="w-56 p-4 font-black uppercase text-xs tracking-wider text-slate-400 border-r border-white/10 shrink-0 sticky left-0 bg-surface/95 z-30">
          Empleado
        </div>
        <div className="flex">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const hasEvents = dayEvents.length > 0;
            const isSelected = selectedDate && isSameDay(selectedDate, day);
            const isWeekend = [0, 6].includes(day.getDay());
            const isToday = isSameDay(new Date(), day);

            return (
              <button
                key={day.toString()}
                onClick={() => onDayClick(day)}
                title={
                  hasEvents
                    ? `${dayEvents.length} Eventos:\n${dayEvents.map((e) => `• ${e.name} (${e.pax} PAX)`).join('\n')}`
                    : undefined
                }
                className={`w-12 p-2 text-center border-r border-white/5 transition-all hover:bg-white/10 relative group flex flex-col items-center justify-center
                                    ${
                                      isSelected
                                        ? 'bg-primary/20 text-primary ring-1 ring-inset ring-primary/50 z-10'
                                        : hasEvents
                                          ? 'bg-emerald-500/10 text-emerald-400'
                                          : isWeekend
                                            ? 'bg-white/[0.02] text-amber-200/70'
                                            : 'text-slate-400'
                                    }
                                    ${isToday ? 'bg-primary/5 text-white' : ''}
                                `}
              >
                <div className={`text-sm font-black ${isToday ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="text-[9px] uppercase font-bold opacity-60">
                  {format(day, 'EEE', { locale: es })}
                </div>

                {hasEvents && (
                  <div className="absolute top-1 right-1 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </div>
                )}
              </button>
            );
          })}
          <div className="w-20 p-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-center border-l border-white/10">
            Total
          </div>
        </div>
      </div>

      {/* Employee Rows */}
      <div className="divide-y divide-white/5 min-w-max">
        {staff.map((emp) => {
          const totalShifts = getEmployeeStats(emp.id);
          return (
            <div key={emp.id} className="flex hover:bg-white/[0.02] transition-colors group">
              {/* Sticky Name Column */}
              <div className="w-56 p-3 flex flex-col justify-center border-r border-white/10 sticky left-0 bg-[#12161f] group-hover:bg-[#1a2234] z-10 shrink-0 transition-colors shadow-[2px_0_10px_rgba(0,0,0,0.2)]">
                <span className="font-bold text-sm text-slate-200 truncate">{emp.name}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  {getRoleLabel(emp.role)}
                </span>
              </div>

              {/* Shift Cells */}
              <div className="flex">
                {days.map((day) => {
                  const shift = getShift(day, emp.id);
                  const isWeekend = [0, 6].includes(day.getDay());

                  return (
                    <div
                      key={day.toString()}
                      onClick={(e) => onCellClick(e, day, emp.id)}
                      className={`w-12 border-r border-white/5 flex items-center justify-center p-1 cursor-pointer hover:bg-white/10 transition-all relative
                                                ${!shift && isWeekend ? 'bg-black/20' : ''}
                                                ${selectedDate && isSameDay(selectedDate, day) ? 'bg-white/[0.03]' : ''}
                                            `}
                    >
                      {shift ? (
                        <div
                          title={shift.type}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-lg transition-transform hover:scale-110 hover:z-10
                                                        ${
                                                          shift.type === 'MORNING'
                                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-amber-500/10'
                                                            : shift.type === 'AFTERNOON'
                                                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-indigo-500/10'
                                                              : shift.type === 'VACATION'
                                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-emerald-500/10'
                                                                : 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-red-500/10'
                                                        }
                                                    `}
                        >
                          {shift.type === 'MORNING'
                            ? 'M'
                            : shift.type === 'AFTERNOON'
                              ? 'T'
                              : shift.type === 'VACATION'
                                ? 'V'
                                : 'B'}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Row Total */}
                <div className="w-20 flex items-center justify-center border-l border-white/10 text-sm font-mono font-bold text-slate-400 bg-black/10">
                  {totalShifts}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Totals Row */}
      <div className="flex bg-surface/95 border-t border-white/10 sticky bottom-0 z-20 min-w-max backdrop-blur shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
        <div className="w-56 p-3 flex items-center justify-end pr-4 text-xs font-black uppercase tracking-wider text-slate-500 border-r border-white/10 sticky left-0 bg-surface/95 z-30">
          Total Turnos
        </div>
        <div className="flex">
          {days.map((day) => {
            const total = getDayStats(day);
            return (
              <div
                key={day.toString()}
                className="w-12 border-r border-white/5 flex items-center justify-center py-2 text-xs font-bold text-slate-400 bg-black/10"
              >
                {total > 0 ? total : '-'}
              </div>
            );
          })}
          <div className="w-20 flex items-center justify-center border-l border-white/10 text-sm font-black text-primary bg-primary/5">
            {shifts.length}
          </div>
        </div>
      </div>
    </div>
  );
};
