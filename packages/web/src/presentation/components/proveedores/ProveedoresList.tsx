import React from 'react';
import { Edit2, Trash2, Phone, Mail, Truck, History } from 'lucide-react';
import type { Supplier } from '@/types/suppliers';

interface ProveedoresListProps {
    suppliers: Supplier[];
    onEdit: (supplier: Supplier) => void;
    onDelete: (id: string, name: string) => void;
    onViewIngredients: (supplier: Supplier) => void;
}

export const ProveedoresList: React.FC<ProveedoresListProps> = ({ suppliers, onEdit, onDelete, onViewIngredients }) => {
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map(supplier => (
                <div key={supplier.id} className="premium-glass p-0 group relative overflow-hidden hover:scale-[1.01] transition-transform duration-300 flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 relative">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-black text-white leading-tight">{supplier.name}</h3>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onEdit(supplier)}
                                    className="p-2 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-blue-500/30"
                                    title="Editar"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => onDelete(supplier.id, supplier.name)}
                                    className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                                    title="Eliminar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {supplier.contactName && (
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <span className="w-1 h-4 bg-primary rounded-full"></span>
                                    <span className="font-bold">{supplier.contactName}</span>
                                </div>
                            )}
                            {supplier.phone && (
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                    <Phone size={14} className="text-slate-500" />
                                    <span>{supplier.phone}</span>
                                </div>
                            )}
                            {supplier.email && (
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                    <Mail size={14} className="text-slate-500" />
                                    <span className="truncate">{supplier.email}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer / Details */}
                    <div className="mt-auto border-t border-white/5 bg-black/20 p-4">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                            <div className="flex items-center gap-2">
                                <Truck size={14} className="text-emerald-400" />
                                <span className="uppercase font-bold tracking-wider">{supplier.leadTime} días entrega</span>
                            </div>
                            <span className="font-mono font-bold text-white">Min: {supplier.minimumOrderValue || 0}€</span>
                        </div>

                        <div className="mb-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Días de Pedido</span>
                            <div className="flex gap-1">
                                {daysOfWeek.map((day, index) => (
                                    <span
                                        key={day}
                                        className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide ${supplier.orderDays?.includes(index)
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-white/5 text-slate-600 border border-white/5'
                                            } `}
                                    >
                                        {day[0]}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => onViewIngredients(supplier)}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border border-white/5 hover:border-white/10"
                        >
                            <History size={14} />
                            Ver Productos
                        </button>
                    </div>
                </div>
            ))}

            {suppliers.length === 0 && (
                <div className="col-span-full py-20 text-center">
                    <Truck className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-500 uppercase tracking-widest">No hay proveedores</h3>
                    <p className="text-slate-600 mt-2">Registra tus proveedores para gestionar pedidos.</p>
                </div>
            )}
        </div>
    );
};
