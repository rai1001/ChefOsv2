import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { logError } from './utils/logger';
import { checkRateLimit } from './utils/rateLimiter';

export const analyzeDocument = onCall(
  {
    memory: '1GiB',
    timeoutSeconds: 300,
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

    try {
      const vertexAI = new VertexAI({
        project: process.env.GCLOUD_PROJECT || admin.app().options.projectId || 'chefosv2',
        location: 'europe-west1',
      });
      const generativeModel = vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
      });

      const prompt = `
            Actúa como un experto en gestión de cocinas. Analiza este documento (${targetCollection || 'General'}).
            Extrae datos estructurados y asigna un 'confidence_score' del 0 al 100 a cada campo.
            
            Si es una Ficha Técnica o Receta, extrae:
            - name: Nombre de la receta.
            - ingredients: [{ name: "Ingrediente", quantity: 0.0, unit: "kg/un" }]
            
            Si es un Listado de Ingredientes o Factura, extrae:
            - name: Nombre del producto.
            - price: Precio unitario.
            - unit: Unidad de medida.
            
            Devuelve un JSON con este formato:
            {
                "items": [
                    { 
                        "data": { ...datos específicos... },
                        "type": "recipe" | "ingredient",
                        "confidence": 85
                    }
                ]
            }
            Solo retorna el JSON. Nada de texto extra.
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

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;
        const json = XLSX.utils.sheet_to_json(sheet);

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
          type = 'recipe';
        }

        json.forEach((row) => {
          // Type assertion for row object
          const rowData = row as Record<string, any>;

          // Validate that row has at least one meaningful field
          const hasData = Object.values(rowData).some(
            (val) => val !== null && val !== undefined && String(val).trim() !== ''
          );

          if (!hasData) return; // Skip empty rows

          // Ensure row has a name field for ingredients/recipes
          if (
            (type === 'ingredient' || type === 'recipe') &&
            !rowData.name &&
            !rowData.Name &&
            !rowData.NOMBRE
          ) {
            return; // Skip rows without name
          }

          results.push({
            data: row,
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
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { items, outletId, defaultType } = request.data;
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

          if (!existingSuppliers.empty) {
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

            // Resolve supplier ID if supplier name is provided
            if (data.supplierName && !data.supplierId && !data.preferredSupplierId) {
              const supplierNormalized = data.supplierName.toLowerCase().trim();
              const foundSupplierId = supplierNameToId.get(supplierNormalized);
              if (foundSupplierId) {
                updateData.supplierId = foundSupplierId;
                updateData.preferredSupplierId = foundSupplierId;
              }
            }

            const supplierId = updateData.supplierId || updateData.preferredSupplierId;
            const key = supplierId ? `${normalizedName}|${supplierId}` : normalizedName;
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
