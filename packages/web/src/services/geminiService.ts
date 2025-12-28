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
      {
        prompt,
        imageSize: imageBase64.length,
      } // Structured payload for estimation
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
  availableIngredients?: string[];
}): Promise<AIAnalysisResult> {
  const prompt = `
        You are an executive chef with 15+ years experience in high-end catering and event planning, specializing in Mediterranean cuisine.

        Design a complete, cohesive menu for:
        - Event type: "${criteria.eventType}"
        - Number of guests: ${criteria.pax}
        - Season: ${criteria.season}
        - Dietary restrictions: ${criteria.restrictions.join(', ') || 'None'}
        ${criteria.availableIngredients ? `- Available ingredients context: ${criteria.availableIngredients.join(', ')}` : ''}

        REQUIREMENTS:
        1. Create 2-3 starters, 2 mains, 2 desserts (all respecting restrictions)
        2. Prioritize seasonal, local ingredients
        3. Ensure menu flow and flavor balance (no repetitive techniques/flavors)
        4. Consider kitchen logistics for ${criteria.pax} pax service
        5. Include allergen declarations per EU 1169/2011
        6. Realistic Spanish market pricing (2025)

        Return ONLY valid JSON:
        {
            "name": "Creative, evocative menu name",
            "description": "Concept description (max 60 words)",
            "theme": "Culinary theme/inspiration",
            "dishes": [
                {
                    "category": "Starter" | "Main" | "Dessert",
                    "name": "Dish name (Spanish or Spanish/English)",
                    "description": "Appetizing description (25-35 words)",
                    "allergens": ["Array of EU allergens present"],
                    "technique": "Main cooking technique",
                    "pairing": "Suggested wine/beverage pairing"
                }
            ],
            "estimatedCostPerPerson": <realistic EUR amount>,
            "suggestedSellPricePerPerson": <with 65-70% markup>,
            "prepComplexity": "Low" | "Medium" | "High",
            "prepTimeEstimate": "<hours needed for ${criteria.pax} pax>",
            "staffRequired": <number of cooks needed>
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
        Eres un experto en procesamiento de documentos fiscales para el sector HORECA en España.

        Analiza esta factura o albarán de proveedor alimentario. Extrae TODA la información en formato JSON estructurado.

        REGLAS CRÍTICAS:
        1. Distingue entre "Factura" y "Albarán" (busca texto "FACTURA" o "ALBARÁN")
        2. Extrae TODOS los artículos de línea con cantidades exactas
        3. Valida que suma de líneas = total (marca si hay discrepancia)
        4. Parsea fechas a formato YYYY-MM-DD independientemente del formato original
        5. Convierte TODOS los precios a Number (no strings)
        6. Para campos ilegibles: usa null (NUNCA adivines)
        7. Respeta los decimales exactos (importante para IVA)

        ${trainingContext || ''}

        Devuelve ÚNICAMENTE este JSON válido:
        {
            "documentType": "Factura" | "Albarán",
            "documentNumber": "Número de factura/albarán",
            "supplierName": "Nombre legal del proveedor",
            "supplierTaxId": "NIF/CIF si visible",
            "supplierAddress": "Dirección completa si visible",
            "issueDate": "YYYY-MM-DD",
            "dueDate": "YYYY-MM-DD o null",
            "subtotal": <número sin IVA>,
            "taxRate": <porcentaje IVA como número: 21, 10, 4>,
            "taxAmount": <importe del IVA>,
            "totalCost": <número total con IVA>,
            "items": [
                {
                    "code": "Código/SKU del producto si visible",
                    "description": "Descripción exacta del artículo",
                    "quantity": <número>,
                    "unit": "kg" | "l" | "u" | "caja" | "bandeja" | etc,
                    "unitPrice": <precio unitario>,
                    "lineTotal": <total de la línea>
                }
            ],
            "totalValidation": "OK" | "DISCREPANCIA" | "NO_VERIFICABLE",
            "currency": "EUR" | "otra",
            "paymentMethod": "Contado | Transferencia | Pagaré | null",
            "notes": "Anotaciones manuscritas o sellos si existen"
        }
    `;
  return analyzeImage(base64Data, prompt, 'invoiceScanner');
}

/**
 * Scan an Ingredient Label for allergens and nutrition
 */
