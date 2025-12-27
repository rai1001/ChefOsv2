import React, { useState, useEffect } from 'react';
import type { Supplier } from '@/types/suppliers';
import { Button } from '@/presentation/components/atoms/Button';
import { Input } from '@/presentation/components/atoms/Input';

interface ProveedorFormProps {
    initialData?: Partial<Supplier> | null;
    onSubmit: (data: Omit<Supplier, 'id'>) => Promise<void>;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export const ProveedorForm: React.FC<ProveedorFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting = false }) => {
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const [formData, setFormData] = useState<Partial<Supplier>>({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        leadTime: 1,
        orderDays: [],
        minimumOrderValue: 0,
        address: '',
        taxId: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                name: '',
                contactName: '',
                email: '',
                phone: '',
                leadTime: 1,
                orderDays: [],
                minimumOrderValue: 0
            });
        }
    }, [initialData]);

    const toggleDay = (day: number) => {
        const currentDays = formData.orderDays || [];
        if (currentDays.includes(day)) {
            setFormData({ ...formData, orderDays: currentDays.filter(d => d !== day) });
        } else {
            setFormData({ ...formData, orderDays: [...currentDays, day].sort() });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await onSubmit(formData as Omit<Supplier, 'id'>);
        } catch (error) {
            console.error("Form submission error", error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <Input
                    label="Nombre Empresa"
                    required
                    data-testid="supplier-name-input"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Input
                        label="Contacto"
                        value={formData.contactName || ''}
                        onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                    />
                </div>
                <div>
                    <Input
                        label="Teléfono"
                        type="tel"
                        value={formData.phone || ''}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>
            </div>

            <div>
                <Input
                    label="Email"
                    type="email"
                    data-testid="supplier-email-input"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">NIF/CIF</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white placeholder-slate-600 transition-all font-medium"
                        value={formData.taxId || ''}
                        onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Dirección</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-white placeholder-slate-600 transition-all font-medium"
                        value={formData.address || ''}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Lead Time (Días)</label>
                    <Input
                        type="number"
                        min="0"
                        className="font-mono"
                        value={formData.leadTime || 0}
                        onChange={e => setFormData({ ...formData, leadTime: parseInt(e.target.value) })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pedido Mínimo (€)</label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="font-mono"
                        value={formData.minimumOrderValue || 0}
                        onChange={e => setFormData({ ...formData, minimumOrderValue: parseFloat(e.target.value) })}
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Días de Pedido</label>
                <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map((day, index) => (
                        <Button
                            type="button"
                            key={day}
                            variant={formData.orderDays?.includes(index) ? 'primary' : 'secondary'}
                            onClick={() => toggleDay(index)}
                            className="text-xs font-bold uppercase tracking-wider"
                            size="sm"
                        >
                            {day}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/5">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="text-slate-400 hover:text-white uppercase tracking-widest text-xs font-bold"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    data-testid="supplier-submit-btn"
                    loading={isSubmitting}
                    className="px-8 font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                    {isSubmitting ? '...' : 'Guardar Proveedor'}
                </Button>
            </div>
        </form>
    );
};
