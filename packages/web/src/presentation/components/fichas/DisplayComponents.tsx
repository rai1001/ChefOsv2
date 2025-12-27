/**
 * @file src/components/fichas/FichaCard.tsx
 */
import React, { useState } from 'react';
import { ChefHat, Users, Edit3, Copy, Trash2, MoreVertical, History, Download, TrendingUp } from 'lucide-react';
import type { FichaTecnica } from '@/types';
import { generarPDFFicha } from '@/services/pdfService';

interface CardProps {
    ficha: FichaTecnica;
    onEdit: (ficha: FichaTecnica) => void;
    onDuplicate: (ficha: FichaTecnica) => void;
    onDelete: (id: string) => void;
    onViewHistory: (ficha: FichaTecnica) => void;
}

export const FichaCard: React.FC<CardProps> = ({ ficha, onEdit, onDuplicate, onDelete, onViewHistory }) => {
    const [showMenu, setShowMenu] = useState(false);

    const getMarginColor = (margen?: number) => {
        if (!margen) return 'text-slate-500 bg-slate-500/10';
        if (margen >= 70) return 'text-green-400 bg-green-500/10';
        if (margen >= 50) return 'text-yellow-400 bg-yellow-500/10';
        return 'text-red-400 bg-red-500/10';
    };

    return (
        <div className="bg-surface-light border border-white/5 rounded-2xl overflow-hidden hover:border-primary/30 transition-all group flex flex-col shadow-xl">
            {/* Header Image/Icon */}
            <div className="relative h-44 bg-surface flex items-center justify-center overflow-hidden">
                {ficha.foto ? (
                    <img src={ficha.foto} alt={ficha.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                        <ChefHat className="w-8 h-8 text-slate-500 group-hover:text-primary transition-colors" />
                    </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10">
                        {ficha.categoria.replace('-', ' ')}
                    </span>
                </div>

                {/* Action Menu Trigger */}
                <div className="absolute top-4 right-4">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all shadow-lg"
                    >
                        <MoreVertical size={16} />
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 mt-2 w-48 bg-surface-light border border-white/10 rounded-xl shadow-2xl z-20 py-2 animate-in zoom-in-95 duration-200">
                                <button onClick={() => { onDuplicate(ficha); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors">
                                    <Copy size={14} /> Duplicar Receta
                                </button>
                                <button onClick={() => { onViewHistory(ficha); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors">
                                    <History size={14} /> Ver Historial
                                </button>
                                <hr className="my-2 border-white/5" />
                                <button onClick={() => { onDelete(ficha.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors">
                                    <Trash2 size={14} /> Eliminar Ficha
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors line-clamp-1">{ficha.nombre}</h3>

                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                    <span className="flex items-center gap-1.5"><Users size={12} /> {ficha.porciones} Pax</span>
                    <span className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${ficha.dificultad === 'baja' ? 'bg-green-500' : ficha.dificultad === 'media' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                        {ficha.dificultad}
                    </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-surface p-3 rounded-xl border border-white/5">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-1">Costo p/p</p>
                        <p className="text-sm font-bold text-white font-mono">{ficha.costos.porPorcion.toFixed(2)}€</p>
                    </div>
                    <div className={`p-3 rounded-xl border border-white/5 flex flex-col justify-center ${getMarginColor(ficha.pricing.margenBruto)}`}>
                        <p className="text-[9px] font-black opacity-60 uppercase tracking-tighter mb-1">Margen</p>
                        <div className="flex items-center gap-1">
                            <p className="text-sm font-bold font-mono">{ficha.pricing.margenBruto?.toFixed(0)}%</p>
                            <TrendingUp size={12} />
                        </div>
                    </div>
                </div>

                {/* Main Actions */}
                <div className="flex gap-2 mt-auto">
                    <button
                        onClick={() => onEdit(ficha)}
                        className="flex-1 bg-primary/10 hover:bg-primary border border-primary/20 hover:border-primary text-primary hover:text-white px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <Edit3 size={14} /> Editar
                    </button>
                    <button
                        onClick={() => generarPDFFicha(ficha)}
                        className="aspect-square bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center shadow-inner"
                    >
                        <Download size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * @file src/components/fichas/FichasGrid.tsx
 */
export const FichasGrid: React.FC<{
    fichas: FichaTecnica[];
    onEdit: (f: FichaTecnica) => void;
    onDuplicate: (f: FichaTecnica) => void;
    onDelete: (id: string) => void;
    onViewHistory: (f: FichaTecnica) => void;
}> = (props) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
        {props.fichas.map(ficha => <FichaCard key={ficha.id} {...props} ficha={ficha} />)}
    </div>
);

/**
 * @file src/components/fichas/FichasList.tsx
 */
export const FichasList: React.FC<{
    fichas: FichaTecnica[];
    onEdit: (f: FichaTecnica) => void;
    onDelete: (id: string) => void;
}> = ({ fichas, onEdit, onDelete }) => (
    <div className="bg-surface-light border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-surface border-b border-white/5">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Categoría</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Costo p/p</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">PV sugerido</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Margen</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {fichas.map(ficha => (
                    <tr key={ficha.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                            <p className="text-sm font-bold text-white leading-none">{ficha.nombre}</p>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">Versión {ficha.version}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <span className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                {ficha.categoria.replace('-', ' ')}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-mono text-slate-200">{ficha.costos.porPorcion.toFixed(2)}€</td>
                        <td className="px-6 py-4 text-center text-sm font-mono text-green-400">{ficha.pricing.precioVentaSugerido?.toFixed(2) || 'N/A'}€</td>
                        <td className="px-6 py-4 text-center">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${(ficha.pricing.margenBruto || 0) >= 70 ? 'text-green-400 bg-green-500/10' : 'text-yellow-400 bg-yellow-500/10'
                                }`}>
                                {ficha.pricing.margenBruto?.toFixed(0) || 0}%
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(ficha)} className="p-2 hover:bg-primary/20 text-primary transition-colors rounded-lg">
                                    <Edit3 size={16} />
                                </button>
                                <button onClick={() => onDelete(ficha.id)} className="p-2 hover:bg-red-500/10 text-red-400 transition-colors rounded-lg">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);
