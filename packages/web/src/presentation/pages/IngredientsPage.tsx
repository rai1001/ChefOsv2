import React, { useState, useMemo } from 'react';
import { Package, Search, Plus, TrendingDown, DollarSign, Layers, ArrowUpRight } from 'lucide-react';
import { useIngredients } from '../../application/hooks/useIngredients';
import { Ingredient } from '../../domain/entities/Ingredient';
import { IngredientForm } from '../components/ingredients/IngredientForm';
import { UniversalImporter } from '../components/imports/UniversalImporter';

export const IngredientsPage: React.FC = () => {
    const { ingredients, loading, addIngredient, updateIngredient, deleteIngredient, refresh } = useIngredients();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>(undefined);

    // Stats Logic
    const stats = useMemo(() => {
        const totalItems = ingredients.length;
        const lowStock = ingredients.filter(i => (i.stock || 0) < (i.minStock || 0)).length;
        const totalValue = ingredients.reduce((acc, i) => acc + ((i.stock || 0) * (i.costPerUnit || 0)), 0);
        const categoriesCount = new Set(ingredients.map(i => i.category)).size;
        return { totalItems, lowStock, totalValue, categoriesCount };
    }, [ingredients]);

    const CATEGORIES = [
        { id: 'all', label: 'Todos' },
        { id: 'meat', label: 'Carne' },
        { id: 'fish', label: 'Pescado' },
        { id: 'produce', label: 'Vegetales' },
        { id: 'dairy', label: 'Lácteos' },
        { id: 'dry', label: 'Secos' },
        { id: 'frozen', label: 'Congelados' },
        { id: 'cleaning', label: 'Limpieza' },
        { id: 'other', label: 'Otros' }
    ];

    const handleEdit = (ingredient: Ingredient) => {
        setEditingIngredient(ingredient);
        setShowAddModal(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Eliminar ingrediente?')) {
            await deleteIngredient(id);
        }
    };

    const handleFormSubmit = async (data: Ingredient) => {
        if (editingIngredient) {
            await updateIngredient(editingIngredient.id, data);
        } else {
            await addIngredient(data);
        }
    };

    const handleImportComplete = () => {
        refresh(); // Reload ingredients after import
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingIngredient(undefined);
    }

    if (loading && ingredients.length === 0) {
        return <div className="p-10 text-white animate-pulse">Cargando ingredientes...</div>;
    }

    return (
        <div className="p-6 md:p-10 space-y-8 min-h-screen bg-transparent text-slate-100 fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter uppercase">
                        <Package className="text-primary animate-pulse w-10 h-10" />
                        Ingredientes <span className="text-primary">&</span> Stock
                    </h1>
                    <p className="text-slate-500 text-xs font-bold mt-2 tracking-[0.3em] uppercase">Biblioteca Maestra & Precios</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <UniversalImporter
                        buttonLabel="Importar / Escanear"
                        defaultType="ingredient"
                        onCompleted={handleImportComplete}
                    />
                    <button
                        onClick={() => { setEditingIngredient(undefined); setShowAddModal(true); }}
                        className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus size={16} />
                        Nuevo Ingrediente
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                        <Layers size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Total Items</p>
                        <p className="text-2xl font-black text-white font-mono">{stats.totalItems}</p>
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Stock Bajo</p>
                        <p className="text-2xl font-black text-white font-mono">{stats.lowStock}</p>
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Valor Stock</p>
                        <p className="text-2xl font-black text-white font-mono">{stats.totalValue.toFixed(2)}€</p>
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                        <ArrowUpRight size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Categorías</p>
                        <p className="text-2xl font-black text-white font-mono">{stats.categoriesCount}</p>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="premium-glass p-2 flex flex-col xl:flex-row gap-4 justify-between items-center rounded-2xl">
                <div className="flex gap-1 overflow-x-auto max-w-full pb-1 custom-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border whitespace-nowrap ${activeCategory === cat.id
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                : 'border-transparent text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
                <div className="w-full xl:w-96 relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="text-slate-500 group-focus-within:text-primary transition-colors h-4 w-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="BUSCAR INGREDIENTE..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/5 rounded-lg focus:border-primary/50 text-slate-200 placeholder-slate-600 font-medium focus:outline-none transition-colors"
                    />
                </div>
            </div>

            {/* List */}
            <div className="premium-glass p-6 min-h-[400px]">
                <h3 className="text-xl font-bold mb-4">Lista de Ingredientes</h3>
                {ingredients.length === 0 ? (
                    <div className="text-center text-slate-500 py-20">
                        <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>No hay ingredientes en esta categoría.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ingredients
                            .filter(i => activeCategory === 'all' || i.category === activeCategory)
                            .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(item => (
                                <div key={item.id} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-primary/30 transition-colors group relative">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded hover:bg-blue-500/30">Edit</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded hover:bg-red-500/30">Del</button>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-white">{item.name}</h4>
                                            <p className="text-xs text-slate-400 capitalize">{item.category}</p>
                                        </div>
                                        <span className="text-sm font-mono text-primary font-bold">{item.costPerUnit}€/{item.unit}</span>
                                    </div>
                                    <div className="mt-4 flex justify-between items-end">
                                        <div className="text-xs text-slate-500">
                                            Stock: <span className={Number(item.stock) < Number(item.minStock) ? 'text-red-400 font-bold' : 'text-slate-300'}>{item.stock} {item.unit}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg h-[85vh] flex flex-col premium-glass overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                        <div className="flex-1 min-h-0">
                            <IngredientForm
                                onClose={closeModal}
                                initialData={editingIngredient}
                                onSubmit={handleFormSubmit}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
