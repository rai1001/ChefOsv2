import React, { useState, useMemo } from 'react';
import { useStore } from '@/presentation/store/useStore';
import {
  Package,
  Search,
  Plus,
  X,
  TrendingDown,
  DollarSign,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/presentation/components/atoms/Button';
import { Input } from '@/presentation/components/atoms/Input';
import { IngredientList } from '@/presentation/components/lists/IngredientList';
import { IngredientForm } from '@/presentation/components/ingredients/IngredientForm';
import { deleteDocument } from '@/services/firestoreService';
import { UniversalImporter } from '@/presentation/components/common/UniversalImporter';
import { useToast } from '@/presentation/components/ui';
import { COLLECTIONS } from '@/config/collections';
import { Ingredient } from '@/domain/entities/Ingredient';

export const IngredientsPage: React.FC = () => {
  const { ingredients } = useStore();
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Ingredient | 'stock' | 'currentStock' | 'lastCost';
    direction: 'asc' | 'desc';
  }>({
    key: 'name',
    direction: 'asc',
  });

  const CATEGORIES = [
    { id: 'all', label: 'Todos', icon: Package },
    { id: 'meat', label: 'Carne' },
    { id: 'fish', label: 'Pescado' },
    { id: 'produce', label: 'Vegetales' },
    { id: 'dairy', label: 'Lácteos' },
    { id: 'dry', label: 'Secos' },
    { id: 'frozen', label: 'Congelados' },
    { id: 'cleaning', label: 'Limpieza' },
    { id: 'other', label: 'Otros' },
  ];

  const handleImportComplete = () => {
    // Data is already committed to Firestore by UniversalImporter
    // We just need to refresh or notify
    addToast('Importación completada y lista de ingredientes actualizada', 'success');
  };

  const handleSort = (key: keyof Ingredient | 'stock' | 'currentStock' | 'lastCost') => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredIngredients = useMemo(() => {
    const result = ingredients.filter(
      (i) =>
        i &&
        i.name &&
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (activeCategory === 'all' || i.category === activeCategory)
    );

    return [...result].sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Manual mapping for complex objects
      if (sortConfig.key === 'currentStock') {
        aValue = a.currentStock?.value || 0;
        bValue = b.currentStock?.value || 0;
      } else if (sortConfig.key === 'lastCost') {
        aValue = a.lastCost?.amount || 0;
        bValue = b.lastCost?.amount || 0;
      } else if (sortConfig.key === 'yieldFactor') {
        // Handle both yieldFactor and legacy yield (if present)
        aValue = a.yieldFactor || (a as any).yield || 1;
        bValue = b.yieldFactor || (b as any).yield || 1;
      } else if (sortConfig.key === 'reorderPoint') {
        aValue = a.reorderPoint?.value || 0;
        bValue = b.reorderPoint?.value || 0;
      }

      // Fallback for direct properties
      if (aValue === undefined) aValue = 0;
      if (bValue === undefined) bValue = 0;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [ingredients, searchTerm, activeCategory, sortConfig]);

  const handleDelete = async (id: string) => {
    if (
      confirm('¿Estás seguro de que quieres eliminar este ingrediente de la biblioteca maestra?')
    ) {
      try {
        await deleteDocument(COLLECTIONS.INGREDIENTS, id);
      } catch (error) {
        console.error('Error deleting ingredient:', error);
        alert('Error al eliminar');
      }
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingIngredient(undefined);
  };

  // Derived Stats
  const stats = useMemo(() => {
    const totalItems = ingredients.length;
    const lowStock = ingredients.filter((i) => {
      const current = i.currentStock?.value || 0;
      const min = i.minimumStock?.value || 0;
      return current < min;
    }).length;
    const totalValue = ingredients.reduce((acc, i) => {
      const stock = i.currentStock?.value || 0;
      const cost = i.averageCost?.amount || i.lastCost?.amount || 0;
      return acc + stock * cost;
    }, 0);
    const categoriesCount = new Set(ingredients.map((i) => i.category)).size;
    return { totalItems, lowStock, totalValue, categoriesCount };
  }, [ingredients]);

  return (
    <div className="p-6 md:p-10 space-y-8 min-h-screen bg-transparent text-slate-100 fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter uppercase">
            <Package className="text-primary animate-pulse w-10 h-10" />
            Ingredientes <span className="text-primary">&</span> Stock
          </h1>
          <p className="text-slate-500 text-xs font-bold mt-2 tracking-[0.3em] uppercase">
            Biblioteca Maestra & Precios
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <UniversalImporter
            buttonLabel="Importar / Escanear"
            defaultType="ingredient"
            onCompleted={handleImportComplete}
          />
          <Button
            onClick={() => {
              setEditingIngredient(undefined);
              setShowAddModal(true);
            }}
            leftIcon={<Plus size={16} />}
            className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-primary/50"
          >
            Nuevo Ingrediente
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
              Total Items
            </p>
            <p className="text-2xl font-black text-white font-mono">{stats.totalItems}</p>
          </div>
        </div>

        <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
          <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 group-hover:bg-rose-500/20 transition-colors">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
              Stock Bajo
            </p>
            <p className="text-2xl font-black text-white font-mono">{stats.lowStock}</p>
          </div>
        </div>

        <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
              Valor Stock
            </p>
            <p className="text-2xl font-black text-white font-mono">
              {stats.totalValue.toFixed(2)}€
            </p>
          </div>
        </div>

        <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
          <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 group-hover:bg-purple-500/20 transition-colors">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
              Categorías
            </p>
            <p className="text-2xl font-black text-white font-mono">{stats.categoriesCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Container */}
      <div className="premium-glass p-2 flex flex-col xl:flex-row gap-4 justify-between items-center rounded-2xl">
        <div className="flex gap-1 overflow-x-auto max-w-full pb-1 custom-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                  : 'border-transparent text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full xl:w-96 relative group">
          <Input
            leftIcon={
              <Search
                className="text-slate-500 group-focus-within:text-primary transition-colors"
                size={16}
              />
            }
            placeholder="BUSCAR INGREDIENTE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/20 border-white/5 focus:border-primary/50 text-slate-200 placeholder-slate-600 font-medium"
          />
        </div>
      </div>

      {/* Content Area - Wrapped for Glass Effect */}
      <div className="premium-glass p-0 overflow-hidden">
        <IngredientList
          ingredients={filteredIngredients}
          onEdit={handleEdit as any}
          onDelete={handleDelete}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg h-[85vh] flex flex-col premium-glass overflow-hidden">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white z-50 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 min-h-0" onClick={(e) => e.stopPropagation()}>
              <IngredientForm onClose={closeModal} initialData={editingIngredient} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
