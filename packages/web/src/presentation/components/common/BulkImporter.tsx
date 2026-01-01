import React, { useState } from 'react';
import Papa from 'papaparse';
import { useStore } from '@/presentation/store/useStore';
import { db } from '@/config/firebase';
import { collection, writeBatch, doc, query, where, getDocs } from 'firebase/firestore';
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
  buttonLabel = 'Importador Masivo CSV',
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

  // Normaliza una fila del CSV para que tenga el formato estándar
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
        'Formato de CSV no válido. Debe incluir las columnas: Articulo, Unidad, Tipo (o name, unit, category)'
      );
      return false;
    }
    return true;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (!file.name.endsWith('.csv')) {
      setError('Solo se permiten archivos .csv');
      e.target.value = '';
      return;
    }

    resetState();
    setLoading(true);
    setStep('processing');

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Validate columns
          if (!validateColumns(results.meta.fields || [])) {
            setStep('upload');
            setLoading(false);
            e.target.value = '';
            return;
          }

          const rows = results.data;
          if (rows.length === 0) {
            throw new Error('El archivo CSV está vacío');
          }

          setTotal(rows.length);

          // Step 1: Collect unique supplier names from CSV
          const uniqueSupplierNames = new Set<string>();
          rows.forEach((row) => {
            const normalized = normalizeRow(row);
            if (normalized?.supplier) {
              uniqueSupplierNames.add(normalized.supplier);
            }
          });

          console.log('[CSV Import] Found unique suppliers:', Array.from(uniqueSupplierNames));

          // Step 2: Check which suppliers already exist in Firestore
          const supplierMap = new Map<string, string>(); // name -> supplierId
          let suppliersCreated = 0;

          if (uniqueSupplierNames.size > 0) {
            try {
              // Query existing suppliers
              const suppliersSnapshot = await getDocs(
                query(
                  collection(db, 'suppliers'),
                  where('outletId', '==', activeOutletId || 'GLOBAL')
                )
              );

              console.log('[CSV Import] Existing suppliers found:', suppliersSnapshot.size);

              suppliersSnapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (data.name) {
                  supplierMap.set(data.name, doc.id);
                  console.log('[CSV Import] Mapped existing supplier:', data.name, '->', doc.id);
                }
              });

              // Step 3: Create missing suppliers
              const batch = writeBatch(db);
              let batchCount = 0;

              for (const supplierName of uniqueSupplierNames) {
                if (!supplierMap.has(supplierName)) {
                  const supplierRef = doc(collection(db, 'suppliers'));
                  const supplierData = {
                    name: supplierName,
                    organizationId: activeOutletId || 'GLOBAL',
                    outletId: activeOutletId || 'GLOBAL',
                    category: ['FOOD'],
                    paymentTerms: 'NET_30',
                    isActive: true,
                    rating: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };

                  console.log('[CSV Import] Creating supplier:', supplierName, supplierData);

                  batch.set(supplierRef, supplierData);
                  supplierMap.set(supplierName, supplierRef.id);
                  suppliersCreated++;
                  batchCount++;

                  // Commit batch if it reaches 500 operations
                  if (batchCount >= 500) {
                    await batch.commit();
                    console.log('[CSV Import] Committed batch of suppliers');
                    batchCount = 0;
                  }
                } else {
                  console.log('[CSV Import] Supplier already exists:', supplierName);
                }
              }

              // Commit remaining suppliers
              if (batchCount > 0) {
                console.log('[CSV Import] Committing final suppliers batch:', batchCount);
                await batch.commit();
                console.log('[CSV Import] Suppliers created successfully:', suppliersCreated);
              }
            } catch (supplierError: any) {
              console.error('[CSV Import] Error creating suppliers:', supplierError);
              throw new Error('Error creando proveedores: ' + supplierError.message);
            }
          }

          // Step 4: Import ingredients with supplier references
          const batchSize = 500;
          let imported = 0;

          console.log(
            '[CSV Import] Starting ingredient import. Supplier map:',
            Object.fromEntries(supplierMap)
          );

          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = writeBatch(db);
            const chunk = rows.slice(i, i + batchSize);

            chunk.forEach((row) => {
              const normalized = normalizeRow(row);

              if (!normalized) {
                console.warn('[CSV Import] Skipping invalid row:', row);
                return; // Skip invalid rows
              }

              const ingredientData: any = {
                name: normalized.name,
                currentStock: parseFloat(normalized.quantity) || 1,
                unit: normalized.unit,
                category: normalized.category,
                expiryDate: null,
                outletId: activeOutletId || 'GLOBAL',
                userId: currentUser.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              // Add supplier reference if provided
              if (normalized.supplier) {
                const supplierId = supplierMap.get(normalized.supplier);
                if (supplierId) {
                  ingredientData.preferredSupplierId = supplierId;
                  console.log(
                    '[CSV Import] Linked ingredient',
                    normalized.name,
                    'to supplier',
                    normalized.supplier,
                    '(',
                    supplierId,
                    ')'
                  );
                } else {
                  console.warn('[CSV Import] Supplier not found in map:', normalized.supplier);
                }
              }

              const ingredientRef = doc(collection(db, 'ingredients'));
              batch.set(ingredientRef, ingredientData);

              imported++;
            });

            await batch.commit();
            setProgress(imported);
            console.log(
              '[CSV Import] Committed batch of',
              chunk.length,
              'ingredients. Total:',
              imported
            );
          }

          setResult({ imported, suppliersCreated });
          setStep('success');

          const message =
            suppliersCreated > 0
              ? `${imported} ingredientes y ${suppliersCreated} proveedores creados`
              : `${imported} ingredientes importados correctamente`;

          addToast(message, 'success');
        } catch (err: any) {
          console.error('CSV import error:', err);
          setError(err.message || 'Error al procesar el archivo CSV');
          setStep('upload');
        } finally {
          setLoading(false);
          e.target.value = '';
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        setError('Error al leer el archivo CSV: ' + error.message);
        setStep('upload');
        setLoading(false);
        e.target.value = '';
      },
    });
  };

  return (
    <div className={className}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg active:scale-95 text-xs font-bold uppercase tracking-widest"
        title="Importador CSV sin IA - Rápido y eficiente"
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
                    <h2 className="text-xl font-bold text-white">Importador CSV Masivo</h2>
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
                Importa ingredientes desde un archivo CSV. Procesamiento instantáneo en tu navegador
                sin costes de servidor.
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
                    accept=".csv"
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
                        Arrastra tu archivo CSV aquí
                      </p>
                      <p className="text-slate-500 text-xs mt-1">o haz clic para seleccionar</p>
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
