import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Loader2, ShoppingCart, Info, TrendingDown, TrendingUp, Package } from 'lucide-react';
import Select from 'react-select';
import { useStore } from '@/presentation/store/useStore';
import { pedidosService } from '@/services/pedidosService';
import { useToast } from '@/presentation/components/ui';
import type { PurchaseOrderItem } from '@/types/purchases';
import type { Unit } from '@/types/inventory';

interface ManualPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ManualPurchaseModal: React.FC<ManualPurchaseModalProps> = ({ isOpen, onClose }) => {
    const { suppliers, activeOutletId, ingredients, inventory } = useStore();
    const { addToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [supplierId, setSupplierId] = useState('');
    const [items, setItems] = useState<Partial<PurchaseOrderItem>[]>([]);

    const selectStyles = {
        control: (base: any, state: any) => ({
            ...base,
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderColor: state.isFocused ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '2px',
            boxShadow: state.isFocused ? '0 0 0 1px rgba(99, 102, 241, 0.2)' : 'none',
            '&:hover': {
                borderColor: 'rgba(255,255,255,0.2)',
            }
        }),
        menu: (base: any) => ({
            ...base,
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            overflow: 'hidden',
            zIndex: 100,
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isFocused ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: state.isFocused ? '#FFF' : '#94A3B8',
            padding: '10px 15px',
            cursor: 'pointer',
            '&:active': {
                backgroundColor: 'rgba(99, 102, 241, 0.25)',
            }
        }),
        singleValue: (base: any) => ({
            ...base,
            color: '#F8FAFC'
        }),
        input: (base: any) => ({
            ...base,
            color: '#F8FAFC'
        }),
        placeholder: (base: any) => ({
            ...base,
            color: '#475569',
            fontSize: '12px'
        })
    };

    const supplierOptions = useMemo(() =>
        suppliers.map(s => ({ value: s.id, label: s.name })),
        [suppliers]);

    const ingredientOptions = useMemo(() =>
        ingredients.map(ing => {
            const invItem = inventory.find(i => i.ingredientId === ing.id);
            return {
                value: ing.id,
                label: ing.name,
                unit: ing.unit,
                cost: ing.costPerUnit,
                stock: invItem?.stock || 0,
                minStock: invItem?.minStock || 0
            };
        }),
        [ingredients, inventory]);

    if (!isOpen) return null;

    const addItem = () => {
        setItems([...items, { ingredientId: '', quantity: 1, unit: 'kg' as Unit, costPerUnit: 0 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, data: Partial<PurchaseOrderItem>) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], ...data };

        if (data.ingredientId) {
            const ing = ingredients.find(i => i.id === data.ingredientId);
            if (ing) {
                newItems[index].unit = ing.unit;
                newItems[index].costPerUnit = ing.costPerUnit || 0;
                newItems[index].tempDescription = ing.name;
            }
        }

        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId || items.length === 0 || !activeOutletId) {
            addToast('Por favor, selecciona un proveedor y añade al menos un artículo', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const orderItems: PurchaseOrderItem[] = items.map(item => ({
                ingredientId: item.ingredientId!,
                quantity: Number(item.quantity),
                unit: item.unit!,
                costPerUnit: Number(item.costPerUnit),
                tempDescription: item.tempDescription || 'Artículo Manual'
            }));

            await pedidosService.createManualOrder(supplierId, orderItems, activeOutletId);

            addToast('Compra manual creada correctamente', 'success');
            onClose();
            setItems([]);
            setSupplierId('');
        } catch (error) {
            console.error('Error creating manual purchase:', error);
            addToast('Error al crear la compra manual', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-xl">
            <div className="premium-glass p-1 max-w-3xl w-full animate-in fade-in zoom-in duration-300 overflow-hidden m-4">
                <div className="bg-slate-900/40 p-8">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
                                <ShoppingCart className="text-primary animate-glow w-8 h-8" />
                                Nueva Compra Manual
                            </h3>
                            <p className="text-slate-500 text-xs font-bold mt-1 tracking-widest uppercase">Aprovisionamiento Directo de Inventario</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Supplier Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                    <Package className="w-3 h-3" /> Proveedor Responsable
                                </label>
                                <Select
                                    options={supplierOptions}
                                    placeholder="Buscar proveedor..."
                                    styles={selectStyles}
                                    value={supplierOptions.find(o => o.value === supplierId)}
                                    onChange={(option: any) => setSupplierId(option?.value || '')}
                                    isClearable
                                />
                            </div>
                            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-4">
                                <Info className="text-primary w-5 h-5 shrink-0" />
                                <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                                    Las compras manuales se guardarán como borradores listos para aprobación o recepción inmediata.
                                </p>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <label className="text-xs font-black text-white uppercase tracking-[0.2em]">Artículos en Compra</label>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="bg-white/5 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl text-xs flex items-center gap-2 font-black transition-all border border-primary/10 hover:border-primary/40 uppercase tracking-wider"
                                >
                                    <Plus size={14} /> Añadir Línea
                                </button>
                            </div>

                            <div className="max-h-[350px] overflow-y-auto space-y-4 pr-3 custom-scrollbar min-h-[100px]">
                                {items.map((item, index) => {
                                    const selectedIng = ingredientOptions.find(o => o.value === item.ingredientId);
                                    const isPriceHigher = (item.costPerUnit || 0) > (selectedIng?.cost || 0);

                                    return (
                                        <div key={index} className="group relative bg-white/[0.02] hover:bg-white/[0.05] p-5 rounded-2xl border border-white/5 transition-all duration-300">
                                            <div className="grid grid-cols-12 gap-5 items-end">
                                                <div className="col-span-12 lg:col-span-5 space-y-2">
                                                    <label className="block text-[9px] font-black uppercase text-slate-500 tracking-widest">Producto / Ingrediente</label>
                                                    <Select
                                                        options={ingredientOptions}
                                                        placeholder="Buscar ingrediente..."
                                                        styles={selectStyles}
                                                        value={selectedIng}
                                                        onChange={(option: any) => updateItem(index, { ingredientId: option?.value || '' })}
                                                        formatOptionLabel={(opt: any) => (
                                                            <div className="flex justify-between items-center py-0.5">
                                                                <span className="font-bold">{opt.label}</span>
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-black ${opt.stock <= opt.minStock ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                        Stock: {opt.stock} {opt.unit}
                                                                    </span>
                                                                    <span className="text-[10px] font-mono text-slate-400">{opt.cost.toFixed(2)}€</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    />
                                                </div>
                                                <div className="col-span-4 lg:col-span-2 space-y-2">
                                                    <label className="block text-[9px] font-black uppercase text-slate-500 tracking-widest">Cantidad</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            required
                                                            min="0"
                                                            step="any"
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-primary outline-none transition-all"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase">{item.unit || 'uds'}</span>
                                                    </div>
                                                </div>
                                                <div className="col-span-5 lg:col-span-3 space-y-2">
                                                    <label className="block text-[9px] font-black uppercase text-slate-500 tracking-widest flex justify-between">
                                                        Precio Unid.
                                                        {selectedIng && (
                                                            <span className={`flex items-center gap-1 ${isPriceHigher ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                {isPriceHigher ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                                {Math.abs(((item.costPerUnit || 0) - selectedIng.cost) / selectedIng.cost * 100).toFixed(0)}%
                                                            </span>
                                                        )}
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            required
                                                            min="0"
                                                            step="any"
                                                            className={`w-full bg-black/40 border rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none transition-all ${isPriceHigher ? 'border-red-500/30' : 'border-white/10'}`}
                                                            value={item.costPerUnit}
                                                            onChange={(e) => updateItem(index, { costPerUnit: Number(e.target.value) })}
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">€</span>
                                                    </div>
                                                </div>
                                                <div className="col-span-3 lg:col-span-2 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="absolute left-0 top-0 w-1 h-0 group-hover:h-full bg-primary transition-all duration-300 opacity-0 group-hover:opacity-100" />
                                        </div>
                                    );
                                })}
                                {items.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-600 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                                        <Package className="w-12 h-12 mb-4 opacity-10" />
                                        <p className="text-sm font-black uppercase tracking-widest opacity-40">Sin artículos seleccionados</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 gap-6">
                            <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-3xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Estimado</p>
                                <div className="text-3xl font-black text-white font-mono flex items-center gap-1">
                                    {items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.costPerUnit || 0)), 0).toFixed(2)}
                                    <span className="text-primary text-xl">€</span>
                                </div>
                            </div>
                            <div className="flex gap-4 w-full md:w-auto">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="flex-1 md:px-8 py-4 text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || items.length === 0}
                                    className="flex-1 md:flex-none md:px-10 py-4 bg-primary hover:bg-blue-600 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all border border-white/10 uppercase tracking-widest disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart size={20} />}
                                    Finalizar Compra
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

