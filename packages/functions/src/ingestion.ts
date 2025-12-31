import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { logError } from './utils/logger';
import { checkRateLimit } from './utils/rateLimiter';

export const analyzeDocument = onCall(
  {
    memory: '2GiB',
    timeoutSeconds: 120, // Reduced from 540s (9min) to 120s (2min) for cost safety
    maxInstances: 2, // COST CONTROL: Max 2 concurrent executions
    cors: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { base64Data, mimeType, targetCollection } = request.data;
    if (!base64Data || !mimeType) {
      throw new HttpsError('invalid-argument', 'Missing base64Data or mimeType.');
    }

    await checkRateLimit(uid, 'analyze_document');

    // Check file size and warn if too large
    const sizeInBytes = (base64Data.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > 15) {
      throw new HttpsError(
        'invalid-argument',
        `El archivo es demasiado grande (${sizeInMB.toFixed(1)}MB). Por favor, usa un archivo menor a 15MB o divide el documento en partes más pequeñas.`
      );
    }

    try {
      const vertexAI = new VertexAI({
        project: process.env.GCLOUD_PROJECT || admin.app().options.projectId || 'chefosv2',
        location: 'europe-southwest1',
      });
      const generativeModel = vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
      });

      const prompt = `
Eres un experto en gestión de cocinas. Analiza este documento y extrae SOLO los datos esenciales.

**REGLAS CRÍTICAS:**
1. NO extraigas headers, títulos de columnas, ni texto descriptivo
2. NO dupliques información - cada ingrediente/receta una sola vez
3. Normaliza unidades: "kg", "g", "L", "ml", "un" (unidades)
4. Si el precio tiene "€" o "$", quítalo y deja solo el número
5. Ignora totales, subtotales, y líneas de resumen

**Si es FACTURA o LISTADO DE INGREDIENTES:**
Extrae solo:
- name: Nombre del producto (sin categorías ni descripciones extra)
- price: Precio unitario como número (ej: 12.50, no "12,50€")
- unit: Una de: "kg", "g", "L", "ml", "un"

**Si es RECETA o FICHA TÉCNICA:**
Extrae:
- name: Nombre de la receta
- ingredients: [{ name: "Ingrediente", quantity: número, unit: "kg/g/L/ml/un" }]

**Formato de salida (JSON puro):**
{
  "items": [
    {
      "type": "ingredient",
      "data": { "name": "Tomate", "price": 2.50, "unit": "kg" },
      "confidence": 95
    }
  ]
}

IMPORTANTE: Solo JSON válido. Sin markdown, sin \`\`\`json, sin texto extra.
        `;

      const result = await generativeModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        } as any,
      });

      const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) throw new Error('No response from AI');

      return JSON.parse(responseText);
    } catch (error: any) {
      logError('AI Analysis Error:', error, { uid, targetCollection });
      throw new HttpsError('internal', error.message);
    }
  }
);