export async function scanIngredientLabel(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Eres un experto en etiquetado alimentario según normativa europea (Reglamento UE 1169/2011).

        Analiza esta etiqueta de producto alimenticio y extrae TODA la información reglamentaria.

        PRIORIDADES:
        1. Alérgenos según los 14 obligatorios de la UE
        2. Información nutricional completa (tabla nutricional)
        3. Lista de ingredientes en orden de proporción
        4. Lote, caducidad y origen

        Devuelve SOLO este JSON:
        {
            "name": "Nombre comercial del producto",
            "brand": "Marca si visible",
            "manufacturer": "Fabricante/envasador si visible",
            "batch": "Número de lote si visible",
            "expiryDate": "YYYY-MM-DD o null",
            "bestBeforeDate": "YYYY-MM-DD o null",
            "origin": "País/región de origen si visible",
            "netWeight": "Peso neto con unidad (ej: 500g, 1L)",
            "ingredients": ["Lista de ingredientes en orden", "segundo ingrediente", "..."],
            "allergens": ["Solo los 14 alérgenos EU presentes"],
            "allergenTraces": ["Posibles trazas si indicadas"],
            "nutrition": {
                "per100g": true,
                "calories": <kcal>,
                "fat": <g>,
                "saturatedFat": <g>,
                "carbs": <g>,
                "sugars": <g>,
                "fiber": <g o null>,
                "protein": <g>,
                "salt": <g>
            },
            "certifications": ["BIO", "Sin Gluten", "Vegano", "Halal", "Kosher", etc si presentes],
            "storageInstructions": "Instrucciones de conservación si visibles"
        }
    `;
  return analyzeImage(base64Data, prompt, 'universalImporter');
}

/**
 * Scan a Recipe Card (Handwritten or Printed)
 */
export async function scanRecipeFromImage(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Eres un chef profesional experto en estandarización de recetas para producción en cocinas profesionales.

        Analiza esta receta (manuscrita, impresa o digital) y conviértela a formato estructurado profesional.

        INSTRUCCIONES:
        1. Normaliza TODAS las cantidades al sistema métrico (kg, g, L, ml, unidades)
        2. Convierte medidas caseras: 1 taza = 240ml, 1 cucharada = 15ml, 1 cucharadita = 5ml
        3. Identifica técnicas culinarias en los pasos (sofreír, brasear, emulsionar, etc.)
        4. Detecta temperaturas y tiempos exactos
        5. Infiere alérgenos de los ingredientes

        Devuelve SOLO JSON válido:
        {
            "name": "Nombre de la receta",
            "servings": <número de personas/raciones>,
            "category": "Entrante" | "Principal" | "Postre" | "Guarnición" | "Salsa" | "Base",
            "difficulty": "Fácil" | "Media" | "Difícil",
            "prepTime": <minutos de preparación>,
            "cookTime": <minutos de cocción>,
            "restTime": <minutos de reposo/enfriado si aplica o null>,
            "totalTime": <suma de todos los tiempos>,
            "ingredients": [
                {
                    "name": "Nombre del ingrediente",
                    "quantity": <número decimal>,
                    "unit": "kg" | "g" | "L" | "ml" | "u" | "diente" | "rama" | etc,
                    "preparation": "Indicación de preparación: picado, en juliana, etc o null"
                }
            ],
            "steps": [
                {
                    "stepNumber": 1,
                    "instruction": "Descripción detallada del paso",
                    "technique": "Técnica culinaria principal del paso",
                    "duration": <minutos estimados para este paso o null>,
                    "temperature": "<temperatura si aplica: ej '180°C' o null>"
                }
            ],
            "equipment": ["Equipamiento necesario: olla, sartén, horno, batidora, etc"],
            "allergens": ["Alérgenos presentes según ingredientes"],
            "tips": "Consejos del chef o notas adicionales si presentes",
            "source": "Origen de la receta si se menciona (libro, chef, tradición)"
        }
    `;
  return analyzeImage(base64Data, prompt, 'universalImporter');
}

/**
 * Scan a Physical Menu to digitalize it
 */
