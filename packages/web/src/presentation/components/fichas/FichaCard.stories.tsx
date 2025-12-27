import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { FichaCard } from './FichaCard';

const meta: Meta<typeof FichaCard> = {
    title: 'Fichas/FichaCard',
    component: FichaCard,
    decorators: [
        (Story) => (
            <MemoryRouter>
                <div className="p-8 max-w-sm">
                    <Story />
                </div>
            </MemoryRouter>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockFicha = {
    id: 'ficha-1',
    nombre: 'Solomillo Wellington',
    categoria: 'comida' as const,
    descripcion: 'Clásico solomillo envuelto en hojaldre con duxelles de champiñones.',
    porciones: 4,
    dificultad: 'alta' as const,
    version: 1,
    activa: true,
    costos: {
        ingredientes: 45.50,
        manoObra: 15.00,
        energia: 5.00,
        total: 65.50,
        porPorcion: 16.37
    },
    pricing: {
        precioVentaSugerido: 55.00,
        margenBruto: 70,
        margenObjetivo: 75
    },
    ingredientes: [],
    pasos: [],
    tiempoPreparacion: 120,
    tiempoCoccion: 45,
    creadoPor: 'user-1',
    outletId: 'outlet-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

export const Default: Story = {
    args: {
        ficha: mockFicha,
        onDelete: (id) => console.log('Delete', id),
        onDuplicate: (id) => console.log('Duplicate', id),
        onDownload: (id) => console.log('Download', id),
    },
};

export const Inactive: Story = {
    args: {
        ficha: { ...mockFicha, activa: false, nombre: 'Receta en Pruebas' },
    },
};

export const WithImage: Story = {
    args: {
        ficha: {
            ...mockFicha,
            foto: 'https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        },
    },
};

export const LowMargin: Story = {
    args: {
        ficha: {
            ...mockFicha,
            pricing: {
                ...mockFicha.pricing,
                margenBruto: 45
            }
        }
    }
};
