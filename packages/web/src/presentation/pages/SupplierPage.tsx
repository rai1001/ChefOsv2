import React, { useState, useMemo } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { Plus, Camera, Loader2, Trash2, Truck, Package, Euro, Search, ChevronDown, ChevronUp, History, X } from 'lucide-react';
import type { Supplier } from '@/types/suppliers';
import { proveedoresService } from '@/services/proveedoresService';
import { firestoreService } from '@/services/firestoreService';
import { COLLECTIONS } from '@/config/collections';

import { UniversalImporter } from '@/presentation/components/common/UniversalImporter';
import { ProveedoresList } from '@/presentation/components/proveedores/ProveedoresList';
import { ProveedorForm } from '@/presentation/components/proveedores/ProveedorForm';

// Helper for random charts or real data if available
const Sparkline = ({ data, color }: { data: number[], color: string }) => (
    <div className="flex items-end gap-1 h-8">
        {data.map((h, i) => (
            <div
                key={i}
                className={`w-1 rounded-t-sm ${color} opacity-60`}
                style={{ height: `${h}%` }}
            />
        ))}
    </div>
);

export const SupplierPage: React.FC = () => {
    const { suppliers, addSupplier, updateSupplier, deleteSupplier, ingredients, activeOutletId } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleClearData = async () => {
        if (!window.confirm('¿ESTÁS SEGURO? Esto borrará TODOS los proveedores permanentemente.')) return;
        setIsDeletingAll(true);
        try {
            await firestoreService.deleteAll(COLLECTIONS.SUPPLIERS);
            // Force reload as a simple sync mechanism if store doesn't auto-update
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('Error al borrar datos');
        } finally {
            setIsDeletingAll(false);
        }
    };

    // Ingredient View State
    const [viewingIngredientsSupplier, setViewingIngredientsSupplier] = useState<Supplier | null>(null);
    const [expandedIngredientId, setExpandedIngredientId] = useState<string | null>(null);

    // Initial Form Data for Scan or New
    const [initialFormData, setInitialFormData] = useState<Partial<Supplier> | null>(null);


    const handleOpenModal = (supplier?: Supplier) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setInitialFormData(supplier);
        } else {
            setEditingSupplier(null);
            setInitialFormData(null);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
        setInitialFormData(null);
        setIsSubmitting(false);
    };

    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            if (!base64) {
                setIsScanning(false);
                return;
            }

            try {
                // Call AI service to analyze image
                const { analyzeImage } = await import('../../services/geminiService');
                const prompt = `
                        Analiza esta tarjeta de visita o cabecera de factura. Extrae datos del PROVEEDOR:
                        {
                            "name": "Nombre Empresa",
                            "contactName": "Persona de contacto",
                            "phone": "Teléfono",
                            "email": "Email",
                            "address": "Dirección"
                        }
                     `;

                const result = await analyzeImage(base64, prompt);
                if (result.success && result.data) {
                    const s = result.data;
                    const scannedData = {
                        name: s.name || '',
                        contactName: s.contactName || '',
                        email: s.email || '',
                        phone: s.phone || '',
                        address: s.address || '',
                        leadTime: 1,
                        minimumOrderValue: 0,
                        orderDays: []
                    } as Partial<Supplier>;

                    setEditingSupplier(null);
                    setInitialFormData(scannedData);
                    setIsModalOpen(true);
                }
            } catch (err) {
                console.error(err);
                alert('Error al analizar imagen');
            } finally {
                setIsScanning(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFormSubmit = async (data: Omit<Supplier, 'id'>) => {
        if (!activeOutletId) {
            alert("Por favor, selecciona una cocina activa.");
            return;
        }

        setIsSubmitting(true);
        try {
            const supplierData = {
                ...data,
                outletId: activeOutletId
            };

            if (editingSupplier) {
                await proveedoresService.update(editingSupplier.id, supplierData);
                updateSupplier({ ...editingSupplier, ...supplierData } as Supplier);
            } else {
                const newId = await proveedoresService.create(supplierData);
                addSupplier({ id: newId, ...supplierData } as Supplier);
            }
            handleCloseModal();
        } catch (error) {
            console.error("Error saving supplier:", error);
            alert("Error al guardar el proveedor. Inténtalo de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar a ${name}?`)) return;

        try {
            await proveedoresService.delete(id);
            deleteSupplier(id);
        } catch (error) {
            console.error("Error deleting supplier:", error);
            alert("Error al eliminar el proveedor.");
        }
    };

    // Ingredients Modal Logic helpers
    const handleViewIngredients = (supplier: Supplier) => {
        setViewingIngredientsSupplier(supplier);
        setExpandedIngredientId(null);
    };

    const closeIngredientsModal = () => {
        setViewingIngredientsSupplier(null);
    };

    const toggleIngredientHistory = (ingId: string) => {
        setExpandedIngredientId(prev => prev === ingId ? null : ingId);
    };

    // Derived state for modal
    const supplierIngredients = viewingIngredientsSupplier
        ? ingredients.filter(i => i.supplierId === viewingIngredientsSupplier.id)
        : [];

    // Stats Calculation
    const stats = useMemo(() => {
        const total = suppliers.length;
        // Mock active orders/spend for now
        const activeOrders = 12;
        const totalSpend = 4500;

        return { total, activeOrders, totalSpend };
    }, [suppliers]);

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 md:p-10 space-y-8 min-h-screen bg-transparent text-slate-100 fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter uppercase">
                        <Truck className="text-primary animate-pulse w-10 h-10" />
                        Gestión de <span className="text-primary">Proveedores</span>
                    </h1>
                    <p className="text-slate-500 text-xs font-bold mt-2 tracking-[0.3em] uppercase">Compras & Logística</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleClearData}
                        disabled={isDeletingAll}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Trash2 size={16} /> {isDeletingAll ? '...' : 'Clear All'}
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                    >
                        {isScanning ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                        {isScanning ? 'Analizando...' : 'Escanear Tarjeta'}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleScanUpload}
                        className="hidden"
                        accept="image/*"
                    />
                    <UniversalImporter buttonLabel="Importar Proveedores" />

                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-primary/50"
                    >
                        <Plus size={16} />
                        Nuevo Proveedor
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                        <Truck size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Total Proveedores</p>
                        <p className="text-2xl font-black text-white font-mono">{stats.total}</p>
                    </div>
                    <div className="ml-auto flex items-end h-full pb-1">
                        <Sparkline data={[40, 50, 65, 55, 70, 80, 75]} color="bg-blue-400" />
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Pedidos Activos</p>
                        <p className="text-2xl font-black text-white font-mono">{stats.activeOrders}</p>
                    </div>
                    <div className="ml-auto flex items-end h-full pb-1">
                        <Sparkline data={[30, 45, 60, 50, 60, 75, 80]} color="bg-emerald-400" />
                    </div>
                </div>

                <div className="premium-glass p-5 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500">
                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                        <Euro size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Gasto Mensual</p>
                        <p className="text-2xl font-black text-white font-mono">{stats.totalSpend}€</p>
                    </div>
                    <div className="ml-auto flex items-end h-full pb-1">
                        <Sparkline data={[60, 50, 70, 65, 80, 85, 90]} color="bg-amber-400" />
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="w-full relative group max-w-md ml-auto">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={16} />
                <input
                    type="text"
                    placeholder="BUSCAR PROVEEDOR..."
                    className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:primary/50 focus:border-primary/50 transition-all text-slate-200 placeholder-slate-600 font-medium text-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>


            <ProveedoresList
                suppliers={filteredSuppliers}
                onEdit={handleOpenModal}
                onDelete={handleDelete}
                onViewIngredients={handleViewIngredients}
            />

            {/* Modal: Edit/Create Supplier */}
            {isModalOpen && (
                <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500"></div>
                        <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">
                            {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                        </h3>
                        {/* We need to ensure ProveedorForm is dark-theme ready. If not, we might see white form texts on dark bg. */}
                        <ProveedorForm
                            initialData={initialFormData}
                            onSubmit={handleFormSubmit}
                            onCancel={handleCloseModal}
                            isSubmitting={isSubmitting}
                        />
                    </div>
                </div>
            )}

            {/* Modal: View Ingredients & History */}
            {viewingIngredientsSupplier && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="premium-glass p-0 max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col rounded-3xl shadow-2xl border border-white/10">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                    <History className="text-primary" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-wide">
                                        Histórico de Precios
                                    </h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        {viewingIngredientsSupplier.name}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeIngredientsModal}
                                className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar bg-black/20 flex-1">
                            {supplierIngredients.length === 0 ? (
                                <div className="text-center py-12">
                                    <Package className="w-16 h-16 text-slate-700 mx-auto mb-4 opacity-50" />
                                    <p className="text-slate-500 font-bold uppercase tracking-wider">Sin productos asignados</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {supplierIngredients.map(ingredient => (
                                        <div key={ingredient.id} className="border border-white/5 rounded-xl overflow-hidden bg-white/5">
                                            <div
                                                className="flex justify-between items-center p-4 cursor-pointer hover:bg-white/5 transition-colors"
                                                onClick={() => toggleIngredientHistory(ingredient.id)}
                                            >
                                                <div>
                                                    <h4 className="font-bold text-white text-sm">{ingredient.name}</h4>
                                                    <p className="text-[10px] text-primary font-mono mt-1">
                                                        {ingredient.costPerUnit}€ / {ingredient.unit}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Historial</span>
                                                    {expandedIngredientId === ingredient.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </div>

                                            {expandedIngredientId === ingredient.id && (
                                                <div className="p-4 bg-black/40 border-t border-white/5">
                                                    {(!ingredient.priceHistory || ingredient.priceHistory.length === 0) ? (
                                                        <p className="text-xs text-slate-500 italic text-center py-2">No hay historial disponible.</p>
                                                    ) : (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left">
                                                                <thead>
                                                                    <tr className="border-b border-white/5">
                                                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha</th>
                                                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Precio</th>
                                                                        <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Motivo</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {[...ingredient.priceHistory].reverse().map((entry, idx) => (
                                                                        <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                                            <td className="px-3 py-2 text-xs text-slate-400 font-mono">
                                                                                {new Date(entry.date).toLocaleDateString()}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-xs font-bold text-emerald-400 font-mono">
                                                                                {entry.price}€
                                                                            </td>
                                                                            <td className="px-3 py-2 text-xs text-slate-500">
                                                                                {entry.changeReason || '-'}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierPage;