export async function scanMenuImage(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Eres un experto en digitalización de cartas de restaurantes para sistemas de gestión.

        Digitaliza esta carta/menú físico preservando TODA su estructura e información.

        REGLAS:
        1. Respeta la jerarquía exacta de secciones
        2. Detecta iconos: ⭐ (recomendado), 🌶️ (picante), 🌱 (vegetariano/vegano), ❄️ (congelado)
        3. Captura precios exactos con decimales
        4. Identifica alérgenos mencionados o representados con números/letras
        5. Detecta si es "Menú del día", "Menú degustación" o "Carta a la carta"

        Devuelve SOLO JSON:
        {
            "restaurantName": "Nombre del restaurante si visible",
            "menuType": "Carta" | "Menú del día" | "Menú degustación" | "Menú grupo",
            "name": "Nombre del menú (ej: Carta Primavera, Menú Ejecutivo)",
            "validFrom": "YYYY-MM-DD si mencionado o null",
            "validUntil": "YYYY-MM-DD si mencionado o null",
            "sections": [
                {
                    "name": "Nombre de sección (Entrantes, Principales, Postres, Bebidas...)",
                    "order": <número de orden de aparición>,
                    "items": [
                        {
                            "name": "Nombre del plato",
                            "description": "Descripción detallada o null",
                            "price": <precio decimal o null si incluido en menú>,
                            "supplement": <precio extra si aplica o null>,
                            "allergens": ["Números o letras de alérgenos si indicados"],
                            "icons": ["recommended", "spicy", "vegetarian", "vegan", "gluten-free", "frozen"],
                            "availability": "Almuerzo | Cena | Todo el día | null"
                        }
                    ]
                }
            ],
            "allergenLegend": {
                "1": "Gluten",
                "2": "Crustáceos",
                "...": "Mapeo si existe leyenda de alérgenos"
            },
            "menuPrice": <precio fijo del menú completo si aplica o null>,
            "includesDrink": <true/false si el menú incluye bebida>,
            "footer": "Textos legales o notas al pie (IVA incluido, propinas, etc)"
        }
    `;
  return analyzeImage(base64Data, prompt, 'universalImporter');
}

/**
 * Scan an Event Order (BEO)
 */
export async function scanEventOrder(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Eres un Banquet Event Order (BEO) specialist en hoteles y catering de lujo.

        Analiza esta Hoja de Orden de Evento y extrae TODA la información operativa y comercial.

        PRIORIDADES OPERATIVAS:
        1. Información del evento (nombre, fecha, pax)
        2. Cronograma detallado (setup, servicio, breakdown)
        3. Menú completo con restricciones dietéticas
        4. Montaje de sala y equipamiento
        5. Contacto del cliente y facturación

        Devuelve SOLO JSON estructurado:
        {
            "eventName": "Nombre del evento",
            "eventType": "Boda" | "Comunión" | "Corporativo" | "Gala" | "Otro",
            "clientName": "Nombre del cliente/empresa",
            "clientContact": "Teléfono/email si visible",
            "eventDate": "YYYY-MM-DD",
            "setupTime": "HH:MM",
            "eventStartTime": "HH:MM",
            "eventEndTime": "HH:MM",
            "breakdownTime": "HH:MM",
            "confirmedPax": <número confirmado>,
            "guaranteedPax": <número garantizado para facturar>,
            "location": "Nombre de salón/espacio",
            "roomSetup": "Banquete" | "Imperial" | "Escuela" | "Teatro" | "Cóctel" | "Otro",
            "tableCount": <número de mesas o null>,
            "seatingPlan": "Numeración/distribución si detallada o null",
            "menu": {
                "name": "Nombre del menú",
                "courses": [
                    {
                        "course": "Aperitivo" | "Entrante" | "Principal" | "Postre" | "Café",
                        "dishes": ["Plato 1", "Plato 2"],
                        "servingStyle": "Emplatado" | "Buffet" | "Estaciones" | "Bandeja"
                    }
                ],
                "beveragePackage": "Descripción del paquete de bebidas",
                "specialDiets": [
                    {
                        "type": "Vegetariano" | "Vegano" | "Celíaco" | "Sin lactosa" | "Halal" | "Kosher",
                        "count": <número de personas>
                    }
                ]
            },
            "schedule": [
                {
                    "time": "HH:MM",
                    "activity": "Descripción de la actividad",
                    "duration": <minutos estimados>,
                    "staffRequired": <número de personal o null>
                }
            ],
            "equipment": {
                "av": ["Proyector", "Micrófono", "Pantalla", etc si mencionado],
                "furniture": ["Mesas auxiliares", "Atril", etc si mencionado],
                "decoration": "Descripción de decoración/flores si mencionada"
            },
            "staffing": {
                "waiters": <número o null>,
                "cooks": <número o null>,
                "captains": <número o null>
            },
            "pricing": {
                "menuPricePerPerson": <precio o null>,
                "beveragePricePerPerson": <precio o null>,
                "equipmentCharge": <precio o null>,
                "totalEstimate": <total estimado o null>
            },
            "specialNotes": "Notas críticas: alergias severas, requisitos especiales, timing estricto, VIPs, etc",
            "internalNotes": "Notas operativas internas manuscritas o sellos"
        }
    `;
  return analyzeImage(base64Data, prompt, 'beoScanner');
}

/**
 * Scan a Handwritten Inventory Count Sheet
 */
export async function scanInventorySheet(
  base64Data: string,
  _expectedItems?: string[]
): Promise<AIAnalysisResult> {
  const prompt = `
        Eres un experto en OCR de documentos manuscritos del sector hostelería, especializado en interpretar caligrafías rápidas de cocina.

        Analiza esta hoja de recuento de inventario físico. Puede estar parcial o totalmente manuscrita.

        DESAFÍOS TÍPICOS:
        1. Caligrafía rápida o poco legible
        2. Abreviaturas comunes: kg→k, litros→l, unidades→u, docena→dz, caja→cj
        3. Nombres de productos abreviados (ej: "tom" = tomates, "pat" = patatas)
        4. Números con tachones o correcciones
        5. Anotaciones al margen (faltas, roturas, caducados)

        INSTRUCCIONES:
        1. Transcribe EXACTAMENTE lo que lees (no corrijas nombres, preserva abreviaturas)
        2. Para cada item, indica nivel de confianza: HIGH, MEDIUM, LOW
        3. Captura anotaciones especiales (círculos, asteriscos, signos de exclamación)
        4. Detecta fecha, turno, responsable si mencionados

        Devuelve SOLO JSON:
        {
            "documentType": "Inventario físico",
            "date": "YYYY-MM-DD si visible o null",
            "shift": "Mañana" | "Tarde" | "Noche" | null,
            "location": "Almacén" | "Cámara" | "Bar" | "Cocina" | "Texto libre si especificado",
            "responsiblePerson": "Nombre si firma/iniciales visibles o null",
            "items": [
                {
                    "rawText": "Texto exacto leído (preserva abreviaturas)",
                    "interpretedName": "Nombre interpretado del producto",
                    "quantity": <número>,
                    "unit": "kg" | "l" | "u" | "caja" | "bandeja" | "docena" | "texto libre",
                    "confidence": "HIGH" | "MEDIUM" | "LOW",
                    "annotations": "Notas al margen: falta, roto, caducado, verificar, etc o null",
                    "hasCorrections": <true si hay tachones/correcciones>
                }
            ],
            "globalNotes": "Notas generales al pie o cabecera del documento",
            "pageNumber": "X de Y si indicado o null",
            "qualityWarning": "Advertencia si documento muy ilegible o dañado o null"
        }
    `;
  return analyzeImage(base64Data, prompt, 'inventoryScanner');
}

