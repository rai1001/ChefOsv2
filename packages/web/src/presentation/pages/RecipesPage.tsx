import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/presentation/store/useStore';
import { useOutletScoping } from '@/hooks/useOutletScoping';
import { Button } from '@/presentation/components/atoms/Button';
import { Input } from '@/presentation/components/atoms/Input';
import { ChefHat, Search, Plus, Trash2, X, Loader2, Sparkles, Store, Layers, BookOpen, DollarSign, AlertTriangle } from 'lucide-react';
import { RecipeForm } from '@/presentation/components/recipes/RecipeForm';
import { RecipeList } from '@/presentation/components/lists/RecipeList';
import { UniversalImporter } from '@/presentation/components/common/UniversalImporter';
import { useToast } from '@/presentation/components/ui';
import { searchRecipes } from '@/services/ai/functions';
import { deleteDocument, firestoreService } from '@/services/firestoreService';
import { COLLECTIONS } from '@/config/collections';
import { convertirRecetaAFicha } from '@/services/fichasTecnicasService';
import type { Recipe } from '@/types';

export const RecipesPage: React.FC = () => {
    const { recipes, currentUser, ingredients } = useStore();
    const { activeOutletId, isValidOutlet } = useOutletScoping();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // Create Map for O(1) ingredient lookup
    const ingredientMap = useMemo(() => new Map(ingredients.map(i => [i.id, i])), [ingredients]);

    const getRecipeCost = useCallback((r: Recipe) => {
        return r.ingredients.reduce((sum, item) => {
            const ing = ingredientMap.get(item.ingredientId);
            return sum + (item.quantity * (ing?.costPerUnit || 0));
        }, 0);
    }, [ingredientMap]);



    const [showAddModal, setShowAddModal] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<'all' | 'regular' | 'base'>('all');
    const [subCategory, setSubCategory] = useState<string>('all');
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    const handleClearData = async () => {
        if (!window.confirm('¿ESTÁS SEGURO? Esto borrará TODAS las recetas permanentemente.')) return;
        setIsDeletingAll(true);
        try {
            await firestoreService.deleteAll(COLLECTIONS.RECIPES);
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('Error al borrar datos');
        } finally {
            setIsDeletingAll(false);
        }
    };
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'name',
        direction: 'asc'
    });

    const RECIPE_CATEGORIES = [
        { id: 'all', label: 'Todos' },
        { id: 'appetizer', label: 'Entrantes' },
        { id: 'main', label: 'Principales' },
        { id: 'dessert', label: 'Postres' },
        { id: 'sauce', label: 'Salsas/Guarn.' },
        { id: 'base', label: 'Bases' },
        { id: 'beverage', label: 'Bebidas' },
        { id: 'other', label: 'Otros' }
    ];

    // AI Search State
    const [isAiSearch, setIsAiSearch] = useState(false);
    const [aiSearching, setAiSearching] = useState(false);
    const [aiResultIds, setAiResultIds] = useState<string[] | null>(null);

    const handleImportComplete = () => {
        addToast('Importación de recetas completada con éxito', 'success');
    };

    const handleAiSearch = async () => {
        if (!searchTerm.trim()) return;
        setAiSearching(true);
        try {
            const result = await searchRecipes({ query: searchTerm });
            const data = result.data as { recipes: { id: string }[] };
            setAiResultIds(data.recipes.map(r => r.id));
        } catch (error) {
            console.error("AI Search failed", error);
        } finally {
            setAiSearching(false);
        }
    };

    const handleDelete = useCallback(async (id: string) => {
        if (confirm('¿Estás seguro de que quieres eliminar esta receta?')) {
            try {
                await deleteDocument(COLLECTIONS.RECIPES, id);
            } catch (error) {
                console.error("Error deleting recipe:", error);
                alert("Error al eliminar la receta");
            }
        }
    }, []);

    const handleConvertToFicha = async (recipeId: string) => {
        if (!activeOutletId || !currentUser) {
            alert("No hay sesión activa");
            return;
        }

        if (confirm('¿Quieres generar un Análisis Pro (Ficha Técnica) de esta receta?')) {
            try {
                await convertirRecetaAFicha(recipeId, activeOutletId, currentUser.id);
                if (confirm('Ficha Técnica generada con éxito. ¿Quieres verla ahora?')) {
                    navigate('/fichas-tecnicas');
                }
            } catch (error) {
                console.error("Error converting to ficha:", error);
                alert("Error al generar la ficha técnica");
            }
        }
    };

    const handleEdit = useCallback((recipe: Recipe) => {
        setEditingRecipe(recipe);
        setShowAddModal(true);
    }, []);

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingRecipe(undefined);
    };

    // Separate base recipes from regular recipes
    const baseRecipes = recipes.filter(r => r.isBase);
    const regularRecipes = recipes.filter(r => !r.isBase);

    // Filter based on active tab and search
    let displayRecipes = recipes;
    if (activeTab === 'base') {
        displayRecipes = baseRecipes;
    } else if (activeTab === 'regular') {
        displayRecipes = regularRecipes;
    }

    const filteredRecipes = useMemo(() => {
        let result = displayRecipes;

        if (isAiSearch && aiResultIds) {
            result = aiResultIds
                .map(id => result.find(r => r.id === id))
                .filter((r): r is typeof result[0] => !!r);
        } else {
            result = result.filter(r =>
                r.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                (subCategory === 'all' || r.category === subCategory)
            );
        }

        // Apply Sorting
        return [...result].sort((a, b) => {
            let aValue: any = (a as any)[sortConfig.key];
            let bValue: any = (b as any)[sortConfig.key];

            // Special case for calculated fields if not in object
            if (sortConfig.key === 'cost') {
                aValue = getRecipeCost(a);
                bValue = getRecipeCost(b);
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [displayRecipes, searchTerm, isAiSearch, aiResultIds, subCategory, sortConfig, isValidOutlet, activeOutletId]);

    // Outlet Scoping Filter
    const scopedRecipes = useMemo(() => {
        if (!isValidOutlet) return [];
        return filteredRecipes.filter(r => r.outletId === activeOutletId);
    }, [filteredRecipes, isValidOutlet, activeOutletId]);

    return (
        <div className="p-6 md:p-10 space-y-8 min-h-screen bg-transparent text-slate-100 fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter uppercase">
                        <ChefHat className="text-primary animate-pulse w-10 h-10" />
                        Recetas <span className="text-primary">&</span> Escandallos
                    </h1>
                    <p className="text-slate-500 text-xs font-bold mt-2 tracking-[0.3em] uppercase">Gestión Técnica Gastronómica</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button
                        onClick={() => {
                            const newState = !isAiSearch;
                            setIsAiSearch(newState);
                            if (!newState) {
                                setAiResultIds(null);
                            }
                        }}
                        variant={isAiSearch ? 'ghost' : 'secondary'}
                        className={`text-xs ${isAiSearch ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30' : ''}`}
                        icon={aiSearching ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    >
                        {isAiSearch ? 'IA Activa' : 'AI Search'}
                    </Button>
                    <UniversalImporter
                        buttonLabel="Importar"
                        onCompleted={handleImportComplete}
                    />
                    <Button
                        onClick={handleClearData}
                        disabled={isDeletingAll}
                        variant="danger"
                        className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                        icon={<Trash2 size={16} />}
                    >
                        {isDeletingAll ? '...' : 'Borrar'}
                    </Button>
                    <Button
                        onClick={() => {
                            setEditingRecipe(undefined);
                            setShowAddModal(true);
                        }}
                        variant="primary"
                        icon={<Plus size={16} />}
                        className="shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-primary/50"
                    >
                        Nueva Receta
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Total Recetas</p>
                        <p className="text-2xl font-black text-white font-mono">{scopedRecipes.length}</p>
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Coste Medio</p>
                        <p className="text-2xl font-black text-white font-mono">
                            {(scopedRecipes.reduce((acc, r) => acc + getRecipeCost(r), 0) / (scopedRecipes.length || 1)).toFixed(2)}€
                        </p>
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                        <Layers size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Recetas Base</p>
                        <p className="text-2xl font-black text-white font-mono">{scopedRecipes.filter(r => r.isBase).length}</p>
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Sin Coste</p>
                        <p className="text-2xl font-black text-white font-mono">{scopedRecipes.filter(r => getRecipeCost(r) === 0).length}</p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Search Container */}
            <div className="premium-glass p-2 flex flex-col xl:flex-row gap-4 justify-between items-center rounded-2xl">
                <div className="flex gap-1 overflow-x-auto max-w-full pb-1 custom-scrollbar">
                    <Button
                        onClick={() => setActiveTab('all')}
                        variant={activeTab === 'all' ? 'primary' : 'ghost'}
                        className="text-[10px] whitespace-nowrap"
                        icon={<ChefHat size={14} />}
                    >
                        Todas ({recipes.filter(r => r.outletId === activeOutletId).length})
                    </Button>

                    <Button
                        onClick={() => setActiveTab('regular')}
                        variant={activeTab === 'regular' ? 'primary' : 'ghost'}
                        className="text-[10px] whitespace-nowrap"
                        icon={<BookOpen size={14} />}
                    >
                        Platos ({regularRecipes.filter(r => r.outletId === activeOutletId).length})
                    </Button>

                    <Button
                        onClick={() => setActiveTab('base')}
                        variant={activeTab === 'base' ? 'secondary' : 'ghost'}
                        className={`text-[10px] whitespace-nowrap ${activeTab === 'base' ? 'bg-purple-500 text-white shadow-purple-500/20' : 'text-purple-400'}`}
                        icon={<Layers size={14} />}
                    >
                        Bases ({baseRecipes.filter(r => r.outletId === activeOutletId).length})
                    </Button>

                    <div className="w-px h-6 bg-white/10 self-center mx-1" />

                    {!isAiSearch && (
                        <div className="flex gap-1">
                            {RECIPE_CATEGORIES.map(cat => (
                                <Button
                                    key={cat.id}
                                    onClick={() => setSubCategory(cat.id)}
                                    variant={subCategory === cat.id ? 'secondary' : 'ghost'}
                                    className="text-[10px] whitespace-nowrap px-4"
                                    size="sm"
                                >
                                    {cat.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="w-full xl:w-96 relative group">
                    <Input
                        placeholder={isAiSearch ? "Describe tu receta con IA..." : "BUSCAR RECETA..."}
                        className={`pl-11 ${isAiSearch ? 'border-purple-500/30 focus:border-purple-500/50 focus:ring-purple-500/50' : ''}`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && isAiSearch) {
                                handleAiSearch();
                            }
                        }}
                        leftIcon={<Search className={isAiSearch ? 'text-purple-400' : 'text-slate-500'} size={16} />}
                    />
                </div>
            </div>

            {/* Content Area */}
            {!isValidOutlet ? (
                <div className="flex flex-col items-center justify-center p-24 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 mt-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="p-6 bg-white/5 rounded-full mb-6 relative">
                        <Store className="w-12 h-12 text-slate-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50 blur-xl scale-150" />
                        <Store className="w-12 h-12 text-slate-300 relative z-10" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">Selecciona una Cocina</h3>
                    <p className="text-slate-500 text-center max-w-md font-medium">
                        Selecciona una cocina activa en el panel superior para gestionar sus recetas.
                    </p>
                </div>
            ) : (
                <div className="premium-glass p-0 overflow-hidden">
                    <RecipeList
                        recipes={scopedRecipes}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onConvertToFicha={handleConvertToFicha}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                    />
                </div>
            )}

            {
                showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="relative w-full max-w-lg">
                            <button
                                onClick={closeModal}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white z-10 p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div onClick={e => e.stopPropagation()}>
                                <RecipeForm
                                    onClose={closeModal}
                                    initialData={editingRecipe}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};


