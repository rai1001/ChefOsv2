import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Edit, Copy, Trash2, Download, ChefHat } from 'lucide-react';
import type { FichaTecnica } from '@/types/fichasTecnicas';

interface FichasListProps {
    fichas: FichaTecnica[];
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onDownload?: (id: string) => void;
}

export const FichasList: React.FC<FichasListProps> = ({ fichas, onDelete, onDuplicate, onDownload }) => {
    const navigate = useNavigate();

    const getMarginColor = (margin = 0) => {
        if (margin >= 70) return 'text-emerald-400 font-medium';
        if (margin >= 50) return 'text-amber-400 font-medium';
        return 'text-rose-400 font-medium';
    };

    if (fichas.length === 0) {
        return (
            <div className="text-center py-16 bg-surface rounded-xl border-2 border-dashed border-white/5">
                <p className="text-slate-400 text-lg">No se encontraron fichas técnicas.</p>
                <p className="text-slate-500 text-sm mt-1">Intenta ajustar los filtros o crea una nueva.</p>
            </div>
        );
    }

    return (
        <div className="bg-surface rounded-xl shadow-lg border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 border-b border-white/5 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                        <tr>
                            <th className="px-6 py-4 w-16 text-center">Foto</th>
                            <th className="px-6 py-4">Nombre</th>
                            <th className="px-6 py-4">Categoría</th>
                            <th className="px-6 py-4 text-center">Porciones</th>
                            <th className="px-6 py-4 text-right">Costo / U</th>
                            <th className="px-6 py-4 text-right">PVP</th>
                            <th className="px-6 py-4 text-right">Margen</th>
                            <th className="px-6 py-4 text-right w-24">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {fichas.map((ficha) => (
                            <tr key={ficha.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-3">
                                    <div className="w-10 h-10 rounded-lg bg-background border border-white/5 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110">
                                        {ficha.foto ? (
                                            <img src={ficha.foto} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <ChefHat className="w-5 h-5 text-slate-700" />
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-3 font-semibold text-slate-200 cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/fichas-tecnicas/${ficha.id}`)}>
                                    {ficha.nombre}
                                </td>
                                <td className="px-6 py-3">
                                    <span className="capitalize px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[10px] font-bold text-slate-400">
                                        {ficha.categoria}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-center text-slate-400">
                                    {ficha.porciones} pax
                                </td>
                                <td className="px-6 py-3 text-right text-slate-300 font-mono">
                                    €{ficha.costos.porPorcion?.toFixed(2) ?? '0.00'}
                                </td>
                                <td className="px-6 py-3 text-right text-slate-300 font-mono">
                                    €{ficha.pricing.precioVentaSugerido?.toFixed(2) ?? '0.00'}
                                </td>
                                <td className={`px-6 py-3 text-right ${getMarginColor(ficha.pricing.margenBruto)}`}>
                                    {ficha.pricing.margenBruto?.toFixed(0) ?? 0}%
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => navigate(`/fichas-tecnicas/${ficha.id}/editar`)}
                                            className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                            title="Editar"
                                            aria-label="Editar ficha"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>

                                        <div className="relative group/menu_list">
                                            <button
                                                className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                aria-label="Más opciones"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            <div className="absolute right-0 top-full mt-2 w-36 bg-surface border border-white/10 rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover/menu_list:opacity-100 group-hover/menu_list:translate-y-0 group-hover/menu_list:pointer-events-auto transition-all z-20 overflow-hidden text-left">
                                                <button onClick={() => onDuplicate?.(ficha.id)} className="w-full px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 flex items-center gap-2">
                                                    <Copy className="w-3.5 h-3.5" /> Duplicar
                                                </button>
                                                <button onClick={() => onDownload?.(ficha.id)} className="w-full px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 flex items-center gap-2">
                                                    <Download className="w-3.5 h-3.5" /> Descargar PDF
                                                </button>
                                                <div className="border-t border-white/5 mx-2 my-1"></div>
                                                <button onClick={() => onDelete?.(ficha.id)} className="w-full px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2">
                                                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
