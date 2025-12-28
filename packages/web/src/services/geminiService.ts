import { container } from '@/application/di/Container';
import { TYPES } from '@/application/di/types';
import type { IAIService } from '@/domain/interfaces/services/IAIService';
import { trackedGeminiCall } from './ai/geminiMetrics';
import type { AIFeature, AICallMetadata } from './ai/types';
import { useStore } from '@/presentation/store/useStore';
import type { Ingredient } from '@/types';
import * as schemas from './ai/aiValidation';

import { PromptRegistry } from './ai/prompts';

const getAIService = () => container.get<IAIService>(TYPES.AIService);

const getMetadata = (overrides?: Partial<AICallMetadata>): AICallMetadata => {
  try {
    const state = useStore?.getState?.();
    if (!state) {
      console.warn('[AI Service] Store state not available for metadata, using defaults');
      return {
        outletId: 'unknown',
        userId: 'unknown',
        ...overrides,
      };
    }
    return {
      outletId: state.activeOutletId || 'unknown',
      userId: state.currentUser?.id || 'unknown',
      ...overrides,
    };
  } catch (e) {
    console.error('[AI Service] Error getting metadata from store:', e);
    return {
      outletId: 'unknown',
      userId: 'unknown',
      ...overrides,
    };
  }
};

console.log('CulinaryOS AI Service initialized via Hexagonal Architecture');

export interface AIAnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Analyze an image using Gemini Flash Multimodal
 * @param imageBase64 Base64 string of the image (without data:image/jpeg;base64, prefix if possible, but SDK handles it)
 * @param prompt Text prompt for the AI
 * @returns Parsed JSON result or error
 */
