import React from 'react';
import { Truck } from 'lucide-react';

export const SupplierView: React.FC = () => {
    // Basic placeholder implementation
    return (
        <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Truck className="text-primary" />
                    Directorio de Proveedores
                </h2>
                <button className="bg-primary hover:bg-blue-600 px-4 py-2 rounded-lg text-white font-medium transition-colors">
                    Nuevo Proveedor
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-6 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center text-center">
                    <p className="text-slate-400">Vista de proveedores en construcción</p>
                </div>
            </div>
        </div>
    );
};
