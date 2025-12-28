import React, { useState } from 'react';
import { generateMenuFromCriteria } from '@/services/geminiService';
import type { GeneratedMenu } from '@/types';
import { useInventory } from '@/presentation/store/inventoryAtoms';
import { X, Sparkles, Loader2, Check } from 'lucide-react';

interface MenuGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (menu: GeneratedMenu, context: { eventType: string; pax: number }) => void;
  initialType?: string;
  initialPax?: number;
}

export const MenuGeneratorModal: React.FC<MenuGeneratorModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialType = 'Comida',
  initialPax = 50,
}) => {
  const [eventType, setEventType] = useState(initialType);
  const [pax, setPax] = useState(initialPax);
  const [season] = useState('Current');
  const [restrictions, setRestrictions] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedMenu | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get inventory for AI context
  const { ingredients } = useInventory();

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await generateMenuFromCriteria({
        eventType,
        pax,
        season,
        restrictions: restrictions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        availableIngredients: ingredients.map((i) => i.name),
      });

      if (response.success && response.data) {
        setResult(response.data as GeneratedMenu);
      } else {
        throw new Error(response.error || 'No se pudo generar el menú');
      }
    } catch (err: any) {
      console.error(err);
      setError('Error generando el menú. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Asistente de Menús (IA)</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {!result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Evento
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option>Boda</option>
                    <option>Empresa</option>
                    <option>Comida</option>
                    <option>Cena</option>
                    <option>Coctel</option>
                    <option>Coffee Break</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comensales (PAX)
                  </label>
                  <input
                    type="number"
                    value={pax}
                    onChange={(e) => setPax(Number(e.target.value))}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restricciones / Notas
                </label>
                <textarea
                  value={restrictions}
                  onChange={(e) => setRestrictions(e.target.value)}
                  placeholder="Ej: Sin gluten, vegetariano, alergia marisco..."
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 h-20"
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Diseñando Propuesta...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generar Propuesta
                  </>
                )}
              </button>
            </div>
          ) : (
            <div>
              <div className="bg-purple-50 rounded-lg p-5 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{result.name}</h3>
                <p className="text-gray-600 text-sm italic">{result.description}</p>
              </div>

              <div className="space-y-4 mb-6">
                {result.dishes.map((dish, i) => (
                  <div
                    key={i}
                    className="border border-gray-100 rounded-lg p-4 hover:border-purple-200 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold tracking-wider text-purple-600 uppercase mb-1 block">
                          {dish.category}
                        </span>
                        <h4 className="font-medium text-gray-900">{dish.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{dish.description}</p>
                      </div>
                      {dish.allergens.length > 0 && (
                        <div className="flex gap-1 flex-wrap justify-end max-w-[30%]">
                          {dish.allergens.map((a) => (
                            <span
                              key={a}
                              className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full border border-red-100"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setResult(null)}
                  className="flex-1 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Intentar de nuevo
                </button>
                <button
                  onClick={() => onApply(result, { eventType, pax })}
                  className="flex-2 w-full py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Aplicar Menú
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
