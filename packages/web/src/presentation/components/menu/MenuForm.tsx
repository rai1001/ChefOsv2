import React, { useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import type { Recipe } from '@/types';


export const MenuForm: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    const { recipes, addMenu } = useStore();
    const [formData, setFormData] = useState({
        name: '',
        sellPrice: 0,
        recipeIds: [] as string[]
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Hydrate recipes
        const menuRecipes = formData.recipeIds.map(id => recipes.find(r => r.id === id)).filter((r): r is Recipe => r !== undefined);

        addMenu({
            id: crypto.randomUUID(),
            name: formData.name,
            sellPrice: formData.sellPrice,
            recipeIds: formData.recipeIds,
            recipes: menuRecipes
        });

        if (onClose) onClose();
    };

    const toggleRecipe = (recipeId: string) => {
        if (formData.recipeIds.includes(recipeId)) {
            setFormData({
                ...formData,
                recipeIds: formData.recipeIds.filter(id => id !== recipeId)
            });
        } else {
            setFormData({
                ...formData,
                recipeIds: [...formData.recipeIds, recipeId]
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-surface p-6 rounded-xl border border-white/5">
            <h3 className="text-xl font-bold text-white mb-4">Añadir Menú</h3>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm text-slate-400">Nombre del Menú</label>
                    <input
                        required
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm text-slate-400">Precio Venta ($)</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
                        value={formData.sellPrice}
                        onChange={e => setFormData({ ...formData, sellPrice: Number(e.target.value) })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm text-slate-400">Seleccionar Platos</label>
                <div className="bg-black/20 border border-white/10 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                    {recipes.map(recipe => (
                        <label key={recipe.id} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.recipeIds.includes(recipe.id)}
                                onChange={() => toggleRecipe(recipe.id)}
                                className="rounded border-white/20 bg-black/40 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-slate-200">{recipe.name}</span>
                            <span className="text-xs text-slate-500 ml-auto uppercase">{recipe.station}</span>
                        </label>
                    ))}
                    {recipes.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-2">No hay recetas disponibles.</p>
                    )}
                </div>
                <p className="text-xs text-slate-500 text-right">{formData.recipeIds.length} platos seleccionados</p>
            </div>

            <button
                type="submit"
                className="w-full bg-primary hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors"
            >
                Guardar Menú
            </button>
        </form>
    );
};
