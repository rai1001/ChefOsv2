import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, Sparkles } from 'lucide-react';
import { Ingredient } from '../../../domain/entities/Ingredient';
import { container } from '../../../application/di/Container';
import { TYPES } from '../../../application/di/types';
import { EnrichIngredientUseCase } from '../../../application/use-cases/ingredients/EnrichIngredientUseCase';

interface IngredientFormProps {
    onClose: () => void;
    initialData?: Ingredient;
    onSubmit: (data: Ingredient) => Promise<void>;
}

export const IngredientForm: React.FC<IngredientFormProps> = ({ onClose, initialData, onSubmit }) => {
    const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm<Ingredient>({
        defaultValues: initialData || {
            name: '',
            unit: 'kg',
            costPerUnit: 0,
            category: 'other',
            stock: 0,
            minStock: 0,
            yieldVal: 1, // field mapping might need care
            allergens: []
        }
    });

    const [enriching, setEnriching] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // AI Enrichment
    const handleEnrich = async () => {
        const name = getValues('name');
        if (!name) return;

        setEnriching(true);
        try {
            const enrichUseCase = container.get<EnrichIngredientUseCase>(TYPES.EnrichIngredientUseCase);
            const data = await enrichUseCase.execute(name);

            if (data) {
                if (data.nutritionalInfo) setValue('nutritionalInfo', data.nutritionalInfo);
                if (data.allergens) setValue('allergens', data.allergens);
            }
        } catch (error) {
            console.error("Enrichment failed", error);
        } finally {
            setEnriching(false);
        }
    };

    const onFormSubmit = async (data: any) => {
        setSubmitting(true);
        try {
            // Ensure ID is present for update, or generate new ID for create (handled by UseCase or here?)
            // Usually ID generation is done in helper or backend. 
            // For now, let's assume UseCase or Repository handles ID if missing, OR we generate valid Ingredient object.
            // But Ingredient entity constructor requires ID.

            const ingredientToSave = new Ingredient(
                initialData?.id || crypto.randomUUID(),
                data.name,
                data.unit,
                Number(data.costPerUnit),
                Number(data.yieldVal || 1),
                data.allergens || [],
                data.category,
                Number(data.stock),
                Number(data.minStock),
                data.nutritionalInfo,
                [], // batches
                undefined, // supplierId
                [],
                undefined,
                undefined,
                undefined
            );

            await onSubmit(ingredientToSave);
            onClose();
        } catch (error) {
            console.error("Save failed", error);
            alert("Error saving ingredient");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface text-white p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase tracking-wide">
                    {initialData ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
                </h2>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleEnrich}
                        disabled={enriching}
                        className="bg-purple-600/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-purple-600/30 transition-colors"
                    >
                        <Sparkles size={14} className={enriching ? 'animate-spin' : ''} />
                        {enriching ? 'Completando...' : 'Auto-Completar AI'}
                    </button>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6 flex-1">
                <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre del Producto</label>
                        <input
                            {...register('name', { required: true })}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none"
                            placeholder="Ej. Tomate Pera"
                        />
                        {errors.name && <span className="text-red-400 text-xs mt-1 block">Requerido</span>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Categoría</label>
                        <select
                            {...register('category')}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none"
                        >
                            <option value="other">Otros</option>
                            <option value="meat">Carne</option>
                            <option value="fish">Pescado</option>
                            <option value="produce">Vegetales</option>
                            <option value="dairy">Lácteos</option>
                            <option value="dry">Secos</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Unidad Base</label>
                        <select
                            {...register('unit')}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none"
                        >
                            <option value="kg">KG</option>
                            <option value="g">G</option>
                            <option value="L">L</option>
                            <option value="ml">ML</option>
                            <option value="un">UNIDAD</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Coste / Unidad (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            {...register('costPerUnit', { min: 0 })}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">% Merma (Yield)</label>
                        <input
                            type="number"
                            step="0.01"
                            {...register('yieldVal', { min: 0, max: 1 })}
                            defaultValue={1}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">1 = Sin merma, 0.8 = 20% merma</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Stock Actual</label>
                        <input
                            type="number"
                            step="0.001"
                            {...register('stock', { min: 0 })}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Stock Mínimo</label>
                        <input
                            type="number"
                            step="0.001"
                            {...register('minStock', { min: 0 })}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none"
                        />
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-primary text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        <Save size={16} />
                        {submitting ? 'Guardando...' : 'Guardar Ficha'}
                    </button>
                </div>
            </form>
        </div>
    );
};
