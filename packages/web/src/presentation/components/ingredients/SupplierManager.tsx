import React, { useState } from 'react';
import type { IngredientSupplierConfig, SupplierOption } from '@/types/suppliers';
import { Truck, Star, Clock, DollarSign, Shield, Save, Plus } from 'lucide-react';

interface SupplierManagerProps {
    ingredientName: string;
    config: IngredientSupplierConfig;
    onSave: (config: IngredientSupplierConfig) => void;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({
    ingredientName,
    config: initialConfig,
    onSave
}) => {
    const [config, setConfig] = useState<IngredientSupplierConfig>(initialConfig);
    const [activeTab, setActiveTab] = useState<'suppliers' | 'criteria'>('suppliers');

    const handleWeightChange = (key: keyof typeof config.selectionCriteria.weights, value: number) => {
        setConfig({
            ...config,
            selectionCriteria: {
                ...config.selectionCriteria,
                weights: {
                    ...config.selectionCriteria.weights,
                    [key]: value
                }
            }
        });
    };

    const updateSupplier = (index: number, updates: Partial<SupplierOption>) => {
        const newSuppliers = [...config.suppliers];
        if (!newSuppliers[index]) return;
        newSuppliers[index] = { ...newSuppliers[index], ...updates };
        setConfig({ ...config, suppliers: newSuppliers });
    };

    const toggleSupplierActive = (index: number) => {
        updateSupplier(index, { isActive: !config.suppliers[index]?.isActive });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="text-indigo-600" size={20} />
                        Proveedores: {ingredientName}
                    </h3>
                    <p className="text-sm text-slate-500">Gestiona la selección automática para este ingrediente.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('suppliers')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${activeTab === 'suppliers' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                    >
                        Proveedores
                    </button>
                    <button
                        onClick={() => setActiveTab('criteria')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${activeTab === 'criteria' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                    >
                        Criterios
                    </button>
                </div>
            </div>

            {activeTab === 'suppliers' ? (
                <div className="space-y-4">
                    {config.suppliers.map((supplier, idx) => (
                        <div key={supplier.supplierId} className={`border rounded-lg p-4 transition-all ${supplier.isActive ? 'border-slate-200 bg-slate-50/50' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${supplier.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    <div>
                                        <h4 className="font-semibold text-slate-800">{supplier.supplierName}</h4>
                                        <p className="text-xs text-slate-500">{supplier.isPrimary ? 'Proveedor Principal' : 'Alternativo'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleSupplierActive(idx)}
                                    className="text-xs font-medium text-slate-400 hover:text-indigo-600"
                                >
                                    {supplier.isActive ? 'Desactivar' : 'Activar'}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Precio</label>
                                    <div className="flex items-center gap-1 font-medium text-slate-700">
                                        <DollarSign size={14} className="text-emerald-500" />
                                        {supplier.price.toFixed(2)} / {supplier.unit}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Entrega</label>
                                    <div className="flex items-center gap-1 font-medium text-slate-700">
                                        <Clock size={14} className="text-blue-500" />
                                        {supplier.leadTimeDays} días
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Calidad (1-5)</label>
                                    <div className="flex items-center gap-1 font-medium text-slate-700">
                                        <Star size={14} className="text-amber-500" />
                                        {supplier.qualityRating}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Fiabilidad</label>
                                    <div className="flex items-center gap-1 font-medium text-slate-700">
                                        <Shield size={14} className="text-purple-500" />
                                        {supplier.reliabilityScore}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-indigo-200 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                        <Plus size={20} /> Añadir Proveedor
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        Ajusta los pesos para determinar automáticamente qué proveedor gana la "Buy Box" para este ingrediente.
                    </p>

                    <div className="space-y-5">
                        {[
                            { key: 'price', label: 'Precio', icon: <DollarSign size={18} className="text-emerald-500" /> },
                            { key: 'quality', label: 'Calidad', icon: <Star size={18} className="text-amber-500" /> },
                            { key: 'leadTime', label: 'Rapidez Entrega', icon: <Clock size={18} className="text-blue-500" /> },
                            { key: 'reliability', label: 'Fiabilidad Histórica', icon: <Shield size={18} className="text-purple-500" /> },
                        ].map(item => (
                            <div key={item.key}>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        {item.icon} {item.label}
                                    </label>
                                    <span className="text-sm font-bold text-slate-900">
                                        {config.selectionCriteria.weights[item.key as keyof typeof config.selectionCriteria.weights]}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="100"
                                    value={config.selectionCriteria.weights[item.key as keyof typeof config.selectionCriteria.weights]}
                                    onChange={(e) => handleWeightChange(item.key as any, Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
                <button
                    onClick={() => onSave(config)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                >
                    <Save size={18} /> Guardar Configuración
                </button>
            </div>
        </div>
    );
};
