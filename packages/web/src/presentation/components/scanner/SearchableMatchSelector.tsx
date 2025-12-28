import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, Check, Utensils, Zap } from 'lucide-react';

interface MatchOption {
  id: string;
  name: string;
  type: 'recipe' | 'ingredient';
  category?: string;
}

interface SearchableMatchSelectorProps {
  onSelect: (option: MatchOption) => void;
  initialValue?: string;
  recipes: any[];
  ingredients: any[];
  placeholder?: string;
}

export const SearchableMatchSelector: React.FC<SearchableMatchSelectorProps> = ({
  onSelect,
  initialValue,
  recipes,
  ingredients,
  placeholder = 'Buscar receta o ingrediente...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState(initialValue);

  const options = useMemo(() => {
    const r: MatchOption[] = recipes.map((x) => ({
      id: x.id,
      name: x.name,
      type: 'recipe',
      category: x.category,
    }));
    const i: MatchOption[] = ingredients.map((x) => ({
      id: x.id,
      name: x.name,
      type: 'ingredient',
      category: x.category,
    }));
    return [...r, ...i];
  }, [recipes, ingredients]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options.slice(0, 20);
    const lower = searchTerm.toLowerCase();
    return options.filter((o) => o.name.toLowerCase().includes(lower)).slice(0, 20);
  }, [options, searchTerm]);

  const handleSelect = (option: MatchOption) => {
    setSelectedId(option.id);
    onSelect(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options.find((o) => o.id === selectedId);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm hover:border-white/20 transition-all text-left"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.type === 'recipe' ? (
                <Utensils size={14} className="text-purple-400" />
              ) : (
                <Zap size={14} className="text-emerald-400" />
              )}
              <span className="truncate text-white font-medium">{selectedOption.name}</span>
            </>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-[120] bg-[#1a1c1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2 border-b border-white/5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  autoFocus
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Escribe para buscar..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.map((option) => (
                <button
                  key={`${option.type}-${option.id}`}
                  onClick={() => handleSelect(option)}
                  className="w-full px-4 py-2 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-lg ${option.type === 'recipe' ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'}`}
                    >
                      {option.type === 'recipe' ? <Utensils size={14} /> : <Zap size={14} />}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium leading-none">{option.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase mt-1 tracking-wider">
                        {option.type} • {option.category || 'Sin categoría'}
                      </p>
                    </div>
                  </div>
                  {selectedId === option.id && <Check size={14} className="text-primary" />}
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-xs italic">
                  No se encontraron resultados
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
