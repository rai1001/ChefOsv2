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
        ROL: Actúa como un experto contable y auditor de facturas especializado en restauración.
        
        TAREA: Digitalizar esta factura/albarán con PRECISIÓN FINANCIERA.
        
        CONTEXTO DE ENTRENAMIENTO (Few-Shot):
        ${trainingContext || 'Ninguno disponible.'}

        INSTRUCCIONES DE EXTRACCIÓN:
        1. CABECERA:
           - Proveedor: Nombre comercial y CIF/NIF si aparece.
           - Fecha: Normaliza a ISO 8601 (YYYY-MM-DD). Si es ambigua (02/03/24), asume DD/MM/YY.
           - Número de Factura: Extrae el identificador único.
        
        2. TOTALES (Validación Matemática):
           - 'netAmount': Base imponible (suma de items sin IVA).
           - 'taxAmount': Total impuestos.
           - 'totalAmount': Total a pagar. 
           - REGLA: netAmount + taxAmount ≈ totalAmount (tolera diferencias de 0.05).

        3. LÍNEAS DE DETALLE (Items):
           - Extrae cada línea de producto.
           - Si una descripción ocupa dos líneas, combínalas.
           - Cantidad: Si no explícita, asume 1.
           - Precio Unitario y Total: Usa números (con punto decimal).
           - CORRECCIÓN OCR: Si ves símbolos de moneda (€, $) ignóralos en los campos numéricos. Convierte 'O' o 'l' en '0' o '1' en contextos numéricos si es obvio.

        FORMATO JSON DE SALIDA:
        {
            "supplier": {
                "name": "Nombre Detectado",
                "taxId": "B-12345678 (o null)"
            },
            "invoiceNumber": "string",
            "date": "YYYY-MM-DD",
            "totals": {
                "net": 0.00,
                "tax": 0.00,
                "gross": 0.00
            },
            "items": [
                { 
                    "description": "Nombre Producto completo", 
                    "quantity": 1.0, 
                    "unitPrice": 0.00, 
                    "totalPrice": 0.00,
                    "taxRate": 0.10 (si se detecta, ej: 10%, sino null)
                }
            ]
        }
    `;
  return analyzeImage(base64Data, prompt, 'invoiceScanner');
}

/**
 * Scan an Ingredient Label for allergens and nutrition
 */
export async function scanIngredientLabel(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        ROL: Actúa como un Tecnólogo de Alimentos y experto en etiquetado nutricional (Reglamento UE 1169/2011).
        
        TAREA: Extraer información técnica de esta etiqueta de producto.
        
        INSTRUCCIONES CLAVE:
        1. NOMBRE: Sé muy específico (ej: "Tomate Frito Estilo Casero" y no solo "Tomate").
        2. NUTRICIÓN: Extrae SIEMPRE los valores por 100g/100ml. Si solo hay por porción, calcúlalos si es posible o indica null.
        3. INGREDIENTES: Transcribe la lista de ingredientes completa ordenados por cantidad (como aparecen en la etiqueta).
        4. ALÉRGENOS: Detecta alérgenos declarados (negrita/mayúsculas) y trazas ("Puede contener...").
        
        FORMATO JSON:
        {
            "productName": "Nombre completo",
            "brand": "Marca/Fabricante",
            "quantity": "Cantidad neta detectada (ej: 1kg, 500ml)",
            "ingredientsText": "Lista completa de ingredientes literal...",
            "additives": ["E-330", "E-202"], // Códigos E detectados
            "certifications": ["Bio", "Gluten-Free", "Vegan"], // Sellos visuales o texto
            "allergens": {
                "contains": ["Gluten", "Soja"],
                "traces": ["Frutos Secos"]
            },
            "nutritionPer100": {
                "energyKcal": 0,
                "protein": 0.0,
                "fats": 0.0,
                "saturatedFats": 0.0,
                "carbs": 0.0,
                "sugars": 0.0,
                "salt": 0.0
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
        ROL: Actúa como un Chef Ejecutivo encargado de digitalizar y estandarizar el recetario del restaurante.
        
        TAREA: Convertir esta imagen de receta (manuscrita o impresa) en una Ficha Técnica estructurada lista para escandallo.
        
        INSTRUCCIONES DE NORMALIZACIÓN:
        1. CANTIDADES: Convierte TODAS las unidades no métricas a métricas (ej: 1 taza -> 240ml, 1 tbsp -> 15ml, 1 pizca -> 1g).
           - Si no puedes convertir con seguridad, mantén la original en 'originalUnit'.
        2. INGREDIENTES: Limpia el nombre (ej: "Tomates maduros picados" -> "Tomate Maduro", nota="Picado").
        3. PASOS: Extrae instrucciones claras y secuenciales.
        4. TIEMPOS: Suma tiempos de preparación activa y cocción pasiva.

        FORMATO JSON:
        {
            "title": "Nombre de la Receta",
            "type": "Starter" | "Main" | "Dessert" | "Cocktail" | "Sauce",
            "yield": {
                "quantity": 1,
                "unit": "Raciones" | "Litros" | "Kg"
            },
            "times": {
                "prepMinutes": 0,
                "cookMinutes": 0,
                "totalMinutes": 0
            },
            "ingredients": [
                {
                    "name": "Nombre limpio ingrediente",
                    "quantity": 0.00,
                    "unit": "kg" | "g" | "l" | "ml" | "ud",
                    "originalText": "Texto original (ej: 2 tazas de harina)",
                    "processingNote": "Notas de preparación (ej: pelado, cortado en brunoise)"
                }
            ],
            "steps": [
                "Paso 1...",
                "Paso 2..."
            ],
            "dietaryTags": ["Vegan", "GF"]
        }
    `;
  return analyzeImage(base64Data, prompt, 'universalImporter');
}

