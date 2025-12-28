import { z } from 'zod';

export const EnrichedIngredientSchema = z.object({
  nutritionalInfo: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    fiber: z.number().optional(),
    sodium: z.number().optional(),
  }),
  allergens: z.array(z.string()),
});

export const ScannedInvoiceItemSchema = z.object({
  code: z.string().nullable().optional(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

export const ScannedInvoiceSchema = z.object({
  documentType: z.enum(['Factura', 'Albarán']),
  documentNumber: z.string(),
  supplierName: z.string(),
  supplierTaxId: z.string().nullable().optional(),
  issueDate: z.string(), // YYYY-MM-DD
  totalCost: z.number(),
  items: z.array(ScannedInvoiceItemSchema),
});

export const MenuDishSchema = z.object({
  category: z.enum(['Starter', 'Main', 'Dessert']),
  name: z.string(),
  description: z.string(),
  allergens: z.array(z.string()),
  price: z.number().optional(),
});

export const GeneratedMenuSchema = z.object({
  name: z.string(),
  description: z.string(),
  dishes: z.array(MenuDishSchema),
  estimatedCostPerPerson: z.number().optional(),
  suggestedSellPricePerPerson: z.number().optional(),
});
