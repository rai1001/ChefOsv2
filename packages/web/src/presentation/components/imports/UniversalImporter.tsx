import React, { useState, useRef } from 'react';
import { Upload, Check, Loader2, Sparkles } from 'lucide-react';
import { container } from '@/application/di/Container';
import { TYPES } from '@/application/di/types';
import { ScanDocumentUseCase } from '@/application/use-cases/ingredients/ScanDocumentUseCase';
import { ImportIngredientsUseCase } from '@/application/use-cases/ingredients/ImportIngredientsUseCase';

interface UniversalImporterProps {
    buttonLabel?: string;
    defaultType?: 'ingredient' | 'invoice' | 'menu';
    onCompleted?: () => void;
}

export const UniversalImporter: React.FC<UniversalImporterProps> = ({
    buttonLabel = 'Importar',
    defaultType = 'ingredient',
    onCompleted
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null); // To store preview items
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setLoading(true);
        try {
            const scanUseCase = container.get<ScanDocumentUseCase>(TYPES.ScanDocumentUseCase);
            const res = await scanUseCase.execute(file, defaultType);
            setResult(res);
        } catch (error) {
            console.error("Scan failed", error);
            alert("Error al escanear archivo");
        } finally {
            setLoading(false);
        }
    };

    const handleCommit = async () => {
        if (!result) return;
        setLoading(true);
        try {
            const importUseCase = container.get<ImportIngredientsUseCase>(TYPES.ImportIngredientsUseCase);
            await importUseCase.execute(result.items.map((i: any) => i.data));

            setIsOpen(false);
            setResult(null);
            if (onCompleted) onCompleted();
        } catch (error) {
            console.error("Import failed", error);
            alert("Error al guardar datos");
        } finally {
            setLoading(false);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase hover:bg-white/10 transition-colors"
            >
                {buttonLabel}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="w-full max-w-2xl bg-surface border border-white/10 rounded-2xl p-8 shadow-2xl relative">
                        <button
                            onClick={() => { setIsOpen(false); setResult(null); }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <XComp />
                        </button>

                        <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
                            <Sparkles className="text-primary" /> Importador Universal
                        </h2>
                        <p className="text-slate-400 text-sm mb-6">Arrastra Excel, CSV, o Imágenes (IA Scan)</p>

                        {!result ? (
                            <div
                                className={`
                                    border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
                                    ${dragging ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/50 hover:bg-white/5'}
                                `}
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={onDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {loading ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 className="animate-spin text-primary w-10 h-10" />
                                        <p className="text-sm font-bold animate-pulse">Analizando documento con IA...</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                                        <p className="font-bold text-white">Click o Arrastra un archivo aquí</p>
                                        <p className="text-xs text-slate-500 mt-2">Soporta .xlsx, .csv, .pdf, .jpg, .png</p>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
                                    <div className="bg-emerald-500 text-black rounded-full p-2"><Check size={20} /></div>
                                    <div>
                                        <p className="font-bold text-white">Análisis Completado</p>
                                        <p className="text-xs text-emerald-400">Se han detectado {result.summary.total} elementos válidos.</p>
                                    </div>
                                </div>

                                <div className="max-h-[300px] overflow-y-auto premium-glass rounded-xl p-2">
                                    {result.items.slice(0, 10).map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between p-2 border-b border-white/5 last:border-0 text-sm">
                                            <span>{item.data.name}</span>
                                            <span className="text-slate-400">{item.data.costPerUnit}€</span>
                                        </div>
                                    ))}
                                    {result.items.length > 10 && <p className="text-center text-xs text-slate-500 p-2">...y {result.items.length - 10} más</p>}
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setResult(null)}
                                        className="px-4 py-2 text-slate-400 hover:text-white"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCommit}
                                        disabled={loading}
                                        className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <SaveIcon />}
                                        Guardar en Inventario
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

// Icons (Inline for simplicity or import)
const XComp = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>;
