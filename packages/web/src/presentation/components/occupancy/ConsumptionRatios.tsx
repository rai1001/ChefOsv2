import React, { useState } from 'react';
import type { ConsumptionRatio } from '@/types/occupancy';
import { Save, Plus, Trash2 } from 'lucide-react';

// Mock data service for Ratios - In real app, this would be a Firestore collection 'consumptionRatios'
// For this task, I'll simulate local state persist or a "save" dummy action if service not requested for Ratios explicitly
// Actually, I should probably add ratio management to occupancyService or a new service.
// Let's add a simple fetch/save stub in the component or assume passed props.
// For now, local state with dummy data for demonstration of UI.

export const ConsumptionRatios: React.FC = () => {
    const [ratios, setRatios] = useState<ConsumptionRatio[]>([
        { ingredientId: '1', ingredientName: 'Huevos', quantityPerPax: 2, unit: 'und', category: 'breakfast' },
        { ingredientId: '2', ingredientName: 'Café', quantityPerPax: 0.015, unit: 'kg', category: 'breakfast' },
        { ingredientId: '3', ingredientName: 'Leche', quantityPerPax: 0.2, unit: 'L', category: 'breakfast' }
    ]);
    const [isEditing, setIsEditing] = useState(false);

    const handleRatioChange = (index: number, field: keyof ConsumptionRatio, value: any) => {
        const newRatios = [...ratios];
        const currentRatio = newRatios[index]!;
        if (field === 'quantityPerPax') {
            newRatios[index] = { ...currentRatio, quantityPerPax: Number(value) };
        } else {
            // For strings like ingredientName, unit, category
            newRatios[index] = { ...currentRatio, [field]: value };
        }
        setRatios(newRatios);
    };

    const handleSave = () => {
        // Save to backend
        console.log('Saving ratios:', ratios);
        setIsEditing(false);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Ratios de Consumo (Desayuno)</h3>
                <button
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isEditing
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                >
                    <Save size={18} />
                    {isEditing ? 'Guardar Cambios' : 'Editar Ratios'}
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                            <th className="px-4 py-3">Ingrediente</th>
                            <th className="px-4 py-3">Cantidad / PAX</th>
                            <th className="px-4 py-3">Unidad</th>
                            <th className="px-4 py-3">Categoría</th>
                            {isEditing && <th className="px-4 py-3 w-10"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {ratios.map((ratio, idx) => (
                            <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-900">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={ratio.ingredientName}
                                            onChange={(e) => handleRatioChange(idx, 'ingredientName', e.target.value)}
                                            className="w-full p-1 border rounded"
                                        />
                                    ) : ratio.ingredientName}
                                </td>
                                <td className="px-4 py-3">
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={ratio.quantityPerPax}
                                            onChange={(e) => handleRatioChange(idx, 'quantityPerPax', Number(e.target.value))}
                                            className="w-full p-1 border rounded w-24"
                                        />
                                    ) : ratio.quantityPerPax}
                                </td>
                                <td className="px-4 py-3 text-slate-500">{ratio.unit}</td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                        {ratio.category}
                                    </span>
                                </td>
                                {isEditing && (
                                    <td className="px-4 py-3 text-center">
                                        <button className="text-slate-400 hover:text-red-500">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isEditing && (
                <div className="mt-4">
                    <button className="flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700">
                        <Plus size={18} /> Añadir Ingrediente
                    </button>
                </div>
            )}
        </div>
    );
};
