import React, { useMemo } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { getRoleLabel } from '@/utils/labels';
import { Users } from 'lucide-react';
import type { Shift } from '@/types';

export const WeeklyRosterWidget: React.FC = () => {
    const { staff, schedule } = useStore();
    const today = new Date();

    // Calculate week days
    const weekDays = useMemo(() => eachDayOfInterval({
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(today, { weekStartsOn: 1 })
    }), [today]);

    // Get current month schedule key (shifts might span months, strictly we should check both if week spans, but simplifying for now or checking dates directly)
    // Actually store schedule is keyed by 'YYYY-MM'. 
    // Optimization: Check shifts from all relevant months.
    const relevantShifts = useMemo(() => {
        const shifts: Shift[] = [];
        const monthKeys = new Set(weekDays.map(d => format(d, 'yyyy-MM')));
        monthKeys.forEach(key => {
            if (schedule[key]?.shifts) {
                shifts.push(...schedule[key].shifts);
            }
        });
        return shifts;
    }, [schedule, weekDays]);

    const getShift = (day: Date, employeeId: string) => {
        return relevantShifts.find(s =>
            isSameDay(new Date(s.date), day) && s.employeeId === employeeId
        );
    };

    return (
        <div className="glass-card p-0 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-surface/50">
                <h3 className="font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Turnos Semanales
                </h3>
                <span className="text-xs text-slate-400 capitalize">
                    {weekDays[0] && weekDays[6] ? `${format(weekDays[0], 'd MMM', { locale: es })} - ${format(weekDays[6], 'd MMM', { locale: es })}` : 'Semana Actual'}
                </span>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="p-3 text-left font-medium text-slate-400 sticky top-0 bg-surface z-10">Empleado</th>
                            {weekDays.map(day => (
                                <th key={day.toString()} className={`p-2 text-center font-medium sticky top-0 bg-surface z-10 ${isSameDay(day, today) ? 'text-primary' : 'text-slate-400'}`}>
                                    <div className="text-xs uppercase">{format(day, 'EEE', { locale: es })}</div>
                                    <div className="text-lg leading-none">{format(day, 'd')}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {staff.map(emp => (
                            <tr key={emp.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-3 border-r border-white/5 font-medium text-slate-200">
                                    <div>{emp.name}</div>
                                    <div className="text-[10px] text-slate-500 uppercase">{getRoleLabel(emp.role)}</div>
                                </td>
                                {weekDays.map(day => {
                                    const shift = getShift(day, emp.id);
                                    return (
                                        <td key={day.toString()} className="p-1 text-center border-r border-white/5 last:border-0 relative">
                                            {shift ? (
                                                <div
                                                    className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                                                    ${shift.type === 'MORNING'
                                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'}
                                                    `}
                                                    title={shift.type === 'MORNING' ? 'Mañana' : 'Tarde'}
                                                >
                                                    {shift.type === 'MORNING' ? 'M' : 'T'}
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 mx-auto flex items-center justify-center text-slate-700">-</div>
                                            )}
                                            {isSameDay(day, today) && (
                                                <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
