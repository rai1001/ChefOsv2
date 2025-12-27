import React, { useEffect, useState, useCallback } from 'react';
import { Check, X, Send, FileText, ShoppingCart, Calendar, MapPin, User, Package, Clock, AlertCircle } from 'lucide-react';
import { pedidosService } from '@/services/pedidosService';
import { aprobacionService } from '@/services/aprobacionService';
import type { PurchaseOrder } from '@/types/purchases';
import { useStore } from '@/presentation/store/useStore';

interface AprobacionPedidoProps {
    outletId: string;
}

export const AprobacionPedido: React.FC<AprobacionPedidoProps> = ({ outletId }) => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useStore();
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [deliveryDate, setDeliveryDate] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryWindow, setDeliveryWindow] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [logisticsNotes, setLogisticsNotes] = useState('');

    useEffect(() => {
        if (selectedOrder) {
            setDeliveryDate(selectedOrder.deliveryDate || '');
            setDeliveryNotes(selectedOrder.deliveryNotes || '');
            setDeliveryAddress(selectedOrder.deliveryAddress || '');
            setDeliveryWindow(selectedOrder.deliveryWindow || '');
            setContactPerson(selectedOrder.contactPerson || '');
            setLogisticsNotes(selectedOrder.logisticsNotes || '');
        }
    }, [selectedOrder]);

    const [filterStatus, setFilterStatus] = useState<string>('DRAFT');

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const allOrders = await pedidosService.getAll(outletId);
            const filtered = filterStatus === 'ALL'
                ? allOrders
                : allOrders.filter(o => o.status === filterStatus);
            setOrders(filtered);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    }, [outletId, filterStatus]);

    useEffect(() => {
        if (outletId) {
            fetchOrders();
        }
    }, [outletId, filterStatus, fetchOrders]);

    const handleApprove = async (order: PurchaseOrder) => {
        if (!currentUser) return;
        if (!confirm(`¿Aprobar pedido ${order.orderNumber}?`)) return;

        try {
            await aprobacionService.approveOrder(order.id, currentUser.id, {
                deliveryDate,
                deliveryNotes,
                deliveryAddress,
                deliveryWindow,
                contactPerson,
                logisticsNotes
            });
            await fetchOrders();
            setSelectedOrder(null);
        } catch (error) {
            console.error('Error approving order:', error);
        }
    };

    const handleReject = async (order: PurchaseOrder) => {
        if (!currentUser?.id) return alert("Usuario no identificado");
        const reason = prompt("Motivo del rechazo:");
        if (reason) {
            try {
                await aprobacionService.rejectOrder(order.id, currentUser.id, reason);
                await fetchOrders();
                setSelectedOrder(null);
            } catch (error) {
                console.error('Error rejecting order:', error);
            }
        }
    };

    const handleSend = async (order: PurchaseOrder) => {
        if (!currentUser) return;
        if (!confirm(`¿Enviar pedido ${order.orderNumber} al proveedor?`)) return;

        try {
            await aprobacionService.sendOrder(order.id, currentUser.id, {
                deliveryDate,
                deliveryNotes,
                deliveryAddress,
                deliveryWindow,
                contactPerson,
                logisticsNotes
            });
            await fetchOrders();
            setSelectedOrder(null);
        } catch (error) {
            console.error('Error sending order:', error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight uppercase">
                        <Check size={28} className="text-primary animate-glow" />
                        Validación de Compras
                    </h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Gestión y Autorización de Suministros</p>
                </div>
                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 self-start shadow-inner">
                    {['DRAFT', 'APPROVED', 'ORDERED', 'ALL'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === status
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            {status === 'DRAFT' ? 'Borradores' :
                                status === 'APPROVED' ? 'Aprobados' :
                                    status === 'ORDERED' ? 'Enviados' : 'Todos'}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Order List */}
                <div className="lg:col-span-4 space-y-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-28 premium-glass animate-pulse border border-white/5" />
                            ))}
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="premium-glass p-16 text-center border-dashed border-2 border-white/5">
                            <FileText size={48} className="mx-auto mb-4 text-slate-700 opacity-20" />
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Sin pedidos pendientes</p>
                        </div>
                    ) : (
                        <div className="max-h-[700px] overflow-y-auto pr-3 space-y-4 custom-scrollbar">
                            {orders.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`p-6 premium-glass border transition-all duration-300 group relative overflow-hidden ${selectedOrder?.id === order.id
                                        ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10 scale-[1.02]'
                                        : 'border-white/5 hover:bg-white/[0.03] hover:border-white/10'
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
                                        <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${order.status === 'DRAFT' ? 'bg-orange-500/20 text-orange-400' :
                                            order.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                                order.status === 'ORDERED' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'
                                            }`}>
                                            {order.status}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end relative z-10">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {new Date(order.date).toLocaleDateString()}
                                        </p>
                                        <p className="text-2xl font-black text-white font-mono">{order.totalCost.toFixed(2)}<span className="text-xs text-primary ml-1">€</span></p>
                                    </div>
                                    <div className={`absolute left-0 top-0 w-1 h-full transition-all duration-500 ${selectedOrder?.id === order.id ? 'bg-primary opacity-100' : 'bg-white/10 opacity-0 group-hover:opacity-50'}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Order Details Panel */}
                <div className="lg:col-span-8">
                    {selectedOrder ? (
                        <div className="premium-glass overflow-hidden flex flex-col h-full border border-white/5 animate-in slide-in-from-right-4 duration-500">
                            {/* Panel Header */}
                            <div className="p-8 border-b border-white/5 bg-white/[0.01] flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <span className="bg-white/5 px-2 py-1 rounded">{selectedOrder.type}</span>
                                        <span className="text-white/10">|</span>
                                        <span className="text-slate-400">{new Date(selectedOrder.date).toLocaleString()}</span>
                                    </div>
                                    <h3 className="text-4xl font-black text-white tracking-tighter uppercase">{selectedOrder.orderNumber}</h3>
                                </div>
                                <div className="flex gap-3">
                                    {selectedOrder.status === 'DRAFT' && (
                                        <>
                                            <button
                                                onClick={() => handleReject(selectedOrder)}
                                                className="px-6 py-3 bg-white/5 text-slate-400 rounded-2xl hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all font-black uppercase text-[10px] tracking-widest flex items-center gap-2"
                                            >
                                                <X size={18} /> Descartar
                                            </button>
                                            <button
                                                onClick={() => handleApprove(selectedOrder)}
                                                className="px-8 py-4 bg-primary text-white rounded-2xl hover:bg-blue-600 transition-all font-black uppercase text-[11px] tracking-[0.15em] shadow-xl shadow-primary/25 flex items-center gap-3 border border-white/10"
                                            >
                                                <Check size={20} /> Aprobar Pedido
                                            </button>
                                        </>
                                    )}
                                    {selectedOrder.status === 'APPROVED' && (
                                        <button
                                            onClick={() => handleSend(selectedOrder)}
                                            className="px-8 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 transition-all font-black uppercase text-[11px] tracking-[0.15em] shadow-xl shadow-emerald-500/25 flex items-center gap-3 border border-white/10"
                                        >
                                            <Send size={20} /> Enviar al Proveedor
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Panel Content */}
                            <div className="p-8 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
                                {/* Summary Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl group hover:border-primary/20 transition-all">
                                        <p className="text-[10px] text-slate-500 font-black mb-2 uppercase tracking-widest flex items-center gap-2">
                                            <Package size={14} className="text-slate-600" /> Proveedor
                                        </p>
                                        <p className="text-white font-black uppercase tracking-tight truncate">{selectedOrder.supplierId || 'Sin asignar'}</p>
                                    </div>
                                    <div className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl group hover:border-primary/20 transition-all">
                                        <p className="text-[10px] text-slate-500 font-black mb-2 uppercase tracking-widest flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-600" /> Creación
                                        </p>
                                        <p className="text-white font-black uppercase tracking-tight">{new Date(selectedOrder.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="bg-white/[0.03] border border-primary/20 p-5 rounded-2xl shadow-lg shadow-primary/5">
                                        <p className="text-[10px] text-primary font-black mb-2 uppercase tracking-widest">Inversión Total</p>
                                        <p className="text-white text-3xl font-black font-mono flex items-center gap-1">
                                            {selectedOrder.totalCost.toFixed(2)} <span className="text-primary text-xl">€</span>
                                        </p>
                                    </div>
                                </div>

                                {selectedOrder.notes && (
                                    <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex gap-4 animate-glow shadow-inner">
                                        <AlertCircle className="text-amber-500 shrink-0" size={24} />
                                        <div>
                                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Nota de Sistema</p>
                                            <p className="text-sm text-slate-400 font-medium leading-relaxed italic">"{selectedOrder.notes}"</p>
                                        </div>
                                    </div>
                                )}

                                {/* Logistics Configuration */}
                                {(selectedOrder.status === 'DRAFT' || selectedOrder.status === 'APPROVED') && (
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                                            <div className="w-8 h-[2px] bg-primary" />
                                            Parámetros de Entrega
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/[0.01] p-6 rounded-3xl border border-white/5">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar size={12} /> Fecha Requerida
                                                </label>
                                                <input
                                                    type="date"
                                                    value={deliveryDate}
                                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <Clock size={12} /> Ventana Horaria
                                                </label>
                                                <input
                                                    type="text"
                                                    value={deliveryWindow}
                                                    onChange={(e) => setDeliveryWindow(e.target.value)}
                                                    placeholder="Ej: 08:00 - 11:00"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <MapPin size={12} /> Punto de Recepción
                                                </label>
                                                <input
                                                    type="text"
                                                    value={deliveryAddress}
                                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                                    placeholder="Dirección exacta del muelle o local..."
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <User size={12} /> Responsable
                                                </label>
                                                <input
                                                    type="text"
                                                    value={contactPerson}
                                                    onChange={(e) => setContactPerson(e.target.value)}
                                                    placeholder="Nombre del contacto..."
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <FileText size={12} /> Instrucciones
                                                </label>
                                                <input
                                                    type="text"
                                                    value={deliveryNotes}
                                                    onChange={(e) => setDeliveryNotes(e.target.value)}
                                                    placeholder="Anotaciones para el repartidor..."
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Items Detail */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                                        <div className="w-8 h-[2px] bg-primary" />
                                        Desglose de Artículos
                                    </h4>
                                    <div className="premium-glass overflow-hidden border border-white/5 rounded-3xl group">
                                        <table className="min-w-full divide-y divide-white/[0.05]">
                                            <thead className="bg-white/[0.03]">
                                                <tr>
                                                    <th className="px-8 py-5 text-left text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Producto</th>
                                                    <th className="px-8 py-5 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Unidades</th>
                                                    <th className="px-8 py-5 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Precio Unit.</th>
                                                    <th className="px-8 py-5 text-right text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.02]">
                                                {selectedOrder.items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-white/[0.04] transition-colors group/row">
                                                        <td className="px-8 py-5">
                                                            <div className="font-black text-white uppercase tracking-tight group-hover/row:text-primary transition-colors">
                                                                {item.tempDescription || 'Artículo Manual'}
                                                            </div>
                                                            <div className="text-[9px] text-slate-500 font-mono mt-1 opacity-40">{item.ingredientId}</div>
                                                        </td>
                                                        <td className="px-8 py-5 text-right">
                                                            <span className="text-white font-black font-mono">{item.quantity}</span>{' '}
                                                            <span className="text-[10px] text-slate-500 font-black uppercase">{item.unit}</span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right text-slate-400 font-mono text-sm">
                                                            {item.costPerUnit?.toFixed(2) || '0.00'}€
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-mono font-black text-white text-lg">
                                                            {(item.quantity * (item.costPerUnit || 0)).toFixed(2)}€
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Audit Timeline */}
                                {selectedOrder.history && selectedOrder.history.length > 0 && (
                                    <div className="space-y-6 pt-8 border-t border-white/5">
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                                            <div className="w-8 h-[2px] bg-primary" />
                                            Línea de Vida del Pedido
                                        </h4>
                                        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                                            {selectedOrder.history.map((entry, idx) => (
                                                <div key={idx} className="relative group">
                                                    <div className={`absolute -left-[27px] top-1.5 w-4 h-4 rounded-full border-4 border-slate-900 z-10 shadow-lg ${entry.status === 'APPROVED' ? 'bg-emerald-500 shadow-emerald-500/20' :
                                                        entry.status === 'REJECTED' ? 'bg-rose-500 shadow-rose-500/20' :
                                                            entry.status === 'ORDERED' ? 'bg-blue-500 shadow-blue-500/20' :
                                                                'bg-slate-600'
                                                        }`} />
                                                    <div className="premium-glass p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-white/5 group-hover:bg-white/[0.04] transition-all">
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{entry.status}</span>
                                                                <span className="text-[9px] text-slate-600 font-mono">{new Date(entry.date).toLocaleString()}</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">
                                                                Agente: <span className="text-primary">{entry.userId}</span>
                                                            </p>
                                                        </div>
                                                        {entry.notes && (
                                                            <p className="text-xs text-slate-400 font-medium italic border-l border-white/10 pl-4 py-1 flex-1 max-w-sm">
                                                                "{entry.notes}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 premium-glass border- dashed border-2 border-white/5 bg-white/[0.01] rounded-[3rem] p-24 text-center">
                            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5 relative group">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                <ShoppingCart size={40} className="text-slate-700 relative z-10" />
                            </div>
                            <h3 className="text-2xl font-black text-white/40 uppercase tracking-tighter mb-4">Inspección de Pedidos</h3>
                            <p className="text-slate-500 text-xs font-medium uppercase tracking-[0.2em] leading-relaxed max-w-sm mx-auto">
                                Seleccione una transmisión de datos para visualizar el desglose logístico y autorizar el flujo de suministros.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