export async function analyzeImage(
  imageBase64: string,
  prompt: string,
  feature: AIFeature = 'universalImporter',
  metadataOverride?: AICallMetadata,
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  const metadata = metadataOverride || getMetadata();

  try {
    console.log(`[AI Service] Starting trackedGeminiCall for ${feature}`);
    return await trackedGeminiCall(
      feature,
      async () => {
        const aiService = getAIService();
        console.log(`[AI Service] Calling aiService.analyzeImage for ${feature}...`);
        const response = await aiService.analyzeImage(imageBase64, prompt, options);

        if (!response) {
          console.error(`[AI Service] AI Service returned NULL/UNDEFINED response for ${feature}`);
          throw new Error('AI Service returned no response');
        }

        console.log(`[AI Service] AI Service response keys:`, Object.keys(response));
        const text = response.text;

        if (text === undefined) {
          console.error(`[AI Service] AI response.text is undefined!`);
          throw new Error('AI response.text is undefined');
        }

        // Try to parse JSON from the response
        try {
          console.log(`[AI Service] Parsing JSON from text (length: ${text.length})...`);
          const jsonMatch = /```json\n([\s\S]*?)\n```/.exec(text) || /\{[\s\S]*\}/.exec(text);
          const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
          let data = JSON.parse(jsonStr);

          // Optional Zod Validation if feature has a schema
          try {
            if (feature === 'invoiceScanner') {
              data = schemas.ScannedInvoiceSchema.parse(data);
            } else if (feature === 'menuGenerator') {
              data = schemas.GeneratedMenuSchema.parse(data);
            }
          } catch (zodError) {
            console.warn(`[AI Service] Zod validation failed for ${feature}:`, zodError);
            // We proceed with the data anyway but log the warning
          }

          console.log(`[AI Service] JSON parsed successfully for ${feature}`);
          return { success: true, data };
        } catch (parseError) {
          console.warn(
            `[AI Service] AI Response was not valid JSON for ${feature}:`,
            text.substring(0, 100) + '...'
          );
          return { success: true, data: { rawText: text } };
        }
      },
      metadata,
      {
        prompt,
        imageSize: imageBase64.length,
      }, // Structured payload for estimation
      options
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during AI analysis';
    console.error('Gemini Analysis Error:', error);
    return { success: false, error: message };
  }
}

export async function generateContent(
  prompt: string,
  feature: AIFeature = 'universalImporter',
  metadataOverride?: AICallMetadata,
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<string> {
  const metadata = metadataOverride || getMetadata();

  try {
    return await trackedGeminiCall(
      feature,
      async () => {
        const aiService = getAIService();
        const response = await aiService.generateText(prompt, options);
        return response.text;
      },
      metadata,
      prompt,
      options
    );
  } catch (error) {
    console.error('Gemini Generation Error:', error);
    throw error;
  }
}

// --- Specialized AI Functions (Client-Side) ---

/**
 * Generate a menu based on criteria
 */
export async function generateMenuFromCriteria(
  criteria: {
    eventType: string;
    pax: number;
    season: string;
    restrictions: string[];
    availableIngredients?: string[];
  },
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  const promptDef = PromptRegistry.getPrompt('menuGenerator', criteria, options?.promptVersion);
  const prompt = promptDef.userPromptTemplate(criteria);

  try {
    const responseText = await generateContent(prompt, 'menuGenerator', undefined, {
      jsonMode: true,
    });
    const text = responseText;

    const jsonMatch = /```json\n([\s\S]*?)\n```/.exec(text) || /\{[\s\S]*\}/.exec(text);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
    const data = JSON.parse(jsonStr);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Menu Generation Error:', error);
    return { success: false, error: message };
  }
}

/**
 * Analyze an invoice image calling analyzeImage with a specific prompt
 * Includes context-aware training via aiConfig if provided
 */
export async function scanInvoiceImage(
  base64Data: string,
  aiConfig?: import('../types/suppliers').SupplierAIConfig,
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  let trainingContext = '';

  if (aiConfig) {
    if (aiConfig.hints) {
      trainingContext += `\nHINTS ESPECÍFICOS PARA ESTE PROVEEDOR:\n${aiConfig.hints}\n`;
    }

    if (aiConfig.samples && aiConfig.samples.length > 0) {
      trainingContext += `\nEJEMPLOS DE EXTRACCIONES EXITOSAS (FEW-SHOT):\n`;
      aiConfig.samples.forEach((sample) => {
        trainingContext += `TEXTO ORIGINAL DETECTADO: "${sample.rawTextSnippet.substring(0, 500)}..."\n`;
        trainingContext += `EXTRACCIÓN CORRECTA: ${JSON.stringify(sample.verifiedData)}\n---\n`;
      });
    }
  }

  const promptDef = PromptRegistry.getPrompt(
    'invoiceScanner',
    { trainingContext },
    options?.promptVersion
  );
  const prompt = promptDef.userPromptTemplate({ trainingContext });
  return analyzeImage(base64Data, prompt, 'invoiceScanner', undefined, { jsonMode: true });
}

/**
 * Scan an Ingredient Label for allergens and nutrition
 */
export async function scanIngredientLabel(
  base64Data: string,
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  const promptDef = PromptRegistry.getPrompt('ingredientLabelScanner', {}, options?.promptVersion);
  const prompt = promptDef.userPromptTemplate({});
  return analyzeImage(base64Data, prompt, 'universalImporter', undefined, options);
}

/**
 * Scan a Recipe Card (Handwritten or Printed)
 */
export async function scanRecipeFromImage(
  base64Data: string,
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  const promptDef = PromptRegistry.getPrompt('recipeScanner', {}, options?.promptVersion);
  const prompt = promptDef.userPromptTemplate({});
  return analyzeImage(base64Data, prompt, 'universalImporter', undefined, options);
}

/**
 * Scan a Physical Menu to digitalize it
 */
export async function scanMenuImage(
  base64Data: string,
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  const promptDef = PromptRegistry.getPrompt('physicalMenuScanner', {}, options?.promptVersion);
  const prompt = promptDef.userPromptTemplate({});
  return analyzeImage(base64Data, prompt, 'universalImporter', undefined, options);
}

/**
 * Scan an Event Order (BEO)
 */
export async function scanEventOrder(
  base64Data: string,
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  const promptDef = PromptRegistry.getPrompt('beoScanner', {}, options?.promptVersion);
  const prompt = promptDef.userPromptTemplate({});
  return analyzeImage(base64Data, prompt, 'beoScanner', undefined, options);
}

/**
 * Scan a Handwritten Inventory Count Sheet
 */
export async function scanInventorySheet(
  base64Data: string,
  _expectedItems?: string[],
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  const promptDef = PromptRegistry.getPrompt('inventoryScanner', {}, options?.promptVersion);
  const prompt = promptDef.userPromptTemplate({});
  return analyzeImage(base64Data, prompt, 'inventoryScanner', undefined, options);
}

/**
 * Scan a Handwritten HACCP Log (Temperatures/Cleaning)
 */
export async function scanHACCPLog(
  base64Data: string,
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  const promptDef = PromptRegistry.getPrompt('haccpScanner', {}, options?.promptVersion);
  const prompt = promptDef.userPromptTemplate({});
  return analyzeImage(base64Data, prompt, 'haccpScanner', undefined, options);
}
/**
 * Optimize Inventory Settings based on historical usage and future demand
 */
export async function optimizeInventorySettings(
  context: {
    ingredients: (Ingredient & {
      currentStock: number;
      usageHistory?: { avgDaily: number };
      futureDemand?: { neededQuantity: number; eventCount: number };
    })[];
    totalFuturePax: number;
  },
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  const ingredientsJson = JSON.stringify(
    context.ingredients.map((i) => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      category: (i as any).category,
      currentReorderPoint: i.reorderPoint,
      currentOptimalStock: i.optimalStock,
      currentStock: i.currentStock,
      avgDailyUsage: i.usageHistory?.avgDaily,
      usageVariability: (i as any).usageHistory?.stdDev,
      futureEventDemand: i.futureDemand?.neededQuantity,
      eventCount: i.futureDemand?.eventCount,
      supplierLeadTime: (i as any).supplierLeadTime,
      shelfLife: (i as any).shelfLife,
      minimumOrderQty: (i as any).minimumOrderQty,
      unitCost: (i as any).unitCost,
    })),
    null,
    2
  );

  const promptDef = PromptRegistry.getPrompt(
    'inventoryOptimization',
    { totalFuturePax: context.totalFuturePax, ingredientsJson },
    options?.promptVersion
  );
  const prompt = promptDef.userPromptTemplate({
    totalFuturePax: context.totalFuturePax,
    ingredientsJson,
  });

  try {
    const text = await generateContent(prompt, 'inventoryOptimization', undefined, options);
    const jsonMatch = /```json\n([\s\S]*?)\n```/.exec(text) || /\{[\s\S]*\}/.exec(text);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
    const data = JSON.parse(jsonStr);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Inventory Optimization Error:', error);
    return { success: false, error: message };
  }
}

