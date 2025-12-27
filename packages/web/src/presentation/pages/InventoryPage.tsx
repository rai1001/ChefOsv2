import React, { useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { AlertTriangle, Search, Plus, ChevronRight, Calendar, Scan, Filter, Sparkles, Upload, Package, Package2, DollarSign } from 'lucide-react';
import type { Ingredient, InventoryItem, IngredientBatch } from '@/types';
import { BarcodeScanner } from '@/presentation/components/scanner/BarcodeScanner';
import { ExpiryDateScanner } from '@/presentation/components/scanner/ExpiryDateScanner';
import { DataImportModal, type ImportType } from '@/presentation/components/common/DataImportModal';
import { updateDocument } from '@/services/firestoreService';
import { COLLECTIONS } from '@/config/collections';
import { lookupProductByBarcode, type ProductLookupResult } from '@/services/productLookupService';
import { AIInventoryAdvisor } from '@/presentation/components/inventory/AIInventoryAdvisor';
import { LabelPrinterModal } from '@/presentation/components/printing/LabelPrinterModal';
import { Printer, Trash2 } from 'lucide-react';

type ScanStep = 'idle' | 'scanning-barcode' | 'product-found' | 'scanning-expiry' | 'confirm-batch';
type FilterTab = 'all' | 'expiring' | 'low-stock' | 'meat' | 'fish' | 'produce' | 'dairy' | 'dry' | 'frozen' | 'canned' | 'cocktail' | 'sports_menu' | 'corporate_menu' | 'coffee_break' | 'restaurant' | 'cleaning' | 'preparation' | 'other';

// ⚡ Bolt: Moved outside to prevent recreation on every render
const getDaysUntilExpiry = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
};

