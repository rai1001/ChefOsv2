import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Users, Activity, FileText, MoreVertical, Edit, Copy, Trash2, Download } from 'lucide-react';
import type { FichaTecnica } from '@/types/fichasTecnicas';

interface FichaCardProps {
    ficha: FichaTecnica;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onDownload?: (id: string) => void;
}

export const FichaCard: React.FC<FichaCardProps> = ({ ficha, onDelete, onDuplicate, onDownload }) => {
    const navigate = useNavigate();

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'comida': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'bebida': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'postre': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
            case 'ingrediente-preparado': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'baja': return 'text-emerald-400';
            case 'media': return 'text-amber-400';
            case 'alta': return 'text-rose-400';
            default: return 'text-slate-400';
        }
    };

    const getMarginColor = (margin = 0) => {
        if (margin >= 70) return 'text-emerald-400';
        if (margin >= 50) return 'text-amber-400';
        return 'text-rose-400';
    };

    return (
        <div className="bg-surface rounded-xl shadow-lg border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden group flex flex-col h-full">
            {/* Header Image/Icon */}
            <div className="relative h-44 bg-background flex items-center justify-center overflow-hidden">
                {ficha.foto ? (
                    <img
                        src={ficha.foto}
                        alt={ficha.nombre}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <ChefHat className="w-16 h-16 text-slate-700 transition-colors group-hover:text-primary/50" />
                )}

                {/* Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full shadow-lg border capitalize backdrop-blur-md ${getCategoryColor(ficha.categoria)}`}>
                        {ficha.categoria}
                    </span>
                    {!ficha.activa && (
                        <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-slate-900/80 text-slate-400 border border-white/10 shadow-lg backdrop-blur-md">
                            Inactiva
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                    <h3
                        onClick={() => navigate(`/fichas-tecnicas/${ficha.id}`)}
                        className="text-lg font-bold text-white line-clamp-1 hover:text-primary cursor-pointer transition-colors"
                        title={ficha.nombre}
                    >
                        {ficha.nombre}
                    </h3>
                    <div className="relative group/menu">
                        <button className="p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors">
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {/* Dropdown Menu */}
                        <div className="absolute right-0 top-full mt-2 w-40 bg-surface border border-white/10 rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-hover/menu:pointer-events-auto transition-all z-20 overflow-hidden">
                            <button onClick={() => navigate(`/fichas-tecnicas/${ficha.id}/editar`)} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2 transition-colors">
                                <Edit className="w-4 h-4" /> Editar
                            </button>
                            <button onClick={() => onDuplicate?.(ficha.id)} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2 transition-colors">
                                <Copy className="w-4 h-4" /> Duplicar
                            </button>
                            <div className="h-px bg-white/5 mx-2" />
                            <button onClick={() => onDelete?.(ficha.id)} className="w-full text-left px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors">
                                <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 text-xs text-slate-400 mb-4 bg-white/5 p-2 rounded-lg">
                    <span className="flex items-center gap-1.5" title="Porciones">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {ficha.porciones} pax
                    </span>
                    <span className={`flex items-center gap-1.5 capitalize font-medium ${getDifficultyColor(ficha.dificultad)}`} title="Dificultad">
                        <Activity className="w-3.5 h-3.5" />
                        {ficha.dificultad}
                    </span>
                    <span className="flex items-center gap-1.5 ml-auto" title="Versión">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        v{ficha.version}
                    </span>
                </div>

                {/* Financials */}
                <div className="space-y-2.5 pt-4 border-t border-white/5 mt-auto">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Costo / Porción</span>
                        <span className="font-semibold text-slate-200">
                            €{ficha.costos.porPorcion?.toFixed(2) ?? '0.00'}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">PVP Sugerido</span>
                        <span className="font-semibold text-slate-200">
                            €{ficha.pricing.precioVentaSugerido?.toFixed(2) ?? '0.00'}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-1">
                        <span className="text-slate-400 font-medium">Margen Bruto</span>
                        <span className={`text-base font-bold ${getMarginColor(ficha.pricing.margenBruto)}`}>
                            {ficha.pricing.margenBruto?.toFixed(0) ?? 0}%
                        </span>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="mt-5 flex gap-2">
                    <button
                        onClick={() => navigate(`/fichas-tecnicas/${ficha.id}`)}
                        className="flex-1 py-2 bg-primary/10 text-primary text-sm font-semibold rounded-lg hover:bg-primary/20 transition-all active:scale-[0.98]"
                    >
                        Ver Ficha
                    </button>
                    <button
                        onClick={() => onDownload?.(ficha.id)}
                        className="px-3 py-2 bg-surface border border-white/10 text-slate-400 rounded-lg hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
                        title="Descargar PDF"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </div>
    );
};
