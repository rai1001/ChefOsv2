import React from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '@/presentation/store/useStore';
import { useToast } from '@/presentation/components/ui';
import { normalizeDate } from '@/utils/date';
import type { MealType } from '@/types';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface OccupancyImportProps {
    onSuccess?: () => void;
}

export const OccupancyImport: React.FC<OccupancyImportProps> = ({ onSuccess }) => {
    const { importOccupancy } = useStore();
    const { addToast } = useToast();
    const [importStatus, setImportStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [importedCount, setImportedCount] = React.useState(0);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus('loading');
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                if (workbook.SheetNames.length === 0) throw new Error("Excel vacío");
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) throw new Error("Nombre de hoja inválido");
                const sheet = workbook.Sheets[sheetName];
                if (!sheet) throw new Error("Hoja no encontrada");

                // 1. Dynamic Header Search
                // Read first 10 rows as raw arrays to findwhere the data starts
                const preview = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, range: 0, defval: null }).slice(0, 10);
                let headerRowIndex = 0;
                let foundHeaders = false;

                const targetKeywords = ['fecha', 'date', 'desayuno', 'comida', 'cena', 'pax', 'paxs'];

                for (let i = 0; i < preview.length; i++) {
                    const row = preview[i];
                    if (!row || !Array.isArray(row)) continue;

                    const matchCount = row.filter(cell =>
                        cell && typeof cell === 'string' &&
                        targetKeywords.some(kw => cell.toLowerCase().includes(kw))
                    ).length;

                    if (matchCount >= 2) {
                        headerRowIndex = i;
                        foundHeaders = true;
                        console.log(`DEBUG: Found headers at row ${i + 1}`, row);
                        break;
                    }
                }

                // 2. Parse with detected header range
                const json = XLSX.utils.sheet_to_json<any>(sheet, {
                    range: headerRowIndex,
                    defval: undefined,
                    raw: false // important for normalizeDate to get consistent strings if not Date objects
                });

                console.log(`DEBUG: Processing ${json.length} rows using header from row ${headerRowIndex + 1}`);

                let count = 0;
                let rowsProcessed = 0;
                const importBatch: any[] = [];

                for (const row of json) {
                    rowsProcessed++;
                    const rowKeys = Object.keys(row);

                    // A. Resolve Date
                    const dateKey = rowKeys.find(k => ['fecha', 'date'].includes(k.trim().toLowerCase()));
                    const dateRaw = dateKey ? row[dateKey] : undefined;

                    if (!dateRaw || String(dateRaw).toLowerCase().includes('total')) continue;

                    const dateStr = normalizeDate(dateRaw);
                    if (!dateStr) continue;

                    // Parse dateStr (YYYY-MM-DD) back to Date object for the store's sync logic
                    const parts = dateStr.split('-').map(Number);
                    if (parts.length !== 3) continue;
                    const [y, m, d] = parts;
                    if (y === undefined || m === undefined || d === undefined) continue;

                    const dateObj = new Date(y, m - 1, d);

                    // B. Resolve Meals (Multi-column lookup)
                    const meals = [
                        { keys: ['desayuno', 'desayunos', 'breakfast'], type: 'breakfast' as MealType },
                        { keys: ['comida', 'comidas', 'lunch', 'almuerzo'], type: 'lunch' as MealType },
                        { keys: ['cena', 'cenas', 'dinner'], type: 'dinner' as MealType }
                    ];

                    let importedInRow = false;
                    for (const meal of meals) {
                        const mealKey = rowKeys.find(k => meal.keys.some(mk => k.trim().toLowerCase().includes(mk)));
                        const mealPax = mealKey ? row[mealKey] : undefined;

                        if (mealPax !== undefined && mealPax !== null && mealPax !== '') {
                            const pax = Number(mealPax);
                            if (!isNaN(pax) && pax > 0) {
                                importBatch.push({
                                    date: dateObj,
                                    mealType: meal.type,
                                    pax: pax
                                });
                                count++;
                                importedInRow = true;
                            }
                        }
                    }

                    // C. Fallback (PAX + Tipo format)
                    if (!importedInRow) {
                        const paxKey = rowKeys.find(k => k.trim().toLowerCase() === 'pax' || k.trim().toLowerCase() === 'paxs');
                        const typeKey = rowKeys.find(k => ['tipo', 'type'].includes(k.trim().toLowerCase()));

                        const paxValue = paxKey ? row[paxKey] : undefined;
                        const typeValue = typeKey ? String(row[typeKey] || '').toLowerCase() : '';

                        if (paxValue !== undefined && Number(paxValue) > 0) {
                            let mealType: MealType = 'breakfast';
                            if (typeValue.includes('comida') || typeValue.includes('almuerzo') || typeValue.includes('lunch')) mealType = 'lunch';
                            if (typeValue.includes('cena') || typeValue.includes('dinner')) mealType = 'dinner';

                            importBatch.push({
                                date: dateObj,
                                mealType,
                                pax: Number(paxValue)
                            });
                            count++;
                        }
                    }
                }

                if (importBatch.length > 0) {
                    await importOccupancy(importBatch);
                    setImportedCount(count);
                    setImportStatus('success');
                    addToast(`Se han importado ${count} servicios correctamente`, 'success');
                } else {
                    setImportStatus('error');
                    addToast(foundHeaders
                        ? "No se encontraron datos de PAX válidos bajo los encabezados detectados."
                        : "No se pudieron identificar las columnas necesarias (Fecha, PAX, etc.)", "error");
                }

                if (onSuccess) onSuccess();
            } catch (error) {
                console.error("Import error:", error);
                setImportStatus('error');
                addToast("Error al procesar el archivo Excel", "error");
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Importar Ocupación</h3>

            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    Sube un archivo Excel con las columnas: Fecha, Desayunos, Comidas, Cenas (o columna PAX genérica).
                </p>

                <label className="w-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all group">
                    <Upload className={`w-12 h-12 mb-4 transition-all ${importStatus === 'loading' ? 'animate-bounce text-indigo-500' : 'text-slate-400 group-hover:text-indigo-500 group-hover:scale-110'}`} />
                    <span className="text-slate-700 font-bold text-lg">
                        {importStatus === 'loading' ? 'Procesando...' : 'Seleccionar Excel de Ocupación'}
                    </span>
                    <span className="text-slate-500 text-xs mt-2 font-medium">Formatos compatibles: Multi-columna (Desayuno/Comida/Cena) o Lista (PAX/Tipo)</span>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={importStatus === 'loading'}
                    />
                </label>

                {importStatus === 'success' && (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg">
                        <CheckCircle size={20} />
                        <span>Se importaron {importedCount} servicios correctamente.</span>
                    </div>
                )}

                {importStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                        <AlertCircle size={20} />
                        <span>No se pudo importar. Verifica las columnas de tu Excel.</span>
                    </div>
                )}
            </div>
        </div>
    );
};