/**
 * NEW: Suggest specific purchases based on future demand
 */
/**
 * NEW: Suggest specific purchases based on future demand and supplier constraints
 */
export interface AdvancedPurchaseContext {
  inventory: any[]; // Full inventory data
  suppliers: { name: string; moq: number; leadTimeDays: number; deliveryDays: string[] }[];
  events: { date: string; name: string; type: string }[];
}

export async function suggestPurchases(
  context: AdvancedPurchaseContext,
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  const inventoryJson = JSON.stringify(
    context.inventory.map((item) => ({
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName,
      futureDemand: item.futureDemand,
      currentStock: item.currentStock,
      reorderPoint: item.reorderPoint,
      optimalStock: item.optimalStock,
      unit: item.unit,
      preferredSupplier: item.preferredSupplier,
      alternativeSuppliers: item.alternativeSuppliers,
      unitCost: item.unitCost,
      minimumOrderQty: item.minimumOrderQty,
      orderMultiple: item.orderMultiple,
      supplierLeadTime: item.supplierLeadTime,
      shelfLife: item.shelfLife,
      lastPurchasePrice: item.lastPurchasePrice,
      eventDates: item.eventDates,
    })),
    null,
    2
  );

  const promptDef = PromptRegistry.getPrompt(
    'purchaseSuggestion',
    {
      inventoryJson,
      budget: (context as any).budget,
      deliveryDeadline: (context as any).deliveryDeadline,
    },
    options?.promptVersion
  );
  const prompt = promptDef.userPromptTemplate({
    inventoryJson,
    budget: (context as any).budget,
    deliveryDeadline: (context as any).deliveryDeadline,
  });

  try {
    const text = await generateContent(prompt, 'purchaseSuggestion', undefined, options);

    const jsonMatch = /```json\n([\s\S]*?)\n```/.exec(text) || /\{[\s\S]*\}/.exec(text);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
    const data = JSON.parse(jsonStr);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Purchase Suggestion Error:', error);
    return { success: false, error: message };
  }
}

