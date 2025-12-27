import React, { useState, useEffect } from 'react';
import { firestoreService } from '@/services/firestoreService';
import { collections } from '@/config/collections';
import { importarRecetasMasivo, type ImportResult } from '@/services/recetaToFichaService';
import type { Recipe } from '@/types';
import { Check, AlertCircle, X, Loader2, ArrowRight } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';

interface ImportadorRecetasProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const ImportadorRecetas: React.FC<ImportadorRecetasProps> = ({ onClose, onSuccess }) => {
    const { currentUser, activeOutletId } = useStore();
    const [recetas, setRecetas] = useState<Recipe[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<ImportResult | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await firestoreService.getAll<Recipe>(collections.recipes as any);
                setRecetas(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const toggleSelect = (id: string) => {
        if (selected.includes(id)) setSelected(prev => prev.filter(i => i !== id));
        else setSelected(prev => [...prev, id]);
    };

    const handleImport = async () => {
        if (!currentUser || !activeOutletId) return;
        setImporting(true);
        setProgress(0);

        try {
            const res = await importarRecetasMasivo(selected, currentUser.id, activeOutletId, (curr, total) => {
                setProgress((curr / total) * 100);
            });
            setResult(res);
        } catch (e) {
            console.error(e);
        } finally {
            setImporting(false);
        }
    };

    if (result) {
        return (
            <div className="bg-white p-6 rounded-xl max-w-lg w-full mx-auto">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">Resultados de Importación</h3>

                <div className="space-y-4 mb-6">
                    {result.exitosas.length > 0 && (
                        <div className="p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-3">
                            <Check className="w-5 h-5" />
                            <span>{result.exitosas.length} recetas importadas correctamente</span>
                        </div>
                    )}
                    {result.duplicadas.length > 0 && (
                        <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg flex items-center gap-3">
                            <AlertCircle className="w-5 h-5" />
                            <span>{result.duplicadas.length} duplicados omitidos</span>
                        </div>
                    )}
                    {result.fallidas.length > 0 && (
                        <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
                            <X className="w-5 h-5" />
                            <span>{result.fallidas.length} fallos</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <button onClick={onSuccess} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Finalizar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 flex flex-col h-[600px] w-full max-w-4xl mx-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Importar desde Recetario</h2>
                    <p className="text-sm text-gray-500">Convierte tus recetas existentes en fichas técnicas con costos calculados.</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recetas.map(receta => (
                            <div
                                key={receta.id}
                                onClick={() => toggleSelect(receta.id)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${selected.includes(receta.id)
                                    ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                                    : 'bg-white border-gray-200 hover:border-blue-300'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-gray-800 line-clamp-1">{receta.name}</h4>
                                    {selected.includes(receta.id) && <Check className="w-4 h-4 text-blue-600" />}
                                </div>
                                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{receta.description}</p>
                                <div className="flex gap-2 text-xs text-gray-400">
                                    <span>{receta.yieldPax} pax</span>
                                    <span>•</span>
                                    <span>{receta.ingredients?.length || 0} ingr.</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-xl">
                <div className="text-sm font-medium text-gray-600">
                    {selected.length} recetas seleccionadas
                </div>

                {importing ? (
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-blue-600 font-medium">{progress.toFixed(0)}%</div>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancelar</button>
                        <button
                            onClick={handleImport}
                            disabled={selected.length === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                        >
                            Importar Seleccionadas <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
