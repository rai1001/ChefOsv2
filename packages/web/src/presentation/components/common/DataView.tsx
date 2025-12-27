import React, { useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { ChefHat, BookOpen, Users, Search, Plus, X, Package } from 'lucide-react';
import { IngredientForm } from '@/presentation/components/ingredients/IngredientForm';
import { RecipeForm } from '@/presentation/components/recipes/RecipeForm';
import { MenuForm } from '@/presentation/components/menu/MenuForm';
import { RecipeList } from '@/presentation/components/lists/RecipeList';
import { MenuList } from '@/presentation/components/lists/MenuList';
import { StaffList } from '@/presentation/components/lists/StaffList';

type Tab = 'recipes' | 'menus' | 'staff' | 'ingredients';

export const DataView: React.FC = () => {
  const {
    recipes,
    menus,
    ingredients,
    // Clear actions - assumed not available or not needed, removing to fix build
  } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('ingredients');
  const [searchTerm, setSearchTerm] = useState('');
  const [showIngredientForm, setShowIngredientForm] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null); // Type 'any' for now to avoid extensive imports, or import Ingredient
  const [showAddModal, setShowAddModal] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'recipes':
        const filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return <RecipeList
          recipes={filteredRecipes}
          onEdit={(recipe) => console.log('Edit recipe', recipe)}
          onDelete={(id) => console.log('Delete recipe', id)}
          onConvertToFicha={(id) => console.log('Convert recipe to ficha', id)}
          sortConfig={{ key: 'name', direction: 'asc' }}
          onSort={() => { }}
        />;

      case 'ingredients': {
        const filteredIngredients = ingredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => { setSelectedIngredient(null); setShowIngredientForm(true); }}
                className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Añadir Ingrediente
              </button>
            </div>

            {showIngredientForm && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="w-full max-w-2xl relative">
                  <button
                    onClick={() => setShowIngredientForm(false)}
                    className="absolute -top-10 right-0 text-white hover:text-slate-300"
                  >
                    Cerrar [Esc]
                  </button>
                  <IngredientForm
                    initialData={selectedIngredient}
                    onClose={() => setShowIngredientForm(false)}
                  />
                </div>
              </div>
            )}

            <div className="bg-surface border border-white/5 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-black/20 text-slate-500 uppercase font-medium">
                  <tr>
                    <th className="p-4">Nombre</th>
                    <th className="p-4">Unidad</th>
                    <th className="p-4 text-right">Coste/Ud</th>
                    <th className="p-4 text-right">Rendimiento</th>
                    <th className="p-4 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredIngredients.map(ing => (
                    <tr
                      key={ing.id}
                      className="hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => { setSelectedIngredient(ing); setShowIngredientForm(true); }}
                    >
                      <td className="p-4 font-medium text-white">{ing.name}</td>
                      <td className="p-4"><span className="bg-white/10 px-2 py-1 rounded text-xs">{ing.unit}</span></td>
                      <td className="p-4 text-right font-mono text-emerald-400">${ing.costPerUnit}</td>
                      <td className="p-4 text-right">{ing.yield * 100}%</td>
                      <td className="p-4 text-right font-bold">{ing.stock || 0}</td>
                    </tr>
                  ))}
                  {filteredIngredients.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center opacity-50">No hay ingredientes. Añade uno o importa un Excel.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'menus':
        const filteredMenus = menus.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return <MenuList menus={filteredMenus} />;

      case 'staff':
        return <StaffList />;

    }
  };

  const renderModal = () => {
    if (!showAddModal) return null;

    let Content = null;
    switch (activeTab) {
      case 'recipes': Content = RecipeForm; break;
      case 'menus': Content = MenuForm; break;
      case 'ingredients': Content = IngredientForm; break;
      default: return null;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-lg">
          <button
            onClick={() => setShowAddModal(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <div onClick={e => e.stopPropagation()}>
            <Content onClose={() => setShowAddModal(false)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 text-slate-200">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestión de Datos</h1>
          <p className="text-slate-400 mt-1">Inspecciona y gestiona los datos de tu cocina.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              className="bg-surface border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:border-primary focus:outline-none w-64 transition-all"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {activeTab !== 'staff' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-primary/25"
            >
              <Plus className="w-4 h-4" /> Añadir Nuevo
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-1 overflow-x-auto">
        <TabButton
          active={activeTab === 'ingredients'}
          onClick={() => setActiveTab('ingredients')}
        >
          <Package className="w-4 h-4" />
          Ingredientes
        </TabButton>
        <TabButton
          active={activeTab === 'recipes'}
          onClick={() => setActiveTab('recipes')}
        >
          <ChefHat className="w-4 h-4" />
          Recetas
        </TabButton>
        <TabButton
          active={activeTab === 'menus'}
          onClick={() => setActiveTab('menus')}
        >
          <BookOpen className="w-4 h-4" />
          Menús
        </TabButton>
        <TabButton
          active={activeTab === 'staff'}
          onClick={() => setActiveTab('staff')}
        >
          <Users className="w-4 h-4" />
          Personal
        </TabButton>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {renderContent()}
      </div>

      {renderModal()}
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative ${active ? 'text-primary' : 'text-slate-400 hover:text-slate-200'
      }`}
  >
    {children}
    {active && (
      <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-primary rounded-t-full" />
    )}
  </button>
);
