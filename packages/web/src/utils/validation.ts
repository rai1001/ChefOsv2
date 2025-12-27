import { z } from 'zod';
import type { Event, Recipe, Ingredient, Menu } from '@/types';

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

// --- Zod Schemas ---

const EventSchema = z.object({
    name: z.string()
        .min(1, 'El nombre del evento es obligatorio')
        .max(100, 'El nombre del evento no puede exceder 100 caracteres'),
    date: z.string().min(1, 'La fecha del evento es obligatoria').refine((val) => {
        const eventDate = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
    }, 'La fecha del evento no puede ser en el pasado'),
    pax: z.number()
        .min(1, 'El número de personas (PAX) debe ser al menos 1')
        .max(10000, 'El número de personas (PAX) no puede exceder 10,000'),
    type: z.string().min(1, 'El tipo de evento es obligatorio'),
});

const RecipeSchema = z.object({
    name: z.string()
        .min(1, 'El nombre de la receta es obligatorio')
        .max(150, 'El nombre de la receta no puede exceder 150 caracteres'),
    station: z.enum(['hot', 'cold', 'dessert'], {
        message: 'La partida (hot/cold/dessert) es obligatoria'
    }),
    ingredients: z.array(z.object({
        ingredientId: z.string().min(1, 'debe seleccionar un ingrediente'),
        quantity: z.number().gt(0, 'la cantidad debe ser mayor a 0'),
    })).min(1, 'La receta debe tener al menos un ingrediente'),
});

const IngredientSchema = z.object({
    name: z.string()
        .min(1, 'El nombre del ingrediente es obligatorio')
        .max(100, 'El nombre del ingrediente no puede exceder 100 caracteres'),
    unit: z.string().min(1, 'La unidad de medida es obligatoria'),
    costPerUnit: z.number().min(0, 'El coste por unidad no puede ser negativo').optional(),
    yield: z.number().min(0, 'El rendimiento debe estar entre 0 y 1 (0-100%)').max(1, 'El rendimiento debe estar entre 0 y 1 (0-100%)').optional(),
    stock: z.number().min(0, 'El stock no puede ser negativo').optional(),
    minStock: z.number().min(0, 'El stock mínimo no puede ser negativo').optional(),
    nutritionalInfo: z.object({
        calories: z.number().min(0, 'Los valores nutricionales no pueden ser negativos').max(9000, 'Los valores nutricionales parecen estar fuera de rango razonable (por 100g/ml)'),
        protein: z.number().min(0, 'Los valores nutricionales no pueden ser negativos').max(100, 'Los valores nutricionales parecen estar fuera de rango razonable (por 100g/ml)'),
        carbs: z.number().min(0, 'Los valores nutricionales no pueden ser negativos').max(100, 'Los valores nutricionales parecen estar fuera de rango razonable (por 100g/ml)'),
        fat: z.number().min(0, 'Los valores nutricionales no pueden ser negativos').max(100, 'Los valores nutricionales parecen estar fuera de rango razonable (por 100g/ml)'),
    }).optional(),
});

const MenuSchema = z.object({
    name: z.string()
        .min(1, 'El nombre del menú es obligatorio')
        .max(150, 'El nombre del menú no puede exceder 150 caracteres'),
    recipeIds: z.array(z.string()).min(1, 'El menú debe tener al menos una receta'),
    sellPrice: z.number().min(0, 'El precio de venta no puede ser negativo').optional(),
});

// --- Validation Wrappers ---

const wrapValidation = <T>(schema: z.ZodSchema<T>, data: Partial<T>): ValidationResult => {
    const result = schema.safeParse(data);
    if (result.success) {
        return { valid: true, errors: [] };
    }
    return {
        valid: false,
        errors: result.error.issues.map((err: z.ZodIssue) => {
            // Special handling for nested ingredient indexing to match old error format
            if (err.path[0] === 'ingredients' && typeof err.path[1] === 'number') {
                return `Ingrediente #${err.path[1] + 1}: ${err.message}`;
            }
            return err.message;
        })
    };
};

export const validateEvent = (event: Partial<Event>) => wrapValidation(EventSchema, event);
export const validateRecipe = (recipe: Partial<Recipe>) => wrapValidation(RecipeSchema, recipe);
export const validateIngredient = (ingredient: Partial<Ingredient>) => wrapValidation(IngredientSchema, ingredient);
export const validateMenu = (menu: Partial<Menu>) => wrapValidation(MenuSchema, menu);

// General helpers
export const formatValidationErrors = (errors: string[]): string => {
    if (errors.length === 0) return '';
    if (errors.length === 1) return errors[0]!;
    return '• ' + errors.join('\n• ');
};

export const isValidEmail = (email: string): boolean => {
    return z.string().email().safeParse(email).success;
};

export const isValidPhone = (phone: string): boolean => {
    // Basic regex for Spanish phone numbers (roughly matching original)
    const phoneRegex = /^[+]?[\d\s()-]{9,}$/;
    return phoneRegex.test(phone);
};
