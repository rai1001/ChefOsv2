
export type EventType =
    | 'Comida'
    | 'Cena'
    | 'Boda'
    | 'Coctel'
    | 'Coffee Break'
    | 'Empresa'
    | 'Equipo Deportivo'
    | 'Otros';

export type EventStatus = 'confirmed' | 'pending' | 'cancelled';

export interface Event {
    id: string;
    name: string;
    date: string; // ISO YYYY-MM-DD
    pax: number;
    type: EventType;
    room?: string;
    notes?: string;
    status: EventStatus;
    menuId?: string;
    outletId?: string;
}
