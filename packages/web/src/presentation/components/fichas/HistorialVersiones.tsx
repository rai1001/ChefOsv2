/**
 * @file src/components/fichas/HistorialVersiones.tsx
 * @description Component to display and manage the version history of a Ficha Técnica.
 */

import React, { useState, useEffect } from 'react';
import { History, User, Clock, Eye } from 'lucide-react';
import { listarVersionesFicha } from '@/services/fichasTecnicasService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { VersionFicha, FichaTecnica } from '@/types';

interface Props {
    fichaId: string;
    currentFicha: FichaTecnica;
    onSelectVersion: (version: VersionFicha) => void;
}

export const HistorialVersiones: React.FC<Props> = ({
    fichaId,
    currentFicha,
    onSelectVersion
}) => {
    const [versiones, setVersiones] = useState<VersionFicha[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadVersiones = async () => {
            try {
                const data = await listarVersionesFicha(fichaId);
                setVersiones(data);
            } catch (error) {
                console.error('Error loading versions:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadVersiones();
    }, [fichaId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-white">Historial de Versiones</h3>
            </div>

            <div className="space-y-3">
                {/* Versión Actual */}
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {currentFicha.version}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Versión Actual (v{currentFicha.version})</p>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(currentFicha.ultimaModificacion!), 'PPp', { locale: es })}</span>
                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {currentFicha.modificadoPor || currentFicha.creadoPor}</span>
                            </div>
                        </div>
                    </div>
                    <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">Activa</span>
                </div>

                {/* Lista de Snapshots */}
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                ) : versiones.length > 0 ? (
                    versiones.map((v) => (
                        <div
                            key={v.id}
                            className="bg-surface border border-white/5 rounded-xl p-4 flex justify-between items-center hover:border-white/20 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 font-bold group-hover:text-white transition-colors">
                                    {v.version}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-200">v{v.version}</p>
                                    <p className="text-xs text-slate-500 italic mt-0.5">{v.cambiosRealizados}</p>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-2">
                                        <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {format(new Date(v.fechaVersion), 'PPp', { locale: es })}</span>
                                        <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" /> {v.versionadaPor}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => onSelectVersion(v)}
                                className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 text-xs"
                            >
                                <Eye className="w-4 h-4" /> Ver Snapshot
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-slate-500 text-sm border-2 border-dashed border-white/5 rounded-xl">
                        No hay versiones anteriores guardadas.
                    </div>
                )}
            </div>
        </div>
    );
};
