import React, { useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { Plus, X, Loader2 } from 'lucide-react';
import { addDocument } from '@/services/firestoreService';

import type { Recipe } from '@/types';
import { updateDocument } from '@/services/firestoreService';
import { COLLECTIONS } from '@/config/collections';

export const RecipeForm: React.FC<{ initialData?: Recipe; onClose?: () => void }> = ({
  initialData,
  onClose,
}) => {
  const { ingredients, activeOutletId } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    station: initialData?.station || 'hot',
    isBase: initialData?.isBase || false,
    category: initialData?.category || ('main' as any),
    yieldPax: initialData?.yieldPax || 1,
    ingredients: initialData?.ingredients || ([] as { ingredientId: string; quantity: number }[]),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeOutletId) {
      alert('No hay cocina activa seleccionada.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Hydrate ingredients for consistency if needed, but for DB we save IDs and quantities usually?
      // Wait, Recipe type has 'ingredients: RecipeIngredient[]'. RecipeIngredient has 'ingredientId'.
      // The logic below stores object with ingredientId.
      // We just need to ensure correct structure.

      // Note: DB usually stores just IDs and quantities. The application hydrates them.
      // But types.ts Recipe has `ingredients: RecipeIngredient[]` where `ingredient?: Ingredient`.
      // We only save the flat data.

      const recipeData = {
        name: formData.name,
        station: formData.station,
        isBase: formData.isBase,
        yieldPax: formData.yieldPax,
        category: formData.category,
        ingredients: formData.ingredients, // Array of { ingredientId, quantity }
        outletId: activeOutletId,
      };

      if (initialData) {
        await updateDocument(COLLECTIONS.RECIPES, initialData.id, recipeData);
      } else {
        await addDocument(COLLECTIONS.RECIPES, recipeData);
      }

      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Error al guardar la receta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addIngredientRow = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { ingredientId: '', quantity: 0 }],
    });
  };

  const updateIngredientRow = (
    index: number,
    field: 'ingredientId' | 'quantity',
    value: string | number
  ) => {
    const newIngredients = [...formData.ingredients];
    const currentItem = newIngredients[index]!;
    if (field === 'ingredientId') {
      newIngredients[index] = { ...currentItem, ingredientId: value as string };
    } else {
      newIngredients[index] = { ...currentItem, quantity: Number(value) };
    }
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const removeIngredientRow = (index: number) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-surface p-6 rounded-xl border border-white/5"
    >
      <h3 className="text-xl font-bold text-white mb-4">
        {initialData ? 'Editar Receta' : 'Añadir Receta'}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="recipe-name" className="text-sm text-slate-400">
            Nombre
          </label>
          <input
            id="recipe-name"
            required
            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="recipe-station" className="text-sm text-slate-400">
            Partida
          </label>
          <select
            id="recipe-station"
            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
            value={formData.station}
            onChange={(e) =>
              setFormData({ ...formData, station: e.target.value as 'hot' | 'cold' | 'dessert' })
            }
          >
            <option value="hot">Caliente</option>
            <option value="cold">Fría</option>
            <option value="dessert">Postres</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="recipe-yield" className="text-sm text-slate-400">
            Raciones / Rendimiento (Pax)
          </label>
          <input
            id="recipe-yield"
            type="number"
            min="1"
            required
            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
            value={formData.yieldPax}
            onChange={(e) => setFormData({ ...formData, yieldPax: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="recipe-category" className="text-sm text-slate-400">
            Categoría
          </label>
          <select
            id="recipe-category"
            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
          >
            <option value="appetizer">Entrante</option>
            <option value="main">Principal</option>
            <option value="dessert">Postre</option>
            <option value="sauce">Salsa / Guarnición</option>
            <option value="base">Base</option>
            <option value="beverage">Bebida</option>
            <option value="other">Otro</option>
          </select>
        </div>
      </div>

      {/* Checkbox for isBase */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isBase"
          checked={formData.isBase}
          onChange={(e) => setFormData({ ...formData, isBase: e.target.checked })}
          className="w-4 h-4 rounded border-white/10 bg-black/20 text-primary focus:ring-primary focus:ring-offset-0"
        />
        <label htmlFor="isBase" className="text-sm text-slate-400 cursor-pointer">
          Esta es una receta base (usada como ingrediente en otras recetas)
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-slate-400">Ingredientes</label>
        {formData.ingredients.map((item, index) => (
          <div key={index} className="flex gap-2">
            <select
              aria-label={`Ingrediente ${index + 1}`}
              required
              className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
              value={item.ingredientId}
              onChange={(e) => updateIngredientRow(index, 'ingredientId', e.target.value)}
            >
              <option value="">Seleccionar Ingrediente...</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} ({ing.unit})
                </option>
              ))}
            </select>
            <input
              aria-label={`Cantidad del ingrediente ${index + 1}`}
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="Cant."
              className="w-24 bg-black/20 border border-white/10 rounded px-3 py-2 text-white"
              value={item.quantity}
              onChange={(e) => updateIngredientRow(index, 'quantity', Number(e.target.value))}
            />
            <button
              type="button"
              onClick={() => removeIngredientRow(index)}
              className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
              aria-label={`Eliminar ingrediente ${index + 1}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addIngredientRow}
          className="text-sm text-primary hover:text-blue-400 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Añadir Ingrediente
        </button>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary hover:bg-blue-600 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Guardar Receta
      </button>
    </form>
  );
};
