import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { logError } from './utils/logger';
import { checkRateLimit } from './utils/rateLimiter';
import { getCachedResult, setCachedResult } from './cache/aiCache';

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

          // Map supplier/proveedor fields - try common supplier column names
          if (!normalizedData.supplier && !normalizedData.supplierName) {
            const supplierField =
              rowData.supplier ||
              rowData.Supplier ||
              rowData.SUPPLIER ||
              rowData.Proveedor ||
              rowData.proveedor ||
              rowData.PROVEEDOR ||
              rowData.Suministrador ||
              rowData.suministrador ||
              rowData.SUMINISTRADOR;

            if (supplierField) {
              normalizedData.supplier = supplierField;
              normalizedData.supplierName = supplierField;
            } else {
              // Search for any column with "proveedor" or "supplier" in name
              const keys = Object.keys(rowData);
              for (const key of keys) {
                const keyUpper = key.toUpperCase();
                if (
                  keyUpper.includes('PROVEEDOR') ||
                  keyUpper.includes('SUPPLIER') ||
                  keyUpper.includes('SUMINISTRADOR')
                ) {
                  normalizedData.supplier = rowData[key];
                  normalizedData.supplierName = rowData[key];
                  console.log(`Found supplier in column "${key}": ${rowData[key]}`);
                  break;
                }
              }
            }
          }

          // Map category/type fields - try common category column names
          if (!normalizedData.category && !normalizedData.type) {
            const categoryField =
              rowData.category ||
              rowData.Category ||
              rowData.CATEGORY ||
              rowData.Categoria ||
              rowData.categoria ||
              rowData.CATEGORIA ||
              rowData.Tipo ||
              rowData.tipo ||
              rowData.TIPO ||
              rowData.Type ||
              rowData.type ||
              rowData.TYPE;

            if (categoryField) {
              normalizedData.category = categoryField;
            } else {
              // Search for any column with "categoria", "category", or "tipo" in name
              const keys = Object.keys(rowData);
              for (const key of keys) {
                const keyUpper = key.toUpperCase();
                if (
                  keyUpper.includes('CATEGORIA') ||
                  keyUpper.includes('CATEGORY') ||
                  keyUpper.includes('TIPO') ||
                  keyUpper === 'TYPE'
                ) {
                  normalizedData.category = rowData[key];
                  console.log(`Found category in column "${key}": ${rowData[key]}`);
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
      const supplierNamesFromIngredients = new Set<string>();

      for (const item of items) {
        const { type, data } = item;
        const itemType = type === 'unknown' ? defaultType : type;

        if (itemType === 'supplier' && data.name) {
          const normalizedName = data.name.toLowerCase().trim();
          suppliersToProcess.push({ item, normalizedName });
        }

        // Also collect supplier names from ingredients
        if (
          (itemType === 'ingredient' || (data.name && (data.price || data.unit))) &&
          (data.supplier || data.supplierName)
        ) {
          const supplierName = data.supplier || data.supplierName;
          if (supplierName && typeof supplierName === 'string' && supplierName.trim().length > 0) {
            supplierNamesFromIngredients.add(supplierName.toLowerCase().trim());
          }
        }
      }

      // Merge all unique supplier names
      const allSupplierNames = new Set([
        ...suppliersToProcess.map((s) => s.normalizedName),
        ...Array.from(supplierNamesFromIngredients),
      ]);

      console.log('[Commit] Found', allSupplierNames.size, 'unique suppliers to process');

      // Query existing suppliers by name
      if (allSupplierNames.size > 0) {
        for (const name of allSupplierNames) {
          const existingSuppliers = await db
            .collection('suppliers')
            .where('name', '>=', name)
            .where('name', '<=', name + '\uf8ff')
            .limit(1)
            .get();

          if (!existingSuppliers.empty && existingSuppliers.docs[0]) {
            const existingDoc = existingSuppliers.docs[0];
            supplierNameToId.set(name, existingDoc.id);
            console.log('[Commit] Found existing supplier:', name, '->', existingDoc.id);
          }
        }
      }

      // Create missing suppliers
      const suppliersToCreate = Array.from(allSupplierNames).filter(
        (name) => !supplierNameToId.has(name)
      );
      if (suppliersToCreate.length > 0) {
        console.log('[Commit] Creating', suppliersToCreate.length, 'new suppliers');

        for (let i = 0; i < suppliersToCreate.length; i += batchSize) {
          const batch = db.batch();
          const chunk = suppliersToCreate.slice(i, i + batchSize);

          for (const supplierName of chunk) {
            const supplierId = uuidv4();
            const supplierRef = db.collection('suppliers').doc(supplierId);

            batch.set(supplierRef, {
              id: supplierId,
              name: supplierName.charAt(0).toUpperCase() + supplierName.slice(1), // Capitalize first letter
              organizationId: outletId || 'GLOBAL',
              outletId: outletId || 'GLOBAL',
              category: ['FOOD'],
              paymentTerms: 'NET_30',
              isActive: true,
              rating: 0,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            supplierNameToId.set(supplierName, supplierId);
            console.log('[Commit] Created supplier:', supplierName, '->', supplierId);
          }

          await batch.commit();
        }
      }

      // Second pass: collect all ingredients and check for existing ones
      const ingredientsToProcess: Array<{
        item: any;
        normalizedName: string;
        supplierId?: string;
      }> = [];

      // Collect ingredients that need classification
      const ingredientsNeedingClassification: string[] = [];

      for (const item of items) {
        const { type, data } = item;
        const itemType = type === 'unknown' ? defaultType : type;

        if ((itemType === 'ingredient' || (data.name && (data.price || data.unit))) && data.name) {
          const normalizedName = data.name.toLowerCase().trim();
          const supplierId = data.supplierId || data.preferredSupplierId;
          ingredientsToProcess.push({ item, normalizedName, supplierId });

          // If ingredient doesn't have category, mark for AI classification
          if (!data.category && !data.type) {
            ingredientsNeedingClassification.push(data.name);
          }
        }
      }

      // AI Classification for ingredients without category
      const classifications: Record<string, any> = {};
      if (ingredientsNeedingClassification.length > 0) {
        console.log(
          '[Commit] Classifying',
          ingredientsNeedingClassification.length,
          'ingredients with AI'
        );

        try {
          // Call the classification AI with caching
          const vertexAI = new VertexAI({
            project: process.env.GCLOUD_PROJECT || admin.app().options.projectId || 'chefosv2',
            location: 'europe-southwest1',
          });
          const generativeModel = vertexAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
          });

          // Process in batches of 50 to avoid token limits
          const classificationBatchSize = 50;
          for (
            let i = 0;
            i < ingredientsNeedingClassification.length;
            i += classificationBatchSize
          ) {
            const batch = ingredientsNeedingClassification.slice(i, i + classificationBatchSize);

            // Check cache first for each ingredient
            const uncachedIngredients: string[] = [];
            for (const ingredientName of batch) {
              const cached = await getCachedResult('ingredient_classification', ingredientName);
              if (cached) {
                console.log('[Commit] Cache HIT for:', ingredientName);
                classifications[ingredientName] = cached;
              } else {
                uncachedIngredients.push(ingredientName);
              }
            }

            // Only call AI for uncached ingredients
            if (uncachedIngredients.length > 0) {
              const prompt = `
Eres un experto en clasificación de ingredientes de cocina. Clasifica cada ingrediente en las siguientes categorías:

**CATEGORÍAS VÁLIDAS:**
- Verduras (verduras, hortalizas, frutas)
- Carnes (ternera, cerdo, pollo, cordero)
- Pescados (pescados y mariscos)
- Lácteos (leche, queso, yogur, mantequilla, nata)
- Secos (arroz, pasta, legumbres, harinas, especias)
- Congelados
- Conservas
- Aceites
- Condimentos
- Otros

**INGREDIENTES A CLASIFICAR:**
${uncachedIngredients.join('\n')}

**FORMATO DE SALIDA (JSON):**
{
  "classifications": {
    "Nombre Ingrediente": {
      "category": "categoría_válida",
      "allergens": []
    }
  }
}

IMPORTANTE: Solo JSON válido. Sin markdown, sin explicaciones extra.
`;

              const result = await generativeModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' } as any,
              });

              const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
              if (responseText) {
                const aiResponse = JSON.parse(responseText);
                if (aiResponse.classifications) {
                  // Store classifications and cache them
                  for (const [ingredientName, classification] of Object.entries(
                    aiResponse.classifications
                  )) {
                    classifications[ingredientName] = classification;
                    // Cache for 30 days
                    await setCachedResult(
                      'ingredient_classification',
                      ingredientName,
                      classification
                    );
                  }
                }
              }
            }
          }

          console.log(
            '[Commit] AI classification complete. Classified',
            Object.keys(classifications).length,
            'ingredients'
          );
        } catch (classificationError: any) {
          console.error('[Commit] AI classification error:', classificationError);
          // Continue without classification if AI fails
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

            // Apply category from AI classification if not already set
            if (!data.category && !data.type && classifications[data.name]) {
              updateData.category = classifications[data.name].category;
              console.log('[Commit] Applied AI category to', data.name, ':', updateData.category);
            } else if (data.category) {
              updateData.category = data.category;
            }

            // Apply allergens from AI classification if not already set
            if (
              (!data.allergens || data.allergens.length === 0) &&
              classifications[data.name]?.allergens
            ) {
              updateData.allergens = classifications[data.name].allergens;
              console.log('[Commit] Applied AI allergens to', data.name, ':', updateData.allergens);
            } else if (data.allergens && Array.isArray(data.allergens)) {
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

/**
 * Classify Ingredients with AI + Caching
 *
 * Cost optimization: Check cache before calling Gemini
 * - Expected 50-70% cache hit rate for common ingredients
 * - Only uncached ingredients sent to Gemini
 * - Saves €1.50-4.00/month
 */
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
      // Step 1: Check cache for each ingredient
      const classifications: any = {};
      const uncachedIngredients: string[] = [];

      for (const ingredient of ingredients) {
        const cached = await getCachedResult('ingredient_classification', ingredient);
        if (cached) {
          console.log('[Classify] Cache HIT:', ingredient);
          classifications[ingredient] = cached;
        } else {
          console.log('[Classify] Cache MISS:', ingredient);
          uncachedIngredients.push(ingredient);
        }
      }

      // Step 2: Only call AI for uncached ingredients
      if (uncachedIngredients.length === 0) {
        console.log('[Classify] All cached! No AI call needed');
        return { classifications };
      }

      console.log('[Classify] Calling AI for', uncachedIngredients.length, 'ingredients');

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
${uncachedIngredients.join('\n')}

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

      const aiResponse = JSON.parse(responseText);
      const newClassifications = aiResponse.classifications || {};

      // Step 3: Cache the new AI results (fire and forget)
      const cachePromises = Object.entries(newClassifications).map(([ingredient, data]) =>
        setCachedResult('ingredient_classification', ingredient, data)
      );
      await Promise.allSettled(cachePromises);
      console.log(
        '[Classify] Cached',
        Object.keys(newClassifications).length,
        'new classifications'
      );

      // Step 4: Merge cached and new results
      const finalClassifications = { ...classifications, ...newClassifications };

      return { classifications: finalClassifications };
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
