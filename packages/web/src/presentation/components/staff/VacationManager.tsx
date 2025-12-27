import React, { useState } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, ChevronLeft, ChevronRight, Calculator, Calendar as CalendarIcon } from 'lucide-react';
import type { Employee } from '@/types';
import { useStore } from '@/presentation/store/useStore';

interface VacationManagerProps {
    employee: Employee;
    onClose: () => void;
}

export const VacationManager: React.FC<VacationManagerProps> = ({ employee, onClose }) => {
    const { updateEmployee } = useStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [vacationDays, setVacationDays] = useState<string[]>(employee.vacationDates || []);

    // Stats
    const totalDays = employee.vacationDaysTotal || 30;
    const usedDays = vacationDays.length;
    const remainingDays = totalDays - usedDays;

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
    });

    const startDay = getDay(startOfMonth(currentDate)); // 0 = Sun, 1 = Mon...
    // Adjust for Monday start (0=Sun -> 6, 1=Mon -> 0)
    const emptyDays = startDay === 0 ? 6 : startDay - 1;

    const toggleDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        let newDates;
        if (vacationDays.includes(dateStr)) {
            newDates = vacationDays.filter(d => d !== dateStr);
        } else {
            if (remainingDays <= 0) return; // Prevent exceeding limit
            newDates = [...vacationDays, dateStr];
        }
        setVacationDays(newDates);

        // Persist immediately
        updateEmployee({
            ...employee,
            vacationDates: newDates
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex border-b border-white/10">
                    {/* Left Sidebar - Stats */}
                    <div className="w-1/3 p-6 bg-surface/50 border-r border-white/10 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                                    {employee.name[0]}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{employee.name}</h2>
                                    <p className="text-sm text-slate-400">{employee.role}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                    <div className="text-sm text-blue-300 font-medium mb-1 flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4" />
                                        Total Anual
                                    </div>
                                    <div className="text-2xl font-bold text-white">{totalDays} <span className="text-sm font-normal text-slate-400">días</span></div>
                                </div>
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="text-sm text-emerald-300 font-medium mb-1 flex items-center gap-2">
                                        <Calculator className="w-4 h-4" />
                                        Restantes
                                    </div>
                                    <div className="text-2xl font-bold text-white">{remainingDays} <span className="text-sm font-normal text-slate-400">días</span></div>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-500/10 border border-white/5">
                                    <div className="text-sm text-slate-400 font-medium mb-1">
                                        Usados
                                    </div>
                                    <div className="text-2xl font-bold text-white">{usedDays} <span className="text-sm font-normal text-slate-400">días</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 text-xs text-slate-500 text-center">
                            Selecciona los días en el calendario para marcarlos como vacaciones.
                        </div>
                    </div>

                    {/* Right Side - Calendar */}
                    <div className="w-2/3 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-lg capitalize">{format(currentDate, 'MMMM yyyy', { locale: es })}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentDate(d => subMonths(d, 1))}
                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setCurrentDate(d => addMonths(d, 1))}
                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                                <div key={day} className="text-center text-xs font-bold text-slate-500 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {Array.from({ length: emptyDays }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {daysInMonth.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const isVacation = vacationDays.includes(dateStr);
                                const isWeekend = [0, 6].includes(getDay(day));

                                return (
                                    <button
                                        key={dateStr}
                                        onClick={() => toggleDate(day)}
                                        className={`
                                            aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all relative overflow-hidden group
                                            ${isVacation
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/50 scale-105'
                                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                            }
                                            ${isWeekend && !isVacation ? 'opacity-50' : ''}
                                        `}
                                    >
                                        {format(day, 'd')}
                                        {isVacation && (
                                            <div className="absolute inset-0 bg-blue-500/20 animate-pulse" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
