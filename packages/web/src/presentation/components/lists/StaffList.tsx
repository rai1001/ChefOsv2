import React, { useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { getRoleLabel } from '@/utils/labels';
import { Briefcase, Calendar } from 'lucide-react';
import { VacationManager } from '../staff/VacationManager';

export const StaffList: React.FC = () => {
    const { staff } = useStore();
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

    const employeeToEdit = selectedEmployee ? staff.find(e => e.id === selectedEmployee) : null;

    return (
        <div className="space-y-4">
            <div className="bg-surface border border-white/5 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-black/20 text-slate-500 uppercase font-medium">
                        <tr>
                            <th className="p-4">Nombre</th>
                            <th className="p-4">Rol</th>
                            <th className="p-4 text-center">Vacaciones</th>
                            <th className="p-4 text-right">Estadísticas (28 Días)</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {staff.map(emp => {
                            const usedVacation = emp.vacationDates?.length || 0;
                            const totalVacation = emp.vacationDaysTotal || 30;

                            return (
                                <tr key={emp.id} className="hover:bg-white/[0.02]">
                                    <td className="p-4 font-medium text-white flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                                            {emp.name[0]}
                                        </div>
                                        {emp.name}
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-white/10 px-2 py-1 rounded text-xs flex items-center gap-1 w-fit">
                                            <Briefcase className="w-3 h-3" />
                                            {getRoleLabel(emp.role)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs">
                                            <Calendar className="w-3 h-3" />
                                            {usedVacation} / {totalVacation}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right opacity-70">
                                        {emp.daysOffInLast28Days} días libres
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => setSelectedEmployee(emp.id)}
                                            className="text-primary hover:text-blue-300 text-xs font-medium uppercase tracking-wider border border-primary/30 px-3 py-1.5 rounded hover:bg-primary/10 transition-colors"
                                        >
                                            Gestionar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {employeeToEdit && (
                <VacationManager
                    employee={employeeToEdit}
                    onClose={() => setSelectedEmployee(null)}
                />
            )}
        </div>
    );
};
