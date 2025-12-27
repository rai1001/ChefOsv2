import React, { useState, useRef } from 'react';
import { Upload, Camera, X, FileSpreadsheet, Image as ImageIcon, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/presentation/components/atoms/Button';
import * as geminiService from '@/services/geminiService';
import { parseWorkbook } from '@/utils/excelImport';
import type { AIAnalysisResult } from '@/services/geminiService';

export type ImportType = 'recipe' | 'menu' | 'ingredient' | 'event' | 'inventory' | 'invoice' | 'haccp';

interface DataImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: ImportType;
    onImportComplete: (data: any) => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({ isOpen, onClose, type, onImportComplete }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const getTitle = () => {
        switch (type) {
            case 'recipe': return 'Importar Receta';
            case 'menu': return 'Importar Menú';
            case 'ingredient': return 'Importar Ingrediente';
            case 'event': return 'Importar Evento';
            case 'inventory': return 'Importar Inventario';
            case 'invoice': return 'Escanear Factura';
            case 'haccp': return 'Importar HACCP';
            default: return 'Importar Datos';
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);

        try {
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.xlsm')) {
                // Excel Import
                const parseResult = await parseWorkbook(file);
                // Filter result based on type if needed, or just return everything
                setResult(parseResult);
            } else {
                // Image/Screen Import
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    // Strip prefix for Gemini SDK if present (though SDK usually handles clean base64, better safe)
                    const base64Clean = base64.split(',')[1];
                    if (!base64Clean) {
                        setError('No se pudo procesar la imagen (base64 inválido)');
                        setLoading(false);
                        return;
                    }

                    let aiResult: AIAnalysisResult = { success: false, error: 'Tipo no soportado' };

                    switch (type) {
                        case 'recipe':
                            aiResult = await geminiService.scanRecipeFromImage(base64Clean);
                            break;
                        case 'menu':
                            aiResult = await geminiService.scanMenuImage(base64Clean);
                            break;
                        case 'ingredient':
                            aiResult = await geminiService.scanIngredientLabel(base64Clean);
                            break;
                        case 'event':
                            aiResult = await geminiService.scanEventOrder(base64Clean);
                            break;
                        case 'inventory':
                            aiResult = await geminiService.scanInventorySheet(base64Clean);
                            break;
                        case 'invoice':
                            aiResult = await geminiService.scanInvoiceImage(base64Clean);
                            break;
                        case 'haccp':
                            aiResult = await geminiService.scanHACCPLog(base64Clean);
                            break;
                    }

                    if (aiResult.success) {
                        setResult(aiResult.data);
                    } else {
                        setError(aiResult.error || 'Error desconocido al analizar la imagen.');
                    }
                    setLoading(false);
                };
                reader.readAsDataURL(file);
                return; // processing continues in onloadend
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al procesar el archivo');
        } finally {
            if (!file.type.startsWith('image/')) setLoading(false); // Excel finishes here
        }
    };

    const confirmImport = () => {
        // Here we would dispatch to store or pass back to parent
        // For Phase 1 we return data to parent
        onImportComplete(result);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {type === 'invoice' ? <Camera className="text-purple-400" /> : <Upload className="text-blue-400" />}
                        {getTitle()}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                            <p className="text-lg font-medium text-white">Analizando...</p>
                            <p className="text-sm text-slate-400">Gemini 2.0 está procesando el documento</p>
                        </div>
                    ) : result ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                <span>Datos extraídos con éxito. Revisa antes de importar.</span>
                            </div>

                            <div className="bg-black/30 p-4 rounded-lg border border-white/10 font-mono text-xs text-slate-300 overflow-auto max-h-60">
                                <pre>{JSON.stringify(result, null, 2)}</pre>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    onClick={() => { setResult(null); setError(null); }}
                                    variant="ghost"
                                    className="text-slate-300"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={confirmImport}
                                    variant="primary"
                                    className="shadow-lg shadow-primary/25"
                                >
                                    Confirmar Importación
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Excel Option */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-white/5 hover:border-green-500/50 transition-all group"
                                >
                                    <FileSpreadsheet className="w-10 h-10 text-slate-400 group-hover:text-green-400 mb-3" />
                                    <span className="font-medium text-white">Subir Excel</span>
                                    <span className="text-xs text-slate-400 mt-1">.xlsx, .xls, .xlsm</span>
                                </button>

                                {/* Camera/Image Option */}
                                <button
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-white/5 hover:border-purple-500/50 transition-all group"
                                >
                                    <div className="relative">
                                        <ImageIcon className="w-10 h-10 text-slate-400 group-hover:text-purple-400 mb-3" />
                                        <Camera className="w-4 h-4 text-white absolute -bottom-[-2px] -right-[-2px] bg-black rounded-full p-0.5" />
                                    </div>
                                    <span className="font-medium text-white">Foto / PDF / Imagen</span>
                                    <span className="text-xs text-slate-400 mt-1">PDF, JPG, PNG</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Hidden Inputs */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx, .xls, .xlsm"
                        onChange={handleFileChange}
                    />
                    <input
                        type="file"
                        ref={cameraInputRef}
                        className="hidden"
                        accept="image/*,application/pdf"
                        capture="environment"
                        onChange={handleFileChange}
                    />
                </div>
            </div>
        </div >
    );
};