/**
 * Scan a Handwritten HACCP Log (Temperatures/Cleaning)
 */
export async function scanHACCPLog(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Eres un experto en sistemas HACCP (Hazard Analysis Critical Control Points) en restauración, especializado en registros de seguridad alimentaria.

        Analiza esta hoja de registro HACCP. Puede ser de:
        - Control de temperaturas (cámaras, equipos, alimentos)
        - Limpieza y desinfección
        - Recepción de mercancías
        - Control de aceites de fritura
        - Registros de alérgenos

        RANGOS DE TEMPERATURA CRÍTICOS (para evaluar status):
        - Refrigeración: 0°C a +4°C (CORRECTO), 5-8°C (WARNING), >8°C (CRITICAL)
        - Congelación: -18°C a -25°C (CORRECTO), -15 a -17°C (WARNING), >-15°C (CRITICAL)
        - Alimentos calientes: >65°C (CORRECTO), 60-64°C (WARNING), <60°C (CRITICAL)
        - Cocción: >75°C centro térmico (CORRECTO)

        INSTRUCCIONES:
        1. Identifica el tipo de registro HACCP
        2. Extrae TODOS los controles con timestamp exacto
        3. Evalúa status según rangos críticos
        4. Captura acciones correctivas si documentadas
        5. Identifica responsable y firma

        Devuelve SOLO JSON:
        {
            "documentType": "HACCP - Temperaturas" | "HACCP - Limpieza" | "HACCP - Recepción" | "HACCP - Aceites" | "HACCP - General",
            "date": "YYYY-MM-DD",
            "shift": "Mañana" | "Tarde" | "Noche" | null,
            "responsiblePerson": "Nombre del responsable del control",
            "isSigned": <true si hay firma visible>,
            "entries": [
                {
                    "time": "HH:MM",
                    "pccId": "PCC-1, PCC-2... si codificado o null",
                    "pccName": "Nombre del punto de control: 'Cámara refrigeración', 'Vitrina', 'Termómetro sonda'",
                    "pccType": "Refrigeración" | "Congelación" | "Cocción" | "Mantenimiento caliente" | "Otro",
                    "value": <temperatura en °C>,
                    "unit": "°C" | "°F" | "pH" | "otro",
                    "expectedRange": "Rango esperado: ej '0-4°C'",
                    "status": "CORRECTO" | "ADVERTENCIA" | "CRÍTICO",
                    "observation": "Observación manuscrita si existe o null",
                    "correctiveAction": "Acción correctiva tomada si documentada o null"
                }
            ],
            "nonConformities": [
                {
                    "time": "HH:MM",
                    "issue": "Descripción de la no conformidad",
                    "severity": "BAJA" | "MEDIA" | "ALTA",
                    "actionTaken": "Acción correctiva documentada"
                }
            ],
            "supervisorReview": {
                "reviewedBy": "Nombre del supervisor si revisado",
                "reviewDate": "YYYY-MM-DD si diferente de fecha registro",
                "comments": "Comentarios del supervisor"
            },
            "complianceStatus": "CONFORME" | "NO CONFORME" | "CONFORME CON OBSERVACIONES",
            "nextReviewDue": "YYYY-MM-DD si mencionado o null"
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
        Eres un Supply Chain Manager especializado en F&B de alta gama con expertise en:
        - Inventory optimization (modelos EOQ, Safety Stock, JIT)
        - Demand forecasting con estacionalidad
        - Gestión de perecederos y shelf life
        - Análisis ABC de inventarios
        - Working capital optimization

        TAREA: Optimizar parámetros de inventario para restaurante de alta gama.

        DATOS DE ENTRADA:
        - PAX previstos (próximas 2 semanas): ${context.totalFuturePax}
        - Ingredientes con histórico de consumo y eventos confirmados:

        ${JSON.stringify(
          context.ingredients.map((i) => ({
            id: i.id,
            name: i.name,
            unit: i.unit,
            category: (i as any).category, // Añadir categoría ABC
            currentReorderPoint: i.reorderPoint,
            currentOptimalStock: i.optimalStock,
            currentStock: i.currentStock,
            avgDailyUsage: i.usageHistory?.avgDaily,
            usageVariability: (i as any).usageHistory?.stdDev, // Añadir desviación estándar
            futureEventDemand: i.futureDemand?.neededQuantity,
            eventCount: i.futureDemand?.eventCount,
            supplierLeadTime: (i as any).supplierLeadTime, // Días de entrega
            shelfLife: (i as any).shelfLife, // Días de caducidad
            minimumOrderQty: (i as any).minimumOrderQty,
            unitCost: (i as any).unitCost,
          })),
          null,
          2
        )}

        METODOLOGÍA DE ANÁLISIS:
        1. **Safety Stock Calculation**: 
           SafetyStock = Z-score × √(LeadTime) × StdDev_Demand
           (Z=1.65 para 95% service level)

        2. **Reorder Point**: 
           ROP = (AvgDailyUsage × LeadTime) + SafetyStock + EventSpikes

        3. **Optimal Stock**: 
           OptStock = ROP + EOQ, considerando:
           - Shelf life (perecederos: max 50% shelf life)
           - Working capital constraints
           - Storage capacity

        4. **Clasificación ABC**:
           - A items (80% valor): Stock preciso, control estricto
           - B items (15% valor): Control moderado
           - C items (5% valor): Stock más holgado

        5. **Event Buffering**:
           Si FutureDemand > 2× AvgDailyUsage: Buffer temporal +30-50%

        REGLAS DE DECISIÓN:
        - Solo recomendar cambios si diferencia >10% Y tiene impacto material
        - Perecederos: NUNCA exceder 40% del shelf life en optimal stock
        - Alto valor unitario (>20€/kg): Preferir JIT, minimizar stock
        - Eventos grandes (>100 pax): Crear buffer específico
        - Ingredientes de temporada: Ajustar según disponibilidad futura

        Devuelve SOLO JSON:
        {
            "recommendations": [
                {
                    "ingredientId": "string",
                    "ingredientName": "string",
                    "currentReorderPoint": <actual>,
                    "suggestedReorderPoint": <nuevo>,
                    "currentOptimalStock": <actual>,
                    "suggestedOptimalStock": <nuevo>,
                    "changePercentage": <% de cambio>,
                    "priority": "URGENT" | "HIGH" | "MEDIUM" | "LOW",
                    "reasoning": "Explicación detallada del cambio sugerido (max 100 palabras)",
                    "trend": "UP" | "DOWN" | "STABLE",
                    "financialImpact": "Impacto estimado en capital inmovilizado: +500€ / -200€",
                    "riskMitigation": "Riesgos mitigados: rotura stock evento X / merma por caducidad"
                }
            ],
            "globalAnalysis": {
                "inventoryHealthScore": <0-100>,
                "totalWorkingCapitalChange": <+/- EUR>,
                "stockoutRiskReduction": "<% reducción riesgo rotura>",
                "wasteRiskReduction": "<% reducción riesgo merma>",
                "summary": "Resumen ejecutivo (max 200 palabras)",
                "actionPriorities": [
                    "1. Acción prioritaria inmediata",
                    "2. Segunda prioridad",
                    "3. Mejora a medio plazo"
                ]
            },
            "categoryInsights": {
                "perishables": "Análisis específico de perecederos",
                "highValue": "Análisis de ingredientes de alto coste",
                "seasonal": "Consideraciones estacionales"
            }
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
        Eres un Head of Procurement en restauración de alta gama con expertise en:
        - Strategic sourcing y vendor management
        - Cost optimization y negociación
        - Demand planning y MRP (Material Requirements Planning)
        - Quality control en recepción
        - Sustainability y sourcing local

        TAREA: Generar orden de compra optimizada para próximos eventos confirmados.

        CONTEXTO DE COMPRA:
        ${JSON.stringify(
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
            orderMultiple: item.orderMultiple, // Múltiplos: cajas de 6, palets de 20, etc
            supplierLeadTime: item.supplierLeadTime,
            shelfLife: item.shelfLife,
            lastPurchasePrice: item.lastPurchasePrice,
            eventDates: item.eventDates, // Fechas de eventos que requieren este ingrediente
          })),
          null,
          2
        )}

        PRESUPUESTO DISPONIBLE: ${(context as any).budget || 'N/A'} EUR
        FECHA LÍMITE RECEPCIÓN: ${(context as any).deliveryDeadline || 'N/A'}

        REGLAS DE CÁLCULO:

        1. **Cantidad a Comprar**:
           QtyToBuy = (FutureDemand × SafetyFactor) - CurrentStock + BufferToOptimal
           
           SafetyFactor por categoría:
           - Perecederos: 1.05 (5% buffer, minimize waste)
           - Secos: 1.15 (15% buffer, storage stable)
           - Congelados: 1.10 (10% buffer)
           - Alto valor: 1.05 (5% buffer, reduce capital lock)

        2. **Ajuste a MOQ y Múltiplos**:
           Round UP to: max(MOQ, ceiling(QtyToBuy / OrderMultiple) × OrderMultiple)

        3. **Priorización**:
           - URGENT: Stock < FutureDemand Y LeadTime > DaysToEvent
           - CRITICAL: Stock < FutureDemand × 1.1
           - HIGH: Stock < ReorderPoint
           - MEDIUM: Stock < OptimalStock
           - LOW: Compra planificada, no urgente

        4. **Agrupación por Proveedor**:
           Agrupa items del mismo proveedor para:
           - Minimizar costes de envío
           - Negociar descuentos por volumen
           - Simplificar logística de recepción

        INSTRUCCIONES:
        1. Calcula cantidades optimizadas (no solo +10% genérico)
        2. Agrupa por proveedor para eficiencia
        3. Valida que total no exceda presupuesto
        4. Considera lead times vs fechas de eventos
        5. Sugiere alternativas si hay limitaciones

        Devuelve SOLO JSON:
        {
            "purchaseOrders": [
                {
                    "supplierId": "string",
                    "supplierName": "Nombre del proveedor",
                    "orderPriority": "URGENT" | "HIGH" | "MEDIUM",
                    "suggestedOrderDate": "YYYY-MM-DD",
                    "expectedDeliveryDate": "YYYY-MM-DD",
                    "items": [
                        {
                            "ingredientId": "string",
                            "ingredientName": "string",
                            "futureDemand": <cantidad demandada>,
                            "currentStock": <stock actual>,
                            "quantityToBuy": <cantidad a pedir>,
                            "unit": "string",
                            "unitPrice": <precio unitario>,
                            "lineTotal": <subtotal línea>,
                            "adjustmentReason": "Ajustado a MOQ de 10kg | Redondeado a caja de 6u | etc"
                        }
                    ],
                    "orderSubtotal": <suma líneas>,
                    "shippingCost": <coste envío estimado>,
                    "orderTotal": <total con envío>,
                    "volumeDiscount": <descuento por volumen si aplica>,
                    "paymentTerms": "Contado | 30 días | 60 días"
                }
            ],
            "summary": {
                "totalInvestment": <suma todos los pedidos>,
                "budgetRemaining": <presupuesto - inversión>,
                "criticalItemsCount": <número items críticos>,
                "supplierCount": <número proveedores involucrados>,
                "estimatedSavings": "Ahorro estimado por agrupación y negociación"
            },
            "alerts": [
                {
                    "severity": "ERROR" | "WARNING" | "INFO",
                    "message": "Budget exceeded by 500€ | Lead time too short for Supplier X | Alternative supplier recommended for item Y"
                }
            ],
            "alternatives": [
                {
                    "ingredientName": "string",
                    "issue": "Out of stock | Price too high | Lead time too long",
                    "suggestion": "Use alternative supplier | Substitute with similar ingredient | Split order"
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
  _ingredients: Ingredient[]
): Promise<AIAnalysisResult> {
  const prompt = `
        Eres un Food Waste Reduction Specialist & Sustainability Consultant en restauración de lujo con expertise en:
        - Lean kitchen management y Six Sigma
        - Root cause analysis (5 Whys, Ishikawa)
        - Behavioral change management
        - Sustainability metrics (SDG 12.3 target)
        - Cost-benefit analysis

        OBJETIVO: Reducir waste y mejorar sostenibilidad económica y ambiental.

        DATOS DE MERMAS (últimos 90 días):
        ${JSON.stringify(
          wasteRecords.map((r) => ({
            date: r.date,
            dayOfWeek: (r as any).dayOfWeek,
            shift: (r as any).shift,
            ingredientId: r.ingredientId,
            ingredientName: _ingredients.find((i) => i.id === r.ingredientId)?.name,
            ingredientCategory: (r as any).ingredientCategory,
            quantity: r.quantity,
            unit: r.unit,
            wasteReason: r.reason, // "Caducidad", "Sobreproducción", "Merma de corte", "Calidad", "Accidente"
            costAtTime: r.costAtTime,
            totalCost: r.quantity * r.costAtTime,
            responsibleArea: (r as any).responsibleArea, // "Cocina", "Pastelería", "Almacén", "Sala"
            recordedBy: (r as any).recordedBy,
          })),
          null,
          2
        )}

        CONTEXTO OPERATIVO:
        - Revenue last 90 days: ${(wasteRecords as any).context?.revenue || 'N/A'} EUR
        - Total waste cost: ${(wasteRecords as any).context?.totalWasteCost || 'N/A'} EUR
        - Current waste %: ${
          (wasteRecords as any).context
            ? (
                ((wasteRecords as any).context.totalWasteCost /
                  (wasteRecords as any).context.revenue) *
                100
              ).toFixed(2)
            : 'N/A'
        }%
        - Industry benchmark: 4-10% for fine dining
        - Staff count: ${(wasteRecords as any).context?.staffCount || 'N/A'}

        FRAMEWORK DE ANÁLISIS:

        1. **Pareto Analysis**: Identifica 20% de ingredientes que causan 80% del coste de merma

        2. **Pattern Detection**:
           - Temporal: día semana, turno, estacionalidad
           - Categorial: tipo de ingrediente, razón de merma, área responsable
           - Correlaciones: pax vs waste, staff rotation vs waste

        3. **Root Cause Analysis** por categoría:
           - **Caducidad**: Overordering, FIFO no aplicado, visibilidad stock
           - **Sobreproducción**: Forecasting pobre, mise en place excesiva
           - **Merma de corte**: Skill gaps, cuchillos desafilados, productos de mala calidad
           - **Calidad**: Proveedor issues, storage conditions
           - **Accidentes**: Training, fatiga, organización workspace

        4. **Financial Impact Modeling**:
           Savings = WasteCost × ReductionRate × ImplementationSuccess

        5. **Action Prioritization Matrix**:
           Priority = (Financial Impact × Feasibility) / Implementation Cost

        INSTRUCCIONES:
        1. Identifica TOP 5 patrones de merma más costosos
        2. Aplica análisis de causa raíz (5 Whys)
        3. Propón acciones SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
        4. Calcula ROI de cada iniciativa
        5. Prioriza por impacto económico y facilidad de implementación

        Devuelve SOLO JSON:
        {
            "executiveSummary": {
                "totalWasteCost": <EUR en período>,
                "wastePercentageOfRevenue": <% facturación>,
                "benchmarkComparison": "Por encima | Dentro | Por debajo del benchmark de industria",
                "potentialSavings": <EUR anualizados>,
                "topWasteCategory": "Categoría con mayor impacto económico",
                "criticalInsight": "Insight más importante (max 100 palabras)"
            },
            "paretoAnalysis": {
                "top20PercentIngredients": [
                    {
                        "ingredientName": "string",
                        "totalWasteCost": <EUR>,
                        "percentageOfTotalWaste": <%>,
                        "mainReason": "Razón principal de merma"
                    }
                ],
                "concentration": "X% de los ingredientes representan Y% del coste de merma"
            },
            "patterns": [
                {
                    "patternType": "Temporal" | "Categorial" | "Operacional",
                    "title": "Título del patrón identificado",
                    "description": "Descripción detallada del patrón",
                    "dataSupport": "Lunes: 35% más merma que promedio | Turno tarde: 2.5x más waste | etc",
                    "severity": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
                    "affectedCost": <EUR impactados por este patrón>
                }
            ],
            "rootCauseAnalysis": [
                {
                    "issue": "Descripción del problema",
                    "wasteCategory": "Caducidad" | "Sobreproducción" | "Merma corte" | "Calidad" | "Accidente",
                    "rootCause": "Causa raíz identificada tras 5 Whys",
                    "contributingFactors": ["Factor 1", "Factor 2", "Factor 3"],
                    "financialImpact": <EUR anualizados>
                }
            ],
            "recommendations": [
                {
                    "id": "REC-001",
                    "priority": "P0-URGENT" | "P1-HIGH" | "P2-MEDIUM" | "P3-LOW",
                    "title": "Título de la recomendación",
                    "problem": "Problema que soluciona",
                    "action": "Acción específica a tomar (detallada, sin límite de palabras)",
                    "owner": "Área/rol responsable: Chef Ejecutivo | Jefe Compras | F&B Manager",
                    "timeline": "Inmediato (1 semana) | Corto plazo (1 mes) | Medio plazo (3 meses)",
                    "implementationSteps": [
                        "1. Paso específico",
                        "2. Siguiente paso",
                        "3. Etc"
                    ],
                    "estimatedCost": <EUR de implementación o 0 si no aplica>,
                    "estimatedSavings": <EUR anualizados>,
                    "roi": <ratio de retorno: savings/cost>,
                    "paybackPeriod": "X meses",
                    "kpis": ["KPI específico para medir éxito", "Otro KPI"],
                    "successCriteria": "Criterio concreto de éxito: reducir merma de lácteos en 30% en 60 días"
                }
            ],
            "quickWins": [
                {
                    "action": "Acción de impacto rápido y bajo coste",
                    "effort": "LOW" | "MEDIUM",
                    "impact": <EUR savings estimados>,
                    "timeToImplement": "días/semanas"
                }
            ],
            "sustainabilityImpact": {
                "co2ReductionKg": <kg CO2 ahorrados si se reduce waste>,
                "mealsEquivalent": <comidas que podrían haberse servido con el waste>,
                "sdgAlignment": "Alineación con SDG 12.3: reducir a la mitad el desperdicio de alimentos per cápita"
            },
            "implementationRoadmap": {
                "phase1_immediate": ["Acción 1", "Acción 2"],
                "phase2_30days": ["Acción 1", "Acción 2"],
                "phase3_90days": ["Acción 1", "Acción 2"],
                "ongoingMonitoring": "Sistema de monitoreo continuo recomendado"
            }
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
    return { success: false, error: message };
  }
}
/**
 * NEW: Specialized Scanner for Sports Team Menus
 * Targets the column-based layout (Guarnición, 1, 2, Postre) and handwritten notes.
 */
export async function scanSportsTeamMenu(base64Data: string): Promise<AIAnalysisResult> {
  const prompt = `
        Eres un Sports Nutritionist & Team Catering Specialist especializado en nutrición deportiva de alto rendimiento.

        Analiza este menú para equipo deportivo profesional. Estos menús tienen características específicas:
        - Estructura por columnas: GUARNICIÓN, PRIMER PLATO, SEGUNDO PLATO, POSTRE
        - Anotaciones manuscritas frecuentes (cambios de última hora, restricciones individuales)
        - Marcas de verificación (✓, X, círculos) para tracking
        - Cantidades específicas por atleta o totales para el equipo
        - Restricciones dietéticas individuales
        - Timing respecto a entrenamientos/partidos

        CONTEXTO NUTRICIONAL DEPORTIVO:
        - Pre-entrenamiento: Alto en carbohidratos, moderado en proteína, bajo en grasa
        - Post-entrenamiento: Proteína + carbohidratos para recuperación
        - Día de partido: Timing crítico, digestión rápida
        - Hidratación: Fundamental monitorizar

        INSTRUCCIONES:
        1. Identifica el tipo de comida y timing deportivo
        2. Extrae TODOS los platos organizados por columnas
        3. Detecta y transcribe TODAS las anotaciones manuscritas
        4. Captura marcas de verificación, tachones, círculos
        5. Identifica restricciones dietéticas individuales
        6. Estima perfil macro si es posible

        Devuelve SOLO JSON:
        {
            "documentInfo": {
                "teamName": "Nombre del equipo si visible",
                "sport": "Fútbol | Baloncesto | Rugby | etc si identificable",
                "date": "YYYY-MM-DD si visible",
                "location": "Concentración | Hotel | Instalaciones si mencionado"
            },
            "mealInfo": {
                "mealType": "DESAYUNO" | "ALMUERZO" | "COMIDA" | "MERIENDA" | "CENA",
                "timing": "Pre-entrenamiento" | "Post-entrenamiento" | "Pre-partido" | "Post-partido" | "Día descanso" | "Normal",
                "timeScheduled": "HH:MM si mencionado",
                "athleteCount": <número de deportistas o null>
            },
            "courses": [
                {
                    "category": "Guarnición" | "Primer Plato" | "Segundo Plato" | "Postre" | "Bebidas" | "Suplementos",
                    "columnPosition": <1, 2, 3, 4 según orden en el documento>,
                    "items": [
                        {
                            "name": "Nombre del plato/alimento",
                            "description": "Descripción adicional si existe",
                            "quantity": "Cantidad: ej '200g por atleta' o '15 unidades' o null",
                            "isHandwritten": <true/false>,
                            "dietaryNotes": ["Sin gluten", "Sin lactosa", "Vegano", "Halal", etc],
                            "individualRestrictions": "Ej: 'Solo para jugadores 3, 7, 12' o null",
                            "verificationMark": "✓ | X | ○ | null",
                            "strikethrough": <true si está tachado>,
                            "emphasis": <true if highlighted/marked>,
                            "handwrittenAdditions": "Texto manuscrito añadido sobre este item"
                        }
                    ]
                }
            ],
            "nutritionalEstimate": {
                "profileType": "Alto carbohidrato" | "Alto proteína" | "Balanceado" | "Recuperación",
                "estimatedMacros": {
                    "carbsPercentage": <% estimado>,
                    "proteinPercentage": <% estimado>,
                    "fatPercentage": <% estimado>
                },
                "suitability": "Evaluación si es apropiado para el timing deportivo identificado"
            },
            "hydrationSupplementation": {
                "hydration": ["Agua", "Isotónicas", etc si mencionadas],
                "supplements": ["Proteína whey", "BCAA", etc si mencionados]
            },
            "handwrittenTranscriptions": [
                {
                    "location": "Margen superior | Junto a Primer Plato | Al pie | etc",
                    "text": "Transcripción exacta de la nota manuscrita",
                    "interpretedMeaning": "Interpretación del significado",
                    "urgency": "CRÍTICO (alergia) | IMPORTANTE (cambio menú) | NORMAL (nota aclaratoria)"
                }
            ],
            "visualMarkers": {
                "hasCheckmarks": <true/false>,
                "hasCrossouts": <true/false>,
                "hasCircles": <true/false>,
                "hasArrows": <true/false>,
                "interpretation": "Interpretación de qué significan las marcas visuales"
            },
            "globalNotes": "Observaciones generales en cabecera o pie de hoja",
            "qualityFlags": {
                "legibility": "HIGH | MEDIUM | LOW",
                "completeness": "COMPLETE | PARTIAL | FRAGMENTARY",
                "warnings": ["Advertencias: caligrafía difícil sector X | Posible texto cortado | etc"]
            }
        }
    `;
  return analyzeImage(base64Data, prompt, 'sportsMenuScanner');
}
