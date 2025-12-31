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
        location: 'europe-southwest1',
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

export const parseStructuredFile = onCall(async (request) => {
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
});

export const commitImport = onCall(async (request) => {
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
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = db.batch();
      const chunk = items.slice(i, i + batchSize);

      chunk.forEach((item) => {
        const { type, data } = item;
        const itemType = type === 'unknown' ? defaultType : type;

        let collection = '';
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
            else return;
            break;
        }

        const docId = data.id || uuidv4();
        const docRef = db.collection(collection).doc(docId);

        batch.set(
          docRef,
          {
            ...data,
            outletId: outletId || 'GLOBAL',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        count++;
      });

      await batch.commit();
    }

    return { success: true, count };
  } catch (error: any) {
    logError('Commit Import Error:', error, { uid, outletId });
    throw new HttpsError('internal', error.message);
  }
});
