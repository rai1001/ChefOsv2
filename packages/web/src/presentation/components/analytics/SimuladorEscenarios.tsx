import React, { useState, useEffect } from 'react';
import type { FichaTecnica } from '@/types/fichasTecnicas';
import { simularEscenario, type ResultadoSimulacion } from '@/services/analyticsService';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface SimuladorProps {
    ficha: FichaTecnica;
}

export const SimuladorEscenarios: React.FC<SimuladorProps> = ({ ficha }) => {
    const [margenDeseado, setMargenDeseado] = useState<number>(ficha.pricing.margenBruto || 0);
    const [porciones, setPorciones] = useState<number>(ficha.porciones);
    const [resultado, setResultado] = useState<ResultadoSimulacion | null>(null);

    useEffect(() => {
        // Initial simulation
        handleSimulate();
    }, [ficha]);

    const handleSimulate = () => {
        const res = simularEscenario(ficha, {
            margenDeseado,
            porciones
        });
        setResultado(res);
    };

    if (!resultado) return <div>Cargando simulador...</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                Simulador de Escenarios
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Desear Margen %</label>
                        <input
                            type="range"
                            min="0"
                            max="90"
                            value={margenDeseado}
                            onChange={(e) => { setMargenDeseado(Number(e.target.value)); handleSimulate(); }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0%</span>
                            <span className="font-bold text-blue-600 text-lg">{margenDeseado}%</span>
                            <span>90%</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Porciones / Rendimiento</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                value={porciones}
                                onChange={(e) => { setPorciones(Number(e.target.value)); handleSimulate(); }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-sm text-gray-500">unids.</span>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                        <span className="text-sm text-gray-600">Nuevo Precio Sugerido</span>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">€{resultado.precioNuevo.toFixed(2)}</div>
                            <div className={`text-xs font-medium flex items-center justify-end gap-1 ${resultado.diferenciaPrecio > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {resultado.diferenciaPrecio > 0 ? '+' : ''}{resultado.diferenciaPrecio.toFixed(2)} €
                                {resultado.diferenciaPrecio > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Nuevo Costo Unitario</span>
                        <div className="text-right">
                            <div className="text-lg font-semibold text-gray-800">€{resultado.costoNuevo.toFixed(2)}</div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 italic">
                            * Este simulador no modifica la ficha real hasta que apliques los cambios manualmente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
