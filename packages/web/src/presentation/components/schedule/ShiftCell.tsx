import React from 'react';
import { format, isWeekend } from 'date-fns';

import type { Employee, Shift } from '@/types';
import { getRoleLabel } from '@/utils/labels';

interface ShiftCellProps {
    day: Date;
    employee: Employee;
    shift?: Shift;
    onCellClick: (e: React.MouseEvent, date: string, employeeId: string) => void;
}

export const ShiftCell: React.FC<ShiftCellProps> = ({ day, employee, shift, onCellClick }) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const isWeekendDay = isWeekend(day);

    return (
        <div
            onClick={(e) => onCellClick(e, dateStr, employee.id)}
            className={`w-12 h-12 flex items-center justify-center cursor-pointer transition-all hover:bg-white/5 ${isWeekendDay ? 'bg-amber-500/5' : ''
                }`}
        >
            {shift ? (
                <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm transition-all hover:scale-110 ${shift.type === 'MORNING'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                        : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                        }`}
                >
                    {shift.type === 'MORNING' ? 'M' : 'T'}
                </span>
            ) : (
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white/5">
                    –
                </span>
            )}
        </div>
    );
};

interface EmployeeRowProps {
    employee: Employee;
    days: Date[];
    getShift: (day: Date, employeeId: string) => Shift | undefined;
    onCellClick: (e: React.MouseEvent, date: string, employeeId: string) => void;
}

export const EmployeeRow: React.FC<EmployeeRowProps> = ({ employee, days, getShift, onCellClick }) => {
    return (
        <div className="flex hover:bg-white/[0.02] transition-colors group">
            {/* Employee Name - Sticky */}
            <div className="w-48 p-4 flex flex-col justify-center border-r border-white/10 sticky left-0 bg-surface/95 z-10 shrink-0 group-hover:bg-surface/80 shadow-[2px_0_10px_rgba(0,0,0,0.2)]">
                <span className="font-medium text-slate-200">{employee.name}</span>
                <span className="text-xs text-slate-500 uppercase tracking-wider">{getRoleLabel(employee.role)}</span>
            </div>

            {/* Shift Cells */}
            <div className="flex">
                {days.map(day => (
                    <ShiftCell
                        key={day.toISOString()}
                        day={day}
                        employee={employee}
                        shift={getShift(day, employee.id)}
                        onCellClick={onCellClick}
                    />
                ))}
            </div>
        </div>
    );
};
