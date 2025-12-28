import React, { useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { Store, ChevronDown, Check, Plus, Loader2 } from 'lucide-react';
import type { Outlet } from '@/types';
import { addDocument } from '@/services/firestoreService';
import { collections } from '@/config/collections';

export const OutletSelector: React.FC = () => {
  const { outlets, activeOutletId, setActiveOutletId, addOutlet } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newOutletName, setNewOutletName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeOutlet = outlets.find((o) => o.id === activeOutletId);

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutletName.trim()) return;

    setIsSubmitting(true);
    try {
      const newOutletData = {
        name: newOutletName,
        type: 'other',
        isActive: true,
      };
      const newId = await addDocument(collections.outlets, newOutletData);
      const newOutlet: Outlet = { id: newId, ...newOutletData } as Outlet;

      addOutlet(newOutlet);
      setActiveOutletId(newId);
      setIsCreating(false);
      setNewOutletName('');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error creating outlet:', error);
      alert('Error al crear la cocina: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative mx-4 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 group-hover:text-indigo-300 transition-colors">
            <Store size={18} />
          </div>
          <div className="text-left">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Cocina Activa
            </p>
            <p className="text-sm font-semibold text-slate-200 truncate max-w-[120px]">
              {activeOutlet ? activeOutlet.name : 'Seleccionar...'}
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            className="absolute top-full left-0 right-0 mt-2 border border-white/10 rounded-xl shadow-xl overflow-hidden z-20"
            style={{ backgroundColor: '#1A1D1F' }}
          >
            <div className="p-2 max-h-64 overflow-y-auto">
              {outlets.map((outlet) => (
                <button
                  key={outlet.id}
                  onClick={() => {
                    setActiveOutletId(outlet.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeOutletId === outlet.id
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">{outlet.name}</span>
                  {activeOutletId === outlet.id && <Check size={14} />}
                </button>
              ))}

              <div className="h-px bg-white/10 my-1" />

              {isCreating ? (
                <form onSubmit={handleCreateOutlet} className="p-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nombre nueva cocina..."
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 mb-2"
                    value={newOutletName}
                    onChange={(e) => setNewOutletName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !newOutletName.trim()}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center"
                    >
                      {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Crear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                >
                  <Plus size={14} />
                  <span>Nueva Cocina</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
