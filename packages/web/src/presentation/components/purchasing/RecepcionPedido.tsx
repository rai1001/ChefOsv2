import React, { useEffect, useState } from 'react';
import { PackageCheck, Calendar, CheckCircle, Package, Search, AlertCircle, ArrowLeft } from 'lucide-react';
import { pedidosService } from '@/services/pedidosService';
import { recepcionService } from '@/services/recepcionService';
import type { PurchaseOrder } from '@/types/purchases';
import { useStore } from '@/presentation/store/useStore';

interface RecepcionPedidoProps {
    outletId: string;
}

export const RecepcionPedido: React.FC<RecepcionPedidoProps> = ({ outletId }) => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const { currentUser } = useStore();
    const [loading, setLoading] = useState(true);

    const [receiveData, setReceiveData] = useState<Record<string, { quantity: number, expiryDate: string }>>({});

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const orders = await pedidosService.getOrdersByStatus(outletId, ['ORDERED', 'PARTIAL']);
            setOrders(orders);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [outletId]);

    const handleSelectOrder = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        const initialData: Record<string, any> = {};
        order.items.forEach(item => {
            initialData[item.ingredientId] = {
                quantity: item.quantity,
                expiryDate: ''
            };
        });
        setReceiveData(initialData);
    };

    const handleReceiveSubmit = async () => {
        if (!selectedOrder || !currentUser?.id) return;

        if (!confirm('¿Confirmar recepción de mercancía? El inventario se actualizará automáticamente.')) return;

        const itemsToReceive = Object.entries(receiveData)
            .filter(([_, data]) => data.quantity > 0)
            .map(([ingId, data]) => ({
                ingredientId: ingId,
                quantity: Number(data.quantity),
                expiryDate: data.expiryDate || undefined
            }));

        try {
            await recepcionService.receiveOrder(selectedOrder, itemsToReceive, currentUser.id);
            fetchOrders();
            setSelectedOrder(null);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight uppercase">
                        <PackageCheck size={28} className="text-primary animate-glow" />
                        Recepción de Mercancía
                    </h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Control de Calidad y Entrada de Suministros</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* List */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-primary transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar pedido o proveedor..."
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-all"
                        />
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-28 premium-glass animate-pulse" />
                            ))}
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="premium-glass p-16 text-center border-dashed border-2 border-white/5">
                            <Package size={48} className="mx-auto mb-4 text-slate-700 opacity-20" />
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Sin entregas pendientes</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {orders.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => handleSelectOrder(order)}
                                    className={`p-6 premium-glass border transition-all duration-300 group relative overflow-hidden ${selectedOrder?.id === order.id
                                        ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10 scale-[1.02]'
                                        : 'border-white/5 hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="space-y-1">
                                            <span className="font-mono text-xs font-black text-white tracking-widest uppercase">
                                                {order.orderNumber}
                                            </span>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-[150px]">
                                                {order.supplierId}
                                            </p>
                                        </div>
                                        <div className="px-2 py-1 bg-primary/20 text-primary rounded-md text-[8px] font-black uppercase tracking-widest">
                                            {order.status}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end relative z-10">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {new Date(order.date).toLocaleDateString()}
                                        </p>
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest font-mono">
                                            {order.items.length} SKUs
                                        </p>
                                    </div>
                                    <div className={`absolute left-0 top-0 w-1 h-full transition-all duration-500 ${selectedOrder?.id === order.id ? 'bg-primary opacity-100' : 'bg-white/10 opacity-0 group-hover:opacity-50'}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Receive Form */}
                <div className="lg:col-span-8">
                    {selectedOrder ? (
                        <div className="premium-glass overflow-hidden flex flex-col h-full border border-white/5 animate-in slide-in-from-right-4 duration-500">
                            {/* Panel Header */}
                            <div className="p-8 border-b border-white/5 bg-white/[0.01] flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setSelectedOrder(null)}
                                        className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-primary transition-colors mb-2"
                                    >
                                        <ArrowLeft size={12} /> Volver a la lista
                                    </button>
                                    <h3 className="text-4xl font-black text-white tracking-tighter uppercase">{selectedOrder.orderNumber}</h3>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{selectedOrder.supplierId}</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleReceiveSubmit}
                                        className="px-8 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-50 transition-all font-black uppercase text-[11px] tracking-[0.15em] shadow-xl shadow-emerald-500/25 flex items-center gap-3 border border-white/10"
                                    >
                                        <CheckCircle size={20} /> Finalizar Entrada
                                    </button>
                                </div>
                            </div>

                            <div className="p-8">
                                <div className="premium-glass overflow-hidden border border-white/5 rounded-3xl group">
                                    <table className="min-w-full divide-y divide-white/[0.05]">
                                        <thead className="bg-white/[0.03]">
                                            <tr>
                                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Producto</th>
                                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Pedido</th>
                                                <th className="px-8 py-5 text-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Entrada Real</th>
                                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Caducidad</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.02]">
                                            {selectedOrder.items.map(item => (
                                                <tr key={item.ingredientId} className="hover:bg-white/[0.04] transition-colors group/row">
                                                    <td className="px-8 py-6">
                                                        <div className="font-black text-white uppercase tracking-tight group-hover/row:text-primary transition-colors">
                                                            {item.tempDescription || 'Ingrediente ' + item.ingredientId}
                                                        </div>
                                                        <div className="text-[9px] text-slate-500 font-mono mt-1 opacity-40 uppercase">Stock Actual: Analizando...</div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <span className="text-white font-black font-mono text-lg">{item.quantity}</span>{' '}
                                                        <span className="text-[10px] text-slate-500 font-black uppercase">{item.unit}</span>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="inline-flex items-center bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="w-24 bg-transparent px-4 py-2 text-center text-white font-black font-mono focus:outline-none"
                                                                value={receiveData[item.ingredientId]?.quantity || 0}
                                                                onChange={(e) => setReceiveData({
                                                                    ...receiveData,
                                                                    [item.ingredientId]: { ...(receiveData[item.ingredientId] || { expiryDate: '' }), quantity: Number(e.target.value) }
                                                                })}
                                                            />
                                                            <span className="bg-white/5 px-3 py-2 text-[9px] font-black text-slate-500 uppercase border-l border-white/10">{item.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="relative inline-block w-40">
                                                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                                                            <input
                                                                type="date"
                                                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-[10px] font-black text-white focus:outline-none focus:border-primary transition-all font-mono"
                                                                value={receiveData[item.ingredientId]?.expiryDate || ''}
                                                                onChange={(e) => setReceiveData({
                                                                    ...receiveData,
                                                                    [item.ingredientId]: { ...(receiveData[item.ingredientId] || { quantity: 0 }), expiryDate: e.target.value }
                                                                })}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-8 p-6 bg-primary/5 border border-primary/10 rounded-3xl flex gap-4 items-center">
                                    <AlertCircle className="text-primary shrink-0" size={24} />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                        Revise que las cantidades y fechas de caducidad sean correctas. Al confirmar, el inventario se incrementará inmediatamente. En caso de desperfectos, ajuste la cantidad de entrada.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[600px] flex flex-col items-center justify-center text-slate-500 premium-glass border-dashed border-2 border-white/5 bg-white/[0.01] rounded-[3rem] p-24 text-center">
                            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-8 border border-blue-500/20 relative group scale-110">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                                <PackageCheck size={40} className="text-primary relative z-10" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Muelle de Carga Digital</h3>
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.2em] leading-relaxed max-w-sm mx-auto">
                                Seleccione un despacho en tránsito para iniciar el proceso de verificación de stock y control de mermas directas.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