export const InventoryPage: React.FC = () => {
    const {
        ingredients,
        activeOutletId,
        inventory,
        addBatch,
        addInventoryItem,
        updateInventoryItem
    } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleClearData = async () => {
        if (!activeOutletId) {
            alert("No hay cocina activa seleccionada.");
            return;
        }

        if (!window.confirm('¿ESTÁS SEGURO? Esto borrará el stock de todos los productos en ESTA cocina. Los ingredientes no se eliminarán, solo su existencia en inventario.')) {
            return;
        }

        setIsDeleting(true);
        try {
            // Only clear ingredients that belong to the active outlet
            // or ingredients that have batches in this outlet.
            // But since we want to clear "Inventory", we zero out stock/batches for items visible here.
            const scopedInventory = inventory.filter(item =>
                !activeOutletId || item.outletId === activeOutletId
            );

            for (const item of scopedInventory) {
                await updateDocument(COLLECTIONS.INVENTORY, item.id, {
                    stock: 0,
                    batches: []
                });
            }

            console.log('Inventory stock cleared for outlet', activeOutletId);
            alert('Inventario puesto a cero correctamente.');
        } catch (err) {
            console.error('Error clearing inventory:', err);
            alert('Error al limpiar el inventario.');
        } finally {
            setIsDeleting(false);
        }
    };

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [importType, setImportType] = useState<ImportType | null>(null);

    // Scanner Workflow State
    const [scanStep, setScanStep] = useState<ScanStep>('idle');
    const [scannedBarcode, setScannedBarcode] = useState<string>('');
    const [productLookup, setProductLookup] = useState<ProductLookupResult | null>(null);
    const [isLookingUp, setIsLookingUp] = useState(false);

    // Batch Form State
    const [batchForm, setBatchForm] = useState({
        quantity: '',
        expiryDate: '',
        costPerUnit: ''
    });

    const [isAIAdvisorOpen, setIsAIAdvisorOpen] = useState(false);
    const [printingItem, setPrintingItem] = useState<{ ingredient: Ingredient | InventoryItem, batch?: any } | null>(null);

    // Determine alerts


    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedIds(newSet);
    };

    // Start scanning workflow
    const startScanningWorkflow = () => {
        setScanStep('scanning-barcode');
    };

    // Handle barcode scan from camera
    const handleBarcodeScan = async (barcode: string) => {
        setScannedBarcode(barcode);
        setScanStep('product-found');
        setIsLookingUp(true);

        try {
            const existingIngredient = ingredients.find(
                ing => ing.defaultBarcode === barcode
            );

            if (existingIngredient) {
                setProductLookup({
                    found: true,
                    barcode,
                    name: existingIngredient.name,
                    allergens: existingIngredient.allergens,
                    nutritionalInfo: existingIngredient.nutritionalInfo,
                });
                setBatchForm({
                    quantity: '',
                    expiryDate: '',
                    costPerUnit: existingIngredient.costPerUnit.toString(),
                });
            } else {
                const result = await lookupProductByBarcode(barcode);
                setProductLookup(result);

                if (result.found) {
                    setBatchForm({
                        quantity: '',
                        expiryDate: '',
                        costPerUnit: '0',
                    });
                }
            }
        } catch (error) {
            console.error('Error looking up product:', error);
            setProductLookup({ found: false, barcode });
        } finally {
            setIsLookingUp(false);
        }
    };

    // Move to expiry date scanning
    const proceedToExpiryScan = () => {
        setScanStep('scanning-expiry');
    };

    // Handle date scanned from OCR
    const handleDateScanned = (date: Date) => {
        setBatchForm({
            ...batchForm,
            expiryDate: date.toISOString().slice(0, 10),
        });
        setScanStep('confirm-batch');
    };

    // Confirm and add batch
    const handleConfirmBatch = async () => {
        if (!productLookup || !batchForm.quantity || !batchForm.expiryDate) return;
        if (!activeOutletId) {
            alert("Selecciona una cocina activa primero.");
            return;
        }

        try {
            // Find existing InventoryItem for this outlet
            // We look up by the name found in product lookup OR ingredient name if linked
            const existingInventoryItem = inventory.find(
                inv => (inv.name === productLookup.name || inv.id === scannedBarcode) && inv.outletId === activeOutletId
            );

            const itemId = existingInventoryItem?.id || ((crypto as any).randomUUID?.() || Math.random().toString(36).substring(2, 11));

            const batchData: Partial<IngredientBatch> = {
                id: (crypto as any).randomUUID?.() || Math.random().toString(36).substring(2, 11),
                batchNumber: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
                initialQuantity: parseFloat(batchForm.quantity),
                currentQuantity: parseFloat(batchForm.quantity),
                expiresAt: new Date(batchForm.expiryDate).toISOString(),
                receivedAt: new Date().toISOString(),
                costPerUnit: parseFloat(batchForm.costPerUnit) || 0,
                barcode: scannedBarcode,
                outletId: activeOutletId,
                status: 'ACTIVE' as const
            };

            const standaloneData = {
                name: productLookup.name || 'Producto sin nombre',
                unit: 'un' as any, // Default to 'un' if not found
                category: 'other' as any,
                costPerUnit: parseFloat(batchForm.costPerUnit) || 0
            };

            // ⚡ Bolt: Using the refactored addBatch which handles standalone data
            await addBatch(itemId, batchData, standaloneData);

        } catch (error) {
            console.error("Error saving batch:", error);
            alert("Error al guardar en base de datos.");
        }

        resetScanWorkflow();
    };

    const resetScanWorkflow = () => {
        setScanStep('idle');
        setScannedBarcode('');
        setProductLookup(null);
        setBatchForm({
            quantity: '',
            expiryDate: '',
            costPerUnit: '',
        });
    };

    // Filter logic
    const filteredIngredients = React.useMemo(() => {
        // 1. Filter inventory by outlet
        let items = inventory.filter(item => !activeOutletId || item.outletId === activeOutletId);

        // 2. Search filter
        if (searchTerm.trim()) {
            const lowSearch = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.name?.toLowerCase().includes(lowSearch) ||
                item.category?.toLowerCase().includes(lowSearch)
            );
        }

        // 3. Tab filters
        if (activeFilter !== 'all') {
            if (activeFilter === 'low-stock') {
                items = items.filter((item: InventoryItem) => (item.stock || 0) <= (item.minStock || 0));
            } else if (activeFilter === 'expiring') {
                items = items.filter((item: InventoryItem) => {
                    const batches = item.batches || [];
                    return batches.some((batch: IngredientBatch) => {
                        const daysUntilExpiry = Math.floor((new Date(batch.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
                    });
                });
            } else {
                items = items.filter((item: InventoryItem) => item.category === activeFilter);
            }
        }
        return items;
    }, [inventory, searchTerm, activeFilter, activeOutletId]);

    // Count for badges
    const expiringCount = React.useMemo(() => {
        const outletInventory = inventory.filter((item: InventoryItem) => !activeOutletId || item.outletId === activeOutletId);
        return outletInventory.filter((item: InventoryItem) => {
            const batches = item.batches || [];
            return batches.some((batch: IngredientBatch) => {
                const diff = new Date(batch.expiresAt).getTime() - new Date().getTime();
                const days = Math.ceil(diff / (1000 * 3600 * 24));
                return days <= 7 && days >= 0;
            });
        }).length;
    }, [inventory, activeOutletId]);

    const lowStockCount = React.useMemo(() => {
        const outletInventory = inventory.filter((item: InventoryItem) => !activeOutletId || item.outletId === activeOutletId);
        return outletInventory.filter((item: InventoryItem) => {
            const totalStock = item.stock || 0;
            const minStock = item.minStock || 0;
            return totalStock <= minStock;
        }).length;
    }, [inventory, activeOutletId]);

    // Handle Import/OCR
    const handleImportComplete = async (data: any) => {
        if (!activeOutletId) {
            alert("Selecciona una cocina activa primero.");
            return;
        }

        if (data.items && Array.isArray(data.items)) {
            // Inventory Sheet Import (OCR or Excel)
            // Expects items with { name, quantity, unit? }
            let updatedCount = 0;
            let missedCount = 0;

            for (const item of data.items) {
                // Fuzzy search by name
                const match = ingredients.find((ing: Ingredient) =>
                    ing.name.toLowerCase().includes(item.name.toLowerCase()) ||
                    item.name.toLowerCase().includes(ing.name.toLowerCase())
                );

                if (match) {
                    try {
                        const newBatch = {
                            id: crypto.randomUUID(),
                            ingredientId: match.id,
                            initialQuantity: Number(item.quantity) || 0,
                            currentQuantity: Number(item.quantity) || 0,
                            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                            receivedAt: new Date().toISOString(),
                            costPerUnit: match.costPerUnit,
                            barcode: (match as any).defaultBarcode || '',
                            unit: match.unit,
                            batchNumber: 'LOT-IMPORT',
                            outletId: activeOutletId,
                            status: 'ACTIVE' as const
                        };

                        // Find or create InventoryItem
                        const existingInventoryItem = inventory.find(
                            (inv: InventoryItem) => inv.ingredientId === match.id && inv.outletId === activeOutletId
                        );

                        if (existingInventoryItem) {
                            const updatedBatches = [...existingInventoryItem.batches, newBatch];
                            const newStock = updatedBatches.reduce((sum: number, b: IngredientBatch) => sum + b.currentQuantity, 0);
                            // Remove unused NextExpiry calculation or use it
                            // const _nextExpiry = existingInventoryItem.batches && existingInventoryItem.batches.length > 0
                            //     ? existingInventoryItem.batches[0]
                            //     : null;

                            // The original `nextExpiry` calculation was unused.
                            // If the intent was to update the `nextExpiry` field in `InventoryItem`,
                            // it should be included in the `updateInventoryItem` call.
                            // For now, we'll just remove the unused calculation.
                            // If a `nextExpiry` field is needed, it should be added to InventoryItem type
                            // and calculated here.
                            await updateInventoryItem({
                                ...existingInventoryItem,
                                batches: updatedBatches,
                                stock: newStock,
                                updatedAt: new Date().toISOString()
                            });
                        } else {
                            const newInventoryItem: InventoryItem = {
                                id: (crypto as any).randomUUID?.() || Math.random().toString(36).substring(2, 11),
                                ingredientId: match.id,
                                outletId: activeOutletId,
                                name: match.name,
                                unit: match.unit,
                                category: (match.category || 'other') as any,
                                costPerUnit: match.costPerUnit || 0,
                                stock: newBatch.currentQuantity,
                                theoreticalStock: newBatch.currentQuantity,
                                minStock: 5,
                                optimalStock: 10,
                                batches: [newBatch],
                                updatedAt: new Date().toISOString()
                            };
                            await addInventoryItem(newInventoryItem);
                        }

                        updatedCount++;
                    } catch (e) {
                        console.error("Error updating stock for", item.name, e);
                    }
                } else {
                    // CREATE STANDALONE ITEM FOR UNMATCHED INGREDIENTS
                    try {
                        const newBatch = {
                            id: crypto.randomUUID(),
                            initialQuantity: Number(item.quantity) || 0,
                            currentQuantity: Number(item.quantity) || 0,
                            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                            receivedAt: new Date().toISOString(),
                            costPerUnit: 0,
                            unit: item.unit || 'uds',
                            batchNumber: 'LOT-IMPORT-NEW',
                            outletId: activeOutletId,
                            status: 'ACTIVE' as const
                        };

                        const newInventoryItem: InventoryItem = {
                            id: (crypto as any).randomUUID?.() || Math.random().toString(36).substring(2, 11),
                            outletId: activeOutletId,
                            name: item.name.toUpperCase(),
                            unit: item.unit || 'uds',
                            category: 'other',
                            costPerUnit: 0,
                            stock: newBatch.currentQuantity,
                            theoreticalStock: newBatch.currentQuantity,
                            minStock: 5,
                            optimalStock: 10,
                            batches: [newBatch],
                            updatedAt: new Date().toISOString()
                        };

                        await addInventoryItem(newInventoryItem);
                        updatedCount++;
                    } catch (e) {
                        console.error("Error creating standalone item for", item.name, e);
                        missedCount++;
                    }
                }
            }

            if (updatedCount > 0) {
                alert(`Inventario actualizado: ${updatedCount} productos procesados.` + (missedCount > 0 ? ` (${missedCount} no encontrados)` : ''));
            } else if (missedCount > 0) {
                alert(`No se encontraron coincidencias para ${missedCount} productos.`);
            }

        }
        setImportType(null);
    };

    return (
        <div className="p-6 md:p-10 space-y-8 min-h-screen bg-transparent text-slate-100 fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter uppercase">
                        <Package2 className="text-primary animate-pulse w-10 h-10" />
                        Inventario <span className="text-primary">&</span> Stock
                    </h1>
                    <p className="text-slate-500 text-xs font-bold mt-2 tracking-[0.3em] uppercase">Gestión de Existencias Inteligente v2.0</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setIsAIAdvisorOpen(true)}
                        className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-500/20 transition-all active:scale-95 shadow-lg shadow-indigo-500/10"
                    >
                        <Sparkles size={16} />
                        AI Advisor
                    </button>
                    <button
                        onClick={() => setImportType('inventory')}
                        className="bg-white/5 text-slate-300 border border-white/10 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95"
                    >
                        <Upload size={16} />
                        Importar
                    </button>
                    <button
                        onClick={handleClearData}
                        disabled={isDeleting}
                        className="bg-red-500/10 text-red-400 border border-red-500/20 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-red-500/20 transition-all active:scale-95"
                    >
                        <Trash2 size={16} />
                        {isDeleting ? '...' : 'Clear'}
                    </button>
                    <button
                        onClick={() => setPrintingItem({ ingredient: undefined as any })}
                        className="bg-white/5 text-slate-300 border border-white/10 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95"
                    >
                        <Printer size={16} />
                        Etiqueta
                    </button>
                    <button
                        onClick={startScanningWorkflow}
                        className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-primary/50"
                    >
                        <Scan size={16} />
                        Nuevo Lote
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Total Ítems UI</p>
                        <p className="text-2xl font-black text-white font-mono">{inventory.filter((item: InventoryItem) => !activeOutletId || item.outletId === activeOutletId).length}</p>
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Bajo Stock</p>
                        <p className="text-2xl font-black text-white font-mono">{lowStockCount}</p>
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Caducan Pronto</p>
                        <p className="text-2xl font-black text-white font-mono">{expiringCount}</p>
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Valor Total</p>
                        <p className="text-2xl font-black text-white font-mono">
                            {inventory
                                .filter((item: InventoryItem) => !activeOutletId || item.outletId === activeOutletId)
                                .reduce((acc: number, item: InventoryItem) => {
                                    const itemVal = item.stock * item.costPerUnit;
                                    return acc + (isNaN(itemVal) ? 0 : itemVal);
                                }, 0).toFixed(0)}€
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Search Container */}
            <div className="premium-glass p-2 flex flex-col xl:flex-row gap-4 justify-between items-center rounded-2xl">
                <div className="flex gap-1 overflow-x-auto max-w-full pb-1 custom-scrollbar">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeFilter === 'all'
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <Filter size={14} />
                        Todo
                    </button>

                    <div className="w-px h-6 bg-white/10 self-center mx-1" />

                    <button
                        onClick={() => setActiveFilter('low-stock')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeFilter === 'low-stock'
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                            : 'text-rose-400 hover:bg-rose-500/10'
                            }`}
                    >
                        <AlertTriangle size={14} />
                        Bajo Stock
                        {lowStockCount > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px] ml-1">{lowStockCount}</span>}
                    </button>

                    <button
                        onClick={() => setActiveFilter('expiring')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeFilter === 'expiring'
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                            : 'text-amber-400 hover:bg-amber-500/10'
                            }`}
                    >
                        <Calendar size={14} />
                        Caducidad
                        {expiringCount > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px] ml-1">{expiringCount}</span>}
                    </button>

                    <div className="w-px h-6 bg-white/10 self-center mx-1" />

                    {/* Simple Category Dropdown or Horizontal Scroll */}
                    <div className="flex gap-1">
                        {[
                            { id: 'meat', label: 'Carne' },
                            { id: 'fish', label: 'Pescado' },
                            { id: 'produce', label: 'Agro' },
                            { id: 'dry', label: 'Secos' },
                        ].map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveFilter(cat.id as any)}
                                className={`px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border whitespace-nowrap ${activeFilter === cat.id
                                    ? 'bg-white/10 border-white/20 text-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search */}
                <div className="w-full xl:w-96 relative group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="BUSCAR INGREDIENTE O LOTE..."
                        className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all text-slate-200 placeholder-slate-600 font-medium text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Inventory Table Container */}
            <div className="premium-glass p-0 overflow-hidden min-h-[500px] flex flex-col">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                    <table className="w-full">
                        <thead className="bg-white/[0.02] border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-12"></th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Producto</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stock Actual</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Valor</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredIngredients.map((ing: InventoryItem, _idx: number) => {
                                const totalStock = ing.stock || 0;
                                const totalValue = ing.batches?.reduce((acc: number, b: IngredientBatch) => acc + (b.currentQuantity * b.costPerUnit), 0) || (totalStock * ing.costPerUnit);
                                const minStock = ing.minStock || 0;
                                const isLowStock = totalStock <= minStock;
                                const nearExpiryBatches = ing.batches?.filter((b: IngredientBatch) => getDaysUntilExpiry(b.expiresAt) <= 7) || [];
                                const isExpanded = expandedIds.has(ing.id);

                                return (
                                    <React.Fragment key={ing.id}>
                                        <tr
                                            className={`transition-all duration-200 group relative ${isExpanded ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'}`}
                                        // style={{ animationDelay: `${idx * 50}ms` }} // Optional stagger
                                        >
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleExpand(ing.id)}
                                                    className={`p-2 rounded-lg transition-all ${isExpanded
                                                        ? 'bg-primary/20 text-primary rotate-90'
                                                        : 'text-slate-600 hover:text-slate-300 hover:bg-white/5'}`}
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-200 text-sm group-hover:text-primary transition-colors">{ing.name}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                                                        {ing.category === 'preparation' ? 'Elaboración' : (ing.category || 'General')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-flex flex-col items-center">
                                                    <span className={`font-mono font-black text-lg ${isLowStock ? 'text-rose-400' : 'text-slate-200'}`}>
                                                        {totalStock.toFixed(2)}
                                                    </span>
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase">{ing.unit}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-mono text-slate-400 font-medium">
                                                    {totalValue.toFixed(2)}€
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {isLowStock && (
                                                        <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center gap-1.5">
                                                            <AlertTriangle size={12} className="text-rose-500" />
                                                            <span className="text-[9px] font-black text-rose-400 uppercase tracking-wide">Bajo</span>
                                                        </div>
                                                    )}
                                                    {nearExpiryBatches.length > 0 && (
                                                        <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-1.5">
                                                            <Calendar size={12} className="text-amber-500" />
                                                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wide">Caducidad</span>
                                                        </div>
                                                    )}
                                                    {!isLowStock && nearExpiryBatches.length === 0 && (
                                                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5 opacity-50">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wide">OK</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setProductLookup({
                                                                found: true,
                                                                barcode: '',
                                                                name: ing.name,
                                                            });
                                                            setScannedBarcode(ing.id);
                                                            setBatchForm({
                                                                quantity: '',
                                                                expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                                                                costPerUnit: ing.costPerUnit.toString()
                                                            });
                                                            setScanStep('scanning-expiry');
                                                        }}
                                                        className="p-2 hover:bg-primary/20 rounded-lg text-slate-400 hover:text-primary transition-colors"
                                                        title="Registrar Lote"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPrintingItem({ ingredient: ing });
                                                        }}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                        title="Imprimir Etiqueta"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expanded Batch Details */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={6} className="px-10 pb-8 pt-2 bg-white/[0.01]">
                                                    <div className="bg-background/50 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                                                        <div className="bg-white/5 px-6 py-3 border-b border-white/5 flex justify-between items-center">
                                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trazabilidad de Lotes</h4>
                                                            <div className="text-[10px] text-slate-500 font-mono">ID: {ing.id}</div>
                                                        </div>
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-white/[0.02] text-slate-500 text-[10px] uppercase tracking-widest font-black">
                                                                <tr>
                                                                    <th className="px-6 py-3 text-left">F. Recepción</th>
                                                                    <th className="px-6 py-3 text-left">Caducidad</th>
                                                                    <th className="px-6 py-3 text-left">Stock Actual</th>
                                                                    <th className="px-6 py-3 text-left">Val. Unitario</th>
                                                                    <th className="px-6 py-3 text-center w-24">Estado</th>
                                                                    <th className="px-6 py-3 text-right">Acciones</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/[0.02]">
                                                                {ing.batches?.sort((a: IngredientBatch, b: IngredientBatch) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()).map((batch: IngredientBatch) => {
                                                                    const daysToExpiry = getDaysUntilExpiry(batch.expiresAt);
                                                                    const isExpired = daysToExpiry < 0;
                                                                    const isNearExpiry = daysToExpiry <= 3;

                                                                    return (
                                                                        <tr key={batch.id} className="hover:bg-white/[0.03] transition-colors group/batch">
                                                                            <td className="px-6 py-4 text-slate-400 font-mono">
                                                                                {new Date(batch.receivedAt).toLocaleDateString('es-ES')}
                                                                            </td>
                                                                            <td className="px-6 py-4">
                                                                                <div className={`font-bold ${isExpired ? 'text-rose-400' : isNearExpiry ? 'text-amber-400' : 'text-slate-200'}`}>
                                                                                    {new Date(batch.expiresAt).toLocaleDateString('es-ES')}
                                                                                </div>
                                                                                <div className="text-[10px] text-slate-500 uppercase font-black">{daysToExpiry === 0 ? 'Caduca hoy' : daysToExpiry < 0 ? `Vencido hace ${Math.abs(daysToExpiry)}d` : `Quedan ${daysToExpiry} días`}</div>
                                                                            </td>
                                                                            <td className="px-6 py-4">
                                                                                <span className="font-bold text-slate-200 font-mono text-base">{batch.currentQuantity}</span>
                                                                                <span className="text-[10px] text-slate-500 font-bold uppercase ml-1.5">{ing.unit}</span>
                                                                            </td>
                                                                            <td className="px-6 py-4 text-slate-300 font-mono">€{batch.costPerUnit.toFixed(2)}</td>
                                                                            <td className="px-6 py-4 text-center">
                                                                                {isExpired ? (
                                                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white uppercase">Vencido</span>
                                                                                ) : isNearExpiry ? (
                                                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-black uppercase animate-pulse">Alerta</span>
                                                                                ) : (
                                                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 uppercase">Activo</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-6 py-4 text-right">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setPrintingItem({ ingredient: ing, batch });
                                                                                    }}
                                                                                    className="p-2 bg-white/5 text-slate-400 rounded-lg hover:bg-primary hover:text-white transition-colors"
                                                                                    title="Imprimir Etiqueta Lote"
                                                                                >
                                                                                    <Printer size={14} />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                                {(!ing.batches || ing.batches.length === 0) && (
                                                                    <tr>
                                                                        <td colSpan={6} className="px-6 py-10 text-center text-slate-600 text-xs italic">
                                                                            No hay lotes activos para este producto.
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {filteredIngredients.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <div className="bg-white/5 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                                            <Search className="text-slate-700" size={32} />
                                        </div>
                                        <div className="text-slate-400 text-lg font-bold">Sin resultados</div>
                                        <div className="text-slate-600 text-sm mt-1 max-w-xs mx-auto">
                                            {searchTerm ? `No encontramos nada parecido a "${searchTerm}"` : 'Pronto aparecerán tus productos aquí.'}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Scanner Workflow Modals */}

            {printingItem && (
                <LabelPrinterModal
                    ingredient={printingItem.ingredient}
                    batch={printingItem.batch}
                    onClose={() => setPrintingItem(null)}
                />
            )}

            {/* Barcode Scanner */}
            {
                scanStep === 'scanning-barcode' && (
                    <BarcodeScanner
                        onScan={handleBarcodeScan}
                        onClose={() => setScanStep('idle')}
                    />
                )
            }

            {/* Product Found Modal */}
            {
                scanStep === 'product-found' && productLookup && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-surface rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-2xl font-bold mb-4 text-white">
                                {productLookup.found ? '✓ Producto Encontrado' : '⚠️ Producto No Encontrado'}
                            </h3>

                            {isLookingUp ? (
                                <div className="flex flex-col items-center py-12">
                                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-4" />
                                    <p className="text-slate-400">Buscando producto...</p>
                                </div>
                            ) : productLookup.found ? (
                                <div className="space-y-4">
                                    {productLookup.imageUrl && (
                                        <img
                                            src={productLookup.imageUrl}
                                            alt={productLookup.name}
                                            className="w-32 h-32 object-contain mx-auto rounded-lg border border-white/10 bg-white/5"
                                        />
                                    )}
                                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                                        <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Nombre</p>
                                        <p className="text-xl font-bold text-white mt-0.5">{productLookup.name}</p>
                                        {productLookup.brand && (
                                            <>
                                                <p className="text-sm text-slate-500 mt-3 uppercase tracking-wider font-semibold">Marca</p>
                                                <p className="text-slate-300 mt-0.5">{productLookup.brand}</p>
                                            </>
                                        )}
                                        {productLookup.allergens && productLookup.allergens.length > 0 && (
                                            <>
                                                <p className="text-sm text-slate-500 mt-3 uppercase tracking-wider font-semibold">Alérgenos</p>
                                                <div className="flex flex-wrap gap-2 mt-1.5">
                                                    {productLookup.allergens.map((allergen, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="bg-orange-500/10 text-orange-400 text-xs px-2.5 py-1 rounded-lg border border-orange-500/20"
                                                        >
                                                            {allergen}
                                                        </span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={resetScanWorkflow}
                                            className="flex-1 px-4 py-3 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={proceedToExpiryScan}
                                            className="flex-1 px-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                                        >
                                            Escanear Fecha →
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                                        <p className="text-slate-300">
                                            No se encontró información para el código <span className="font-mono font-bold text-white">{scannedBarcode}</span>
                                        </p>
                                        <p className="text-sm text-slate-500 mt-2">
                                            Puedes continuar introduciendo los datos manualmente.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1.5">Nombre del Producto</label>
                                            <input
                                                type="text"
                                                value={productLookup.name || ''}
                                                onChange={(e) => setProductLookup({ ...productLookup, name: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all outline-none"
                                                placeholder="Nombre..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={resetScanWorkflow}
                                            className="flex-1 px-4 py-3 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={proceedToExpiryScan}
                                            disabled={!productLookup.name}
                                            className="flex-1 px-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Continuar →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Expiry Date Scanner */}
            {
                scanStep === 'scanning-expiry' && productLookup && (
                    <ExpiryDateScanner
                        productName={productLookup.name}
                        onDateScanned={handleDateScanned}
                        onClose={resetScanWorkflow}
                    />
                )
            }

            {/* Confirm Batch Modal */}
            {
                scanStep === 'confirm-batch' && productLookup && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                                <Plus className="text-primary" /> Confirmar Entrada de Stock
                            </h3>

                            <div className="mb-6 bg-primary/5 p-4 rounded-xl border border-primary/20">
                                <div className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Producto</div>
                                <div className="text-lg font-bold text-white mt-0.5">{productLookup.name}</div>
                                <div className="text-sm text-slate-500 mt-4 uppercase tracking-wider font-semibold">Fecha de Caducidad</div>
                                <div className="text-lg font-bold text-white mt-0.5">
                                    {new Date(batchForm.expiryDate).toLocaleDateString('es-ES')}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">
                                        Cantidad (unidades)
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        min="1"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-lg font-medium text-white focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all outline-none"
                                        value={batchForm.quantity}
                                        onChange={e => setBatchForm({ ...batchForm, quantity: e.target.value })}
                                        autoFocus
                                        placeholder="1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">
                                        Coste Unitario (€) <span className="text-slate-500 font-normal">(opcional)</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all outline-none"
                                        value={batchForm.costPerUnit}
                                        onChange={e => setBatchForm({ ...batchForm, costPerUnit: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={resetScanWorkflow}
                                    className="flex-1 px-4 py-3 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmBatch}
                                    disabled={!batchForm.quantity}
                                    className="flex-1 px-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirmar Entrada
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                importType && (
                    <DataImportModal
                        isOpen={!!importType}
                        onClose={() => setImportType(null)}
                        onImportComplete={handleImportComplete}
                        type={importType}
                    />
                )
            }
            {
                isAIAdvisorOpen && (
                    <AIInventoryAdvisor
                        outletId={activeOutletId || ''}
                        isOpen={isAIAdvisorOpen}
                        onClose={() => setIsAIAdvisorOpen(false)}
                    />
                )
            }
        </div >
    );
};



