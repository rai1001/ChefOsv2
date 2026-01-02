import React, { useState } from 'react';
import {
  addDocument,
  updateDocument,
  deleteDocument,
  firestoreService,
} from '@/services/firestoreService';
import { COLLECTIONS, collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';
import { useOutletScoping } from '@/hooks/useOutletScoping';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  Utensils,
  Store,
  Layers,
} from 'lucide-react';
import type { Menu, MenuVariation, Recipe, Ingredient } from '@/types';
import { useToast, ConfirmModal } from '@/presentation/components/ui';
import { UniversalImporter } from '@/presentation/components/common/UniversalImporter';

export const MenuPage: React.FC = () => {
  const { menus, recipes } = useStore();
  const { activeOutletId, isValidOutlet } = useOutletScoping();
  const { addToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleClearData = async () => {
    if (!window.confirm('¿ESTÁS SEGURO? Esto borrará TODOS los menús permanentemente.')) return;
    setIsDeletingAll(true);
    try {
      await firestoreService.deleteAll(COLLECTIONS.MENUS);
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Error al borrar datos');
    } finally {
      setIsDeletingAll(false);
    }
  };
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [sortConfig, _setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  });

  const MENU_CATEGORIES = [
    { id: 'all', label: 'Todos' },
    { id: 'daily', label: 'Menú Día' },
    { id: 'event', label: 'Eventos' },
    { id: 'tasting', label: 'Degustación' },
    { id: 'corporate', label: 'Empresa' },
    { id: 'breakfast', label: 'Desayuno' },
  ];

  const handleImportComplete = async (data: any) => {
    if (!activeOutletId) {
      alert('Selecciona una cocina activa primero.');
      return;
    }

    let menuCount = 0;
    let recipeCount = 0;
    let ingredientCount = 0;

    try {
      // 1. Ingredients
      if (data.ingredients && Array.isArray(data.ingredients)) {
        for (const ing of data.ingredients as Ingredient[]) {
          try {
            const newIng: any = { ...ing, outletId: activeOutletId };
            if (newIng.id || String(newIng.id).length < 20) delete newIng.id;
            await addDocument(collections.ingredients, newIng);
            ingredientCount++;
          } catch (e) {
            console.error(e);
          }
        }
      }

      // 2. Recipes
      const importedRecipeMap = new Map<string, string>(); // temp id -> firestore id
      if (data.recipes && Array.isArray(data.recipes)) {
        for (const r of data.recipes as Recipe[]) {
          try {
            const tempId = r.id;
            const newRecipe: Partial<Recipe> = {
              ...r,
              outletId: activeOutletId,
              updatedAt: new Date().toISOString(),
            };
            if (!newRecipe.id || String(newRecipe.id).length < 20) delete newRecipe.id;

            const resId = await addDocument(collections.recipes, newRecipe);
            recipeCount++;
            if (tempId) importedRecipeMap.set(tempId, resId);

            // If NO explicit menus were found, create a placeholder menu for each recipe
            if (!data.menus || data.menus.length === 0) {
              const newMenu: Partial<Menu> = {
                name: r.name,
                outletId: activeOutletId,
                recipeIds: [resId],
                variations: [],
                sellPrice: 0,
              };
              await addDocument(collections.menus, newMenu);
              menuCount++;
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      // 3. Menus (Explicit)
      if (data.menus && Array.isArray(data.menus)) {
        for (const m of data.menus as Menu[]) {
          try {
            // Map temp recipe IDs to firestore IDs if possible
            const recipeIds = (m.recipeIds || []).map(
              (id: string) => importedRecipeMap.get(id) || id
            );

            const newMenu: any = {
              ...m,
              outletId: activeOutletId,
              recipeIds: recipeIds,
              variations: m.variations || [],
              sellPrice: Number(m.sellPrice) || 0,
              updatedAt: new Date().toISOString(),
            };
            if (newMenu.id || String(newMenu.id).length < 20) delete newMenu.id;

            await addDocument(collections.menus, newMenu);
            menuCount++;
          } catch (e) {
            console.error(e);
          }
        }
      }

      // Final feedback
      if (menuCount > 0 || recipeCount > 0 || ingredientCount > 0) {
        let msg = `Importación completada:`;
        if (menuCount > 0) msg += `\n- ${menuCount} menús`;
        if (recipeCount > 0) msg += `\n- ${recipeCount} recetas`;
        if (ingredientCount > 0) msg += `\n- ${ingredientCount} ingredientes`;
        alert(msg);
      } else if (data.name) {
        // OCR Single Import fallback
        let desc = '';
        if (data.sections) {
          desc = data.sections
            .map(
              (s: any) =>
                `## ${s.name}\n${s.items.map((i: any) => `- ${i.name} (${i.price || '?'}€)`).join('\n')}`
            )
            .join('\n\n');
        }

        setFormData({
          name: data.name,
          description: desc,
          recipeIds: [],
          variations: [],
          sellPrice: 0,
        });
        setIsEditing(true);
      } else {
        alert('No se encontró información válida para importar en el archivo.');
      }
    } catch (err) {
      console.error('Critical import error:', err);
      alert('Error crítico durante la importación.');
    } finally {
      // cleanup if needed
    }
  };

  // Form State
  const [formData, setFormData] = useState<Partial<Menu>>({
    name: '',
    description: '',
    recipeIds: [],
    variations: [],
    sellPrice: 0,
    category: 'daily',
    status: 'draft',
  });

  // Derived Stats
  const stats = React.useMemo(() => {
    if (!menus.length) return { total: 0, active: 0, avgPrice: 0, totalDishes: 0 };
    const relevant = activeOutletId ? menus.filter((m) => m.outletId === activeOutletId) : menus;

    const total = relevant.length;
    const active = relevant.filter((m) => m.status === 'active').length;
    const totalPrice = relevant.reduce((acc, m) => acc + (m.sellPrice || 0), 0);
    const avgPrice = total > 0 ? totalPrice / total : 0;
    const totalDishes = relevant.reduce((acc, m) => acc + (m.recipeIds?.length || 0), 0);

    return { total, active, avgPrice, totalDishes };
  }, [menus, activeOutletId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'draft':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'archived':
        return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
      default:
        return 'text-slate-400 bg-white/5 border-white/10';
    }
  };

  // const _handleSort = (key: string) => {
  //     setSortConfig(prev => ({
  //         key,
  //         direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
  //     }));
  // };

  const filteredMenus = React.useMemo(() => {
    const result = menus.filter(
      (m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (activeCategory === 'all' || m.category === activeCategory) &&
        (activeStatus === 'all' || m.status === activeStatus)
    );

    return [...result].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key] || 0;
      const bValue = (b as any)[sortConfig.key] || 0;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [menus, searchTerm, activeCategory, activeStatus, sortConfig]);

  const scopedMenus = React.useMemo(() => {
    if (!isValidOutlet) return [];
    return filteredMenus.filter((m) => m.outletId === activeOutletId);
  }, [filteredMenus, isValidOutlet, activeOutletId]);

  const handleEdit = (menu: Menu) => {
    setFormData({ ...menu });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await deleteDocument(COLLECTIONS.MENUS, deleteConfirm.id);
        addToast('Menú eliminado', 'success');
      } catch (error) {
        console.error(error);
        addToast('Error al eliminar menú', 'error');
      }
    }
    setDeleteConfirm({ isOpen: false, id: null });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    if (!activeOutletId) {
      addToast('Selecciona una cocina primero', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const menuData: Partial<Menu> = {
        name: formData.name,
        description: formData.description || '',
        recipeIds: formData.recipeIds || [],
        variations: formData.variations || [],
        sellPrice: Number(formData.sellPrice) || 0,
        category: formData.category || 'daily',
        status: formData.status || 'draft',
        outletId: activeOutletId,
        // Note: 'recipes' is hydrated, not saved to DB
      };

      if (formData.id) {
        await updateDocument(COLLECTIONS.MENUS, formData.id, menuData as any);
        addToast('Menú actualizado', 'success');
      } else {
        await addDocument(collections.menus, menuData);
        addToast('Menú creado', 'success');
      }
      setIsEditing(false);
      setFormData({
        name: '',
        description: '',
        recipeIds: [],
        variations: [],
        sellPrice: 0,
        category: 'daily',
        status: 'draft',
      });
    } catch (error) {
      console.error(error);
      addToast('Error al guardar menú', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRecipe = (recipeId: string) => {
    const current = formData.recipeIds || [];
    const updated = current.includes(recipeId)
      ? current.filter((id) => id !== recipeId)
      : [...current, recipeId];
    setFormData({ ...formData, recipeIds: updated });
  };

  const addVariation = () => {
    const newVariation: MenuVariation = { dishName: '', alternativeDishName: '' };
    setFormData({
      ...formData,
      variations: [...(formData.variations || []), newVariation],
    });
  };

  const updateVariation = (index: number, field: keyof MenuVariation, value: string) => {
    const newVariations = [...(formData.variations || [])];
    const current = newVariations[index] || {};
    newVariations[index] = { dishName: '', alternativeDishName: '', ...current, [field]: value };
    setFormData({ ...formData, variations: newVariations });
  };

  const removeVariation = (index: number) => {
    const newVariations = [...(formData.variations || [])];
    newVariations.splice(index, 1);
    setFormData({ ...formData, variations: newVariations });
  };

  if (isEditing) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            {formData.id ? <Edit2 className="text-primary" /> : <Plus className="text-primary" />}
            {formData.id ? 'Editar Menú' : 'Nuevo Menú'}
          </h2>
          <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-surface border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre del Menú</label>
                <input
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Menú Boda Estándar"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Precio de Venta (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none"
                  value={formData.sellPrice}
                  onChange={(e) => setFormData({ ...formData, sellPrice: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Categoría</label>
                <select
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                >
                  <option value="daily">Menú de Día</option>
                  <option value="event">Evento / Banquete</option>
                  <option value="tasting">Degustación</option>
                  <option value="corporate">Empresa</option>
                  <option value="breakfast">Desayuno</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Estado</label>
                <select
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="draft">Borrador</option>
                  <option value="active">Activo / En Carta</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>
              <div className="col-span-full">
                <label className="block text-sm text-slate-400 mb-1">Descripción</label>
                <textarea
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary outline-none h-20"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción corta del menú..."
                />
              </div>
            </div>
          </div>

          {/* Recipe Selection */}
          <div className="bg-surface border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex justify-between">
              <span>Selección de Platos</span>
              <span className="text-sm bg-primary/20 text-primary px-2 py-1 rounded">
                {formData.recipeIds?.length || 0} seleccionados
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => toggleRecipe(recipe.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    formData.recipeIds?.includes(recipe.id)
                      ? 'bg-primary/20 border-primary text-white'
                      : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{recipe.name}</span>
                  {formData.recipeIds?.includes(recipe.id) && <Utensils size={14} />}
                </div>
              ))}
            </div>
          </div>

          {/* Variations */}
          <div className="bg-surface border border-white/10 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Variaciones / Alternativas</h3>
              <button
                type="button"
                onClick={addVariation}
                className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                + Añadir Variación
              </button>
            </div>

            {(!formData.variations || formData.variations.length === 0) && (
              <p className="text-sm text-slate-500 italic text-center py-4 bg-black/10 rounded-lg">
                No hay variaciones definidas (ej. Opción Vegana para Entrante)
              </p>
            )}

            <div className="space-y-3">
              {formData.variations?.map((visual, idx) => (
                <div key={idx} className="flex gap-3 items-start bg-black/20 p-3 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <input
                      placeholder="Plato Original (ej. Solomillo)"
                      className="w-full bg-transparent border-b border-white/10 text-sm text-white px-2 py-1 focus:border-primary outline-none"
                      value={visual.dishName}
                      onChange={(e) => updateVariation(idx, 'dishName', e.target.value)}
                    />
                    <input
                      placeholder="Alternativa (ej. Tofu Marinado)"
                      className="w-full bg-transparent border-b border-white/10 text-sm text-emerald-400 px-2 py-1 focus:border-emerald-500 outline-none"
                      value={visual.alternativeDishName}
                      onChange={(e) => updateVariation(idx, 'alternativeDishName', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariation(idx)}
                    className="text-slate-500 hover:text-red-400 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-6 py-2 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all font-medium flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar Menú'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8 min-h-screen bg-transparent text-slate-100 fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter uppercase">
            <BookOpen className="text-primary animate-pulse w-10 h-10" />
            Gestión de <span className="text-primary">Menús</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold mt-2 tracking-[0.3em] uppercase">
            Carta Digital & Planificación
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleClearData}
            disabled={isDeletingAll}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
          >
            <Trash2 size={16} /> {isDeletingAll ? '...' : 'Clear All'}
          </button>
          <UniversalImporter
            buttonLabel="Importar Carta"
            defaultType="menu"
            onCompleted={handleImportComplete}
          />
          <button
            onClick={() => {
              setFormData({
                name: '',
                description: '',
                recipeIds: [],
                variations: [],
                sellPrice: 0,
                category: 'daily',
                status: 'draft',
              });
              setIsEditing(true);
            }}
            className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-primary/50"
          >
            <Plus size={16} />
            Nuevo Menú
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
              Total Menús
            </p>
            <p className="text-2xl font-black text-white font-mono">{stats.total}</p>
          </div>
        </div>

        <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
            <Utensils size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
              Activos
            </p>
            <p className="text-2xl font-black text-white font-mono">{stats.active}</p>
          </div>
        </div>

        <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 group-hover:bg-amber-500/20 transition-colors">
            <Store size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
              Precio Medio
            </p>
            <p className="text-2xl font-black text-white font-mono">{stats.avgPrice.toFixed(2)}€</p>
          </div>
        </div>

        <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
          <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 group-hover:bg-purple-500/20 transition-colors">
            <Plus size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
              Platos Totales
            </p>
            <p className="text-2xl font-black text-white font-mono">{stats.totalDishes}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="premium-glass p-2 flex flex-col xl:flex-row gap-4 justify-between items-center rounded-2xl">
        <div className="flex gap-1 overflow-x-auto max-w-full pb-1 custom-scrollbar">
          {MENU_CATEGORIES.map((cat) => (
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

        <div className="flex items-center gap-4 w-full xl:w-auto">
          <select
            className="bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-300 focus:border-primary outline-none hover:bg-white/5 transition-colors"
            value={activeStatus}
            onChange={(e) => setActiveStatus(e.target.value)}
          >
            <option value="all">Todos los Estados</option>
            <option value="draft">Borradores</option>
            <option value="active">Activos</option>
            <option value="archived">Archivados</option>
          </select>

          <div className="w-full xl:w-64 relative group">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors"
              size={16}
            />
            <input
              type="text"
              placeholder="BUSCAR MENÚ..."
              className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-slate-200 placeholder-slate-600 font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {!isValidOutlet ? (
        <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
          <Store className="w-16 h-16 text-slate-600 mb-6" />
          <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">
            Selecciona una Cocina
          </h3>
          <p className="text-slate-500 text-center max-w-md font-medium">
            Selecciona una cocina activa para ver y gestionar sus menús.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-6 custom-scrollbar">
          {scopedMenus.map((menu) => (
            <div
              key={menu.id}
              className="premium-glass p-0 group relative overflow-hidden hover:scale-[1.01] transition-transform duration-300 flex flex-col h-full"
            >
              {/* Card Header */}
              <div className="p-6 relative">
                <div
                  className={`absolute top-4 right-4 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${getStatusColor(menu.status || 'draft')}`}
                >
                  {menu.status === 'active'
                    ? 'ACTIVO'
                    : menu.status === 'archived'
                      ? 'ARCHIVADO'
                      : 'BORRADOR'}
                </div>
                <h3 className="text-2xl font-black text-white mb-2 pr-16 leading-tight">
                  {menu.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 min-h-[2.5em] font-medium leading-relaxed">
                  {menu.description || 'Sin descripción disponible.'}
                </p>
              </div>

              {/* Card Body */}
              <div className="px-6 flex-1">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                      <Utensils size={14} className="text-primary" />
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Platos
                      </span>
                    </div>
                    <span className="text-white font-mono font-bold">{menu.recipeIds.length}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                      <Layers size={14} className="text-emerald-400" />
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Variaciones
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold ${menu.variations?.length ? 'text-emerald-400' : 'text-slate-500'}`}
                    >
                      {menu.variations?.length || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-6 p-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                    Precio Venta
                  </p>
                  <p className="text-xl font-mono text-white font-bold">
                    {menu.sellPrice?.toFixed(2)}€
                  </p>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    onClick={() => handleEdit(menu)}
                    className="p-2 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded-lg transition-colors border border-transparent hover:border-blue-500/30"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(menu.id)}
                    className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {scopedMenus.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <Utensils className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-500 uppercase tracking-widest">
                No hay menús
              </h3>
              <p className="text-slate-600 mt-2">Crea tu primer menú para empezar.</p>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Eliminar Menú"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
      />
    </div>
  );
};
