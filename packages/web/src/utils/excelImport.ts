import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import type { Recipe, Ingredient, Menu, Unit } from '@/types';
import { ALLERGENS } from './allergenUtils';

// Helper to normalize headers
const normalize = (str: string) => str?.toLowerCase().trim().replace(/[^a-z0-9]/g, '') || '';

// Type for flexible Excel row data (columns vary by sheet)
type ExcelRow = Record<string, string | number | boolean | null | undefined>;

export interface ParseResult {
    ingredients: Ingredient[];
    recipes: Recipe[];
    menus: Menu[];
    items: any[]; // Raw items for direct mapping (e.g. inventory counts)
    summary: {
        ingredientsFound: number;
        recipesFound: number;
        menusFound: number;
        itemsFound: number;
        sheetsScaned: number;
        staffFound?: number;
        suppliersFound?: number;
        occupancyFound?: number;
    };
    errors: string[];
}

export interface ImportJobStatus {
    id: string;
    status: 'idle' | 'processing' | 'preview' | 'completed' | 'failed';
    summary?: ParseResult['summary'];
    error?: string;
    fileName: string;
    items?: IngestionItem[];
}

export interface IngestionItem {
    type: 'ingredient' | 'recipe' | 'staff' | 'supplier' | 'occupancy' | 'unknown';
    data: any;
    confidence: number;
    sheetName?: string;
}

/**
 * @deprecated Use processStructuredFile
 */
export const uploadForCloudParsing = async (file: File, userId: string): Promise<string> => {
    const storage = getStorage();
    const fileId = uuidv4();
    const storageRef = ref(storage, `incoming_imports/${userId}/${fileId}`);
    await uploadBytes(storageRef, file);
    return fileId;
};

/**
 * @deprecated Use processFileForAnalysis
 */
export const uploadForAISmartParsing = async (file: File, userId: string): Promise<string> => {
    const storage = getStorage();
    const fileId = uuidv4();
    const storageRef = ref(storage, `universal_imports/${userId}/${fileId}`);
    await uploadBytes(storageRef, file);
    return fileId;
};

/**
 * Calls AI Smart Analysis for PDF/Images.
 */
export const processFileForAnalysis = async (file: File, targetCollection?: string): Promise<IngestionItem[]> => {
    const analyzeDocument = httpsCallable<any, { items: IngestionItem[] }>(functions, 'analyzeDocument');

    // Convert file to base64
    const base64Data = await fileToBase64(file);

    const response = await analyzeDocument({
        base64Data,
        mimeType: file.type,
        targetCollection
    });

    return response.data.items;
};

/**
 * Calls Structured File Parser for Excel/CSV/JSON.
 */
export const processStructuredFile = async (file: File, hintType?: string): Promise<IngestionItem[]> => {
    const parseFile = httpsCallable<any, { items: IngestionItem[] }>(functions, 'parseStructuredFile');

    const base64Data = await fileToBase64(file);

    const response = await parseFile({
        base64Data,
        fileName: file.name,
        hintType
    });

    return response.data.items;
};

/**
 * Finalizes the import by committing validated items.
 */
export const confirmAndCommit = async (items: IngestionItem[], outletId: string, defaultType?: string): Promise<{ success: boolean, count: number }> => {
    const commitImport = httpsCallable<any, { success: boolean, count: number }>(functions, 'commitImport');

    const response = await commitImport({
        items,
        outletId,
        defaultType
    });

    return response.data;
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || '');
        };
        reader.onerror = error => reject(error);
    });
};

