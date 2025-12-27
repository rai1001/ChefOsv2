import React, { useState, useEffect } from 'react';
import type { PurchaseOrder } from '@/types';
import { useStore } from '@/presentation/store/useStore';
import { X, PackageCheck, AlertTriangle, Loader2 } from 'lucide-react';

interface OrderDetailModalProps {
    order: PurchaseOrder;
    onClose: () => void;
    onReceive: (orderId: string, receivedItems: Record<string, number>) => Promise<void>;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose, onReceive }) => {
    const { suppliers, ingredients } = useStore();
    const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
    const [isReceiving, setIsReceiving] = useState(false);

    useEffect(() => {
        // Initialize received quantities with already received amounts or 0
        const initial: Record<string, number> = {};
        order.items.forEach(item => {
            initial[item.ingredientId] = item.receivedQuantity || 0;
        });
        setReceivedQuantities(initial);
    }, [order]);

    const supplier = suppliers.find(s => s.id === order.supplierId);

    const handleQuantityChange = (ingredientId: string, val: number) => {
        setReceivedQuantities(prev => ({
            ...prev,
            [ingredientId]: val
        }));
    };

    const handleReceiveSubmit = async () => {
        setIsReceiving(true);
        try {
            await onReceive(order.id, receivedQuantities);
            onClose();
        } finally {
            setIsReceiving(false);
        }
    };

    const canReceive = order.status === 'ORDERED' || order.status === 'PARTIAL';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            Pedido {order.id.slice(0, 8)}
                            <span className={`px-2 py-0.5 rounded text-xs uppercase ${order.status === 'RECEIVED' ? 'bg-emerald-500/20 text-emerald-300' :
                                order.status === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-300' :
                                    order.status === 'ORDERED' ? 'bg-blue-500/20 text-blue-300' :
                                        'bg-slate-500/20 text-slate-300'
                                }`}>
                                {order.status}
                            </span>
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {supplier?.name || 'Proveedor Desconocido'} • {new Date(order.date).toLocaleDateString()}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-400">
                            {order.deliveryDate && (
                                <span className="flex items-center gap-1"><span className="text-slate-500">Entrega:</span> <span className="text-white">{new Date(order.deliveryDate).toLocaleDateString()}</span></span>
                            )}
                            {order.deliveryWindow && (
                                <span className="flex items-center gap-1"><span className="text-slate-500">Horario:</span> <span className="text-white">{order.deliveryWindow}</span></span>
                            )}
                            {order.contactPerson && (
                                <span className="flex items-center gap-1"><span className="text-slate-500">Contacto:</span> <span className="text-white">{order.contactPerson}</span></span>
                            )}
                        </div>
                        {order.deliveryAddress && (
                            <p className="text-xs text-slate-500 mt-1">
                                <span className="font-semibold">Dirección:</span> {order.deliveryAddress}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <table className="w-full text-left border-collapse">
                        <thead className="text-xs uppercase bg-black/20 text-slate-500 sticky top-0">
                            <tr>
                                <th className="p-3">Ingrediente</th>
                                <th className="p-3 text-right">Cant. Pedida</th>
                                <th className="p-3 text-right">Cant. Recibida</th>
                                {canReceive && <th className="p-3 text-right">A Recepcionar</th>}
                                <th className="p-3 text-right">Coste Est.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {order.items.map(item => {
                                const ingredient = ingredients.find(i => i.id === item.ingredientId);
                                return (
                                    <tr key={item.ingredientId} className="hover:bg-white/5">
                                        <td className="p-3 font-medium text-white">
                                            {ingredient?.name || 'Desconocido'}
                                        </td>
                                        <td className="p-3 text-right text-slate-300">
                                            {item.quantity} {item.unit}
                                        </td>
                                        <td className="p-3 text-right text-emerald-400 font-mono">
                                            {item.receivedQuantity || 0} {item.unit}
                                        </td>
                                        {canReceive && (
                                            <td className="p-3 text-right">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                    className="w-24 bg-black/20 border border-white/10 rounded px-2 py-1 text-right text-white focus:border-indigo-500"
                                                    value={receivedQuantities[item.ingredientId] ?? 0}
                                                    onChange={(e) => handleQuantityChange(item.ingredientId, Number(e.target.value))}
                                                />
                                            </td>
                                        )}
                                        <td className="p-3 text-right text-slate-400">
                                            {(item.costPerUnit * item.quantity).toFixed(2)}€
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t border-white/10 bg-white/5 font-bold">
                            <tr>
                                <td colSpan={canReceive ? 4 : 3} className="p-4 text-right text-white">Total Estimado</td>
                                <td className="p-4 text-right text-emerald-400">{order.totalCost.toFixed(2)}€</td>
                            </tr>
                        </tfoot>
                    </table>

                    {canReceive && (
                        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="text-blue-400 shrink-0 mt-0.5" size={20} />
                            <div className="text-sm text-slate-300">
                                <p className="font-bold text-blue-300 mb-1">Recepción de Mercancía</p>
                                <p>Ingresa las cantidades entregadas en la columna "A Recepcionar". Al guardar, el stock se actualizará automáticamente y el estado del pedido cambiará a "RECIBIDO" (si se completa) o "PARCIAL".</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-surface">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                        disabled={isReceiving}
                    >
                        Cerrar
                    </button>
                    {canReceive && (
                        <button
                            onClick={handleReceiveSubmit}
                            disabled={isReceiving}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isReceiving ? <Loader2 className="animate-spin" size={20} /> : <PackageCheck size={20} />}
                            {isReceiving ? 'Procesando...' : 'Confirmar Recepción'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
