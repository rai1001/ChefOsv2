/**
 * @file src/components/FichasTecnicasView.tsx
 * @description Main dashboard for the Fichas Técnicas module.
 */

import React, { useState, useEffect } from 'react';
import { ChefHat, Plus, Search, FileText, Copy, Trash2, Edit3, Grid, List as ListIcon } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import { listarFichas, eliminarFichaTecnica, duplicarFicha } from '@/services/fichasTecnicasService';
import { FichaTecnicaForm } from '@/presentation/components/fichas/FichaTecnicaForm';
import { generarPDFFicha } from '@/services/pdfService';
import type { FichaTecnica } from '@/types';

export const FichasTecnicasPage: React.FC = () => {
    const { activeOutletId, currentUser } = useStore();
    const [fichas, setFichas] = useState<FichaTecnica[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingFicha, setEditingFicha] = useState<FichaTecnica | undefined>(undefined);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const loadFichas = async () => {
        if (!activeOutletId) return;
        setIsLoading(true);
        try {
            const data = await listarFichas(activeOutletId);
            setFichas(data);
        } catch (error) {
            console.error('Error loading fichas:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadFichas();
    }, [activeOutletId]);

    const filteredFichas = fichas.filter(f =>
        f.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de que quieres eliminar esta ficha técnica?')) {
            await eliminarFichaTecnica(id);
            loadFichas();
        }
    };

    const handleDuplicate = async (ficha: FichaTecnica) => {
        if (!currentUser) return;
        const nombre = prompt('Nuevo nombre para la copia:', `${ficha.nombre} (Copia)`);
        if (nombre) {
            await duplicarFicha(ficha.id, nombre, currentUser.id);
            loadFichas();
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 text-slate-200">
            <header className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3">
                        <ChefHat className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold text-white">Fichas Técnicas</h1>
                    </div>
                    <p className="text-slate-400 mt-1">Gestión profesional de recetas, costos y márgenes.</p>
                </div>
                <div className="flex gap-3 items-center">
                    <div className="flex bg-surface p-1 rounded-lg border border-white/5 mr-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                            className="bg-surface border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:border-primary focus:outline-none w-64 transition-all"
                            placeholder="Buscar receta..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingFicha(undefined);
                            setShowForm(true);
                        }}
                        className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-primary/25"
                    >
                        <Plus className="w-4 h-4" /> Nueva Ficha
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredFichas.length > 0 ? (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-3'}>
                    {filteredFichas.map(ficha => (
                        <div key={ficha.id} className="bg-surface border border-white/5 rounded-2xl p-6 hover:border-white/20 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${ficha.categoria === 'comida' ? 'bg-orange-500/10 text-orange-400' :
                                        ficha.categoria === 'bebida' ? 'bg-blue-500/10 text-blue-400' :
                                            ficha.categoria === 'postre' ? 'bg-purple-500/10 text-purple-400' :
                                                'bg-slate-500/10 text-slate-400'
                                        }`}>
                                        {ficha.categoria.replace('-', ' ')}
                                    </span>
                                    <h3 className="text-xl font-bold text-white mt-2 group-hover:text-primary transition-colors">{ficha.nombre}</h3>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingFicha(ficha); setShowForm(true); }} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors" title="Editar">
                                        <Edit3 size={16} />
                                    </button>
                                    <button onClick={() => handleDuplicate(ficha)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors" title="Duplicar">
                                        <Copy size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(ficha.id)} className="p-2 hover:bg-white/5 rounded-lg text-slate-600 hover:text-red-400 transition-colors" title="Eliminar">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-4">
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-500 uppercase font-medium">Costo</p>
                                    <p className="text-sm font-bold text-slate-200">{ficha.costos.porPorcion.toFixed(2)}€</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-500 uppercase font-medium">Margen</p>
                                    <p className="text-sm font-bold text-green-400">{ficha.pricing.margenObjetivo}%</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-500 uppercase font-medium">Versión</p>
                                    <p className="text-sm font-bold text-slate-400">v{ficha.version}</p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={() => generarPDFFicha(ficha)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-sm font-medium transition-all"
                                >
                                    <FileText size={14} /> Descargar PDF
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-surface/30 rounded-3xl border border-dashed border-white/10">
                    <ChefHat className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No se encontraron fichas técnicas.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 text-primary hover:underline text-sm font-medium"
                    >
                        Crea tu primera ficha técnica
                    </button>
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-5xl" onClick={e => e.stopPropagation()}>
                        <FichaTecnicaForm
                            initialData={(editingFicha || { outletId: activeOutletId || undefined }) as any}
                            userId={currentUser?.id || ''}
                            onClose={() => setShowForm(false)}
                            onSaved={() => {
                                setShowForm(false);
                                loadFichas();
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

