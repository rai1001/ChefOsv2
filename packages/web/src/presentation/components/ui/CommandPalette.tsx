import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { useNavigate } from 'react-router-dom';
import { Search, ChefHat, Package, CalendarDays, Truck, X, ArrowRight } from 'lucide-react';
import Fuse from 'fuse.js';

interface SearchableItem {
    id: string;
    title: string;
    subtitle?: string;
    type: 'recipe' | 'ingredient' | 'event' | 'supplier' | 'menu';
    icon: React.ReactNode;
    action: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const { recipes, ingredients, events, suppliers } = useStore();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Build searchable index
    const searchableItems = useMemo<SearchableItem[]>(() => {
        const items: SearchableItem[] = [];

        // Recipes
        recipes.forEach(recipe => {
            items.push({
                id: `recipe-${recipe.id}`,
                title: recipe.name,
                subtitle: `Receta · ${recipe.station}`,
                type: 'recipe',
                icon: <ChefHat size={20} className="text-orange-400" />,
                action: () => {
                    navigate('/recipes');
                    onClose();
                }
            });
        });

        // Ingredients
        ingredients.forEach(ingredient => {
            items.push({
                id: `ingredient-${ingredient.id}`,
                title: ingredient.name,
                subtitle: `Ingrediente · €${ingredient.costPerUnit.toFixed(2)}/${ingredient.unit}`,
                type: 'ingredient',
                icon: <Package size={20} className="text-green-400" />,
                action: () => {
                    navigate('/ingredients');
                    onClose();
                }
            });
        });

        // Events
        events.forEach(event => {
            items.push({
                id: `event-${event.id}`,
                title: event.name,
                subtitle: `Evento · ${new Date(event.date).toLocaleDateString('es-ES')} · ${event.pax} PAX`,
                type: 'event',
                icon: <CalendarDays size={20} className="text-blue-400" />,
                action: () => {
                    navigate('/events');
                    onClose();
                }
            });
        });

        // Suppliers
        suppliers.forEach(supplier => {
            items.push({
                id: `supplier-${supplier.id}`,
                title: supplier.name,
                subtitle: `Proveedor${supplier.contactName ? ` · ${supplier.contactName}` : ''}`,
                type: 'supplier',
                icon: <Truck size={20} className="text-purple-400" />,
                action: () => {
                    navigate('/suppliers');
                    onClose();
                }
            });
        });

        return items;
    }, [recipes, ingredients, events, suppliers, navigate, onClose]);

    // Fuzzy search with fuse.js
    const fuse = useMemo(() => {
        return new Fuse(searchableItems, {
            keys: ['title', 'subtitle'],
            threshold: 0.3,
            includeScore: true
        });
    }, [searchableItems]);

    const searchResults = useMemo(() => {
        if (!query.trim()) {
            // Show recent/all items when no query
            return searchableItems.slice(0, 8);
        }
        return (fuse.search(query) as { item: SearchableItem }[]).map(result => result.item).slice(0, 8);
    }, [query, fuse, searchableItems]);

    // Reset selected index when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchResults]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % searchResults.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (searchResults[selectedIndex]) {
                    searchResults[selectedIndex].action();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, searchResults, selectedIndex, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] pointer-events-none">
                <div
                    className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Search Input */}
                    <div className="flex items-center gap-3 p-4 border-b border-white/10">
                        <Search size={20} className="text-slate-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Buscar recetas, ingredientes, eventos..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-lg"
                        />
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Results */}
                    <div className="max-h-96 overflow-y-auto">
                        {searchResults.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <p>No se encontraron resultados</p>
                            </div>
                        ) : (
                            <div className="p-2">
                                {searchResults.map((item, index) => (
                                    <button
                                        key={item.id}
                                        onClick={item.action}
                                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${index === selectedIndex
                                            ? 'bg-primary text-white'
                                            : 'text-slate-300 hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="flex-shrink-0">
                                            {item.icon}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-medium">{item.title}</p>
                                            {item.subtitle && (
                                                <p className={`text-sm ${index === selectedIndex ? 'text-white/70' : 'text-slate-500'
                                                    }`}>
                                                    {item.subtitle}
                                                </p>
                                            )}
                                        </div>
                                        <ArrowRight
                                            size={16}
                                            className={index === selectedIndex ? 'opacity-100' : 'opacity-0'}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer hint */}
                    <div className="p-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex gap-4">
                            <span>↑↓ Navegar</span>
                            <span>↵ Seleccionar</span>
                            <span>Esc Cerrar</span>
                        </div>
                        <div>
                            {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