export const parseWorkbook = async (file: File): Promise<ParseResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                const result: ParseResult = {
                    ingredients: [],
                    recipes: [],
                    menus: [],
                    items: [],
                    summary: {
                        ingredientsFound: 0,
                        recipesFound: 0,
                        menusFound: 0,
                        itemsFound: 0,
                        sheetsScaned: workbook.SheetNames.length
                    },
                    errors: []
                };

                const ingredientsMap = new Map<string, Ingredient>();
                const recipesMap = new Map<string, Recipe>();
                const menusMap = new Map<string, Menu>();

                // --- CLASSIFICATION & PARSING STRATEGY ---
                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    if (!sheet) continue;
                    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z100');

                    // Specialized Master List Detection (Trust Sheet Name)
                    const isMasterList = sheetName.toUpperCase().includes('LIST. PRODUCTOS') ||
                        sheetName.toUpperCase().includes('PRODUCTOS') ||
                        sheetName.toUpperCase().includes('INGREDIENTES');

                    let type: 'INGREDIENTS' | 'INVENTORY' | 'RECIPE_CARD' | 'MENU' | 'UNKNOWN' = 'UNKNOWN';
                    let headerRow = 0;

                    if (isMasterList) {
                        type = 'INGREDIENTS';
                    } else {
                        // Generic Detection Logic
                        for (let r = range.s.r; r <= Math.min(range.e.r, 50); r++) {
                            const rowText: string[] = [];
                            for (let c = range.s.c; c <= range.e.c; c++) {
                                const cell = sheet[XLSX.utils.encode_cell({ r, c })];
                                if (cell?.v) rowText.push(String(cell.v).toUpperCase().trim());
                            }

                            if (rowText.length === 0) continue;
                            const rowString = rowText.join(' ');

                            const strongRecipeTitles = ['PROPUESTA GASTRONÓMICA', 'PROPUESTA GASTRONOMICA', 'BASES', 'FICHA TÉCNICA', 'ESCANDALLO'];
                            const hasStrongRecipe = strongRecipeTitles.some(k => rowString.includes(k));

                            const strongIngredientTitles = ['LISTA DE PRODUCTOS', 'MASTER PRODUCTOS', 'LISTADO DE PRECIOS'];
                            const hasStrongIngredients = strongIngredientTitles.some(k => rowString.includes(k));

                            if (type === 'UNKNOWN') {
                                if (hasStrongRecipe) type = 'RECIPE_CARD';
                                else if (hasStrongIngredients) type = 'INGREDIENTS';
                            }

                            const isRecipeHeader = rowText.some(t => ['INGREDIENTE', 'PRODUCTO', 'DESCRIPCIÓN'].some(k => t.includes(k))) &&
                                rowText.some(t => ['CANTIDAD', 'PESO', 'NETO', 'Q'].some(k => t.includes(k)));

                            const isIngredientHeader = rowText.some(t => ['PRODUCTO', 'NOMBRE', 'DESCRIPCIÓN'].some(k => t.includes(k))) &&
                                rowText.some(t => ['PRECIO', 'COSTE', 'COST', '€'].some(k => t.includes(k)));

                            const isInventoryHeader = rowText.some(t => ['PRODUCTO', 'NOMBRE', 'DESCRIPCIÓN'].some(k => t.includes(k))) &&
                                rowText.some(t => ['CANTIDAD', 'STOCK', 'QTY', 'CONTEO', 'UNIDADES'].some(k => t.includes(k)));

                            const isMenuHeader = rowText.some(t => ['MENÚ', 'MENU', 'PLATO'].some(k => t.includes(k)));

                            if (isRecipeHeader) {
                                if (type === 'UNKNOWN') type = 'RECIPE_CARD';
                                headerRow = r;
                                break;
                            }
                            if (isIngredientHeader) {
                                if (type === 'UNKNOWN') type = 'INGREDIENTS';
                                headerRow = r;
                                break;
                            }
                            if (isInventoryHeader) {
                                type = 'INVENTORY';
                                headerRow = r;
                                break;
                            }
                            if (isMenuHeader) {
                                type = 'MENU';
                                headerRow = r;
                                break;
                            }
                        }
                    }

                    // --- PARSER ---
                    if (type === 'INGREDIENTS') {
                        if (isMasterList) {
                            // 🚀 Enhanced Scoring-Based Header Detection
                            const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 'A', defval: '' });

                            let bestHeaderRowIdx = -1;
                            let maxScore = 0;
                            let productCol = 'B';
                            let unitCol = 'C';
                            let priceCol = 'D';
                            const allergenCols: Record<string, string> = {};

                            // Scan first 50 rows for the best header
                            const scanLimit = Math.min(rows.length, 50);
                            for (let i = 0; i < scanLimit; i++) {
                                const row = rows[i];
                                let currentScore = 0;
                                const tempMap: any = {};

                                Object.entries(row).forEach(([col, val]) => {
                                    const v = normalize(String(val));
                                    if (v.includes('producto') || v.includes('descripcion')) {
                                        currentScore += 10;
                                        tempMap.product = col;
                                    } else if (v.includes('unidad') || v.includes('formato')) {
                                        currentScore += 5;
                                        tempMap.unit = col;
                                    } else if (v.includes('precio') || v.includes('coste') || v === 'eur' || v === 'e' || v.includes('pvp')) {
                                        currentScore += 5;
                                        tempMap.price = col;
                                    } else if (ALLERGENS.some(a => normalize(a).includes(v) && v.length > 3)) {
                                        currentScore += 1;
                                    }
                                });

                                if (currentScore > maxScore && tempMap.product) {
                                    maxScore = currentScore;
                                    bestHeaderRowIdx = i;
                                    productCol = tempMap.product || productCol;
                                    unitCol = tempMap.unit || unitCol;
                                    priceCol = tempMap.price || priceCol;
                                }
                            }

                            if (bestHeaderRowIdx !== -1) {
                                const headerRow = rows[bestHeaderRowIdx];
                                Object.entries(headerRow).forEach(([col, val]) => {
                                    const v = normalize(String(val));
                                    const matchedAllergen = ALLERGENS.find(a => normalize(a) === v || normalize(a).includes(v) && v.length > 3);
                                    if (matchedAllergen) allergenCols[col] = matchedAllergen;
                                });
                            }

                            const dataStartIdx = bestHeaderRowIdx !== -1 ? bestHeaderRowIdx + 1 : 0;
                            for (let i = dataStartIdx; i < rows.length; i++) {
                                const row = rows[i];
                                const rawName = row[productCol];
                                const rawUnit = row[unitCol];
                                const rawPrice = row[priceCol];

                                if (!rawName || typeof rawName !== 'string' || rawName.length < 2) continue;
                                const nameUpper = rawName.toUpperCase();
                                if (['PRODUCTO', 'DESCRIPCION', 'NOMBRE', 'UNIDAD', 'PRECIO'].includes(nameUpper)) continue;

                                const unit = String(rawUnit || 'kg').toLowerCase().trim();
                                const finalUnit = (unit === 'ud' || unit === 'u.' || unit === 'u' || unit === 'un' || unit === 'uni') ? 'un' : unit;

                                let priceText = String(rawPrice || '0');
                                if (typeof rawPrice === 'number') priceText = String(rawPrice);
                                priceText = priceText.replace('€', '').trim().replace(',', '.');
                                const price = parseFloat(priceText) || 0;

                                const allergens: string[] = [];
                                Object.entries(allergenCols).forEach(([col, label]) => {
                                    const val = String(row[col] ?? '').toUpperCase().trim();
                                    if (['SI', 'SÍ', 'X', 'TRAZAS', 'S', '1', 'YES'].includes(val) || val.includes('SI') || val.includes('SÍ')) {
                                        if (!allergens.includes(label)) allergens.push(label);
                                    }
                                });

                                const ingKey = normalize(rawName);
                                if (!ingredientsMap.has(ingKey)) {
                                    ingredientsMap.set(ingKey, {
                                        id: uuidv4(),
                                        name: rawName.trim(),
                                        unit: finalUnit as Unit,
                                        costPerUnit: price,
                                        yield: 1,
                                        allergens: allergens
                                    });
                                }
                            }
                        } else {
                            const json = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { range: headerRow });
                            json.forEach((row) => {
                                const keys = Object.keys(row);
                                const findKey = (candidates: string[]) => keys.find(k => candidates.some(c => k.toUpperCase().includes(c)));
                                const nameKey = findKey(['PRODUCTO', 'NOMBRE', 'NAME', 'DESCRIPCIÓN', 'INGREDIENTE', 'ITEM', 'DESCRIPCION']);
                                const priceKey = findKey(['PRECIO', 'COSTE', 'COST', 'PRICE', '€']);
                                const unitKey = findKey(['UNIDAD', 'UNIT', 'FORMATO', 'U.']);

                                const name = nameKey ? String(row[nameKey] ?? '') : null;
                                const price = priceKey ? Number(String(row[priceKey] ?? '0').replace(/[^\d,.]/g, '').replace(',', '.')) : 0;
                                let unit = unitKey ? String(row[unitKey] ?? 'kg').toLowerCase().trim() : 'kg';
                                if (unit === 'ud' || unit === 'u') unit = 'un';

                                if (!name || String(name).toUpperCase().includes('TOTAL')) return;

                                const ingKey = normalize(name);
                                if (!ingredientsMap.has(ingKey)) {
                                    ingredientsMap.set(ingKey, {
                                        id: uuidv4(),
                                        name: String(name).trim(),
                                        unit: unit as Unit,
                                        costPerUnit: Number(price || 0),
                                        yield: 1,
                                        allergens: []
                                    });
                                }
                            });
                        }
                    } else if (type === 'INVENTORY') {
                        const json = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { range: headerRow });
                        json.forEach((row) => {
                            const keys = Object.keys(row);
                            const findKey = (candidates: string[]) => keys.find(k => candidates.some(c => k.toUpperCase().includes(c)));
                            const nameKey = findKey(['PRODUCTO', 'NOMBRE', 'NAME', 'DESCRIPCIÓN', 'INGREDIENTE', 'ITEM']);
                            const qtyKey = findKey(['CANTIDAD', 'STOCK', 'QTY', 'CONTEO', 'UNIDADES']);
                            const unitKey = findKey(['UNIDAD', 'UNIT', 'FORMATO']);

                            const name = nameKey ? String(row[nameKey] ?? '') : null;
                            const qty = qtyKey ? Number(String(row[qtyKey] ?? '0').replace(/[^\d,.]/g, '').replace(',', '.')) : 0;
                            const unit = unitKey ? String(row[unitKey] ?? 'un').trim() : 'un';

                            if (name && !name.toUpperCase().includes('TOTAL')) {
                                result.items.push({
                                    name: name.trim(),
                                    quantity: qty,
                                    unit: unit
                                });
                            }
                        });
                    } else if (type === 'RECIPE_CARD') {
                        const isBaseSheet = sheetName.toUpperCase().includes('BASES') || sheetName.toUpperCase().includes('BASE');
                        let recipeName = '';
                        const nameRowIdx = Math.max(0, headerRow - 2);
                        for (let c = range.s.c; c <= range.e.c; c++) {
                            const cell = sheet[XLSX.utils.encode_cell({ r: nameRowIdx, c })];
                            if (cell?.v) recipeName += cell.v + ' ';
                        }
                        recipeName = recipeName.trim() || `Receta ${sheetName}`;
                        recipeName = recipeName.replace(/ESCANDALLO/i, '').trim();
                        if (isBaseSheet) {
                            recipeName = recipeName.replace(/BASES?/i, '').trim();
                            if (!recipeName.toUpperCase().startsWith('BASE')) recipeName = 'BASE ' + recipeName;
                        }

                        const recipeKey = normalize(recipeName);
                        if (!recipesMap.has(recipeKey)) {
                            const recipe: Recipe = {
                                id: uuidv4(),
                                name: recipeName,
                                station: 'hot',
                                ingredients: [],
                                isBase: isBaseSheet,
                                totalCost: 0
                            };
                            recipesMap.set(recipeKey, recipe);

                            const json = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { range: headerRow });
                            json.forEach((row) => {
                                const rawName = row['DESCRIPCIÓN PRODUCTO PROVEEDOR'] || row['DESCRIPCIÓN'] || row.PRODUCTO;
                                const rawQty = row['CANTIDAD NETA'] || row.CANTIDAD || row.NETO;
                                const rawUnit = row.UNIDADES || row.UNIDAD;
                                if (!rawName) return;
                                const ingName = String(rawName).trim();
                                if (ingName.toUpperCase().includes('TOTAL') || ingName.length < 2) return;

                                const ingKey = normalize(ingName);
                                let ingredient = ingredientsMap.get(ingKey);
                                if (!ingredient) {
                                    ingredient = {
                                        id: uuidv4(),
                                        name: ingName,
                                        unit: (String(rawUnit || 'kg').toLowerCase()) as Unit,
                                        costPerUnit: 0,
                                        yield: 0,
                                        allergens: []
                                    };
                                    ingredientsMap.set(ingKey, ingredient);
                                }
                                recipe.ingredients.push({
                                    ingredientId: ingredient.id,
                                    ingredient: ingredient,
                                    quantity: Number(rawQty || 0)
                                });
                            });
                        }
                    } else if (type === 'MENU') {
                        const json = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { range: headerRow });
                        json.forEach((row) => {
                            const menuName = row.Menu || row['Nombre Menú'] || row.MENU;
                            const dishName = row.Plato || row.Receta || row.RECETA || row.PLATO;
                            const price = row.Precio || row.Price || 0;
                            if (!menuName || !dishName) return;
                            const menuKey = normalize(String(menuName));
                            let menu = menusMap.get(menuKey);
                            if (!menu) {
                                menu = {
                                    id: uuidv4(),
                                    name: String(menuName).trim(),
                                    recipeIds: [],
                                    recipes: [],
                                    sellPrice: Number(price) || 0
                                };
                                menusMap.set(menuKey, menu);
                            }
                            const foundRecipe = Array.from(recipesMap.values()).find(r => normalize(r.name) === normalize(String(dishName)));
                            if (foundRecipe) {
                                menu.recipeIds.push(foundRecipe.id);
                                menu.recipes?.push(foundRecipe);
                            }
                        });
                    }
                }

                result.ingredients = Array.from(ingredientsMap.values());
                result.recipes = Array.from(recipesMap.values());
                result.menus = Array.from(menusMap.values());

                result.summary.ingredientsFound = result.ingredients.length;
                result.summary.recipesFound = result.recipes.length;
                result.summary.menusFound = result.menus.length;
                result.summary.itemsFound = result.items.length;

                resolve(result);

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error parsing workbook';
                reject(new Error(`Failed to parse workbook: ${errorMessage}`));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
};
