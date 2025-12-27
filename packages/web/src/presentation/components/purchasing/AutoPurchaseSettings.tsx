import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Power } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import type { AutoPurchaseSettings } from '@/types';
import { useToast } from '@/presentation/components/ui/Toast';
import { updateDocument } from '@/services/firestoreService';

interface AutoPurchaseSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const DAYS_OF_WEEK = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
];

export const AutoPurchaseSettingsModal: React.FC<AutoPurchaseSettingsProps> = ({ isOpen, onClose }) => {
    const { activeOutletId, outlets, updateOutlet } = useStore();
    const { addToast } = useToast();

    // Local state for form
    const [settings, setSettings] = useState<AutoPurchaseSettings>({
        enabled: false,
        runFrequency: 'WEEKLY',
        runDay: 1, // Monday
        runTime: '23:00',
        generateDraftsOnly: true,
        supplierSelectionStrategy: 'CHEAPEST',
        outletId: activeOutletId || ''
    });

    const [isLoading, setIsLoading] = useState(false);

    // Initial load from store
    useEffect(() => {
        if (isOpen && activeOutletId) {
            const activeOutlet = outlets.find(o => o.id === activeOutletId);
            if (activeOutlet?.autoPurchaseSettings) {
                setSettings({
                    ...activeOutlet.autoPurchaseSettings,
                    outletId: activeOutletId
                });
            } else {
                // Set defaults with correct outletId
                setSettings(prev => ({ ...prev, outletId: activeOutletId }));
            }
        }
    }, [isOpen, activeOutletId, outlets]);

    const handleSave = async () => {
        if (!activeOutletId) return;
        setIsLoading(true);
        try {
            await updateDocument('outlets', activeOutletId, {
                autoPurchaseSettings: settings
            });

            // Update store
            updateOutlet(activeOutletId, {
                autoPurchaseSettings: settings
            });

            addToast('Configuración guardada correctamente', 'success');
            onClose();
        } catch (error) {
            console.error(error);
            addToast('Error al guardar configuración', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Clock className="text-indigo-400" />
                        Configuración de Compras
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Main Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${settings.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                                <Power size={24} />
                            </div>
                            <div>
                                <h3 className="font-medium text-white">Generación Automática</h3>
                                <p className="text-xs text-slate-400">Crear borradores basados en stock</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.enabled}
                                onChange={e => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    {/* Frequency Settings */}
                    <div className={`space-y-4 transition-opacity duration-200 ${settings.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Frecuencia</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSettings(s => ({ ...s, runFrequency: 'DAILY' }))}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${settings.runFrequency === 'DAILY'
                                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                        : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                                        }`}
                                >
                                    Diaria
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSettings(s => ({ ...s, runFrequency: 'WEEKLY' }))}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${settings.runFrequency === 'WEEKLY'
                                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                        : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                                        }`}
                                >
                                    Semanal
                                </button>
                            </div>
                        </div>

                        {settings.runFrequency === 'WEEKLY' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Día de ejecución</label>
                                <select
                                    value={settings.runDay}
                                    onChange={e => setSettings(s => ({ ...s, runDay: Number(e.target.value) }))}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-indigo-500 outline-none"
                                >
                                    {DAYS_OF_WEEK.map(day => (
                                        <option key={day.value} value={day.value}>{day.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Hora de ejecución</label>
                            <input
                                type="time"
                                value={settings.runTime}
                                onChange={e => setSettings(s => ({ ...s, runTime: e.target.value }))}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-indigo-500 outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200">
                            <Clock size={14} />
                            <span>El sistema generará borradores automáticamente a esta hora.</span>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Estrategia de Proveedor</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSettings(s => ({ ...s, supplierSelectionStrategy: 'CHEAPEST' }))}
                                    className={`px-4 py-3 rounded-lg border text-xs font-medium transition-all text-center ${settings.supplierSelectionStrategy === 'CHEAPEST'
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                        : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                                        }`}
                                >
                                    El más Barato
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSettings(s => ({ ...s, supplierSelectionStrategy: 'FASTEST' }))}
                                    className={`px-4 py-3 rounded-lg border text-xs font-medium transition-all text-center ${settings.supplierSelectionStrategy === 'FASTEST'
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                                        : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                                        }`}
                                >
                                    El más Rápido
                                </button>
                            </div>
                            <p className="mt-2 text-[10px] text-slate-500 italic px-1">
                                {settings.supplierSelectionStrategy === 'CHEAPEST'
                                    ? 'Prioriza el precio más bajo entre todos los proveedores conocidos.'
                                    : 'Prioriza el menor tiempo de entrega (Lead Time).'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Guardando...' : (
                            <>
                                <Save size={18} />
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
