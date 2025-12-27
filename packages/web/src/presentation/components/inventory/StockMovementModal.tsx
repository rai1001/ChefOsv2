import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, ArrowRightLeft, AlertTriangle, DollarSign, Archive, ClipboardCheck } from 'lucide-react';
import { LegacyIngredient } from '@/domain/entities/Ingredient';
import { StockTransactionType } from '@/domain/entities/StockTransaction';
import { useInventory } from '@/presentation/store/inventoryAtoms';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/presentation/store/authAtoms';

interface StockMovementModalProps {
    ingredient: LegacyIngredient;
    onClose: () => void;
    onSuccess: () => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({ ingredient, onClose, onSuccess }) => {
    const user = useAtomValue(userAtom);
    const { registerMovement, performAudit, loading, error } = useInventory();

    const [type, setType] = useState<StockTransactionType>('PURCHASE');

    const { register, handleSubmit, reset, setValue } = useForm({
        defaultValues: {
            quantity: 0,
            cost: ingredient.costPerUnit || 0,
            reason: '',
            batchId: '',
            orderId: ''
        }
    });

    // Reset form when type changes
    useEffect(() => {
        reset({ quantity: 0, cost: ingredient.costPerUnit || 0, reason: '', batchId: '', orderId: '' });
        if (type === 'AUDIT') {
            setValue('quantity', ingredient.stock || 0);
        }
    }, [type, ingredient, reset, setValue]);

    const onSubmit = async (data: any) => {
        if (!user) {
            alert("No user logged in");
            return;
        }

        try {
            if (type === 'AUDIT') {
                await performAudit(
                    ingredient.id,
                    Number(data.quantity),
                    user.displayName || 'Unknown',
                    ingredient.name,
                    ingredient.unit
                );
            } else {
                // Determine sign based on type
                let qty = Number(data.quantity);
                if (type === 'WASTE' || type === 'USAGE') {
                    qty = -Math.abs(qty);
                }

                // For adjustments, we trust the sign entered or force it? 
                // Let's assume adjustment can be + or -
                if (type === 'ADJUSTMENT') {
                    // Keep as is
                }

                // Purchase is positive.

                await registerMovement({
                    ingredientId: ingredient.id,
                    ingredientName: ingredient.name,
                    quantity: qty,
                    unit: ingredient.unit,
                    type: type,
                    performedBy: user.displayName || 'Unknown',
                    costPerUnit: Number(data.cost),
                    reason: data.reason,
                    batchId: data.batchId,
                    orderId: data.orderId,
                    relatedEntityId: undefined
                });
            }
            onSuccess();
            onClose();
        } catch (e) {
            console.error("Transaction failed", e);
        }
    };

    const getTypeIcon = (t: StockTransactionType) => {
        switch (t) {
            case 'PURCHASE': return <DollarSign size={20} />;
            case 'WASTE': return <Archive size={20} />;
            case 'AUDIT': return <ClipboardCheck size={20} />;
            case 'USAGE': return <ArrowRightLeft size={20} />;
            default: return <AlertTriangle size={20} />;
        }
    };

    const getRefColor = (t: StockTransactionType) => {
        switch (t) {
            case 'PURCHASE': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'WASTE': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
            case 'AUDIT': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'USAGE': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-wide">Movimiento de Stock</h2>
                        <p className="text-slate-400 text-xs mt-1">{ingredient.name} ({ingredient.stock} {ingredient.unit})</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Type Selector */}
                <div className="p-4 grid grid-cols-3 gap-2 border-b border-white/5">
                    {(['PURCHASE', 'USAGE', 'WASTE', 'AUDIT', 'ADJUSTMENT'] as StockTransactionType[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setType(t)}
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-wider ${type === t
                                ? getRefColor(t) + ' border-current'
                                : 'border-transparent bg-white/5 text-slate-500 hover:bg-white/10'
                                }`}
                        >
                            {getTypeIcon(t)}
                            {t}
                        </button>
                    ))}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            {type === 'AUDIT' ? 'Stock Real Contado' : 'Cantidad'} ({ingredient.unit})
                        </label>
                        <input
                            type="number"
                            step="0.001"
                            {...register('quantity', { required: true })}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none font-mono text-lg"
                        />
                    </div>

                    {type === 'PURCHASE' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Coste Total (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('cost')}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Coste unitario actual: {ingredient.costPerUnit}€</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Motivo / Notas</label>
                        <textarea
                            {...register('reason')}
                            rows={3}
                            placeholder="Opcional..."
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                            {error}
                        </div>
                    )}

                </form>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-white/5 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        <Save size={16} />
                        {loading ? 'Guardando...' : 'Confirmar'}
                    </button>
                </div>

            </div>
        </div>
    );
};
