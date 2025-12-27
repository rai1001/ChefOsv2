import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";

/**
 * Normalizes string for key mapping.
 */
const normalize = (str: string) => str?.toLowerCase().trim().replace(/[^a-z0-9]/g, '') || '';

/**
 * Storage trigger to process Excel files in the background.
 */
export const processExcelImport = onObjectFinalized("incoming_imports/{uid}/{fileId}", async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;

    // Extract params from path
    const pathParts = filePath.split('/');
    const uid = pathParts[1];
    const fileId = pathParts[2];

    const db = admin.firestore();
    const jobRef = db.collection("import_jobs").doc(fileId);

    try {
        // 1. Mark job as started
        await jobRef.set({
            uid,
            status: "processing",
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            fileName: filePath.split('/').pop()
        });

        // 2. Download file
        const bucket = admin.storage().bucket(fileBucket);
        const [content] = await bucket.file(filePath).download();

        // 3. Parse content based on file type
        const extension = filePath.split('.').pop()?.toLowerCase();
        let workbook: XLSX.WorkBook | null = null;
        let jsonData: any[] | null = null;

        if (extension === 'json') {
            jsonData = JSON.parse(content.toString());
        } else {
            // XLSX handles .xlsx, .xls, .csv, .xlsm
            workbook = XLSX.read(content, { type: 'buffer' });
        }

        const ingredientsMap = new Map<string, any>();
        const recipesMap = new Map<string, any>();
        const staffMap = new Map<string, any>();
        const suppliersMap = new Map<string, any>();
        const occupancyMap = new Map<string, any>();

        // Helper to normalize dates for occupancy
        const parseDate = (val: any): Date | null => {
            if (val instanceof Date) return val;
            if (typeof val === 'number') {
                // Excel serial date
                return new Date(Math.round((val - 25569) * 86400 * 1000));
            }
            const str = String(val).trim();
            if (str.includes('/')) {
                const parts = str.split('/');
                if (parts.length === 3) {
                    const [d, m, y] = parts.map(Number);
                    if (d > 0 && d <= 31 && m > 0 && m <= 12 && y > 1900) {
                        return new Date(y, m - 1, d);
                    }
                }
            }
            const d = new Date(str);
            return isNaN(d.getTime()) ? null : d;
        };

        // Helper to process rows into the ingredients map
        const processIngredientRow = (row: any) => {
            const name = row['Producto'] || row['Nombre'] || row['DESCRIPCIÓN'] || row['Ingrediente'];
            const price = parseFloat(String(row['Precio'] || row['Coste'] || row['Price'] || '0').replace(',', '.'));
            const unit = String(row['Unidad'] || row['Unit'] || 'kg').toLowerCase();

            if (name && name.length > 2) {
                const key = normalize(name);
                if (!ingredientsMap.has(key)) {
                    ingredientsMap.set(key, {
                        id: uuidv4(),
                        name: name.trim(),
                        unit: unit === 'ud' ? 'un' : unit,
                        costPerUnit: price || 0,
                        yield: 1,
                        outletId: "GLOBAL",
                        isTrackedInInventory: true,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        };

        const processStaffRow = (row: any) => {
            const name = row['Nombre'] || row['Name'] || row['nombre'];
            const role = row['Rol'] || row['Role'] || row['rol'] || 'COOK_ROTATING';
            if (name) {
                staffMap.set(normalize(name), {
                    id: uuidv4(),
                    name: String(name),
                    role: role,
                    status: 'ACTIVE',
                    outletId: "GLOBAL",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        };

        const processSupplierRow = (row: any) => {
            const name = row['Nombre'] || row['Proveedor'] || row['Name'];
            if (name) {
                suppliersMap.set(normalize(name), {
                    id: uuidv4(),
                    name: String(name),
                    email: row['Email'] || '',
                    phone: String(row['Telefono'] || ''),
                    outletId: "GLOBAL",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        };

        const processOccupancyRow = (row: any) => {
            const dateVal = row['Fecha'] || row['Date'] || row['fecha'] || row['date'];
            const date = parseDate(dateVal);
            if (!date) return;

            const dateStr = date.toISOString().slice(0, 10);
            const totalRooms = Number(row['Habitaciones Totales'] || row['Total Rooms'] || 0);
            const occupiedRooms = Number(row['Habitaciones Ocupadas'] || row['Occupied Rooms'] || 0);

            const meals = [
                { key: ['Desayunos', 'Breakfast', 'desayunos'], type: 'breakfast' },
                { key: ['Comidas', 'Lunch', 'comidas'], type: 'lunch' },
                { key: ['Cenas', 'Dinner', 'cenas'], type: 'dinner' }
            ];

            meals.forEach(meal => {
                const paxKey = meal.key.find(k => row[k] !== undefined);
                if (paxKey !== undefined) {
                    const pax = Number(row[paxKey]);
                    const docId = `${dateStr}_${meal.type}`;
                    occupancyMap.set(docId, {
                        id: docId,
                        date: admin.firestore.Timestamp.fromDate(date),
                        mealType: meal.type,
                        estimatedPax: pax,
                        totalRooms,
                        occupiedRooms,
                        occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            });

            // Generic PAX column
            const genericPax = row['PAX'] || row['Pax'] || row['Personas'] || row['personas'];
            if (genericPax !== undefined && !meals.some(m => row[m.key[0]] !== undefined)) {
                const type = String(row['Tipo'] || row['Meal Type'] || 'breakfast').toLowerCase();
                const docId = `${dateStr}_${type}`;
                occupancyMap.set(docId, {
                    id: docId,
                    date: admin.firestore.Timestamp.fromDate(date),
                    mealType: type,
                    estimatedPax: Number(genericPax),
                    totalRooms,
                    occupiedRooms,
                    occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        };

        if (jsonData) {
            // Assume JSON is either an array of items or has a specific structure
            const rows = Array.isArray(jsonData) ? jsonData : ((jsonData as any).ingredients || (jsonData as any).items || []);
            rows.forEach(processIngredientRow);
        } else if (workbook) {
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json<any>(sheet);

                const isMasterList = sheetName.toUpperCase().includes('PRODUCTOS') ||
                    sheetName.toUpperCase().includes('INGREDIENTES') ||
                    sheetName.toUpperCase().includes('INV');

                const isRecipeSheet = sheetName.toUpperCase().includes('RECETA') ||
                    sheetName.toUpperCase().includes('PLATO') ||
                    sheetName.toUpperCase().includes('MENU');

                const isSupplierSheet = sheetName.toUpperCase().includes('PROVEEDOR') ||
                    sheetName.toUpperCase().includes('SUPPLIER');

                const isStaffSheet = sheetName.toUpperCase().includes('PERSONAL') ||
                    sheetName.toUpperCase().includes('STAFF') ||
                    sheetName.toUpperCase().includes('EQUIPO');

                const isOccupancySheet = sheetName.toUpperCase().includes('OCUPACION') ||
                    sheetName.toUpperCase().includes('OCUPACIÓN') ||
                    sheetName.toUpperCase().includes('OCCUPANCY');

                if (isMasterList) {
                    json.forEach(processIngredientRow);
                } else if (isSupplierSheet) {
                    json.forEach(processSupplierRow);
                } else if (isStaffSheet) {
                    json.forEach(processStaffRow);
                } else if (isOccupancySheet) {
                    json.forEach(processOccupancyRow);
                } else if (isRecipeSheet) {
                    // Simple Recipe Parsing: Name in first row or header
                    // This is a heuristic, in a real scenario we'd need a more rigid template
                    const recipeName = sheetName;
                    const ingredients: any[] = [];

                    json.forEach(row => {
                        const ingName = row['Ingrediente'] || row['Nombre'] || row['Producto'];
                        const qty = parseFloat(String(row['Cantidad'] || row['Quantity'] || '0').replace(',', '.'));

                        if (ingName && qty > 0) {
                            const key = normalize(ingName);

                            // AUTO-CREATION logic: If not in master list, create a "ghost" ingredient
                            if (!ingredientsMap.has(key)) {
                                ingredientsMap.set(key, {
                                    id: uuidv4(),
                                    name: ingName.trim(),
                                    unit: 'kg', // Default
                                    costPerUnit: 0, // Mark for manual review
                                    yield: 1,
                                    outletId: "GLOBAL",
                                    isTrackedInInventory: false, // Never to inventory automatically
                                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                                });
                            }

                            const ingData = ingredientsMap.get(key);
                            ingredients.push({
                                ingredientId: ingData.id,
                                quantity: qty
                            });
                        }
                    });

                    if (ingredients.length > 0) {
                        recipesMap.set(normalize(recipeName), {
                            id: uuidv4(),
                            name: recipeName,
                            ingredients,
                            outletId: "GLOBAL",
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
            }
        }

        // 4. Save to Firestore (Transactional for safety)
        const items = Array.from(ingredientsMap.values());
        const BATCH_SIZE = 500;

        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = items.slice(i, i + BATCH_SIZE);

            chunk.forEach(ing => {
                const ingRef = db.collection("ingredients").doc(ing.id);
                batch.set(ingRef, ing);
            });

            await batch.commit();
        }

        // 4b. Save Recipes
        const recipes = Array.from(recipesMap.values());
        for (let i = 0; i < recipes.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = recipes.slice(i, i + BATCH_SIZE);

            chunk.forEach(recipe => {
                const recipeRef = db.collection("recipes").doc(recipe.id);
                batch.set(recipeRef, recipe);
            });

            await batch.commit();
        }

        // 4c. Save Staff
        const staffList = Array.from(staffMap.values());
        for (let i = 0; i < staffList.length; i += BATCH_SIZE) {
            const batch = db.batch();
            staffList.slice(i, i + BATCH_SIZE).forEach(member => {
                batch.set(db.collection("staff").doc(member.id), member);
            });
            await batch.commit();
        }

        // 4d. Save Suppliers
        const suppliersList = Array.from(suppliersMap.values());
        for (let i = 0; i < suppliersList.length; i += BATCH_SIZE) {
            const batch = db.batch();
            suppliersList.slice(i, i + BATCH_SIZE).forEach(sup => {
                batch.set(db.collection("suppliers").doc(sup.id), sup);
            });
            await batch.commit();
        }

        // 4e. Save Occupancy
        const occupancyList = Array.from(occupancyMap.values());
        for (let i = 0; i < occupancyList.length; i += BATCH_SIZE) {
            const batch = db.batch();
            occupancyList.slice(i, i + BATCH_SIZE).forEach(occ => {
                batch.set(db.collection("occupancy").doc(occ.id), occ, { merge: true });
            });
            await batch.commit();
        }

        // 5. Success
        await jobRef.update({
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            summary: {
                ingredientsFound: ingredientsMap.size,
                recipesFound: recipesMap.size,
                staffFound: staffMap.size,
                suppliersFound: suppliersMap.size,
                occupancyFound: occupancyMap.size
            }
        });

        // Clean up storage? Optional.
        // await bucket.file(filePath).delete();

    } catch (error: any) {
        console.error("Excel Import Error:", error);
        await jobRef.update({
            status: "failed",
            error: error.message,
            failedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
