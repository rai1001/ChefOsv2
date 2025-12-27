import React, { useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import type { Event, EventType } from '@/types';
import { Calendar, Users, FileText, X } from 'lucide-react';
import { Button } from '@/presentation/components/atoms/Button';
import { Input } from '@/presentation/components/atoms/Input';
import { addDocument, updateDocument } from '@/services/firestoreService';
import { collections } from '@/config/collections';
import { COLLECTIONS } from '@/config/collections';

import { normalizeDate } from '@/utils/date';

interface EventFormProps {
    initialDate?: string;
    initialData?: Event;
    prefillData?: Partial<Event>;
    onClose: () => void;
    onSuccess?: () => void;
}

const EVENT_TYPES: EventType[] = [
    'Comida', 'Cena', 'Empresa', 'Coctel', 'Mediodia', 'Noche', 'Equipo Deportivo', 'Coffee Break'
];

export const EventForm: React.FC<EventFormProps> = ({ initialDate, initialData, prefillData, onClose, onSuccess }) => {
    const { menus, activeOutletId } = useStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || prefillData?.name || '',
        date: initialData?.date || initialDate || prefillData?.date || normalizeDate(new Date()),
        pax: initialData?.pax || prefillData?.pax || 0,
        type: (initialData?.type || prefillData?.type || 'Comida'),
        room: initialData?.room || (prefillData as any)?.room || '',
        menuId: initialData?.menuId || prefillData?.menuId || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeOutletId) {
            alert("Selecciona una cocina activa");
            return;
        }

        setIsSubmitting(true);
        try {
            const eventData = {
                name: formData.name,
                date: formData.date,
                pax: formData.pax,
                type: formData.type,
                room: formData.room || null,
                menuId: formData.menuId || null,
                outletId: activeOutletId
            };

            if (initialData) {
                await updateDocument(COLLECTIONS.EVENTS, initialData.id, eventData);
            } else {
                await addDocument(collections.events, eventData);
            }

            // Refresh events in store
            // We need to fetch the range that covers this event date
            // For simplicity, we just trigger onSuccess which should ideally refresh parent
            if (onSuccess) onSuccess();

            // Also simpler: Create a date range around the event date and fetch?
            // Or just rely on onSuccess callback to parent to decide what to refresh.

            onClose();
        } catch (error) {
            console.error("Error saving event:", error);
            alert("Error al guardar el evento");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-surface p-6 rounded-xl border border-white/5 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">{initialData ? 'Editar Evento' : 'Nuevo Evento'}</h3>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X size={20} />
                </Button>
            </div>

            <Input
                label="Nombre del Evento"
                placeholder="Ej: Boda Familia Smith"
                required
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm text-slate-400">Fecha</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                            type="date"
                            required
                            className="w-full bg-black/20 border border-white/10 rounded pl-9 pr-3 py-2 text-white"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm text-slate-400">PAX (Personas)</label>
                    <div className="relative">
                        <Users className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                            type="number"
                            min="1"
                            required
                            className="w-full bg-black/20 border border-white/10 rounded pl-9 pr-3 py-2 text-white"
                            value={formData.pax}
                            onChange={e => setFormData({ ...formData, pax: Number(e.target.value) })}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm text-slate-400">Tipo de Evento</label>
                <select
                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white outline-none"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as EventType })}
                >
                    {EVENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            <Input
                label="Salón / Espacio (Opcional)"
                placeholder="Ej: Salón Gran Gala"
                value={formData.room}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, room: e.target.value })}
            />

            <div className="space-y-1">
                <label className="text-sm text-slate-400">Menú (Opcional)</label>
                <div className="relative">
                    <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <select
                        className="w-full bg-black/20 border border-white/10 rounded pl-9 pr-3 py-2 text-white outline-none appearance-none"
                        value={formData.menuId}
                        onChange={e => setFormData({ ...formData, menuId: e.target.value })}
                    >
                        <option value="">Seleccionar Menú...</option>
                        {menus.map(menu => (
                            <option key={menu.id} value={menu.id}>{menu.name}</option>
                        ))}
                    </select>
                </div>
            </div >

            <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                className="w-full"
            >
                {initialData ? 'Guardar Cambios' : 'Crear Evento'}
            </Button>
        </form>
    );
};
