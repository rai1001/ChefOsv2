import React from 'react';
import type { Employee } from '@/types';
import { getRoleLabel } from '@/utils/labels';

interface MonthlySummaryProps {
    staff: Employee[];
    getEmployeeStats: (employeeId: string) => { shiftsCount: number };
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({ staff, getEmployeeStats }) => {
    return (
        <div className="mt-6 bg-surface rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-bold mb-4 text-white">Resumen Mensual</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {staff.map(emp => {
                    const stats = getEmployeeStats(emp.id);
                    const total = stats.shiftsCount;

                    // Calculate morning/afternoon from stats if available
                    return (
                        <div key={emp.id} className="bg-black/20 rounded-lg p-4 border border-white/5 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-slate-200">{emp.name}</div>
                                <div className="text-xs text-slate-500">{getRoleLabel(emp.role)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white mb-1">{total}</div>
                                <div className="text-xs text-slate-500">turnos</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
