import React from 'react';
import { Search } from 'lucide-react';
import { FichaCard } from './FichaCard';
import type { FichaTecnica } from '@/types/fichasTecnicas';

interface FichasGridProps {
    fichas: FichaTecnica[];
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onDownload?: (id: string) => void;
}

export const FichasGrid: React.FC<FichasGridProps> = ({ fichas, onDelete, onDuplicate, onDownload }) => {
    if (fichas.length === 0) {
        return (
            <div className="text-center py-16 bg-surface rounded-3xl border-2 border-dashed border-white/5 shadow-inner">
                <div className="bg-white/5 p-4 rounded-full inline-block mb-4">
                    <Search className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-white">No se encontraron fichas</h3>
                <p className="text-slate-500 mt-2">Prueba ajustando los filtros o crea una nueva.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lx:grid-cols-4 gap-6">
            {fichas.map(ficha => (
                <FichaCard
                    key={ficha.id}
                    ficha={ficha}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onDownload={onDownload}
                />
            ))}
        </div>
    );
};