export const parseStructuredFile = onCall(
  {
    cors: true,
    timeoutSeconds: 60, // COST CONTROL: 1 minute timeout
    memory: '512MiB',
    maxInstances: 3, // COST CONTROL: Max 3 concurrent executions
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { base64Data, hintType } = request.data;
    if (!base64Data) {
      throw new HttpsError('invalid-argument', 'Missing base64Data.');
    }

    await checkRateLimit(uid, 'parse_structured_file');

    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const results: any[] = [];

      console.log(`Processing Excel with ${workbook.SheetNames.length} sheets`);

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;
        const json = XLSX.utils.sheet_to_json(sheet, { defval: null });

        console.log(`Sheet "${sheetName}": ${json.length} rows`);
        if (json.length > 0 && json[0]) {
          console.log('First row keys:', Object.keys(json[0] as object));
          console.log('First row sample:', json[0]);
        }

        let type = hintType || 'unknown';
        const sn = sheetName.toUpperCase();
        const firstRow = json.length > 0 ? JSON.stringify(json[0]).toUpperCase() : '';

        if (sn.includes('PERSONAL') || sn.includes('STAFF')) {
          type = 'staff';
        } else if (sn.includes('PROVEEDOR') || sn.includes('SUPPLIER')) {
          type = 'supplier';
        } else if (
          sn.includes('OCUPAC') ||
          sn.includes('OCCUPAN') ||
          firstRow.includes('PAX') ||
          firstRow.includes('DESAYUNO')
        ) {
          type = 'occupancy';
        } else if (
          sn.includes('MASTER') ||
          sn.includes('INGRED') ||
          firstRow.includes('COST') ||
          firstRow.includes('PRECIO')
        ) {
          type = 'ingredient';
        } else if (json.length > 0 && type === 'unknown') {
          // If no type detected but we have data, default to ingredient
          type = 'ingredient';
        }

        console.log(`Detected type for sheet "${sheetName}": ${type}`);

        json.forEach((row) => {
          // Type assertion for row object
          const rowData = row as Record<string, any>;

          // Validate that row has at least one meaningful field
          const hasData = Object.values(rowData).some(
            (val) => val !== null && val !== undefined && String(val).trim() !== ''
          );

          if (!hasData) return; // Skip empty rows

          // Find name field - try exact matches first, then fuzzy match
          let nameField =
            rowData.name ||
            rowData.Name ||
            rowData.NAME ||
            rowData.NOMBRE ||
            rowData.nombre ||
            rowData.Nombre ||
            rowData.producto ||
            rowData.Producto ||
            rowData.PRODUCTO ||
            rowData.Articulo ||
            rowData.articulo ||
            rowData.ARTICULO ||
            rowData.Material ||
            rowData.material ||
            rowData.MATERIAL ||
            rowData.Descripcion ||
            rowData.descripcion ||
            rowData.DESCRIPCION ||
            rowData.Item ||
            rowData.item ||
            rowData.ITEM ||
            rowData.Detalle ||
            rowData.detalle ||
            rowData.DETALLE;

          // If still no name field, try to find ANY column that looks like a name
          if (!nameField) {
            const keys = Object.keys(rowData);
            for (const key of keys) {
              const keyUpper = key.toUpperCase();
              // Look for columns with name-like keywords
              if (
                keyUpper.includes('NOMBRE') ||
                keyUpper.includes('NAME') ||
                keyUpper.includes('PRODUCTO') ||
                keyUpper.includes('ARTICULO') ||
                keyUpper.includes('MATERIAL') ||
                keyUpper.includes('DESCRIPCION') ||
                keyUpper.includes('DESCRIPTION') ||
                keyUpper.includes('ITEM') ||
                keyUpper.includes('DETALLE')
              ) {
                nameField = rowData[key];
                console.log(`Found name in column "${key}": ${nameField}`);
                break;
              }
            }

            // If STILL no match, use the first non-numeric column
            if (!nameField) {
              for (const key of keys) {
                const val = rowData[key];
                if (val && typeof val === 'string' && val.trim() !== '' && isNaN(Number(val))) {
                  nameField = val;
                  console.log(`Using first text column "${key}" as name: ${nameField}`);
                  break;
                }
              }
            }
          }

          // Ensure row has a valid name field for ingredients/recipes
          if ((type === 'ingredient' || type === 'recipe') && !nameField) {
            console.log('Skipping row without name:', rowData);
            return; // Skip rows without name
          }

          // Skip header rows (common header text)
          const nameStr = String(nameField || '').toUpperCase();
          if (
            nameStr === 'NOMBRE' ||
            nameStr === 'NAME' ||
            nameStr === 'PRODUCTO' ||
            nameStr === 'ARTICULO' ||
            nameStr === 'MATERIAL' ||
            nameStr === 'INGREDIENTE' ||
            nameStr === 'DESCRIPCION' ||
            nameStr === 'DESCRIPTION' ||
            nameStr.length < 2
          ) {
            return; // Skip header rows
          }

          // Normalize data structure for better compatibility
          const normalizedData: any = { ...rowData };

          // Map common field names to standard names
          if (!normalizedData.name) {
            normalizedData.name = nameField;
          }

          // Map price fields - try common price column names
          if (!normalizedData.price) {
            const priceField =
              rowData.price ||
              rowData.Price ||
              rowData.PRICE ||
              rowData.Precio ||
              rowData.precio ||
              rowData.PRECIO ||
              rowData.Cost ||
              rowData.cost ||
              rowData.COST ||
              rowData.Costo ||
              rowData.costo ||
              rowData.COSTO ||
              rowData.Importe ||
              rowData.importe ||
              rowData.IMPORTE;

            if (priceField) {
              normalizedData.price = priceField;
            } else {
              // Search for any column with "precio", "price", "cost", or "importe" in name
              const keys = Object.keys(rowData);
              for (const key of keys) {
                const keyUpper = key.toUpperCase();
                if (
                  keyUpper.includes('PRECIO') ||
                  keyUpper.includes('PRICE') ||
                  keyUpper.includes('COST') ||
                  keyUpper.includes('IMPORTE')
                ) {
                  normalizedData.price = rowData[key];
                  console.log(`Found price in column "${key}": ${rowData[key]}`);
                  break;
                }
              }
            }
          }

          // Map unit fields - try common unit column names
          if (!normalizedData.unit) {
            const unitField =
              rowData.unit ||
              rowData.Unit ||
              rowData.UNIT ||
              rowData.Unidad ||
              rowData.unidad ||
              rowData.UNIDAD ||
              rowData.Unidades ||
              rowData.unidades ||
              rowData.UNIDADES ||
              rowData.UM ||
              rowData.um ||
              rowData.UdM ||
              rowData.udm;

            if (unitField) {
              normalizedData.unit = unitField;
            } else {
              // Search for any column with "unidad" or "unit" in name
              const keys = Object.keys(rowData);
              for (const key of keys) {
                const keyUpper = key.toUpperCase();
                if (
                  keyUpper.includes('UNIDAD') ||
                  keyUpper.includes('UNIT') ||
                  keyUpper === 'UM' ||
                  keyUpper === 'UDM'
                ) {
                  normalizedData.unit = rowData[key];
                  console.log(`Found unit in column "${key}": ${rowData[key]}`);
                  break;
                }
              }
            }
          }

          results.push({
            data: normalizedData,
            type,
            sheetName,
            confidence: 100,
          });
        });
      });

      return { items: results };
    } catch (error: any) {
      logError('File Parsing Error:', error, { uid });
      throw new HttpsError('internal', error.message);
    }
  }
);