/**
 * Scan a Physical Menu to digitalize it
 */
export async function scanMenuImage(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        ROL: Actúa como un consultor de Marketing Gastronómico y experto en Digitalización.
        
        TAREA: Digitalizar esta carta/menú físico manteniendo su estructura jerárquica y detectando información de venta.
        
        INSTRUCCIONES:
        1. ESTRUCTURA: Respeta las secciones (Entrantes, Carnes, Pescados...).
        2. PRECIOS: Detecta precios con precisión (incluyendo 'S/M' o 'Según Mercado').
        3. DETALLES:
           - Extrae descripciones completas.
           - Identifica etiquetas como "Nuevo", "Picante", "Vegano" (busca iconos o texto).
           - Si hay alérgenos indicados (iconos o letra pequeña), extráelos.
        
        FORMATO JSON:
        {
            "menuTitle": "Título detectado (ej: Carta de Vinos, Menú Degustación)",
            "sections": [
                {
                    "sectionName": "Nombre Sección (ej: Tapas Frías)",
                    "description": "Subtítulo de sección si existe",
                    "items": [
                        { 
                            "name": "Nombre Plato", 
                            "description": "Descripción comercial", 
                            "price": 0.00,
                            "currency": "EUR",
                            "isSpicy": boolean,
                            "isVegan": boolean,
                            "isGlutenFree": boolean,
                            "tags": ["Chef's Choice", "New"]
                        }
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
        ROL: Actúa como un Director de Eventos (Event Manager) meticuloso.
        
        TAREA: Digitalizar esta Orden de Servicio (BEO) estructurando la complejidad operativa.
        
        INSTRUCCIONES CLAVE:
        1. UBICACIÓN: Identifica si el evento usa MÚLTIPLES espacios (ej: Cóctel en Jardín, Cena en Salón A).
           - Si es así, marca 'multiRoomEvent' = true.
        2. SERVICIOS DE COMIDA (CRÍTICO):
           - Detecta y SEPARA los momentos gastronómicos: Desayuno, Coffee Break, Comida, Merienda, Cena.
           - No mezcles los platos de la comida con los de la cena.
        3. TIMING: Asocia cada servicio a su hora de inicio real.
        
        FORMATO JSON:
        {
            "eventInfo": {
                "name": "Nombre Cliente/Evento",
                "date": "YYYY-MM-DD",
                "pax": 0,
                "mainLocation": "Ubicación principal detectada",
                "multiRoomEvent": boolean, // TRUE si hay >1 espacio involucrado
                "locationWarning": "Aviso si hay múltiples salones (ej: 'Atención: Evento distribuido en Jardín y Salón A')"
            },
            "schedule": [
                 { "time": "HH:MM", "activity": "Descripción agenda" }
            ],
            "services": [
                {
                    "type": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "COCKTAIL" | "BEVERAGE_ONLY",
                    "name": "Nombre del servicio (ej: Almuerzo de Trabajo)",
                    "time": "HH:MM",
                    "location": "Espacio específico (si difiere del principal)",
                    "menu": {
                        "name": "Nombre Menú",
                        "items": ["Plato 1", "Plato 2"]
                    }
                }
            ],
            "dietaryRequests": [
                 { "type": "Vegan", "count": 2, "details": "Mesa 4" }
            ],
            "logistics": {
                "setupType": "Imperial / Redondas / Cocktail",
                "avNeeds": "Proyector / Micro..."
            },
            "internalNotes": "Otras observaciones"
        }
    `;
  return analyzeImage(base64Data, prompt, 'beoScanner');
}

/**
 * Scan a Handwritten Inventory Count Sheet
 */
export async function scanInventorySheet(
  base64Data: string,
  expectedItems?: string[]
): Promise<AIAnalysisResult> {
  const prompt = `
        ROL: Actúa como un Auditor de Inventarios y Control de Recepción.
        
        TAREA: Digitalizar esta hoja de recuento/albarán manuscrito y compararla (si aplica) con la lista esperada.
        
        CONTEXTO DE PEDIDO (Items Esperados):
        ${expectedItems ? expectedItems.join(', ') : 'No proporcionado (Modo Inventario Ciego)'}
        
        INSTRUCCIONES:
        1. EXTRACCIÓN: Lee cantidades, unidades y nombres de productos, incluso con caligrafía difícil.
        2. VALIDACIÓN (Cruce):
           - Si hay 'Contexto de Pedido', marca las discrepancias.
           - ¿Falta algo de la lista esperada? -> "MISSING".
           - ¿Hay algo que no estaba en el pedido? -> "UNEXPECTED".
        3. DETALLES: Busca anotaciones de calidad (ej: "Caja rota", "Mal estado").
        
        FORMATO JSON:
        {
            "docInfo": {
                "date": "YYYY-MM-DD",
                "type": "INVENTORY_COUNT" | "RECEIVING_NOTE",
                "auditor": "Nombre detectado"
            },
            "items": [
                { 
                    "name": "Nombre Producto", 
                    "quantity": 0.00, 
                    "unit": "kg/ud", 
                    "status": "OK" | "DAMAGED" | "UNKNOWN",
                    "reconciliation": {
                        "match": boolean, // Coincide con lista esperada
                        "notes": "Falta respecto al pedido / Cantidad incorrecta"
                    }
                }
            ],
            "discrepancies": {
                "missingItems": ["Item no encontrado en la foto..."],
                "unexpectedItems": ["Item que no estaba en el pedido..."]
            }
        }
    `;
  return analyzeImage(base64Data, prompt, 'inventoryScanner');
}

/**
 * Scan a Handwritten HACCP Log (Temperatures/Cleaning)
 */
export async function scanHACCPLog(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        ROL: Actúa como un Inspector de Sanidad y Calidad Alimentaria (APPCC/HACCP).
        
        TAREA: Digitalizar y AUDITAR este registro de control (Temperaturas, Limpieza o Recepción).
        
        INSTRUCCIONES DE AUDITORÍA:
        1. VALORES CRÍTICOS: Identifica temperaturas.
           - REFRIGERACIÓN: Alerta si > 5°C.
           - CONGELACIÓN: Alerta si > -18°C.
           - COCCIÓN: Alerta si < 65°C.
        2. INCIDENCIAS: Si hay texto manuscrito explicando un problema (ej: "Puerta abierta"), extráelo como 'correctiveAction'.
        3. VACÍOS: Reporta si faltan tomas de temperatura obligatorias.
        
        FORMATO JSON:
        {
            "logType": "COOLING" | "COOKING" | "FRIDGE_TEMP" | "RECEPTION",
            "date": "YYYY-MM-DD",
            "records": [
                { 
                    "time": "HH:MM", 
                    "itemOrEquipment": "Nombre (ej: Cámara Pescado)", 
                    "value": 0.0, 
                    "unit": "C", 
                    "isCompliant": boolean, // False si viola el rango seguro
                    "hasSignature": boolean,
                    "notes": "Texto manuscrito extraído"
                }
            ],
            "complianceSummary": {
                "totalRecords": 0,
                "nonCompliantCount": 0,
                "criticalAlerts": ["Alerta: Cámara Pescado a 12°C"]
            }
        }
    `;
  return analyzeImage(base64Data, prompt, 'haccpScanner');
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
        ROL: Actúa como un Director de Operaciones (COO) enfocado en Lean Hospitality.
        
        OBJETIVO: Optimizar el inventario para liberar Flujo de Caja sin arriesgar roturas de stock.
        
        DATOS DE ENTRADA:
        - Previsión de Pax (2 semanas): ${context.totalFuturePax}
        - Datos de Ingredientes (Stock actual, Consumo medio, Demanda Eventos).
        
        INSTRUCCIONES DE ANÁLISIS:
        1. CÁLCULO DE PAR (Stock Óptimo):
           - Fórmula sugerida: (Consumo Diario Medio * Días de Entrega) + Stock de Seguridad + Demanda Eventos.
        2. PUNTO DE PEDIDO (Reorder Point):
           - Momento exacto para pedir antes de agotar, considerando el Lead Time.
        3. DETECCIÓN DE EXCESOS (Dead Stock):
           - Si Stock Actual > (Consumo x 30 días), marcar como "OVERSTOCK" -> Sugerir reducción.
        
        FORMATO DE RESPUESTA JSON:
        {
            "marketAnalysis": "Resumen breve del estado del inventario (ej: 'Niveles altos en lácteos, riesgo en mariscos')",
            "recommendations": [
                {
                    "ingredientId": "ID",
                    "name": "Nombre",
                    "currentStatus": "HEALTHY" | "OVERSTOCK" | "LOW_STOCK" | "CRITICAL",
                    "suggestedAction": "BUY_NOW" | "REDUCE_ORDERS" | "HOLD",
                    "newSettings": {
                        "reorderPoint": 0, // Nuevo punto de pedido sugerido
                        "optimalStock": 0, // Nuevo stock máximo sugerido
                        "reason": "Justificación (ej: Aumento demanda por bodas en junio)"
                    }
                }
            ]
        }
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
/**
 * NEW: Suggest specific purchases based on future demand and supplier constraints
 */
export interface AdvancedPurchaseContext {
  inventory: any[]; // Full inventory data
  suppliers: { name: string; moq: number; leadTimeDays: number; deliveryDays: string[] }[];
  events: { date: string; name: string; type: string }[];
}

export async function suggestPurchases(
  context: AdvancedPurchaseContext
): Promise<AIAnalysisResult> {
  const prompt = `
        ROL: Actúa como un Jefe de Compras y Logística (Supply Chain Manager).
        
        OBJETIVO: Planificar pedidos cumpliendo restricciones de Pedido Mínimo (MOQ) y Tiempos de Entrega (Lead Time).
        
        REGLAS DE NEGOCIO:
        1. PEDIDOS MÍNIMOS:
           - Si un proveedor tiene MOQ (ej: 100€) y el pedido actual no llega, SUGIERE traspasar productos de otros proveedores genéricos a este para cumplirlo.
        2. TIEMPOS DE SEGURIDAD (Lead Times):
           - FRESCOS (Verdura, Pescado): Deben llegar máx 48h antes del consumo.
           - ELABORACIONES/SECOS: Buffer de 5 días.
           - CALCULA la "Fecha Límite de Pedido" basada en la fecha del evento.
        
        DATOS:
        - Inventario: ${JSON.stringify(context.inventory)}
        - Proveedores (MOQs y Días de Entrega): ${JSON.stringify(context.suppliers)}
        - Eventos Próximos: ${JSON.stringify(context.events)}
        
        FORMATO JSON:
        {
            "proposals": [
                {
                    "supplierName": "Nombre",
                    "isBelowMOQ": boolean, // ¿No llega al mínimo?
                    "orderValue": 0.00,
                    "moq": 0.00,
                    "deadlineDate": "YYYY-MM-DD", // Cuándo lanzar el pedido
                    "items": [
                        { "name": "Producto", "qty": 0, "reason": "Stock bajo" }
                    ],
                    "optimizationSuggestion": "Te faltan 20€ para el mínimo. Sugiero mover 'Aceite' (que ibas a pedir a Makro) a este proveedor."
                }
            ]
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
        ROL: Actúa como un Consultor de Sostenibilidad y Control de Gestión (Controller).
        
        OBJETIVO: Reducir la merma (Food Waste) y mejorar el Food Cost.
        
        DATOS DE MERMA:
        ${JSON.stringify(wasteRecords)}
        
        INSTRUCCIONES:
        1. DIAGNÓSTICO:
           - Si la causa principal es "Caducidad", el problema es de COMPRAS (sobra stock).
           - Si es "Elaboración/Quemado", es FORMACIÓN de personal.
           - Si es "Retorno de Cliente", las RACIONES son excesivas.
        2. SOLUCIONES (Trash Cooking):
           - Sugiere 3 recetas rentables para aprovechar los recortes más comunes (ej: "Huesos" -> "Demi-glace").
        
        FORMATO JSON:
        {
            "executiveSummary": "Perdidos 500€ este mes. Principal causa: Caducidad en Verduras.",
            "actions": [
                {
                    "area": "PURCHASING" | "TRAINING" | "MENU_DESIGN",
                    "problem": "Exceso de compra en perecederos",
                    "solution": "Ajustar PAR levels de Frescos un 15% a la baja"
                }
            ],
            "trashCookingIdeas": [
                { "ingredient": "Recortes de Salmón", "dish": "Tartar o Relleno de Pasta", "estimatedSaving": "50€/mes" }
            ]
        }
    `;

  try {
    const text = await generateContent(prompt, 'analyzeWaste');

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
export async function scanSportsTeamMenu(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        ROL: Actúa como un Nutricionista Deportivo de Alto Rendimiento.
        
        TAREA: Digitalizar el menú enviado por un equipo deportivo (Fútbol, Baloncesto, etc.).
        
        INSTRUCCIONES:
        1. TIPO DE COMIDA: Clasifica según el momento deportivo (Pre-Match, Recovery, Training Camp).
        2. ESTACIONES: Separa el Buffet en estaciones (Salad Bar, Pasta Station, Grill, Postres/Fruta).
        3. REQUISITOS TÉCNICOS:
           - Busca notas como "Pasta blanca sin aceite", "Pollo a la plancha sin sal".
           - Detecta horarios de servicio estrictos.
        
        FORMATO JSON:
        {
            "teamInfo": {
                "name": "Nombre Equipo (si aparece)",
                "mealType": "PRE_MATCH" | "POST_MATCH" | "REGULAR",
                "serviceStyle": "BUFFET" | "PLATED" | "BOX"
            },
            "stations": [
                {
                    "name": "Pasta Station",
                    "items": ["Spaghetti", "Macarrón Integral", "Salsa Tomate Natural"]
                },
                {
                    "name": "Main Proteins",
                    "items": ["Pechuga Pollo", "Ternera Plancha"]
                }
            ],
            "specialInstructions": [
                "Nada de fritos",
                "Disponer de máquina de hielo",
                "Horario estricto 13:00"
            ]
        }
    `;
  return analyzeImage(base64Data, prompt, 'scanSportsTeamMenu');
}
