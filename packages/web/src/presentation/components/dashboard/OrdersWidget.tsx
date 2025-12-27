import React, { useMemo, useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Truck, ShoppingBag, AlertCircle, FileText, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ManualPurchaseModal } from './ManualPurchaseModal';

export const OrdersWidget: React.FC = () => {
    const { purchaseOrders, suppliers } = useStore();
    const navigate = useNavigate();
    const [tab, setTab] = useState<'incoming' | 'pending'>('incoming');
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const incomingOrders = useMemo(() => {
        return purchaseOrders.filter(po => {
            if (po.status !== 'ORDERED') return false;
            // Assuming deliveryDate exists, otherwise check creation date + lead time?
            // Use deliveryDate if available
            if (po.deliveryDate) {
                return isWithinInterval(parseISO(po.deliveryDate), { start: weekStart, end: weekEnd });
            }
            return false;
        }).sort((a, b) => new Date(a.deliveryDate!).getTime() - new Date(b.deliveryDate!).getTime());
    }, [purchaseOrders, weekStart, weekEnd]);

    const pendingOrders = useMemo(() => {
        // Show DRAFTS
        return purchaseOrders
            .filter(po => po.status === 'DRAFT')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [purchaseOrders]);

    const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Proveedor Desconocido';

    return (
        <div className="premium-glass p-0 flex flex-col h-full fade-in-up" style={{ animationDelay: '600ms' }}>
            <div className="flex border-b border-white/5 bg-white/[0.02]">
                <button
                    onClick={() => setTab('incoming')}
                    className={`flex-1 p-4 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative
                        ${tab === 'incoming' ? 'text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}
                    `}
                >
                    <Truck className={`w-4 h-4 ${tab === 'incoming' ? 'text-primary animate-glow' : ''}`} />
                    Llegadas
                    {tab === 'incoming' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />}
                </button>
                <button
                    onClick={() => setTab('pending')}
                    className={`flex-1 p-4 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative
                        ${tab === 'pending' ? 'text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}
                    `}
                >
                    <ShoppingBag className={`w-4 h-4 ${tab === 'pending' ? 'text-accent animate-glow' : ''}`} />
                    Borradores
                    {pendingOrders.length > 0 && (
                        <span className="bg-accent text-black text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-lg">{pendingOrders.length}</span>
                    )}
                    {tab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent shadow-[0_0_10px_rgba(var(--accent),0.5)]" />}
                </button>
                <button
                    onClick={() => setIsManualModalOpen(true)}
                    className="px-5 text-primary hover:bg-primary/10 transition-all border-l border-white/5 group"
                    title="Añadir Compra Manual"
                >
                    <Plus className="w-5 h-5 group-hover:scale-125 transition-transform" />
                </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-2">
                {tab === 'incoming' ? (
                    incomingOrders.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                            <Truck className="w-8 h-8 opacity-20" />
                            <p className="text-sm">Sin entregas previstas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {incomingOrders.map((po, i) => (
                                <div
                                    key={po.id}
                                    className="p-4 rounded-xl bg-white/[0.02] border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/[0.05] transition-all duration-300 group"
                                    style={{ animationDelay: `${700 + (i * 50)}ms` }}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">{getSupplierName(po.supplierId).toUpperCase()}</span>
                                        <span className="text-emerald-400 font-mono font-black text-lg text-glow">{po.totalCost.toFixed(2)}€</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-3 text-[11px] text-slate-400 font-medium">
                                        <span className="bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">{po.items.length} ítems</span>
                                        <div className="flex items-center gap-1.5 text-emerald-300/80">
                                            <Truck className="w-3.5 h-3.5" />
                                            <span className="font-mono">{format(parseISO(po.deliveryDate!), 'EEE d MMM', { locale: es }).toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    pendingOrders.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                            <FileText className="w-8 h-8 opacity-20" />
                            <p className="text-sm">No hay borradores</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pendingOrders.map(po => (
                                <div key={po.id} className="p-3 rounded-lg bg-surface border border-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer" onClick={() => navigate('/purchasing')}>
                                    <div className="flex justify-between">
                                        <span className="font-bold text-slate-200">{getSupplierName(po.supplierId)}</span>
                                        <span className="text-slate-400 font-mono">{po.totalCost.toFixed(2)}€</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                                        <span>{po.items.length} ítems</span>
                                        <div className="flex items-center gap-1 text-amber-300">
                                            <AlertCircle className="w-3 h-3" />
                                            Borrador
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
            <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                <button
                    onClick={() => navigate('/purchasing')}
                    className="w-full text-center text-[11px] font-black text-slate-400 hover:text-primary uppercase tracking-[0.2em] transition-all duration-300"
                >
                    GESTIÓN DE COMPRAS →
                </button>
            </div>

            <ManualPurchaseModal
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
            />
        </div>
    );
};
