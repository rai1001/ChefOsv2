/**
 * @file src/components/fichas/FichaTecnicaForm.tsx
 * @description Main form for creating and editing Fichas Técnicas.
 */

import React, { useState } from 'react';
import { Save, FileText, ChevronLeft, ChevronRight, Check, Trash2, Plus } from 'lucide-react';
import { useFichaTecnicaForm } from '@/hooks/useFichaTecnicaForm';
import { IngredientesSelector } from './IngredientesSelector';
import { CostosPreview } from './CostosPreview';
import { HistorialVersiones } from './HistorialVersiones';
import { ComparadorVersiones } from './ComparadorVersiones';
import { generarPDFFicha } from '@/services/pdfService';
import type { FichaTecnica, VersionFicha } from '@/types';
// TODO FASE 3: Restore when social-chef components are re-implemented
// import { SocialChefButton } from '../social-chef/SocialChefButton';
// import { SocialChefModal } from '../social-chef/SocialChefModal';
// import { generateMarketingContent } from '@/services/socialChef';

interface Props {
  initialData?: Partial<FichaTecnica>;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

type TabType = 'general' | 'ingredientes' | 'pasos' | 'analisis' | 'historial';

export const FichaTecnicaForm: React.FC<Props> = ({ initialData, userId, onClose, onSaved }) => {
  const {
    formData,
    isSaving,
    error,
    updateGeneral,
    addIngrediente,
    removeIngrediente,
    updateIngrediente,
    addPaso,
    removePaso,
    save,
  } = useFichaTecnicaForm(initialData, userId);

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [newStep, setNewStep] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<VersionFicha | null>(null);
  // TODO FASE 3: Restore when SocialChef is re-implemented
  // const [socialChefOpen, setSocialChefOpen] = useState(false);

  const handleSave = async () => {
    const success = await save();
    if (success) {
      onSaved();
    }
  };

  const TABS = [
    { id: 'general', label: '1. General' },
    { id: 'ingredientes', label: '2. Ingredientes' },
    { id: 'pasos', label: '3. Preparación' },
    { id: 'analisis', label: '4. Análisis' },
    ...(initialData?.id ? [{ id: 'historial', label: 'Historial' }] : []),
  ];

  return (
    <div className="bg-surface-light rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      {/* Header */}
      <header className="px-6 py-4 bg-surface border-b border-white/10 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">
            {initialData?.id ? 'Editar Ficha Técnica' : 'Nueva Ficha Técnica'}
          </h2>
          <p className="text-xs text-slate-500">Completa la información detallada del plato.</p>
        </div>
        <div className="flex gap-2">
          {initialData?.id && (
            <button
              onClick={() => generarPDFFicha({ ...formData, id: initialData.id! } as FichaTecnica)}
              className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"
              title="Descargar PDF"
            >
              <FileText className="w-5 h-5" />
            </button>
          )}
          {/* TODO FASE 3: Restore SocialChefButton */}
          {/* {initialData?.id && initialData?.foto && (
            <SocialChefButton onClick={() => setSocialChefOpen(true)} />
          )} */}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            {isSaving ? (
              'Guardando...'
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Ficha
              </>
            )}
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="flex px-6 bg-surface/50 border-b border-white/5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Nombre del Plato
              </label>
              <input
                className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none transition-all"
                value={formData.nombre}
                onChange={(e) => updateGeneral({ nombre: e.target.value })}
                placeholder="Ej. Risotto de Setas"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Categoría
              </label>
              <select
                className="w-full bg-surface border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none appearance-none"
                value={formData.categoria}
                onChange={(e) => updateGeneral({ categoria: e.target.value as any })}
              >
                <option value="comida">Comida</option>
                <option value="bebida">Bebida</option>
                <option value="postre">Postre</option>
                <option value="ingrediente-preparado">Ingrediente Preparado (Sub-receta)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Porciones por Receta
              </label>
              <input
                type="number"
                className="w-32 bg-surface border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none transition-all"
                value={formData.porciones}
                onChange={(e) => updateGeneral({ porciones: Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        {activeTab === 'ingredientes' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Composición</h3>
              <p className="text-sm text-slate-500 mb-4">
                Añade los ingredientes y especifica las cantidades brutas.
              </p>
              <IngredientesSelector
                ingredientes={formData.ingredientes}
                onAdd={addIngrediente}
                onRemove={removeIngrediente}
                onUpdate={updateIngrediente}
              />
            </div>
          </div>
        )}

        {activeTab === 'pasos' && (
          <div className="space-y-6 max-w-3xl">
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-surface border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none transition-all"
                  placeholder="Descripción del paso..."
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && newStep && (addPaso(newStep), setNewStep(''))
                  }
                />
                <button
                  onClick={() => newStep && (addPaso(newStep), setNewStep(''))}
                  className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-colors border border-white/10"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {formData.pasos.map((paso, idx) => (
                  <div
                    key={paso.id}
                    className="flex gap-4 p-4 bg-surface rounded-xl border border-white/5 group"
                  >
                    <span className="text-primary font-bold">{idx + 1}</span>
                    <p className="flex-1 text-sm text-slate-300">{paso.descripcion}</p>
                    <button
                      onClick={() => removePaso(idx)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analisis' && (
          <div className="space-y-8">
            <div className="space-y-4 border-b border-white/5 pb-8">
              <h3 className="text-lg font-medium text-white">Análisis de Costos</h3>
              <CostosPreview
                costos={formData.costos}
                pricing={formData.pricing}
                onUpdatePricing={(updates) =>
                  updateGeneral({ pricing: { ...formData.pricing, ...updates } } as any)
                }
              />
            </div>
          </div>
        )}

        {activeTab === 'historial' && initialData?.id && (
          <HistorialVersiones
            fichaId={initialData.id}
            currentFicha={{ ...formData, id: initialData.id } as FichaTecnica}
            onSelectVersion={setSelectedVersion}
          />
        )}
      </div>

      {/* Comparison Modal Overlay */}
      {selectedVersion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <ComparadorVersiones
              v1={selectedVersion.snapshot}
              v2={{ ...formData, id: initialData?.id } as FichaTecnica}
              onClose={() => setSelectedVersion(null)}
            />
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <footer className="px-6 py-4 bg-surface border-t border-white/10 flex justify-between">
        <button
          disabled={activeTab === 'general'}
          onClick={() =>
            setActiveTab(
              TABS[Math.max(0, TABS.findIndex((t) => t.id === activeTab) - 1)]?.id as TabType
            )
          }
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-0"
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        {activeTab !== 'analisis' && activeTab !== 'historial' ? (
          <button
            onClick={() =>
              setActiveTab(
                TABS[Math.min(TABS.length - 1, TABS.findIndex((t) => t.id === activeTab) + 1)]
                  ?.id as TabType
              )
            }
            className="flex items-center gap-2 text-sm text-primary hover:text-blue-400 font-medium transition-colors"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <span className="text-sm text-green-500 flex items-center gap-2 font-medium">
            <Check className="w-4 h-4" /> Sección Finalizada
          </span>
        )}
      </footer>
      {/* TODO FASE 3: Restore SocialChefModal */}
      {/* {initialData?.foto && (
        <SocialChefModal
          isOpen={socialChefOpen}
          onClose={() => setSocialChefOpen(false)}
          recipeName={initialData.nombre || 'Plato'}
          imagePath={initialData.foto}
          onGenerate={() =>
            generateMarketingContent(initialData.nombre || 'Plato', initialData.foto!, 'HOTEL')
          }
        />
      )} */}
    </div>
  );
};
