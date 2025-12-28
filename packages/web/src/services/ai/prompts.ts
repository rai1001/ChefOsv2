// removed unused import AIFeature

export interface PromptDefinition {
  version: string;
  systemInstruction: string;
  userPromptTemplate: (context: any) => string;
}

export const CHEF_SYSTEM_PROMPT = `You are a professional Executive Chef with 15+ years of experience in high-end catering and Mediterranean cuisine. 
You specialize in menu engineering, nutrition, and kitchen logistics.`;

export const DOCUMENT_SCIENTIST_PROMPT = `You are an expert document analysis scientist specialized in HORECA (Hotel, Restaurant, Cafe) fiscal and operational documents. 
You extract structured data from invoices, delivery notes, and inventory sheets with extreme precision.`;

export const NUTRITION_EXPERT_PROMPT = `You are a certified nutrition expert and food safety scientist specialized in EU Regulation 1169/2011 and HACCP standards.`;

const REGISTRY: Record<string, Record<string, PromptDefinition>> = {
  menuGenerator: {
    '1.0': {
      version: '1.0',
      systemInstruction: CHEF_SYSTEM_PROMPT,
      userPromptTemplate: (c: {
        eventType: string;
        pax: number;
        season: string;
        restrictions: string[];
        availableIngredients?: string[];
      }) => `
Design a complete, cohesive menu for:
- Event type: "${c.eventType}"
- Number of guests: ${c.pax}
- Season: ${c.season}
- Dietary restrictions: ${c.restrictions.join(', ') || 'None'}
${c.availableIngredients ? `- Available ingredients context: ${c.availableIngredients.join(', ')}` : ''}

REQUIREMENTS:
1. Create 2-3 starters, 2 mains, 2 desserts (all respecting restrictions)
2. Prioritize seasonal, local ingredients
3. Ensure menu flow and flavor balance (no repetitive techniques/flavors)
4. Consider kitchen logistics for ${c.pax} pax service
5. Include allergen declarations per EU 1169/2011
6. Realistic Spanish market pricing (2025)

Return ONLY a JSON object (no markdown, no extra text) following this schema:

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
    "prepTimeEstimate": "<hours needed for ${c.pax} pax>",
    "staffRequired": <number of cooks needed>
}
`,
    },
  },
  invoiceScanner: {
    '1.0': {
      version: '1.0',
      systemInstruction: DOCUMENT_SCIENTIST_PROMPT,
      userPromptTemplate: (c: { trainingContext?: string }) => `
Analiza esta factura o albarán de proveedor alimentario. Extrae TODA la información en formato JSON estructurado.

REGLAS CRÍTICAS:
1. Distingue entre "Factura" y "Albarán" (busca texto "FACTURA" o "ALBARÁN")
2. Extrae TODOS los artículos de línea con cantidades exactas
3. Valida que suma de líneas = total (marca si hay discrepancia)
4. Parsea fechas a formato YYYY-MM-DD independientemente del formato original
5. Convierte TODOS los precios a Number (no strings)
6. Para campos ilegibles: usa null (NUNCA adivines)
7. Respeta los decimales exactos (importante para IVA)

${c.trainingContext || ''}

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
`,
    },
  },
  ingredientLabelScanner: {
    '1.0': {
      version: '1.0',
      systemInstruction: NUTRITION_EXPERT_PROMPT,
      userPromptTemplate: () => `
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
`,
    },
  },
  recipeScanner: {
    '1.0': {
      version: '1.0',
      systemInstruction:
        'Eres un chef profesional experto en estandarización de recetas para producción en cocinas profesionales.',
      userPromptTemplate: () => `
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
`,
    },
  },
  physicalMenuScanner: {
    '1.0': {
      version: '1.0',
      systemInstruction:
        'Eres un experto en digitalización de cartas de restaurantes para sistemas de gestión.',
      userPromptTemplate: () => `
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
`,
    },
  },
  beoScanner: {
    '1.0': {
      version: '1.0',
      systemInstruction:
        'Eres un Banquet Event Order (BEO) specialist en hoteles y catering de lujo.',
      userPromptTemplate: () => `
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
`,
    },
  },
  inventoryScanner: {
    '1.0': {
      version: '1.0',
      systemInstruction:
        'Eres un experto en OCR de documentos manuscritos del sector hostelería, especializado en interpretar caligrafías rápidas de cocina.',
      userPromptTemplate: () => `
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
`,
    },
  },
  haccpScanner: {
    '1.0': {
      version: '1.0',
      systemInstruction: NUTRITION_EXPERT_PROMPT,
      userPromptTemplate: () => `
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
`,
    },
  },
  inventoryOptimization: {
    '1.0': {
      version: '1.0',
      systemInstruction:
        'Eres un Supply Chain Manager especializado en F&B de alta gama con expertise en EOQ, Safety Stock, JIT y ABC Analysis.',
      userPromptTemplate: (c: { totalFuturePax: number; ingredientsJson: string }) => `
TAREA: Optimizar parámetros de inventario para restaurante de alta gama.

DATOS DE ENTRADA:
- PAX previstos (próximas 2 semanas): ${c.totalFuturePax}
- Ingredientes con histórico de consumo y eventos confirmados:

${c.ingredientsJson}

METODOLOGÍA DE ANÁLISIS:
1. **Safety Stock Calculation**: SafetyStock = Z-score × √(LeadTime) × StdDev_Demand (Z=1.65 para 95% service level)
2. **Reorder Point**: ROP = (AvgDailyUsage × LeadTime) + SafetyStock + EventSpikes
3. **Optimal Stock**: OptStock = ROP + EOQ
4. **Clasificación ABC** (A=80% valor, B=15%, C=5%)
5. **Event Buffering** (+30-50% si FutureDemand > 2× promedio)

Devuelve SOLO JSON:
 {
    "recommendations": [
        {
            "ingredientId": "string",
            "ingredientName": "string",
            "currentReorderPoint": number,
            "suggestedReorderPoint": number,
            "currentOptimalStock": number,
            "suggestedOptimalStock": number,
            "changePercentage": number,
            "priority": "URGENT" | "HIGH" | "MEDIUM" | "LOW",
            "reasoning": "string (max 100 palabras)",
            "trend": "UP" | "DOWN" | "STABLE",
            "financialImpact": "string",
            "riskMitigation": "string"
        }
    ],
    "globalAnalysis": {
        "inventoryHealthScore": number,
        "totalWorkingCapitalChange": number,
        "stockoutRiskReduction": "string",
        "wasteRiskReduction": "string",
        "summary": "string",
        "actionPriorities": ["string"]
    },
    "categoryInsights": {
        "perishables": "string",
        "highValue": "string",
        "seasonal": "string"
    }
}
`,
    },
  },
  purchaseSuggestion: {
    '1.0': {
      version: '1.0',
      systemInstruction:
        'Eres un Head of Procurement en restauración de alta gama con expertise en sourcing estratégico y MRP.',
      userPromptTemplate: (c: {
        inventoryJson: string;
        budget?: string;
        deliveryDeadline?: string;
      }) => `
TAREA: Generar orden de compra optimizada para próximos eventos confirmados.

CONTEXTO DE COMPRA:
${c.inventoryJson}

PRESUPUESTO DISPONIBLE: ${c.budget || 'N/A'} EUR
FECHA LÍMITE RECEPCIÓN: ${c.deliveryDeadline || 'N/A'}

REGLAS DE CÁLCULO:
1. **Cantidad a Comprar**: QtyToBuy = (FutureDemand × SafetyFactor) - CurrentStock + BufferToOptimal
2. **Ajuste a MOQ y Múltiplos**: Round UP to: max(MOQ, ceiling(QtyToBuy / OrderMultiple) × OrderMultiple)
3. **Priorización**: URGENT, CRITICAL, HIGH, MEDIUM, LOW
4. **Agrupación por Proveedor**

Devuelve SOLO JSON:
{
    "purchaseOrders": [
        {
            "supplierId": "string",
            "supplierName": "string",
            "orderPriority": "URGENT" | "HIGH" | "MEDIUM",
            "suggestedOrderDate": "YYYY-MM-DD",
            "expectedDeliveryDate": "YYYY-MM-DD",
            "items": [
                {
                    "ingredientId": "string",
                    "ingredientName": "string",
                    "futureDemand": number,
                    "currentStock": number,
                    "quantityToBuy": number,
                    "unit": "string",
                    "unitPrice": number,
                    "lineTotal": number,
                    "adjustmentReason": "string"
                }
            ],
            "orderSubtotal": number,
            "shippingCost": number,
            "orderTotal": number,
            "volumeDiscount": number,
            "paymentTerms": "string"
        }
    ],
    "summary": {
        "totalInvestment": number,
        "budgetRemaining": number,
        "criticalItemsCount": number,
        "supplierCount": number,
        "estimatedSavings": "string"
    },
    "alerts": [
        {
            "severity": "ERROR" | "WARNING" | "INFO",
            "message": "string"
        }
    ]
}
`,
    },
  },
  wasteAnalysis: {
    '1.0': {
      version: '1.0',
      systemInstruction:
        'Eres un Food Waste Reduction Specialist especializado en Lean kitchen management y RCA.',
      userPromptTemplate: (c: { wasteRecordsJson: string; contextJson: string }) => `
OBJETIVO: Reducir waste y mejorar sostenibilidad económica y ambiental.

DATOS DE MERMAS:
${c.wasteRecordsJson}

CONTEXTO OPERATIVO:
${c.contextJson}

INSTRUCCIONES:
1. Pareto Analysis (20/80)
2. RCA (5 Whys)
3. Recomendaciones SMART
4. Calculo ROI

Devuelve SOLO JSON:
{
    "executiveSummary": {
        "totalWasteCost": number,
        "wastePercentageOfRevenue": number,
        "benchmarkComparison": "string",
        "potentialSavings": number,
        "topWasteCategory": "string",
        "criticalInsight": "string"
    },
    "paretoAnalysis": {
        "top20PercentIngredients": [
            {
                "ingredientName": "string",
                "totalWasteCost": number,
                "percentageOfTotalWaste": number,
                "mainReason": "string"
            }
        ],
        "concentration": "string"
    },
    "patterns": [
        {
            "patternType": "Temporal" | "Categorial" | "Operacional",
            "title": "string",
            "severity": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
            "affectedCost": number
        }
    ],
    "recommendations": [
        {
            "id": "string",
            "priority": "P0-URGENT" | "P1-HIGH" | "P2-MEDIUM",
            "title": "string",
            "action": "string",
            "estimatedSavings": number,
            "roi": number
        }
    ]
}
`,
    },
  },
  sportsMenuScanner: {
    '1.0': {
      version: '1.0',
      systemInstruction:
        'Eres un Sports Nutritionist especializado en nutrición deportiva de alto rendimiento.',
      userPromptTemplate: () => `
Analiza este menú para equipo deportivo profesional. 
Columnas: GUARNICIÓN, PRIMER PLATO, SEGUNDO PLATO, POSTRE.
Detecta anotaciones manuscritas y marcas de verificación.

Devuelve SOLO JSON:
{
    "documentInfo": { "teamName": "string", "date": "YYYY-MM-DD" },
    "mealInfo": { "mealType": "string", "timing": "string" },
    "courses": [
        {
            "category": "string",
            "items": [
                {
                    "name": "string",
                    "quantity": "string",
                    "isHandwritten": boolean,
                    "verificationMark": "string"
                }
            ]
        }
    ]
}
`,
    },
  },
};

export class PromptRegistry {
  static getPrompt(feature: string, _context: any, version: string = '1.0'): PromptDefinition {
    const featurePrompts = REGISTRY[feature];
    if (!featurePrompts) {
      console.warn(
        `[PromptRegistry] No prompts found for feature: ${feature}. Falling back to universal.`
      );
      return this.getUniversalPrompt(version);
    }
    const definition = featurePrompts[version] || featurePrompts['1.0'];
    if (!definition) {
      return this.getUniversalPrompt(version);
    }
    return definition;
  }

  private static getUniversalPrompt(version: string): PromptDefinition {
    return {
      version,
      systemInstruction: CHEF_SYSTEM_PROMPT,
      userPromptTemplate: (c: { prompt: string }) => c.prompt || 'Process the input.',
    };
  }
}