export const commitImport = onCall(
  {
    cors: true,
    timeoutSeconds: 120, // COST CONTROL: 2 minute timeout for batch writes
    memory: '512MiB',
    maxInstances: 2, // COST CONTROL: Max 2 concurrent executions (writes are expensive)
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { items, outletId, defaultType, supplierId } = request.data;
    if (!Array.isArray(items)) {
      throw new HttpsError('invalid-argument', 'Items must be an array.');
    }

    await checkRateLimit(uid, 'commit_import');

    const db = admin.firestore();
    const batchSize = 500;
    let count = 0;

    try {
      // Build lookup maps for deduplication
      const supplierNameToId = new Map<string, string>();
      const ingredientKeyToId = new Map<string, string>();

      // First pass: collect all suppliers and check for existing ones
      const suppliersToProcess: Array<{ item: any; normalizedName: string }> = [];

      for (const item of items) {
        const { type, data } = item;
        const itemType = type === 'unknown' ? defaultType : type;

        if (itemType === 'supplier' && data.name) {
          const normalizedName = data.name.toLowerCase().trim();
          suppliersToProcess.push({ item, normalizedName });
        }
      }

      // Query existing suppliers by name
      if (suppliersToProcess.length > 0) {
        const uniqueNames = [...new Set(suppliersToProcess.map((s) => s.normalizedName))];

        for (const name of uniqueNames) {
          const existingSuppliers = await db
            .collection('suppliers')
            .where('name', '>=', name)
            .where('name', '<=', name + '\uf8ff')
            .limit(1)
            .get();

          if (!existingSuppliers.empty && existingSuppliers.docs[0]) {
            const existingDoc = existingSuppliers.docs[0];
            supplierNameToId.set(name, existingDoc.id);
          }
        }
      }

      // Second pass: collect all ingredients and check for existing ones
      const ingredientsToProcess: Array<{
        item: any;
        normalizedName: string;
        supplierId?: string;
      }> = [];

      for (const item of items) {
        const { type, data } = item;
        const itemType = type === 'unknown' ? defaultType : type;

        if ((itemType === 'ingredient' || (data.name && (data.price || data.unit))) && data.name) {
          const normalizedName = data.name.toLowerCase().trim();
          const supplierId = data.supplierId || data.preferredSupplierId;
          ingredientsToProcess.push({ item, normalizedName, supplierId });
        }
      }

      // Query existing ingredients by name
      if (ingredientsToProcess.length > 0) {
        const uniqueNames = [...new Set(ingredientsToProcess.map((i) => i.normalizedName))];

        for (const name of uniqueNames) {
          const existingIngredients = await db
            .collection('ingredients')
            .where('name', '>=', name)
            .where('name', '<=', name + '\uf8ff')
            .limit(5) // Get a few to check supplier match
            .get();

          existingIngredients.docs.forEach((doc) => {
            const data = doc.data();
            const docName = (data.name || '').toLowerCase().trim();

            if (docName === name) {
              const key = `${name}|${data.supplierId || data.preferredSupplierId || 'none'}`;
              ingredientKeyToId.set(key, doc.id);

              // Also store just by name for fallback
              if (!ingredientKeyToId.has(name)) {
                ingredientKeyToId.set(name, doc.id);
              }
            }
          });
        }
      }

      // Third pass: process items in batches
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = db.batch();
        const chunk = items.slice(i, i + batchSize);

        for (const item of chunk) {
          const { type, data } = item;
          const itemType = type === 'unknown' ? defaultType : type;

          let collection = '';
          let docId = data.id || uuidv4();
          let shouldUpdate = true;
          let updateData = { ...data };

          switch (itemType) {
            case 'ingredient':
              collection = 'ingredients';
              break;
            case 'recipe':
              collection = 'recipes';
              break;
            case 'staff':
              collection = 'staff';
              break;
            case 'supplier':
              collection = 'suppliers';
              break;
            case 'occupancy':
              collection = 'occupancy';
              break;
            default:
              if (data.name && (data.price || data.unit)) collection = 'ingredients';
              else continue;
              break;
          }

          // Handle supplier deduplication
          if (collection === 'suppliers' && data.name) {
            const normalizedName = data.name.toLowerCase().trim();
            const existingId = supplierNameToId.get(normalizedName);

            if (existingId) {
              // Supplier exists, use existing ID
              docId = existingId;
              supplierNameToId.set(normalizedName, existingId);
            } else {
              // New supplier, remember it
              supplierNameToId.set(normalizedName, docId);
            }
          }

          // Handle ingredient deduplication and price updates
          if (collection === 'ingredients' && data.name) {
            const normalizedName = data.name.toLowerCase().trim();

            // Use global supplier ID from request if provided
            if (supplierId && !data.supplierId && !data.preferredSupplierId) {
              updateData.supplierId = supplierId;
              updateData.preferredSupplierId = supplierId;
              if (!updateData.suppliers || !Array.isArray(updateData.suppliers)) {
                updateData.suppliers = [supplierId];
              } else if (!updateData.suppliers.includes(supplierId)) {
                updateData.suppliers.push(supplierId);
              }
            }

            // Resolve supplier ID if supplier name is provided
            if (data.supplierName && !data.supplierId && !data.preferredSupplierId && !supplierId) {
              const supplierNormalized = data.supplierName.toLowerCase().trim();
              const foundSupplierId = supplierNameToId.get(supplierNormalized);
              if (foundSupplierId) {
                updateData.supplierId = foundSupplierId;
                updateData.preferredSupplierId = foundSupplierId;
              }
            }

            // Apply category from AI classification if provided
            if (data.category) {
              updateData.category = data.category;
            }

            // Apply allergens from AI classification if provided
            if (data.allergens && Array.isArray(data.allergens)) {
              updateData.allergens = data.allergens;
            }

            const ingredientSupplierId = updateData.supplierId || updateData.preferredSupplierId;
            const key = ingredientSupplierId
              ? `${normalizedName}|${ingredientSupplierId}`
              : normalizedName;
            const existingId = ingredientKeyToId.get(key);

            if (existingId) {
              // Ingredient exists
              docId = existingId;

              // Check if we need to update the price
              const existingDoc = await db.collection('ingredients').doc(existingId).get();
              const existingData = existingDoc.data();

              if (existingData) {
                const existingPrice =
                  existingData.costPerUnit ||
                  existingData.lastCost?.amount ||
                  existingData.price ||
                  0;
                const newPrice = data.costPerUnit || data.price || 0;

                // Only update if price changed
                if (existingPrice === newPrice) {
                  shouldUpdate = false;
                } else {
                  // Update price and add to price history
                  updateData.costPerUnit = newPrice;
                  updateData.lastCost = { amount: newPrice, currency: 'EUR' };

                  if (!updateData.priceHistory) {
                    updateData.priceHistory = existingData.priceHistory || [];
                  }
                  updateData.priceHistory = [
                    ...(existingData.priceHistory || []),
                    {
                      date: new Date().toISOString(),
                      price: newPrice,
                      supplierId: supplierId,
                      changeReason: 'import_update',
                    },
                  ];
                }
              }

              ingredientKeyToId.set(key, existingId);
            } else {
              // New ingredient, remember it
              ingredientKeyToId.set(key, docId);

              // Set initial price
              if (data.costPerUnit || data.price) {
                updateData.costPerUnit = data.costPerUnit || data.price;
                updateData.lastCost = {
                  amount: data.costPerUnit || data.price,
                  currency: 'EUR',
                };
              }
            }
          }

          if (!collection) continue;

          const docRef = db.collection(collection).doc(docId);

          if (shouldUpdate) {
            batch.set(
              docRef,
              {
                ...updateData,
                outletId: outletId || 'GLOBAL',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            count++;
          }
        }

        await batch.commit();
      }

      return { success: true, count };
    } catch (error: any) {
      logError('Commit Import Error:', error, { uid, outletId });
      throw new HttpsError('internal', error.message);
    }
  }
);

// Valid unit types
const VALID_UNITS = ['kg', 'g', 'L', 'ml', 'un', 'manojo'];

// Valid categories
const VALID_CATEGORIES = [
  'meat',
  'fish',
  'produce',
  'dairy',
  'dry',
  'frozen',
  'canned',
  'cocktail',
  'sports_menu',
  'corporate_menu',
  'coffee_break',
  'restaurant',
  'other',
  'preparation',
];

export const fixIngredientsData = onCall(
  {
    cors: true,
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const db = admin.firestore();
    const ingredientsRef = db.collection('ingredients');
    const snapshot = await ingredientsRef.get();

    let fixed = 0;
    let deleted = 0;
    let skipped = 0;

    for (let batchStart = 0; batchStart < snapshot.docs.length; batchStart += 500) {
      const batch = db.batch();
      const batchDocs = snapshot.docs.slice(batchStart, batchStart + 500);

      for (const docSnapshot of batchDocs) {
        const data = docSnapshot.data();
        const updates: any = {};
        let needsUpdate = false;
        let shouldDelete = false;

        // Check if ingredient has a valid name
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
          batch.delete(docSnapshot.ref);
          deleted++;
          shouldDelete = true;
        }

        if (shouldDelete) continue;

        // Fix unit field
        if (data.unit) {
          const unitLower = String(data.unit).toLowerCase().trim();
          let normalizedUnit = unitLower;

          if (['ud', 'u', 'u.', 'uni', 'unidad'].includes(unitLower)) {
            normalizedUnit = 'un';
          } else if (unitLower === 'kilo' || unitLower === 'kilos') {
            normalizedUnit = 'kg';
          } else if (unitLower === 'litro' || unitLower === 'litros') {
            normalizedUnit = 'L';
          } else if (unitLower === 'gramo' || unitLower === 'gramos') {
            normalizedUnit = 'g';
          }

          if (!VALID_UNITS.includes(normalizedUnit)) {
            normalizedUnit = 'un';
          }

          if (normalizedUnit !== data.unit) {
            updates.unit = normalizedUnit;
            needsUpdate = true;
          }
        } else {
          updates.unit = 'un';
          needsUpdate = true;
        }

        // Fix category field
        if (data.category) {
          const categoryLower = String(data.category).toLowerCase().trim();
          if (!VALID_CATEGORIES.includes(categoryLower)) {
            updates.category = 'other';
            needsUpdate = true;
          }
        } else {
          updates.category = 'other';
          needsUpdate = true;
        }

        // Ensure yieldFactor exists and is valid
        if (typeof data.yieldFactor !== 'number' || data.yieldFactor <= 0 || data.yieldFactor > 1) {
          updates.yieldFactor = 1;
          needsUpdate = true;
        }

        // Ensure allergens is an array
        if (!Array.isArray(data.allergens)) {
          updates.allergens = [];
          needsUpdate = true;
        }

        // Ensure isActive is boolean
        if (typeof data.isActive !== 'boolean') {
          updates.isActive = true;
          needsUpdate = true;
        }

        // Ensure suppliers is an array
        if (!Array.isArray(data.suppliers)) {
          updates.suppliers = [];
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(docSnapshot.ref, {
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          fixed++;
        } else {
          skipped++;
        }
      }

      await batch.commit();
    }

    return {
      success: true,
      total: snapshot.size,
      fixed,
      deleted,
      skipped,
    };
  }
);

export const classifyIngredients = onCall(
  {
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 60, // COST CONTROL: Reduced to 1 min (was 2 min)
    maxInstances: 2, // COST CONTROL: Max 2 concurrent AI calls
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { ingredients } = request.data;
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new HttpsError('invalid-argument', 'Missing or invalid ingredients array.');
    }

    await checkRateLimit(uid, 'classify_ingredients');

    try {
      const vertexAI = new VertexAI({
        project: process.env.GCLOUD_PROJECT || admin.app().options.projectId || 'chefosv2',
        location: 'europe-southwest1',
      });
      const generativeModel = vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
      });

      const prompt = `
Eres un experto en clasificación de ingredientes de cocina. Clasifica cada ingrediente en las siguientes categorías y detecta alérgenos.

**CATEGORÍAS VÁLIDAS:**
- meat (carnes: ternera, cerdo, pollo, cordero, etc.)
- fish (pescados y mariscos)
- produce (verduras, hortalizas, frutas)
- dairy (lácteos: leche, queso, yogur, mantequilla, nata)
- dry (secos: arroz, pasta, legumbres, harinas, especias)
- frozen (congelados)
- canned (conservas y enlatados)
- preparation (preparaciones: salsas, caldos, bases)
- other (otros)

**ALÉRGENOS COMUNES:**
gluten, lactosa, huevo, frutos secos, soja, pescado, marisco, sésamo, apio, mostaza, sulfitos

**INGREDIENTES A CLASIFICAR:**
${ingredients.join('\n')}

**FORMATO DE SALIDA (JSON):**
{
  "classifications": {
    "Nombre Ingrediente": {
      "category": "categoría_válida",
      "allergens": ["alérgeno1", "alérgeno2"]
    }
  }
}

IMPORTANTE: Solo JSON válido. Sin markdown, sin explicaciones extra.
`;

      const result = await generativeModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        } as any,
      });

      const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) throw new Error('No response from AI');

      return JSON.parse(responseText);
    } catch (error: any) {
      logError('AI Classification Error:', error, { uid });
      throw new HttpsError('internal', error.message);
    }
  }
);