/**
 * NEW: Analyze Waste Patterns and provide reduction insights
 */
import type { WasteRecord } from '@/types';

export async function analyzeWaste(
  wasteRecords: WasteRecord[],
  _ingredients: Ingredient[],
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  const wasteRecordsJson = JSON.stringify(
    wasteRecords.map((r) => ({
      date: r.date,
      dayOfWeek: (r as any).dayOfWeek,
      shift: (r as any).shift,
      ingredientId: r.ingredientId,
      ingredientName: _ingredients.find((i) => i.id === r.ingredientId)?.name,
      ingredientCategory: (r as any).ingredientCategory,
      quantity: r.quantity,
      unit: r.unit,
      wasteReason: r.reason,
      costAtTime: r.costAtTime,
      totalCost: r.quantity * r.costAtTime,
      responsibleArea: (r as any).responsibleArea,
      recordedBy: (r as any).recordedBy,
    })),
    null,
    2
  );

  const contextObj = {
    revenue: (wasteRecords as any).context?.revenue || 'N/A',
    totalWasteCost: (wasteRecords as any).context?.totalWasteCost || 'N/A',
    wastePercentage: (wasteRecords as any).context
      ? (
          ((wasteRecords as any).context.totalWasteCost / (wasteRecords as any).context.revenue) *
          100
        ).toFixed(2)
      : 'N/A',
    staffCount: (wasteRecords as any).context?.staffCount || 'N/A',
  };
  const contextJson = JSON.stringify(contextObj, null, 2);

  const promptDef = PromptRegistry.getPrompt(
    'wasteAnalysis',
    { wasteRecordsJson, contextJson },
    options?.promptVersion
  );
  const prompt = promptDef.userPromptTemplate({ wasteRecordsJson, contextJson });

  try {
    const text = await generateContent(prompt, 'wasteAnalysis', undefined, options);

    const jsonMatch = /```json\n([\s\S]*?)\n```/.exec(text) || /\{[\s\S]*\}/.exec(text);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
    const data = JSON.parse(jsonStr);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: message };
  }
}
/**
 * NEW: Specialized Scanner for Sports Team Menus
 * Targets the column-based layout (Guarnición, 1, 2, Postre) and handwritten notes.
 */
export async function scanSportsTeamMenu(
  base64Data: string,
  options?: import('@/domain/interfaces/services/IAIService').AIRequestOptions
): Promise<AIAnalysisResult> {
  const promptDef = PromptRegistry.getPrompt('sportsMenuScanner', {}, options?.promptVersion);
  const prompt = promptDef.userPromptTemplate({});
  return analyzeImage(base64Data, prompt, 'sportsMenuScanner', undefined, options);
}
