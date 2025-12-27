import React, { useState, useMemo } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { Plus, Edit2, Trash2, Briefcase, Loader2, Users, Calendar, Award } from 'lucide-react';
import type { Employee, Role } from '@/types';
import { getRoleLabel } from '@/utils/labels';
import { addDocument, updateDocument, deleteDocument } from '@/services/firestoreService';
import { collections } from '@/config/collections';
import { UniversalImporter } from '@/presentation/components/common/UniversalImporter';

export const StaffPage: React.FC = () => {
    const { staff, activeOutletId } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Employee>>({
        name: '',
        role: 'COOK_ROTATING',
        vacationDaysTotal: 30,
        consecutiveWorkDays: 0,
        daysOffInLast28Days: 0,
        vacationDates: [],
        status: 'ACTIVE',
        qualificationDocs: []
    });

    // Computed Stats
    const stats = useMemo(() => {
        const total = staff.length;
        const active = staff.filter(e => e.status === 'ACTIVE').length;
        const vacation = staff.filter(e => {
            // Check if today is in vacationDates strings (YYYY-MM-DD)
            const today = new Date().toISOString().split('T')[0] || '';
            if (!today) return false;
            return e.vacationDates && Array.isArray(e.vacationDates) ? e.vacationDates.includes(today) : false;
        }).length;
        // Simple role breakdown for now
        const chefs = staff.filter(e => e.role === 'HEAD_CHEF' || e.role === 'SOUS_CHEF').length;
        return { total, active, vacation, chefs };
    }, [staff]);


    const handleOpenModal = (employee?: Employee) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData(employee);
        } else {
            setEditingEmployee(null);
            setFormData({
                name: '',
                role: 'COOK_ROTATING',
                vacationDaysTotal: 30,
                consecutiveWorkDays: 0,
                daysOffInLast28Days: 0,
                vacationDates: [],
                status: 'ACTIVE',
                qualificationDocs: []
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEmployee(null);
        setIsSubmitting(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeOutletId) {
            alert("Por favor, selecciona una cocina activa.");
            return;
        }

        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const employeeData = {
                ...formData,
                outletId: activeOutletId
            };

            if (editingEmployee) {
                await updateDocument('staff', editingEmployee.id, employeeData);
            } else {
                await addDocument(collections.staff, employeeData);
            }
            handleCloseModal();
        } catch (error) {
            console.error("Error saving employee:", error);
            alert("Error al guardar el empleado.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar a ${name}?`)) return;

        try {
            await deleteDocument('staff', id);
        } catch (error) {
            console.error("Error deleting employee:", error);
            alert("Error al eliminar el empleado.");
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-8 min-h-screen bg-transparent text-slate-100 fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter uppercase">
                        <Users className="text-primary animate-pulse w-10 h-10" />
                        Gestión de <span className="text-primary">Personal</span>
                    </h1>
                    <p className="text-slate-500 text-xs font-bold mt-2 tracking-[0.3em] uppercase">Equipo & Roles</p>
                </div>
                <div className="flex gap-3">
                    <UniversalImporter
                        buttonLabel="Importar Personal"
                        template={{ col1: "Nombre", col2: "Rol" }}
                    />
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-primary/50"
                    >
                        <Plus size={16} />
                        Nuevo Empleado
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Total Empleados</p>
                        <p className="text-2xl font-black text-white font-mono">{stats.total}</p>
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Activos Ahora</p>
                        <p className="text-2xl font-black text-white font-mono">{stats.active}</p>
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                        <Award size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Jefes de Cocina</p>
                        <p className="text-2xl font-black text-white font-mono">{stats.chefs}</p>
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Vacaciones Hoy</p>
                        <p className="text-2xl font-black text-white font-mono">{stats.vacation}</p>
                    </div>
                </div>
            </div>

            {/* Staff List */}
            <div className="premium-glass rounded-3xl overflow-hidden border border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Vacaciones</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {staff.map(emp => (
                                <tr key={emp.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-blue-600/20 text-blue-400 flex items-center justify-center font-black text-sm border border-white/5 group-hover:scale-110 transition-transform shadow-lg shadow-black/20">
                                                {emp.name[0]}
                                            </div>
                                            <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{emp.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 text-slate-300 border border-white/5 uppercase tracking-wider">
                                            <Briefcase size={12} className="text-primary" />
                                            {getRoleLabel(emp.role)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${emp.status === 'ACTIVE'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                            {emp.status === 'ACTIVE' ? 'Activo' : 'Baja'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-mono font-bold text-slate-400">
                                            <span className="text-white">{emp.vacationDates?.length || 0}</span>
                                            <span className="text-slate-600 mx-1">/</span>
                                            {emp.vacationDaysTotal}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenModal(emp)}
                                                className="p-2 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-blue-500/30"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(emp.id, emp.name)}
                                                className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {staff.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                                        <Users className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                                        <p className="font-medium">No hay empleados registrados.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Qualifications Summary Section */}
            <div className="premium-glass p-8 rounded-3xl">
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight">
                    <Award className="w-6 h-6 text-primary" />
                    Documentación y Títulos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {staff.map(emp => (
                        <div key={emp.id} className="bg-black/20 rounded-2xl p-5 border border-white/5 hover:bg-white/[0.02] transition-colors">
                            <div className="font-bold text-slate-200 mb-4 pb-2 border-b border-white/5 flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-primary/20 text-primary flex items-center justify-center text-xs">
                                    {emp.name[0]}
                                </div>
                                {emp.name}
                            </div>
                            {emp.qualificationDocs && emp.qualificationDocs.length > 0 ? (
                                <div className="space-y-2">
                                    {emp.qualificationDocs.map((doc, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs bg-white/5 p-3 rounded-xl border border-white/5 hover:border-primary/30 transition-colors group">
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-primary transition-colors truncate flex-1 font-medium">
                                                {doc.name}
                                            </a>
                                            {doc.expiryDate && (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ml-2 ${new Date(doc.expiryDate) < new Date() ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                                    Exp: {doc.expiryDate}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest italic py-2">Sin documentos</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>


            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0f1014] rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-primary opacity-50"></div>

                        <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                            {editingEmployee ? <Edit2 className="text-primary" /> : <Plus className="text-primary" />}
                            {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all placeholder-slate-600 font-medium"
                                    value={formData.name}
                                    placeholder="Nombre completo"
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Rol</label>
                                <select
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all appearance-none"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                                >
                                    <option value="HEAD_CHEF">Jefe de Cocina</option>
                                    <option value="SOUS_CHEF">Sous Chef</option>
                                    <option value="CHEF_PARTIE">Jefe de Partida</option>
                                    <option value="COOK_MORNING">Cocinero Mañanas</option>
                                    <option value="COOK_ROTATING">Cocinero Rotativo</option>
                                    <option value="ASSISTANT">Ayudante</option>
                                    <option value="DISHWASHER">Office / Limpieza</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Días Vacaciones</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all font-mono"
                                        value={formData.vacationDaysTotal}
                                        onChange={e => setFormData({ ...formData, vacationDaysTotal: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Estado</label>
                                    <select
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                                    >
                                        <option value="ACTIVE">Activo</option>
                                        <option value="INACTIVE">Baja</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-4">Documentación</label>
                                <div className="space-y-3">
                                    {(formData.qualificationDocs || []).map((doc, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                placeholder="Nombre del documento"
                                                className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-xs text-white placeholder-slate-600 focus:border-primary/50 outline-none"
                                                value={doc.name}
                                                onChange={e => {
                                                    const newDocs = [...(formData.qualificationDocs || [])];
                                                    if (!newDocs[idx]) return;
                                                    newDocs[idx] = { ...newDocs[idx], url: newDocs[idx].url || '', name: e.target.value };
                                                    setFormData({ ...formData, qualificationDocs: newDocs });
                                                }}
                                            />
                                            <input
                                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                                value={doc.url}
                                                onChange={e => {
                                                    const newDocs = [...(formData.qualificationDocs || [])];
                                                    if (!newDocs[idx]) return;
                                                    newDocs[idx] = { ...newDocs[idx], url: e.target.value };
                                                    setFormData({ ...formData, qualificationDocs: newDocs });
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newDocs = (formData.qualificationDocs || []).filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, qualificationDocs: newDocs });
                                                }}
                                                className="text-slate-500 hover:text-red-400 p-2"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            qualificationDocs: [...(formData.qualificationDocs || []), { name: '', url: '' }]
                                        })}
                                        className="text-primary hover:text-blue-400 text-xs font-black uppercase tracking-wider flex items-center gap-2 mt-2"
                                    >
                                        <Plus size={14} /> Añadir Documento
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={isSubmitting}
                                    className="px-6 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors font-bold text-xs uppercase tracking-wider"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {editingEmployee ? 'Guardar Cambios' : 'Crear Empleado'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};


