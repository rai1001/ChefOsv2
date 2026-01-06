import React, { useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { processStructuredFile, confirmAndCommit } from '@/utils/excelImport';
import type { IngestionItem } from '@/utils/excelImport';
import {
  Upload,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  ImageIcon,
} from 'lucide-react';
import { LoggingService } from '@/infrastructure/services/LoggingService';
import { useToast } from '@/presentation/components/ui';
import { ImportPreviewGrid } from './ImportPreviewGrid';
import { useInjection } from '@/hooks/useInjection';
import { TYPES } from '@/application/di/types';
import { ImportIngredientsUseCase } from '@/application/use-cases/ingredients/ImportIngredientsUseCase';
import { ImportEventsUseCase } from '@/application/use-cases/schedule/ImportEventsUseCase';

import { ImportType, ImportMode } from '@/types/import';
import { parseICS } from '@/utils/icsParser';

const IS_AI_CONFIGURED = true; // Using Supabase Edge Functions for AI

interface UniversalImporterProps {
  buttonLabel?: string;
  className?: string;
  template?: Record<string, string>;
  onCompleted?: (data: any) => void;
  defaultType?: ImportType;
  mode?: ImportMode;
}

export const UniversalImporter: React.FC<UniversalImporterProps> = ({
  buttonLabel = 'Universal Importer',
  className = '',
  template,
  onCompleted,
  defaultType,
}) => {
  const { currentUser, activeOutletId } = useStore();
  const { addToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'processing' | 'preview' | 'success'>('upload');
  const [loading, setLoading] = useState(false);
  const [extractedItems, setExtractedItems] = useState<IngestionItem[]>([]);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSmartMode, setIsSmartMode] = useState(false);

  // Dependency Injection
  const importIngredientsUseCase = useInjection<ImportIngredientsUseCase>(
    TYPES.ImportIngredientsUseCase
  );
  const importEventsUseCase = useInjection<ImportEventsUseCase>(TYPES.ImportEventsUseCase);
  // Add AI Service
  const iaService = useInjection<any>(TYPES.AIService); // Use 'any' or explicit interface if exported

  const resetState = () => {
    setStep('upload');
    setExtractedItems([]);
    setImportResult(null);
    setStatus(null);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    resetState();
    setLoading(true);
    setStep('processing');

    try {
      let items: IngestionItem[] = [];
      if (file.name.toLowerCase().endsWith('.ics')) {
        const text = await file.text();
        const events = parseICS(text);
        items = events.map((e) => ({
          type: 'event' as ImportType,
          data: { ...e, status: 'confirmed' },
          confidence: 100,
        }));
      } else if (isSmartMode) {
        try {
          // Note: API Key is handled server-side in Supabase Edge Functions
          // No need to configure it from the client

          const result = await iaService.scanDocument(file, 'invoice');
          // Map AI result items to IngestionItems
          items = result.items.map((i: any) => ({
            type: 'ingredient' as ImportType, // Default assumption or infer from i.category
            data: i,
            confidence: 85,
          }));
        } catch (aiError: any) {
          console.error('Smart AI Error:', aiError);
          throw new Error('El análisis de IA falló: ' + aiError.message);
        }
      } else {
        // Use processStructuredFile which now has internal fallback to local parseWorkbook
        items = await processStructuredFile(file, defaultType);
      }

      if (items.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo.');
      }

      // Client-side fix: if we have a defaultType, ensure generic results respect it
      if (defaultType) {
        items = items.map((item) => ({
          ...item,
          type: item.type === 'unknown' || item.type === 'recipe' ? defaultType : item.type,
        }));
      }

      setExtractedItems(items);
      setStep('preview');
    } catch (err: any) {
      console.error('Import error:', err);
      setStatus({ type: 'error', message: err.message || 'Error al procesar archivo' });
      setStep('upload');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = async (finalItems: IngestionItem[], selectedSupplier?: string) => {
    setLoading(true);
    setStep('processing');
    try {
      const type = defaultType || (finalItems.length > 0 ? finalItems[0]?.type : 'unknown');

      LoggingService.info('Confirming import', {
        itemsCount: finalItems.length,
        outletId: activeOutletId || 'GLOBAL',
        supplierId: selectedSupplier,
        type,
      });

      let count = 0;

      if (type === 'ingredient') {
        // Use UseCase for ingredients (Supabase migration)
        const data = finalItems.map((i) => i.data);
        await importIngredientsUseCase.execute(data, activeOutletId || 'GLOBAL');
        count = finalItems.length;
      } else if (type === 'event') {
        // Sanitize and de-duplicate events (avoid multi-room duplicates)
        const seen = new Map<string, any>();
        finalItems.forEach((i) => {
          const name = String(i.data.name || '').trim();
          const date = i.data.date ? String(i.data.date).slice(0, 10) : '';
          if (!name || !date) return;

          const key = `${name.toLowerCase()}|${date}`;
          if (seen.has(key)) {
            // Merge optional fields if missing
            const existing = seen.get(key);
            if (!existing.room && i.data.room) existing.room = i.data.room;
            if (!existing.menuId && i.data.menuId) existing.menuId = i.data.menuId;
            if (!existing.notes && i.data.notes) existing.notes = i.data.notes;
            return;
          }

          const paxVal = Number(i.data.pax || i.data.quantity || 0) || 0;
          seen.set(key, {
            id: i.data.id || crypto.randomUUID(),
            name,
            date,
            pax: paxVal,
            type: (i.data.type as any) || 'Otros',
            room: i.data.room || i.data.location || i.data.hall || null,
            notes: i.data.notes || i.data.observations || null,
            status: (i.data.status as any) || 'confirmed',
            menuId: i.data.menuId || null,
            outletId: activeOutletId || 'GLOBAL',
          });
        });

        const data = Array.from(seen.values());
        await importEventsUseCase.execute(data);
        count = data.length;
      } else {
        // Legacy fallback for other types
        const result = await confirmAndCommit(
          finalItems,
          activeOutletId || 'GLOBAL',
          defaultType,
          selectedSupplier
        );
        count = result.count;
      }

      LoggingService.info('Import confirmed', { count });
      setImportResult({ count });
      setStep('success');
      if (onCompleted) onCompleted({ count });
      addToast('Importación completada con éxito', 'success');
    } catch (error: any) {
      LoggingService.error('Commit error:', error);
      setStatus({ type: 'error', message: error.message || 'Error al guardar los datos' });
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-lg active:scale-95 text-xs font-bold uppercase tracking-widest"
        title={
          template
            ? `Columnas esperadas: ${Object.values(template).join(', ')}`
            : 'Importar datos (Excel, CSV, JSON, PDF, Imagen)'
        }
      >
        <Upload className="w-4 h-4" />
        <span>{buttonLabel}</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg">
            {/* Close Button Trigger Area (clicking backdrop) */}
            <div
              className="absolute inset-0 -z-10"
              onClick={() => !loading && step !== 'processing' && (resetState(), setIsOpen(false))}
            />

            <div className="p-6 glass-card w-full overflow-hidden relative group border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${isSmartMode ? 'bg-primary/20 text-primary' : 'bg-emerald-500/20 text-emerald-400'}`}
                  >
                    {isSmartMode ? (
                      <Sparkles className="w-6 h-6" />
                    ) : (
                      <FileSpreadsheet className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Universal Importer</h2>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                      Misión 5: AI-Driven
                    </span>
                  </div>
                </div>

                {/* Smart Mode Toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">
                    Smart AI
                  </span>
                  <button
                    onClick={() => IS_AI_CONFIGURED && setIsSmartMode(!isSmartMode)}
                    disabled={!IS_AI_CONFIGURED}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 outline-none ${isSmartMode ? 'bg-primary' : 'bg-slate-700'} ${!IS_AI_CONFIGURED ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={
                      !IS_AI_CONFIGURED ? 'IA requiere configuración de Supabase' : 'Activar IA'
                    }
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${isSmartMode ? 'translate-x-5' : ''}`}
                    />
                  </button>
                  <button
                    onClick={() => {
                      resetState();
                      setIsOpen(false);
                    }}
                    className="ml-4 p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                    <AlertCircle className="w-5 h-5 rotate-45" />
                  </button>
                </div>
              </div>

              <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                {isSmartMode
                  ? 'Sube PDF, fotos de facturas o listas escritas a mano. Nuestra IA extraerá ingredientes, recetas y más automáticamente.'
                  : 'Sube archivos Excel (.xlsx, .xlsm), CSV, JSON o ICS (.ics). Procesamiento optimizado por lotes en la nube.'}
              </p>

              {step === 'upload' && (
                <div
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 bg-surface/30 hover:bg-surface/50 ${isSmartMode ? 'border-primary/40 hover:border-primary' : 'border-slate-600 hover:border-emerald-500/50'}`}
                >
                  <input
                    type="file"
                    accept={isSmartMode ? '.pdf,image/*' : '.xlsx,.xls,.xlsm,.csv,.json,.ics'}
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={loading}
                  />
                  <div className="flex flex-col items-center gap-4 pointer-events-none">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${isSmartMode ? 'bg-primary/10 text-primary' : 'bg-slate-800 text-slate-400'}`}
                    >
                      {isSmartMode ? (
                        <ImageIcon className="w-6 h-6" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-slate-200 font-bold text-sm">
                        {loading
                          ? 'Subiendo...'
                          : isSmartMode
                            ? 'Soltar PDF o Imagen'
                            : 'Soltar Excel, CSV, JSON o ICS'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 'processing' && (
                <div className="py-10 flex flex-col items-center gap-6 text-center animate-pulse">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 animate-bounce" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-white font-black uppercase tracking-[0.2em] text-[10px]">
                      IA Analizando Datos
                    </p>
                  </div>
                </div>
              )}

              {step === 'preview' && (
                <ImportPreviewGrid
                  items={extractedItems}
                  onConfirm={handleConfirmImport}
                  onCancel={() => setStep('upload')}
                />
              )}

              {step === 'success' && importResult && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="premium-glass p-4 rounded-2xl border-emerald-500/20 bg-emerald-500/5 space-y-3">
                    <div className="flex items-center gap-3 text-emerald-400">
                      <CheckCircle className="w-5 h-5" />
                      <h3 className="font-bold text-sm">¡Éxito!</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Items Guardados
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white">
                            {importResult.count}
                          </span>
                        </div>
                      </div>
                      <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Estado
                        </span>
                        <div className="text-[10px] text-primary font-bold">COMPLETADO</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      resetState();
                      setIsOpen(false);
                    }}
                    className="w-full bg-primary text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
                  >
                    Cerrar
                  </button>
                </div>
              )}

              {status && (
                <div
                  className={`mt-4 p-3 rounded-xl flex items-start gap-3 bg-red-400/10 border border-red-500/20 text-red-200`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <p className="text-xs font-bold opacity-80">{status.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