/**
 * DELETE ALL INGREDIENTS FROM DATABASE (MAINTENANCE ONLY)
 * ⚠️ WARNING: This will delete ALL ingredients from the database
 */
export const deleteAllIngredients = onCall(
  {
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 300, // 5 minutes for mass deletion
    maxInstances: 1, // COST CONTROL: Only 1 deletion at a time (prevents accidental mass deletions)
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    // Security check: require explicit confirmation
    const { confirmation } = request.data;
    if (confirmation !== 'DELETE_ALL_INGREDIENTS') {
      throw new HttpsError(
        'permission-denied',
        'Invalid confirmation. Please provide exact confirmation text.'
      );
    }

    try {
      console.log('Starting deletion of all ingredients', { uid });

      const db = admin.firestore();
      const ingredientsRef = db.collection('ingredients');

      // Get all ingredients
      const snapshot = await ingredientsRef.get();
      const totalCount = snapshot.size;

      if (totalCount === 0) {
        return {
          success: true,
          deleted: 0,
          message: 'No ingredients found in database',
        };
      }

      // Delete in batches of 500 (Firestore limit)
      const batchSize = 500;
      let deletedCount = 0;

      while (true) {
        const batch = db.batch();
        const docs = await ingredientsRef.limit(batchSize).get();

        if (docs.size === 0) break;

        docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        deletedCount += docs.size;

        console.log(`Deleted batch of ${docs.size} ingredients`, {
          deletedCount,
          totalCount,
        });

        // Prevent infinite loop
        if (deletedCount >= totalCount * 2) {
          throw new Error('Deletion count exceeded expected total - aborting');
        }
      }

      console.log('Completed deletion of all ingredients', {
        uid,
        deletedCount,
      });

      return {
        success: true,
        deleted: deletedCount,
        message: `Successfully deleted ${deletedCount} ingredients from database`,
      };
    } catch (error: any) {
      logError('Error deleting ingredients:', error, { uid });
      throw new HttpsError('internal', error.message);
    }
  }
);
