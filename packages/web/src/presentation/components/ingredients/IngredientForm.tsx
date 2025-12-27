import React, { useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { Plus, Sparkles, Loader2, Trash2 } from 'lucide-react';
import type { Ingredient, IngredientSupplier } from '@/types';
import { enrichIngredientCallable } from '@/services/ai/functions';
import { container } from '@/application/di/Container';
import { TYPES } from '@/application/di/types';
import { CreateIngredientUseCase } from '@/application/use-cases/ingredients/CreateIngredientUseCase';
import { UpdateIngredientUseCase } from '@/application/use-cases/ingredients/UpdateIngredientUseCase';
import { CreateIngredientRequest, UpdateIngredientRequest } from '@/types/inventory';
import { SupplierManager } from './SupplierManager';
import { SupplierSelectionSimulator } from './SupplierSelectionSimulator';
import { ALLERGENS } from '@/utils/allergenUtils';
import { NutritionalInfo, type NutritionalValues } from '@culinaryos/core';

export const IngredientForm: React.FC<{ initialData?: Ingredient; onClose?: () => void }> = ({
  initialData,
  onClose,
}) => {
  const { activeOutletId, suppliers } = useStore();

  // Resolve Use Cases
  const createUseCase = container.get<CreateIngredientUseCase>(TYPES.CreateIngredientUseCase);
  const updateUseCase = container.get<UpdateIngredientUseCase>(TYPES.UpdateIngredientUseCase);

  const [formData, setFormData] = useState<Partial<Ingredient>>(
    initialData || {
      name: '',
      unit: 'kg',
      costPerUnit: 0,
      yieldFactor: 1,
      shelfLife: 0,
      allergens: [] as string[],
      stock: 0,
      minStock: 0,
      supplierId: '',
      category: 'other',
      supplierInfo: [],
      isActive: true,
      nutritionalInfo: NutritionalInfo.create({
        energyKcal: 0,
        protein: 0,
        carbohydrates: 0,
        sugars: 0,
        fat: 0,
        saturatedFat: 0,
        fiber: 0,
        sodium: 0,
      }),
      autoSupplierConfig: {
        ingredientId: '',
        suppliers: [],
        selectionCriteria: {
          priorityFactor: 'price',
          weights: { price: 60, quality: 20, reliability: 10, leadTime: 10 },
        },
      },
    }
  );
  const [enriching, setEnriching] = useState(false);

  const handleEnrich = async () => {
    if (!formData.name) return;
    setEnriching(true);
    try {
      const result = await enrichIngredientCallable({ name: formData.name });
      const data = result.data as any; // Cast to any to handle structure mismatch if needed
      if (data) {
        // Map AI result to Core structure if necessary
        const enrichedNutrition = data.nutritionalInfo || {};

        const newNutritionalInfo = NutritionalInfo.create({
          energyKcal: enrichedNutrition.calories || enrichedNutrition.energyKcal || 0,
          protein: enrichedNutrition.protein || 0,
          carbohydrates: enrichedNutrition.carbs || enrichedNutrition.carbohydrates || 0,
          sugars: enrichedNutrition.sugars || 0,
          fat: enrichedNutrition.fat || 0,
          saturatedFat: enrichedNutrition.saturatedFat || 0,
          fiber: enrichedNutrition.fiber || 0,
          sodium: enrichedNutrition.sodium || 0,
        });

        setFormData((prev) => ({
          ...prev,
          nutritionalInfo: newNutritionalInfo,
          allergens: data.allergens || [],
        }));
      }
    } catch (error) {
      console.error('Enrichment failed', error);
    } finally {
      setEnriching(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeOutletId) {
      alert('Por favor selecciona una cocina activa.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Data Cleaning
      const cleanedAllergens = (formData.allergens || [])
        .filter(Boolean)
        .map((a) => String(a).trim())
        .filter((a) => a.length > 0);

      if (initialData) {
        // UPDATE
        const request: UpdateIngredientRequest = {
          name: formData.name,
          category: typeof formData.category === 'string' ? formData.category : 'other',
          unit: formData.unit as any,
          minStock: formData.minStock,
          stock: formData.stock,
          costPerUnit: formData.costPerUnit,
          yieldFactor: formData.yieldFactor || 1,
          shelfLife: formData.shelfLife,
          allergens: cleanedAllergens,
          supplierId: formData.supplierId,
          sku: formData.sku,
          isActive: formData.isActive,
          pieceWeight: formData.pieceWeight,
        };
        await updateUseCase.execute(initialData.id, request);
      } else {
        // CREATE
        const request: CreateIngredientRequest = {
          outletId: activeOutletId,
          name: formData.name || 'Sin Nombre',
          category: typeof formData.category === 'string' ? formData.category : 'other',
          unit: (formData.unit || 'kg') as any,
          minStock: formData.minStock || 0,
          stock: formData.stock,
          costPerUnit: formData.costPerUnit,
          yieldFactor: formData.yieldFactor || 1,
          shelfLife: formData.shelfLife,
          allergens: cleanedAllergens,
          supplierId: formData.supplierId,
          sku: formData.sku,
          isActive: formData.isActive,
          pieceWeight: formData.pieceWeight,
        };
        await createUseCase.execute(request);
      }

      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      alert('Error al guardar el ingrediente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateNutritionalValue = (field: keyof NutritionalValues, value: number) => {
    if (!formData.nutritionalInfo) return;

    // We must create a new instance to satisfy type requirements
    const currentValues = formData.nutritionalInfo.values;
    const newValues = {
      ...currentValues,
      [field]: value,
    };

    setFormData({
      ...formData,
      nutritionalInfo: NutritionalInfo.create(newValues),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col h-full bg-surface rounded-xl border border-white/5 overflow-hidden"
    >
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
        <h3 className="text-lg font-black text-white uppercase tracking-tight">
          {initialData ? 'Editar Ingrediente' : 'Añadir Ingrediente'}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold px-1">Nombre</label>
            <div className="flex gap-2">
              <input
                required
                className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:border-primary"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <button
                type="button"
                onClick={handleEnrich}
                disabled={enriching || !formData.name}
                className="p-2 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded hover:bg-purple-500/30 disabled:opacity-50 transition-colors"
                title="Auto-completar con IA"
              >
                {enriching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold px-1">Categoría</label>
            <select
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary/50"
              value={String(formData.category || 'other')}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="meat">Carne</option>
              <option value="fish">Pescado</option>
              <option value="produce">Frutas y Verduras</option>
              <option value="dairy">Lácteos</option>
              <option value="dry">Secos</option>
              <option value="frozen">Congelados</option>
              <option value="canned">Latas</option>
              <option value="cocktail">Cóctel</option>
              <option value="sports_menu">Menú Deportivo</option>
              <option value="corporate_menu">Menú Empresa</option>
              <option value="coffee_break">Coffee Break</option>
              <option value="restaurant">Restaurante</option>
              <option value="other">Otros</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
              Unidad (Receta)
            </label>
            <select
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary/50"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
            >
              {['kg', 'g', 'L', 'ml', 'un', 'manojo'].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
              Coste por Unidad ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-primary/50"
              value={formData.costPerUnit}
              onChange={(e) => setFormData({ ...formData, costPerUnit: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
              Rendimiento (0-1)
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-primary/50"
              value={formData.yieldFactor || 1}
              onChange={(e) => setFormData({ ...formData, yieldFactor: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
              Vida útil (días)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-primary/50"
              value={formData.shelfLife || ''}
              onChange={(e) => setFormData({ ...formData, shelfLife: Number(e.target.value) })}
            />
          </div>

          {/* HIGH PRIORITY ALLERGENS SECTION */}
          <div className="col-span-2 border-t border-white/10 pt-4 mt-2">
            <h4 className="text-md font-semibold text-white mb-3">Alérgenos</h4>
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map((allergen) => {
                const isSelected = formData.allergens?.includes(allergen);
                return (
                  <button
                    key={allergen}
                    type="button"
                    onClick={() => {
                      const current = formData.allergens || [];
                      const next = isSelected
                        ? current.filter((a) => a !== allergen)
                        : [...current, allergen];
                      setFormData({ ...formData, allergens: next });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      isSelected
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    {allergen}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
              Proveedor Principal
            </label>
            <select
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary/50"
              value={formData.supplierId || ''}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
            >
              <option value="">Seleccionar Proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 border-t border-white/10 pt-4 mt-2">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-semibold text-white">Proveedores Alternativos</h4>
              <button
                type="button"
                onClick={() => {
                  const newSupplier: IngredientSupplier = { supplierId: '', costPerUnit: 0 };
                  setFormData({
                    ...formData,
                    supplierInfo: [...(formData.supplierInfo || []), newSupplier],
                  });
                }}
                className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-2"
              >
                <Plus size={14} /> Añadir Proveedor
              </button>
            </div>
            <div className="space-y-3">
              {(formData.supplierInfo || []).map((info, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-end bg-black/10 p-3 rounded-lg border border-white/5"
                >
                  <div className="col-span-5 space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
                      Proveedor
                    </label>
                    <select
                      className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white outline-none"
                      value={info.supplierId}
                      onChange={(e) => {
                        const newList = [...(formData.supplierInfo || [])];
                        if (newList[index]) {
                          newList[index]!.supplierId = e.target.value;
                          setFormData({ ...formData, supplierInfo: newList });
                        }
                      }}
                    >
                      <option value="">Seleccionar...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
                      Coste
                    </label>
                    <input
                      type="number"
                      className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-sm text-white"
                      value={info.costPerUnit}
                      onChange={(e) => {
                        const newList = [...(formData.supplierInfo || [])];
                        if (newList[index]) {
                          newList[index]!.costPerUnit = Number(e.target.value);
                          setFormData({ ...formData, supplierInfo: newList });
                        }
                      }}
                    />
                  </div>
                  <div className="col-span-1 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        const newList = (formData.supplierInfo || []).filter((_, i) => i !== index);
                        setFormData({ ...formData, supplierInfo: newList });
                      }}
                      className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
              <label className="text-xs text-indigo-300 font-medium flex items-center gap-2">
                El proveedor principal (selección arriba) se utilizará por defecto.
              </label>
            </div>

            {/* Advanced Supplier Manager */}
            <div className="mt-6 border-t border-white/10 pt-6">
              <SupplierManager
                ingredientName={formData.name || 'Nuevo Ingrediente'}
                config={
                  formData.autoSupplierConfig || {
                    ingredientId: initialData?.id || 'temp',
                    suppliers: [],
                    selectionCriteria: {
                      priorityFactor: 'price',
                      weights: { price: 60, quality: 20, reliability: 10, leadTime: 10 },
                    },
                  }
                }
                onSave={(newConfig: any) =>
                  setFormData({ ...formData, autoSupplierConfig: newConfig })
                }
              />
              {formData.autoSupplierConfig && (
                <div className="mt-4">
                  <SupplierSelectionSimulator config={formData.autoSupplierConfig} />
                </div>
              )}
            </div>
          </div>

          <div className="col-span-2 border-t border-white/10 pt-4 mt-2">
            <h4 className="text-md font-semibold text-white mb-3">
              Información Nutricional (por 100g/ml)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
                  Calorías (kcal)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                  value={formData.nutritionalInfo?.values?.energyKcal}
                  onChange={(e) => updateNutritionalValue('energyKcal', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
                  Proteínas (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                  value={formData.nutritionalInfo?.values?.protein}
                  onChange={(e) => updateNutritionalValue('protein', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
                  Carbohidratos (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                  value={formData.nutritionalInfo?.values?.carbohydrates}
                  onChange={(e) => updateNutritionalValue('carbohydrates', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
                  Grasas (g)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                  value={formData.nutritionalInfo?.values?.fat}
                  onChange={(e) => updateNutritionalValue('fat', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
              Stock Actual
            </label>
            <input
              type="number"
              min="0"
              step="any"
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold px-1">
              Stock Mínimo
            </label>
            <input
              type="number"
              min="0"
              step="any"
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
            />
          </div>

          <div className="col-span-2 border-t border-white/10 pt-4 mt-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="isTrackedInInventory"
              className="w-4 h-4 rounded border-white/10 bg-black/20 text-primary focus:ring-primary"
              checked={formData.isActive ?? true}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <label
              htmlFor="isTrackedInInventory"
              className="text-sm text-slate-200 font-medium cursor-pointer"
            >
              Activo
              <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                Si se desmarca, el ingrediente no aparecerá en nuevas recetas.
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-sm">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-primary/50 group"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <Plus size={16} className="group-hover:rotate-90 transition-transform" />{' '}
              {initialData ? 'Guardar Cambios' : 'Añadir Ingrediente'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};
