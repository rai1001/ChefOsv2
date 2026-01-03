import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useStore } from '@/presentation/store/useStore';
import { supabase } from '@/config/supabase';
// import { db } from '@/config/firebase';
// import { collection, writeBatch, doc, query, where, getDocs } from 'firebase/firestore';
import { Upload, Download, Loader2, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/presentation/components/ui';

interface BulkImporterProps {
  buttonLabel?: string;
  className?: string;
}

interface CSVRow {
  // Formato estándar
  name?: string;
  quantity?: string;
  unit?: string;
  category?: string;
  supplier?: string;
  expiry_date?: string;

  // Formato Excel alternativo
  Proveedor?: string;
  Articulo?: string;
  Precio?: string;
  Unidad?: string;
  Tipo?: string;
  Observaciones?: string;
}

export const BulkImporter: React.FC<BulkImporterProps> = ({
  buttonLabel = 'Importador Masivo CSV/Excel',
  className = '',
}) => {
  const { currentUser, activeOutletId } = useStore();
  const { addToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [step, setStep] = useState<'upload' | 'processing' | 'success'>('upload');
  const [result, setResult] = useState<{ imported: number; suppliersCreated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setStep('upload');
    setLoading(false);
    setProgress(0);
    setTotal(0);
    setResult(null);
    setError(null);
  };

  const downloadTemplate = () => {
    const csvContent =
      'Proveedor,Articulo,Precio,Unidad,Tipo,Observaciones\n' +
      'Proveedores García,Tomates,2.50,kg,Verduras,\n' +
      'Distribuciones Martínez,Aceite de Oliva,5.00,L,Aceites,\n' +
      'Proveedores García,Sal,1.00,kg,Condimentos,';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_ingredientes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Normaliza una fila del CSV/Excel para que tenga el formato estándar
  const normalizeRow = (
    row: CSVRow
  ): {
    name: string;
    quantity: string;
    unit: string;
    category: string;
    supplier?: string;
  } | null => {
    // Mapeo de columnas Excel -> formato estándar
    const name = row.name || row.Articulo;
    const unit = row.unit || row.Unidad;
    const category = row.category || row.Tipo;
    const supplier = row.supplier || row.Proveedor;

    // quantity puede venir como "Precio" en el Excel o como cantidad directa
    let quantity = row.quantity;
    if (!quantity && row.Precio) {
      // Si solo tenemos precio, usar 1 como cantidad por defecto
      quantity = '1';
    }

    if (!name || !unit || !category) {
      return null;
    }

    return {
      name: name.trim(),
      quantity: quantity || '1',
      unit: unit.trim(),
      category: category.trim(),
      supplier: supplier?.trim(),
    };
  };

  const validateColumns = (headers: string[]): boolean => {
    const normalized = headers.map((h) => h.toLowerCase().trim());

    // Acepta formato estándar O formato Excel
    const hasStandardFormat = ['name', 'unit', 'category'].every((col) => normalized.includes(col));
    const hasExcelFormat = ['articulo', 'unidad', 'tipo'].every((col) => normalized.includes(col));

    if (!hasStandardFormat && !hasExcelFormat) {
      setError(
        'Formato no válido. Debe incluir las columnas: Articulo, Unidad, Tipo (o name, unit, category)'
      );
      return false;
    }
    return true;
  };

  const processImport = async (rows: CSVRow[], inputElement: HTMLInputElement) => {
    try {
      if (rows.length === 0) {
        throw new Error('El archivo está vacío');
      }

      setTotal(rows.length);

      // Step 1: Collect unique supplier names
      const uniqueSupplierNames = new Set<string>();
      rows.forEach((row) => {
        const normalized = normalizeRow(row);
        if (normalized?.supplier) {
          uniqueSupplierNames.add(normalized.supplier);
        }
      });

      console.log('[Import] Found unique suppliers:', Array.from(uniqueSupplierNames));

      // Step 2: Check which suppliers already exist in Firestore (Now Supabase)
      const supplierMap = new Map<string, string>(); // name -> supplierId
      let suppliersCreated = 0;

      if (uniqueSupplierNames.size > 0) {
        try {
          // Query existing suppliers
          const { data: existingSuppliers, error: fetchError } = await supabase
            .from('suppliers')
            .select('id, name')
            .eq('outletId', activeOutletId || 'GLOBAL');

          if (fetchError) throw fetchError;

          console.log('[Import] Existing suppliers found:', existingSuppliers?.length);

          existingSuppliers?.forEach((s) => {
            if (s.name) {
              supplierMap.set(s.name, s.id);
              console.log('[Import] Mapped existing supplier:', s.name, '->', s.id);
            }
          });

          // Step 3: Create missing suppliers
          const newSuppliers: any[] = [];
          for (const supplierName of uniqueSupplierNames) {
            if (!supplierMap.has(supplierName)) {
              const newId = crypto.randomUUID();
              const supplierData = {
                id: newId,
                name: supplierName,
                // organizationId: activeOutletId || 'GLOBAL', // Schema check needed?
                outletId: activeOutletId || 'GLOBAL',
                category: ['FOOD'],
                paymentTerms: 'NET_30',
                isActive: true,
                rating: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              newSuppliers.push(supplierData);
              supplierMap.set(supplierName, newId);
              suppliersCreated++;
            }
          }

          if (newSuppliers.length > 0) {
            const { error: createError } = await supabase.from('suppliers').insert(newSuppliers);
            if (createError) throw createError;
            console.log('[Import] Suppliers created successfully:', newSuppliers.length);
          }
        } catch (supplierError: any) {
          console.error('[Import] Error creating suppliers:', supplierError);
          throw new Error('Error creando proveedores: ' + supplierError.message);
        }
      }

      // Step 4: Import ingredients with supplier references
      const batchSize = 100; // Supabase handles larger batches well, but safe limit
      let imported = 0;

      console.log(
        '[Import] Starting ingredient import. Supplier map:',
        Object.fromEntries(supplierMap)
      );

      const allIngredients = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const normalized = normalizeRow(row);

        if (!normalized) {
          console.warn('[Import] Skipping invalid row:', row);
          continue;
        }

        const ingredientData: any = {
          id: crypto.randomUUID(),
          name: normalized.name,
          currentStock: parseFloat(normalized.quantity) || 1,
          unit: normalized.unit,
          category: normalized.category,
          expiryDate: null,
          outletId: activeOutletId || 'GLOBAL',
          userId: currentUser!.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Add supplier reference if provided
        if (normalized.supplier) {
          const supplierId = supplierMap.get(normalized.supplier);
          if (supplierId) {
            ingredientData.preferredSupplierId = supplierId;
          }
        }
        allIngredients.push(ingredientData);
      }

      // Batch insert ingredients
      for (let i = 0; i < allIngredients.length; i += batchSize) {
        const chunk = allIngredients.slice(i, i + batchSize);
        const { error: insertError } = await supabase.from('ingredients').insert(chunk);

        if (insertError) throw insertError;

        imported += chunk.length;
        setProgress(imported);
        console.log('[Import] Committed batch of', chunk.length, 'ingredients. Total:', imported);
      }

      setResult({ imported, suppliersCreated });
      setStep('success');

      const message =
        suppliersCreated > 0
          ? `${imported} ingredientes y ${suppliersCreated} proveedores creados`
          : `${imported} ingredientes importados correctamente`;

      addToast(message, 'success');
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Error al procesar el archivo');
      setStep('upload');
    } finally {
      setLoading(false);
      inputElement.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.name.endsWith('.csv');

    if (!isExcel && !isCSV) {
      setError('Solo se permiten archivos .csv, .xlsx o .xls');
      e.target.value = '';
      return;
    }

    resetState();
    setLoading(true);
    setStep('processing');

    try {
      let rows: CSVRow[] = [];
      let headers: string[] = [];

      if (isExcel) {
        // Parse Excel file
        console.log('[Excel Import] Reading Excel file:', file.name);
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('El archivo Excel no contiene hojas');
        }
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          throw new Error('No se pudo leer la hoja de Excel');
        }
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          throw new Error('El archivo Excel está vacío');
        }

        // First row is headers
        headers = jsonData[0] as string[];
        console.log('[Excel Import] Headers:', headers);

        // Validate columns
        if (!validateColumns(headers)) {
          setStep('upload');
          setLoading(false);
          e.target.value = '';
          return;
        }

        // Convert remaining rows to objects
        rows = jsonData
          .slice(1)
          .map((row: any) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              if (row[index] !== undefined && row[index] !== null && row[index] !== '') {
                obj[header] = String(row[index]);
              }
            });
            return obj as CSVRow;
          })
          .filter((row) => {
            // Filter out completely empty rows
            const normalized = normalizeRow(row);
            return normalized !== null;
          });

        console.log('[Excel Import] Parsed', rows.length, 'valid rows from Excel');
      } else {
        // Parse CSV file
        console.log('[CSV Import] Reading CSV file:', file.name);
        await new Promise<void>((resolve, reject) => {
          Papa.parse<CSVRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              rows = results.data;
              headers = results.meta.fields || [];
              console.log('[CSV Import] Headers:', headers);
              console.log('[CSV Import] Parsed', rows.length, 'rows from CSV');

              // Validate columns
              if (!validateColumns(headers)) {
                setStep('upload');
                setLoading(false);
                e.target.value = '';
                reject(new Error('Invalid columns'));
                return;
              }

              resolve();
            },
            error: (parseError) => {
              reject(new Error('Error al leer el archivo CSV: ' + parseError.message));
            },
          });
        });
      }

      // Process the import with the parsed rows
      await processImport(rows, e.target);
    } catch (parseError: any) {
      console.error('File parsing error:', parseError);
      setError(parseError.message || 'Error al leer el archivo');
      setStep('upload');
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className={className}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg active:scale-95 text-xs font-bold uppercase tracking-widest"
        title="Importador CSV/Excel sin IA - Rápido y eficiente"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span>{buttonLabel}</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg">
            <div
              className="absolute inset-0 -z-10"
              onClick={() => !loading && (resetState(), setIsOpen(false))}
            />

            <div className="p-6 glass-card w-full overflow-hidden relative border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Importador CSV/Excel Masivo</h2>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                      Sin IA · Rápido · Eficiente
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    resetState();
                    setIsOpen(false);
                  }}
                  disabled={loading}
                  className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <AlertCircle className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                Importa ingredientes desde un archivo CSV o Excel. Procesamiento instantáneo en tu
                navegador sin costes de servidor.
              </p>

              {/* Download Template Button */}
              <button
                onClick={downloadTemplate}
                className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-xs font-semibold"
              >
                <Download className="w-4 h-4" />
                Descargar Plantilla CSV
              </button>

              {step === 'upload' && (
                <div className="relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 bg-surface/30 hover:bg-surface/50 border-blue-600/40 hover:border-blue-500">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={loading}
                  />
                  <div className="flex flex-col items-center gap-4 pointer-events-none">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-slate-200 font-bold text-sm">
                        Arrastra tu archivo CSV o Excel aquí
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        o haz clic para seleccionar (.csv, .xlsx, .xls)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 'processing' && (
                <div className="py-10 flex flex-col items-center gap-6 text-center">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                  </div>
                  <div className="space-y-2 w-full">
                    <p className="text-white font-black uppercase tracking-[0.2em] text-[10px]">
                      Importando Datos
                    </p>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all duration-300"
                        style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-slate-400 text-xs">
                      {progress} / {total} ingredientes
                    </p>
                  </div>
                </div>
              )}

              {step === 'success' && result && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="premium-glass p-4 rounded-2xl border-green-500/20 bg-green-500/5 space-y-3">
                    <div className="flex items-center gap-3 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <h3 className="font-bold text-sm">¡Importación Completada!</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Ingredientes
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white">{result.imported}</span>
                        </div>
                      </div>

                      {result.suppliersCreated > 0 && (
                        <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Proveedores
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-white">
                              {result.suppliersCreated}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      resetState();
                      setIsOpen(false);
                    }}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
                  >
                    Cerrar
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-xl flex items-start gap-3 bg-red-400/10 border border-red-500/20 text-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <p className="text-xs font-bold opacity-80">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
