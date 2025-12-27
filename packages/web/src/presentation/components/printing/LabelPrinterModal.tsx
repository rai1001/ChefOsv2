import React, { useState, useRef } from 'react';
import Barcode from 'react-barcode';
import { X, Printer, Snowflake, Leaf, ThermometerSnowflake, Package } from 'lucide-react';
import type { Ingredient, InventoryItem } from '@/types';
import { useStore } from '@/presentation/store/useStore';
import { generateLabelPDF, printBlob } from '@/utils/labelGenerator';

interface LabelPrinterModalProps {
    ingredient?: Ingredient | InventoryItem;
    batch?: any; // Flexible for now
    onClose: () => void;
}

type LabelType = 'congelado' | 'fresco' | 'pasteurizado' | 'elaborado' | 'abatido';


export const LabelPrinterModal: React.FC<LabelPrinterModalProps> = ({ ingredient, batch, onClose }) => {
    const { currentUser } = useStore();
    const [selectedTypes, setSelectedTypes] = useState<LabelType[]>(['congelado']);
    const [selectedSize, setSelectedSize] = useState<{ id: string; w: number; h: number }>({ id: '50x30', w: 50, h: 30 });
    const [expiryDate, setExpiryDate] = useState(
        batch?.expiresAt ? new Date(batch.expiresAt).toISOString().split('T')[0] :
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [customName, setCustomName] = useState('');
    const [quantity, setQuantity] = useState(batch?.currentQuantity?.toString() || '1');
    const [_isPrinting, setIsPrinting] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const PRESET_SIZES = [
        { id: '50x30', label: 'Estándar', w: 50, h: 30 },
        { id: '75x50', label: 'Mediana', w: 75, h: 50 },
        { id: '100x50', label: 'Grande', w: 100, h: 50 },
    ];

    const calculateExpiryDays = (types: LabelType[]): number => {
        if (types.includes('congelado')) return 90; // 3 months
        if (types.includes('pasteurizado')) return 21; // 21 days
        if (types.includes('abatido')) return 5; // 5 days
        return 3; // Default 3 days for fresh/elaborado
    };

    const toggleType = (type: LabelType) => {
        let newTypes = [];
        if (selectedTypes.includes(type)) {
            newTypes = selectedTypes.filter(t => t !== type);
        } else {
            newTypes = [...selectedTypes, type];
        }
        setSelectedTypes(newTypes);

        // Auto-calculate expiry based on the new selection
        const days = calculateExpiryDays(newTypes);
        const newDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        setExpiryDate(newDate.toISOString().split('T')[0]);
    };

    const getDominantColorClass = () => {
        if (selectedTypes.includes('congelado')) return { text: 'text-blue-600', border: 'border-blue-600', bg: 'bg-blue-500/20' };
        if (selectedTypes.includes('abatido')) return { text: 'text-cyan-600', border: 'border-cyan-500', bg: 'bg-cyan-500/20' };
        if (selectedTypes.includes('pasteurizado')) return { text: 'text-amber-500', border: 'border-amber-500', bg: 'bg-amber-500/20' };
        if (selectedTypes.includes('fresco')) return { text: 'text-emerald-600', border: 'border-emerald-600', bg: 'bg-emerald-500/20' };
        return { text: 'text-indigo-600', border: 'border-indigo-600', bg: 'bg-indigo-500/20' };
    };

    const getCombinedLabel = () => {
        if (selectedTypes.length === 0) return 'ETIQUETA';
        return selectedTypes.map(t => {
            switch (t) {
                case 'congelado': return 'CONGELADO';
                case 'fresco': return 'FRESCO';
                case 'pasteurizado': return 'PASTEURIZADO';
                case 'elaborado': return 'ELABORADO';
                case 'abatido': return 'ABATIDO';
                default: return '';
            }
        }).join(' + ');
    };

    // Use batch barcode or ingredient/item default or generate one
    const barcodeValue = batch?.barcode || (ingredient as any)?.defaultBarcode || (ingredient as any)?.barcode || `GEN-${Date.now().toString().slice(-8)}`;
    const colors = getDominantColorClass();

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            const blob = await generateLabelPDF({
                title: ingredient ? ingredient.name : (customName || 'NOMBRE PRODUCTO'),
                type: getCombinedLabel(),
                productionDate: new Date().toISOString(),
                expiryDate: new Date(expiryDate || new Date()).toISOString(),
                batchNumber: batch?.batchNumber || 'MANUAL-' + Date.now().toString().slice(-6),
                quantity: quantity + (ingredient?.unit ? ` ${ingredient.unit}` : ''),
                user: currentUser?.name || currentUser?.email || 'Chef',
                allergens: (ingredient as Partial<Ingredient>)?.allergens || [],
                width: selectedSize.w,
                height: selectedSize.h
            });
            printBlob(blob);
            // onClose(); // Optional: close after print
        } catch (error) {
            console.error("Failed to generate label:", error);
            alert("Error al generar la etiqueta");
        } finally {
            setIsPrinting(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-surface rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col md:flex-row overflow-hidden border border-white/10 shadow-2xl">

                {/* Controls Section - Left/Top */}
                <div className="w-full md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-white/10 flex flex-col gap-6 overflow-y-auto bg-background/50">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Printer size={24} className="text-primary" />
                            Imprimir Etiqueta
                        </h2>
                        <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Tipo de Etiqueta</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => toggleType('congelado')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedTypes.includes('congelado') ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                <Snowflake size={24} />
                                <span className="text-xs font-bold">Congelado</span>
                            </button>
                            <button
                                onClick={() => toggleType('fresco')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedTypes.includes('fresco') ? 'border-emerald-500 bg-emerald-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                <Leaf size={24} />
                                <span className="text-xs font-bold">Fresco</span>
                            </button>
                            <button
                                onClick={() => toggleType('pasteurizado')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedTypes.includes('pasteurizado') ? 'border-amber-500 bg-amber-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                <ThermometerSnowflake size={24} />
                                <span className="text-xs font-bold">Past.</span>
                            </button>
                            <button
                                onClick={() => toggleType('elaborado')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedTypes.includes('elaborado') ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                <Package size={24} />
                                <span className="text-xs font-bold">Elaborado</span>
                            </button>
                            <button
                                onClick={() => toggleType('abatido')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedTypes.includes('abatido') ? 'border-cyan-500 bg-cyan-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                <Snowflake size={24} className="text-cyan-400" />
                                <span className="text-xs font-bold">Abatido</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Tamaño de Etiqueta</label>
                        <div className="flex gap-2">
                            {PRESET_SIZES.map(size => (
                                <button
                                    key={size.id}
                                    onClick={() => setSelectedSize(size)}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${selectedSize.id === size.id ? 'border-primary bg-primary/20 text-primary' : 'border-white/10 bg-white/5 text-slate-500 hover:bg-white/10'}`}
                                >
                                    {size.id}mm
                                    <span className="block text-[10px] font-normal opacity-60 font-sans">{size.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {!ingredient && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Nombre del Producto</label>
                                <input
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder="Ej: Salsa Trufa Evento"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Fecha Caducidad</label>
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Cantidad ({ingredient?.unit || 'un'})</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    <div className="mt-auto pt-6 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            <Printer size={20} />
                            Imprimir
                        </button>
                    </div>
                </div>

                {/* Preview Section - Right/Bottom */}
                <div className="flex-1 bg-black/50 p-8 flex items-center justify-center relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-center text-slate-400 mb-4 text-sm font-bold uppercase tracking-wider">Vista Previa ({selectedSize.id}mm)</p>

                        {/* PREVIEW CONTAINER - Scaled to look realistic on screen but matching print ratios */}
                        <div
                            ref={printRef}
                            className="bg-white text-black p-2 shadow-xl flex flex-col relative transition-all duration-300"
                            style={{
                                width: `${selectedSize.w * 5}px`,
                                height: `${selectedSize.h * 5}px`,
                                boxSizing: 'border-box'
                            }}
                        >
                            {/* Header */}
                            <div className={`text-center font-black text-xs uppercase py-1 border-b-2 mb-2 whitespace-nowrap overflow-hidden text-ellipsis ${colors.border} ${colors.text}`}>
                                {getCombinedLabel()}
                            </div>

                            {/* Name */}
                            <div className="font-black text-2xl mb-2 leading-none uppercase overflow-hidden max-h-[60px]">
                                {ingredient ? ingredient.name : (customName || 'NOMBRE PRODUCTO')}
                            </div>

                            {/* Grid Dates */}
                            <div className="grid grid-cols-1 gap-2 mb-2">
                                <div className="border border-gray-300 rounded-lg px-2 py-1 flex justify-between items-center bg-gray-50">
                                    <span className="font-bold text-[14px] text-gray-500 uppercase tracking-tighter">ELAB</span>
                                    <span className="font-black text-[22px] leading-none">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                </div>
                                <div className="border border-gray-900 rounded-lg px-2 py-1 flex justify-between items-center bg-gray-100">
                                    <span className="font-bold text-[14px] text-gray-900 uppercase tracking-tighter">EXP</span>
                                    <span className="font-black text-[28px] leading-none">{new Date(expiryDate || new Date()).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                </div>
                            </div>

                            {/* Batch Info */}
                            <div className="flex justify-between text-xs font-mono mb-auto">
                                <span>LOT: {batch?.batchNumber?.slice(-6) || '-----'}</span>
                                <span className="font-sans font-bold">{quantity} {ingredient?.unit || 'un'}</span>
                            </div>

                            {/* Barcode */}
                            <div className="mt-auto flex justify-center h-[40px] overflow-hidden">
                                <Barcode
                                    value={barcodeValue}
                                    width={1.2}
                                    height={30}
                                    fontSize={10}
                                    displayValue={false} // Hide value text to save space, redundant with generic LOT text maybe?
                                    margin={0}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
