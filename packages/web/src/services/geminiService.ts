import { container } from '@/application/di/Container';
import { TYPES } from '@/application/di/types';
import type { IAIService } from '@/domain/interfaces/services/IAIService';
import { trackedGeminiCall } from './ai/geminiMetrics';
import type { AIFeature, AICallMetadata } from './ai/types';
import { useStore } from '@/presentation/store/useStore';
import type { Ingredient } from '@/types';

const getAIService = () => container.get<IAIService>(TYPES.AIService);

const getMetadata = (overrides?: Partial<AICallMetadata>): AICallMetadata => {
  const state = useStore.getState();
  return {
    outletId: state.activeOutletId || 'unknown',
    userId: state.currentUser?.id || 'unknown',
    ...overrides,
  };
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
  metadataOverride?: AICallMetadata
): Promise<AIAnalysisResult> {
  const metadata = metadataOverride || getMetadata();

  try {
    console.log(`[AI Service] Starting trackedGeminiCall for ${feature}`);
    return await trackedGeminiCall(
      feature,
      async () => {
        const aiService = getAIService();
        console.log(`[AI Service] Calling aiService.analyzeImage for ${feature}...`);
        const response = await aiService.analyzeImage(imageBase64, prompt);

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
          // Find JSON block if wrapped in markdown
          const jsonMatch = /```json\n([\s\S]*?)\n```/.exec(text) || /\{[\s\S]*\}/.exec(text);
          const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
          const data = JSON.parse(jsonStr);
          console.log(`[AI Service] JSON parsed successfully for ${feature}`);
          const finalResult = { success: true, data };
          console.log(`[AI Service] Returning result with success: true`);
          return finalResult;
        } catch (parseError) {
          console.warn(
            `[AI Service] AI Response was not valid JSON for ${feature}:`,
            text.substring(0, 100) + '...'
          );
          return { success: true, data: { rawText: text } }; // Return raw text if JSON parse fails
        }
      },
      metadata,
      imageBase64 // Cache key input
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
  metadataOverride?: AICallMetadata
): Promise<string> {
  const metadata = metadataOverride || getMetadata();

  try {
    return await trackedGeminiCall(
      feature,
      async () => {
        const aiService = getAIService();
        const response = await aiService.generateText(prompt);
        return response.text;
      },
      metadata,
      prompt
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
export async function generateMenuFromCriteria(criteria: {
  eventType: string;
  pax: number;
  season: string;
  restrictions: string[];
}): Promise<AIAnalysisResult> {
  const prompt = `
        Act as a professional Chef. Design a menu for a "${criteria.eventType}" event for ${criteria.pax} people.
        Season: ${criteria.season}.
        Dietary Restrictions: ${criteria.restrictions.join(', ') || 'None'}.

        Return ONLY a JSON object with this structure:
        {
            "name": "Creative Menu Name",
            "description": "Brief description of the concept",
            "dishes": [
                {
                    "category": "Starter/Main/Dessert",
                    "name": "Dish Name",
                    "description": "Appetizing description",
                    "allergens": ["Gluten", "Dairy", etc]
                }
            ],
            "estimatedCost": 0.00,
            "sellPrice": 0.00
        }
    `;

  try {
    // Reuse generateContent which is now tracked. We pass the feature.
    const responseText = await generateContent(prompt, 'menuGenerator');
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
  aiConfig?: import('../types/suppliers').SupplierAIConfig
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

  const prompt = `
        Analiza esta factura o albarán de restaurante/proveedor. Extrae los datos en JSON siguiendo estrictamente este esquema:
        {
            "supplierName": "String",
            "date": "YYYY-MM-DD",
            "totalCost": Number,
            "items": [
                { "description": "String", "quantity": Number, "unitPrice": Number, "total": Number }
            ]
        }
        ${trainingContext}
        Si un campo no es legible, devuelve null. Asegúrate de que los números sean tipos Number de JS, no strings.
    `;
  return analyzeImage(base64Data, prompt, 'invoiceScanner');
}

/**
 * Scan an Ingredient Label for allergens and nutrition
 */
export async function scanIngredientLabel(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Analiza esta etiqueta de producto alimenticio. Extrae en JSON:
        {
            "name": "Nombre del producto",
            "brand": "Marca (si visible)",
            "allergens": ["Lista", "de", "alergenos", "detectados"],
            "nutrition": {
                "calories": 0 (kcal/100g),
                "protein": 0,
                "carbs": 0,
                "fat": 0
            }
        }
    `;
  return analyzeImage(base64Data, prompt, 'universalImporter');
}

/**
 * Scan a Recipe Card (Handwritten or Printed)
 */
export async function scanRecipeFromImage(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Analiza esta receta (foto o texto). Extrae en JSON:
        {
            "name": "Nombre Receta",
            "servings": Number (personas),
            "prepTime": Number (minutos),
            "ingredients": [
                { "name": "Ingrediente", "quantity": Number, "unit": "kg/g/l/unit" }
            ],
            "steps": ["Paso 1", "Paso 2"]
        }
        Normaliza las unidades a sistema métrico si es posible.
    `;
  return analyzeImage(base64Data, prompt, 'universalImporter');
}

/**
 * Scan a Physical Menu to digitalize it
 */
export async function scanMenuImage(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Digitaliza esta carta/menú. Extrae en JSON:
        {
            "name": "Nombre del Menú (ej. Carta Verano)",
            "sections": [
                {
                    "name": "Entrantes/Principales...",
                    "items": [
                        { "name": "Plato", "description": "Desc", "price": 0.00, "allergens": [] }
                    ]
                }
            ]
        }
    `;
  return analyzeImage(base64Data, prompt, 'universalImporter');
}

/**
 * Scan an Event Order (BEO)
 */
export async function scanEventOrder(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Analiza esta Hoja de Orden de Evento (BEO). Extrae en JSON:
        {
            "eventName": "Nombre Evento",
            "date": "YYYY-MM-DD",
            "time": "HH:MM",
            "pax": Number,
            "location": "Salón/Ubicación",
            "menu": {
                "name": "Nombre Menú",
                "items": ["Plato 1", "Plato 2"]
            },
            "schedule": [
                { "time": "HH:MM", "activity": "Cóctel/Cena/Barra Libre" }
            ],
            "notes": "Notas especiales (dietas, montaje...)"
        }
    `;
  return analyzeImage(base64Data, prompt, 'beoScanner');
}

/**
 * Scan a Handwritten Inventory Count Sheet
 */
export async function scanInventorySheet(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Analiza esta hoja de recuento de inventario manuscrita. Extrae en JSON:
        {
            "date": "YYYY-MM-DD",
            "items": [
                { "name": "Nombre Producto", "quantity": Number, "unit": "kg/l/u" }
            ]
        }
        Trata de interpretar la caligrafía lo mejor posible.
    `;
  return analyzeImage(base64Data, prompt, 'universalImporter');
}

/**
 * Scan a Handwritten HACCP Log (Temperatures/Cleaning)
 */
export async function scanHACCPLog(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Analiza esta hoja de registro de HACCP/Temperaturas. Extrae en JSON:
        {
            "date": "YYYY-MM-DD",
            "entries": [
                {
                    "pccName": "Nombre del equipo/cámara",
                    "value": Number (temperatura),
                    "time": "HH:MM",
                    "status": "CORRECT/WARNING/CRITICAL"
                }
            ]
        }
        Intenta mapear los nombres de equipos a PCCs genéricos si es posible.
    `;
  return analyzeImage(base64Data, prompt, 'universalImporter');
}
/**
 * Optimize Inventory Settings based on historical usage and future demand
 */
export async function optimizeInventorySettings(context: {
  ingredients: (Ingredient & {
    currentStock: number;
    usageHistory?: { avgDaily: number };
    futureDemand?: { neededQuantity: number; eventCount: number };
  })[];
  totalFuturePax: number;
}): Promise<AIAnalysisResult> {
  const prompt = `
        Actúa como un experto en cadena de suministro para restaurantes de alta gama.
        Analiza los siguientes datos de inventario y eventos próximos para optimizar los 'Reorder Points' (punto de pedido) y 'Optimal Stock' (stock máximo).

        DATOS DISPONIBLES:
        - Pax total previstos (próximas 2 semanas): ${context.totalFuturePax}
        - Ingredientes (incluye histórico de consumo diario y demanda futura por eventos confirmados).

        CONTEXTO:
        ${JSON.stringify(
          context.ingredients.map((i) => ({
            id: i.id,
            name: i.name,
            unit: i.unit,
            currentReorderPoint: i.reorderPoint,
            currentOptimalStock: i.optimalStock,
            currentStock: i.currentStock,
            avgDailyUsage: i.usageHistory?.avgDaily,
            futureEventDemand: i.futureDemand?.neededQuantity,
            eventCount: i.futureDemand?.eventCount,
          })),
          null,
          2
        )}

        INSTRUCCIONES:
        1. Compara el uso histórico vs la demanda futura.
        2. Si hay eventos grandes (pico de demanda), sugiere subir el reorderPoint proactivamente para evitar roturas de stock.
        3. Si un producto tiene poco uso histórico y no hay eventos, sugiere bajar el optimalStock para reducir capital inmovilizado y posibles mermas.
        4. Considera el 'yield' (rendimiento) si está presente, aunque aquí ya se asumen cantidades netas.
        5. Devuelve UNICAMENTE un objeto JSON con esta estructura:
        {
            "recommendations": [
                {
                    "ingredientId": "string",
                    "ingredientName": "string",
                    "suggestedReorderPoint": number,
                    "suggestedOptimalStock": number,
                    "reasoning": "Breve explicación en español (máx 15 palabras)",
                    "trend": "UP" | "DOWN" | "STABLE"
                }
            ],
            "globalAnalysis": "Resumen ejecutivo de la salud del inventario (español, 2 frases)"
        }
        Sugiere cambios solo para ingredientes donde la diferencia sea significativa (>10%).
    `;

  try {
    const text = await generateContent(prompt, 'inventoryOptimization');
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
export interface PurchaseSuggestionContext {
  ingredientId: string;
  ingredientName: string;
  futureDemand: number;
  currentStock: number;
  reorderPoint: number;
}

export async function suggestPurchases(
  context: PurchaseSuggestionContext[]
): Promise<AIAnalysisResult> {
  const prompt = `
        Actúa como un Jefe de Compras experto. 
        Analiza las necesidades de ingredientes para los próximos eventos y genera una lista de compra sugerida.
        
        CONTEXTO:
        ${JSON.stringify(context, null, 2)}
        
        INSTRUCCIONES:
        1. Para cada ingrediente, calcula la cantidad a comprar sabiendo: (Demanda Futura + 10% margen de seguridad) - Stock Actual.
        2. Si la cantidad resultante es <= 0, no sugerir compra para ese ítem.
        3. Agrupa por prioridad: 'CRITICAL' (stock insuficiente para el próximo evento) o 'PLANNING' (stock suficiente pero por debajo del óptimo).
        4. Devuelve UNICAMENTE un objeto JSON:
        {
            "suggestions": [
                {
                    "ingredientId": "string",
                    "ingredientName": "string",
                    "quantityToBuy": number,
                    "unit": "string",
                    "priority": "CRITICAL" | "PLANNING",
                    "reason": "Por qué comprar esta cantidad"
                }
            ],
            "summary": "Resumen de la inversión estimada y urgencia"
        }
    `;

  try {
    const text = await generateContent(prompt, 'purchaseSuggestion');

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
  ingredients: Ingredient[]
): Promise<AIAnalysisResult> {
  const prompt = `
        Actúa como un experto en control de costes y sostenibilidad en restauración (Loss Prevention Expert).
        Analiza los siguientes registros de mermas y propón estrategias concretas para reducirlas.

        DATOS DE MERMAS:
        ${JSON.stringify(
          wasteRecords.map((r) => ({
            date: r.date,
            ingredient: ingredients.find((i) => i.id === r.ingredientId)?.name,
            quantity: r.quantity,
            unit: r.unit,
            reason: r.reason,
            cost: r.quantity * r.costAtTime,
          })),
          null,
          2
        )}

        INSTRUCCIONES:
        1. Identifica patrones (ej: "Se tira mucha leche los lunes", "La merma por caducidad en carne es alta").
        2. Clasifica las recomendaciones por impacto económico.
        3. Propón acciones preventivas (ej: cambiar frecuencia de pedido, mejorar formación en cortes, ajustar stock de seguridad).
        4. Devuelve UNICAMENTE un objeto JSON:
        {
            "insights": [
                {
                    "title": "string",
                    "observation": "Qué está pasando",
                    "recommendation": "Qué hacer (máx 20 palabras)",
                    "severity": "CRITICAL" | "MODERATE" | "LOW"
                }
            ],
            "estimatedSavings": "Ahorro potencial estimado si se aplican las medidas",
            "summary": "Resumen ejecutivo de la situación"
        }
    `;

  try {
    const text = await generateContent(prompt, 'wasteAnalysis');

    const jsonMatch = /```json\n([\s\S]*?)\n```/.exec(text) || /\{[\s\S]*\}/.exec(text);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
    const data = JSON.parse(jsonStr);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Waste Analysis Error:', error);
    return { success: false, error: message };
  }
}
/**
 * NEW: Specialized Scanner for Sports Team Menus
 * Targets the column-based layout (Guarnición, 1, 2, Postre) and handwritten notes.
 */
export async function scanSportsTeamMenu(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Analiza esta foto de un menú para un Equipo Deportivo.
        Este formato suele tener columnas como "GUARNICIÓN", "PRIMER PLATO", "SEGUNDO PLATO", "POSTRES".
        
        EXTRAE EN JSON SIGUIENDO ESTA ESTRUCTURA:
        {
            "mealType": "CENA | COMIDA | DESAYUNO | MERIENDA",
            "courses": [
                {
                    "category": "Guarnición | Primero | Segundo | Postre",
                    "items": [
                        { 
                            "name": "Nombre del plato/alimento", 
                            "notes": "Notas específicas (ej: sin gluten, sin lactosa)", 
                            "quantity": "Cantidad si se especifica (ej: 15 unidades)",
                            "isHandwritten": true/false 
                        }
                    ]
                }
            ],
            "globalNotes": "Observaciones generales de la hoja",
            "handwrittenTranscriptions": "Transcripción de cualquier nota a mano encontrada (ej: tachones, flechas, añadidos con boli)"
        }
        
        IMPORTANTE: 
        1. Presta especial atención a lo escrito a mano (bolígrafo azul/negro sobre el papel).
        2. Detecta todas las restricciones dietéticas mencionadas para cada plato.
        3. Si hay marcas (checks o cruces) al lado de un plato, regístralo en las notas del plato.
    `;
  return analyzeImage(base64Data, prompt, 'sportsMenuScanner');
}
