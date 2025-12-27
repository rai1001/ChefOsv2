/**
 * @file src/hooks/useFichaTecnicaForm.ts
 * @description Hook for managing Ficha Técnica form state and business logic.
 */

import { useState, useEffect } from 'react';
import { calcularCostosFicha } from '@/services/costosService';
import { crearFichaTecnica, actualizarFichaTecnica } from '@/services/fichasTecnicasService';
import type {
    FichaTecnica,
    IngredienteFicha,
    PasoPreparacion,
    FichaCategoria
} from '@/types';

export interface FichaFormState {
    nombre: string;
    categoria: FichaCategoria;
    porciones: number;
    ingredientes: IngredienteFicha[];
    pasos: PasoPreparacion[];
    costos: FichaTecnica['costos'];
    pricing: FichaTecnica['pricing'];
    outletId: string;
}

const initialState: FichaFormState = {
    nombre: '',
    categoria: 'comida',
    porciones: 1,
    ingredientes: [],
    pasos: [],
    costos: { ingredientes: 0, total: 0, porPorcion: 0 },
    pricing: { margenObjetivo: 60 },
    outletId: ''
};

export function useFichaTecnicaForm(initialData?: Partial<FichaTecnica>, userId?: string) {
    const [formData, setFormData] = useState<FichaFormState>({
        ...initialState,
        ...(initialData as any)
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Recalculate costs when ingredients or portions change
    useEffect(() => {
        const updateCosts = async () => {
            try {
                const nuevosCostos = await calcularCostosFicha(formData);
                setFormData(prev => ({ ...prev, costos: nuevosCostos }));
            } catch (err) {
                console.error('Error updating costs:', err);
            }
        };

        updateCosts();
    }, [formData.ingredientes, formData.porciones]);

    const updateGeneral = (updates: Partial<Pick<FichaFormState, 'nombre' | 'categoria' | 'porciones' | 'outletId'>>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const addIngrediente = (ingrediente: IngredienteFicha) => {
        setFormData(prev => ({
            ...prev,
            ingredientes: [...prev.ingredientes, ingrediente]
        }));
    };

    const removeIngrediente = (index: number) => {
        setFormData(prev => ({
            ...prev,
            ingredientes: prev.ingredientes.filter((_, i) => i !== index)
        }));
    };

    const updateIngrediente = (index: number, updates: Partial<IngredienteFicha>) => {
        setFormData(prev => ({
            ...prev,
            ingredientes: prev.ingredientes.map((ing, i) => i === index ? { ...ing, ...updates } : ing)
        }));
    };

    const addPaso = (descripcion: string) => {
        setFormData(prev => ({
            ...prev,
            pasos: [...prev.pasos, {
                id: crypto.randomUUID(),
                descripcion,
                orden: prev.pasos.length
            }]
        }));
    };

    const removePaso = (index: number) => {
        setFormData(prev => ({
            ...prev,
            pasos: prev.pasos.filter((_, i) => i !== index).map((p, i) => ({ ...p, orden: i }))
        }));
    };

    const save = async () => {
        if (!userId) {
            setError('User not authenticated');
            return;
        }
        setError(null);
        setIsSaving(true);
        try {
            if ((initialData as any)?.id) {
                await actualizarFichaTecnica((initialData as any).id, formData as any, userId);
            } else {
                await crearFichaTecnica(formData as any, userId);
            }
            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to save Ficha Técnica');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    return {
        formData,
        isSaving,
        error,
        updateGeneral,
        addIngrediente,
        removeIngrediente,
        updateIngrediente,
        addPaso,
        removePaso,
        save
    };
}
