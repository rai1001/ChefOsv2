import { injectable } from 'inversify';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { IImportService, ImportResult, ImportItem } from '../../domain/interfaces/services/IImportService';
import { Unit } from '../../domain/types';



@injectable()
export class ExcelImportService implements IImportService {

    async parseFile(file: File, hintType?: string): Promise<ImportResult> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const result = this.processWorkbook(workbook, hintType);
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    async processSmartFile(_file: File): Promise<ImportResult> {
        // Smart mode usually implies sending to AI, but if we have local logic for PDF parsing (unlikely strictly in browser without library), 
        // this method might be a placeholder or delegated to AI Service in the Use Case. 
        // For strict SOC, ImportService handles file parsing. If "Smart" means AI, the Use Case handles that using AIService.
        // I will return empty here or implement simple heuristics if needed.
        throw new Error("Smart Import should use AIService, not ExcelImportService directly.");
    }

    private processWorkbook(workbook: XLSX.WorkBook, hintType?: string): ImportResult {
        const items: ImportItem[] = [];
        let total = 0;
        let valid = 0;
        let errors = 0;

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;
            // Simple version of the legacy parsing logic
            // We prioritize Ingredients for this module migration

            // const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z100');
            const isIngredients = sheetName.toUpperCase().includes('PRODUCTOS') || sheetName.toUpperCase().includes('INGREDIENTES') || hintType === 'ingredient';

            if (isIngredients) {
                const json = XLSX.utils.sheet_to_json<any>(sheet);
                json.forEach(row => {
                    total++;
                    // Heuristic detection of columns
                    const keys = Object.keys(row);
                    const findKey = (candidates: string[]) => keys.find(k => candidates.some(c => k.toUpperCase().includes(c)));

                    const nameKey = findKey(['PRODUCTO', 'NOMBRE', 'NAME', 'DESCRIPCIÓN', 'INGREDIENTE', 'ITEM']);
                    const priceKey = findKey(['PRECIO', 'COSTE', 'COST', 'PRICE', '€']);
                    const unitKey = findKey(['UNIDAD', 'UNIT', 'FORMATO', 'U.']);

                    const name = nameKey ? String(row[nameKey] ?? '') : null;
                    const price = priceKey ? Number(String(row[priceKey] ?? '0').replace(/[^\d,.]/g, '').replace(',', '.')) : 0;
                    let unit = unitKey ? String(row[unitKey] ?? 'kg').toLowerCase().trim() : 'kg';
                    if (unit === 'ud' || unit === 'u') unit = 'un';

                    if (name && !String(name).toUpperCase().includes('TOTAL')) {
                        valid++;
                        items.push({
                            type: 'ingredient',
                            confidence: 1,
                            data: {
                                id: uuidv4(),
                                name: String(name).trim(),
                                unit: unit as Unit,
                                costPerUnit: price,
                                yield: 1,
                                allergens: [], // Could implement allergen parsing logic here too
                                category: 'other'
                            }
                        });
                    } else {
                        errors++;
                    }
                });
            }
        }

        return { items, summary: { total, valid, errors } };
    }
}
