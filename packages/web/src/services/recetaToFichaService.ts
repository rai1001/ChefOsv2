import { firestoreService } from '@/services/firestoreService';
import { collections, COLLECTION_NAMES } from '@/config/collections';
import { crearFichaTecnica } from './fichasTecnicasService';
import { where, CollectionReference } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import type { Recipe, Ingredient, CreateFichaDTO, IngredienteFicha } from '@/types';

export interface ImportResult {
    exitosas: { recetaId: string; fichaId: string }[];
    fallidas: { recetaId: string; error: string }[];
    duplicadas: { recetaId: string; motivo: string }[];
}

/**
 * Checks if a ficha already exists for a recipe.
 */
async function fichaExisteParaReceta(recetaId: string): Promise<boolean> {
    // This assumes we store recipeId in the ficha, which we should added in the types.
    // I'll assume we can query by 'recetaOriginalId' or similar if added, 
    // or simple check by name for now if schema isn't fully updated in my context.
    // The requirements added 'recetaOriginalId' to FichaTecnica type in the plan?
    // Let's check type definition I saw in Step 12... 
    // Step 12: `recetaBaseId?: string;` exists.

    const existing = await firestoreService.query(
        collections.fichasTecnicas as CollectionReference<DocumentData>,
        where('recetaBaseId', '==', recetaId),
        where('activa', '==', true)
    );
    return existing.length > 0;
}

/**
 * Converts a single recipe to a Ficha Técnica DTO.
 */
export async function convertirRecetaAFicha(
    recetaId: string,
    userId: string,
    outletId: string
): Promise<CreateFichaDTO> {
    // 1. Get Recipe
    const receta = await firestoreService.getById<Recipe>(COLLECTION_NAMES.RECIPES, recetaId);
    if (!receta) throw new Error(`Receta ${recetaId} no encontrada`);

    // 2. Get Ingredients and calculate costs
    const ingredients = await firestoreService.getAll<Ingredient>(collections.ingredients as unknown as CollectionReference<Ingredient>);
    const ingredientMap = new Map(ingredients.map(i => [i.id, i]));

    const ingredientesFicha: IngredienteFicha[] = receta.ingredients.map(ri => {
        const invInfo = ingredientMap.get(ri.ingredientId);
        const costoUnitario = invInfo?.costPerUnit || 0;
        return {
            ingredienteId: ri.ingredientId,
            nombre: invInfo?.name || 'Ingrediente desconocido',
            cantidad: ri.quantity,
            unidad: (invInfo?.unit || 'un'),
            costoUnitario: costoUnitario,
            costoTotal: ri.quantity * costoUnitario,
            esOpcional: false
        };
    });

    const costoIngredientes = ingredientesFicha.reduce((sum, i) => sum + i.costoTotal, 0);

    // Standard overheads (can be configured later)
    const costoManoObra = costoIngredientes * 0.15;
    const costoEnergia = costoIngredientes * 0.05;
    const costoTotal = costoIngredientes + costoManoObra + costoEnergia;
    const costoPorPorcion = costoTotal / (receta.yieldPax || 1);

    // Suggested Price (65% margin default)
    const precioSugerido = costoPorPorcion / (1 - 0.65);

    return {
        nombre: receta.name,
        categoria: 'comida', // Default, should map from recipe type if available
        descripcion: receta.description || `Importado desde receta ${receta.name}`,
        porciones: receta.yieldPax || 1,
        ingredientes: ingredientesFicha,
        pasos: receta.instructions?.map((inst, idx) => ({
            id: `step-${idx}`,
            orden: idx + 1,
            descripcion: inst,
            tiempoEstimado: 0
        })) || [],
        tiempoPreparacion: receta.prepTime || 30,
        tiempoCoccion: receta.cookTime || 0,
        dificultad: 'media',
        costos: {
            ingredientes: costoIngredientes,
            manoObra: costoManoObra,
            energia: costoEnergia,
            total: costoTotal,
            porPorcion: costoPorPorcion
        },
        pricing: {
            precioVentaSugerido: precioSugerido,
            margenBruto: 65,
            margenObjetivo: 70
        },
        recetaBaseId: recetaId,
        outletId: outletId,
        creadoPor: userId,
        notas: 'Importado automáticamente'
    };
}

/**
 * Bulk imports recipes.
 */
export async function importarRecetasMasivo(
    recetaIds: string[],
    userId: string,
    outletId: string,
    onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
    const resultados: ImportResult = {
        exitosas: [],
        fallidas: [],
        duplicadas: []
    };

    for (let i = 0; i < recetaIds.length; i++) {
        const recetaId = recetaIds[i];
        if (!recetaId) continue;

        try {
            if (await fichaExisteParaReceta(recetaId)) {
                resultados.duplicadas.push({ recetaId, motivo: 'Ya existe una ficha activa' });
            } else {
                const dto = await convertirRecetaAFicha(recetaId, userId, outletId);
                const ficha = await crearFichaTecnica(dto, userId);
                resultados.exitosas.push({ recetaId, fichaId: ficha.id });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            resultados.fallidas.push({ recetaId, error: message });
        }

        if (onProgress) onProgress(i + 1, recetaIds.length);
    }

    return resultados;
}
