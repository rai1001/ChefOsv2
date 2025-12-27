import React from 'react';
import type { FichaTecnica } from '@/types/fichasTecnicas';


interface ComparadorPlatosProps {
    fichas: FichaTecnica[];
    seleccionadas: string[];
    onSelect: (id: string) => void;
}

export const ComparadorPlatos: React.FC<ComparadorPlatosProps> = ({ fichas, seleccionadas, onSelect }) => {
    const fichasComparadas = fichas.filter(f => seleccionadas.includes(f.id));

    return (
        <div className="space-y-6">
            {/* Selector */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Selecciona platos para comparar (máx 3)</h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {fichas.map(f => (
                        <button
                            key={f.id}
                            onClick={() => onSelect(f.id)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${seleccionadas.includes(f.id)
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                }`}
                        >
                            {f.nombre}
                        </button>
                    ))}
                </div>
            </div>

            {/* Comparison Table */}
            {fichasComparadas.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-4 divide-x divide-gray-100 min-w-[600px]">
                        {/* Headers (Row Labels) */}
                        <div className="bg-gray-50 flex flex-col">
                            <div className="h-32 p-4 flex items-end font-bold text-gray-400 text-sm">Plato</div>
                            <div className="p-4 border-t border-gray-100 text-sm font-medium text-gray-600 h-14 flex items-center">Costo Unitario</div>
                            <div className="p-4 border-t border-gray-100 text-sm font-medium text-gray-600 h-14 flex items-center">Precio Venta</div>
                            <div className="p-4 border-t border-gray-100 text-sm font-medium text-gray-600 h-14 flex items-center">Margen</div>
                            <div className="p-4 border-t border-gray-100 text-sm font-medium text-gray-600 h-14 flex items-center">Porciones</div>
                        </div>

                        {/* Columns */}
                        {fichasComparadas.map(f => (
                            <div key={f.id} className="flex flex-col">
                                <div className="h-32 p-4 flex flex-col justify-end">
                                    <div className="font-bold text-gray-800 mb-1">{f.nombre}</div>
                                    <span className="text-xs text-gray-500 capitalize">{f.categoria}</span>
                                </div>
                                <div className="p-4 border-t border-gray-100 h-14 flex items-center font-semibold text-gray-700">
                                    €{f.costos.porPorcion.toFixed(2)}
                                </div>
                                <div className="p-4 border-t border-gray-100 h-14 flex items-center font-medium text-gray-600">
                                    €{f.pricing.precioVentaSugerido?.toFixed(2)}
                                </div>
                                <div className={`p-4 border-t border-gray-100 h-14 flex items-center font-bold ${(f.pricing.margenBruto || 0) > 50 ? 'text-green-600' : 'text-yellow-600'
                                    }`}>
                                    {f.pricing.margenBruto?.toFixed(0)}%
                                </div>
                                <div className="p-4 border-t border-gray-100 h-14 flex items-center text-gray-600">
                                    {f.porciones}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
