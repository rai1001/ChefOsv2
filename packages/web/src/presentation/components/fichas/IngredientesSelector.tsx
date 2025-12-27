/**
 * @file src/components/fichas/IngredientesSelector.tsx
 * @description Component for searching and adding ingredients to a Ficha Técnica.
 */

import React, { useState, useMemo } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import Fuse from 'fuse.js';
import type { IngredienteFicha, Ingredient } from '@/types';

interface Props {
    ingredientes: IngredienteFicha[];
    onAdd: (ing: IngredienteFicha) => void;
    onRemove: (index: number) => void;
    onUpdate: (index: number, updates: Partial<IngredienteFicha>) => void;
}

export const IngredientesSelector: React.FC<Props> = ({
    ingredientes,
    onAdd,
    onRemove,
    onUpdate
}) => {
    const { ingredients } = useStore();
    const [searchTerm, setSearchTerm] = useState('');

    const fuse = useMemo(() => new Fuse(ingredients, {
        keys: ['name'],
        threshold: 0.3
    }), [ingredients]);

    const searchResults = useMemo(() => {
        if (!searchTerm) return [];
        return (fuse.search(searchTerm) as any[]).slice(0, 5).map(res => res.item as Ingredient);
    }, [searchTerm, fuse]);

    const handleSelect = (ing: Ingredient) => {
        onAdd({
            ingredienteId: ing.id,
            nombre: ing.name,
            cantidad: 0,
            unidad: ing.unit,
            costoUnitario: ing.costPerUnit,
            costoTotal: 0,
            esOpcional: false
        });
        setSearchTerm('');
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                    className="w-full bg-surface border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:border-primary focus:outline-none transition-all"
                    placeholder="Buscar ingrediente en inventario..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />

                {searchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-surface-light border border-white/10 rounded-lg shadow-xl overflow-hidden">
                        {searchResults.map(ing => (
                            <button
                                key={ing.id}
                                onClick={() => handleSelect(ing)}
                                className="w-full px-4 py-2 text-left hover:bg-primary/20 text-sm flex justify-between items-center transition-colors"
                            >
                                <span>{ing.name}</span>
                                <span className="text-xs text-slate-500">{ing.costPerUnit.toFixed(2)}€/{ing.unit}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                {ingredientes.map((ing, idx) => (
                    <div key={`${ing.ingredienteId}-${idx}`} className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-white/5">
                        <div className="flex-1">
                            <span className="text-sm font-medium text-white">{ing.nombre}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="w-20 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-right focus:border-primary focus:outline-none"
                                value={ing.cantidad}
                                onChange={e => onUpdate(idx, { cantidad: Number(e.target.value) })}
                            />
                            <span className="text-xs text-slate-500 w-8">{ing.unidad}</span>
                        </div>

                        <div className="w-24 text-right">
                            <span className="text-xs font-mono text-primary">
                                {ing.costoTotal?.toFixed(2)} €
                            </span>
                        </div>

                        <button
                            onClick={() => onRemove(idx)}
                            className="p-1 hover:text-red-400 text-slate-500 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                {ingredientes.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-xl">
                        <p className="text-sm text-slate-500">No hay ingredientes añadidos</p>
                    </div>
                )}
            </div>
        </div>
    );
};
