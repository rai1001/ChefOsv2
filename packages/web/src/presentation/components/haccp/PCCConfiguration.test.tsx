import React from 'react';
import { render, screen } from '@testing-library/react';
import { PCCConfiguration } from './PCCConfiguration';
import { describe, it, expect, vi } from 'vitest';

// Mock the store
vi.mock('../../store/useStore', () => ({
    useStore: () => ({
        pccs: [
            {
                id: '1',
                name: 'Nevera 1',
                type: 'FRIDGE',
                minTemp: 0,
                maxTemp: 5,
                isActive: true,
                description: 'Cocina principal'
            },
            {
                id: '2',
                name: 'Congelador 1',
                type: 'FREEZER',
                minTemp: -20,
                maxTemp: -18,
                isActive: true
            }
        ],
        addPCC: vi.fn(),
        updatePCC: vi.fn(),
        deletePCC: vi.fn()
    })
}));

describe('PCCConfiguration', () => {
    it('renders Edit and Delete buttons with correct aria-labels', () => {
        render(<PCCConfiguration />);

        // Check for first item
        const editBtn1 = screen.getByLabelText('Editar Nevera 1');
        const deleteBtn1 = screen.getByLabelText('Eliminar Nevera 1');

        expect(editBtn1).toBeInTheDocument();
        expect(deleteBtn1).toBeInTheDocument();

        // Check for second item
        const editBtn2 = screen.getByLabelText('Editar Congelador 1');
        const deleteBtn2 = screen.getByLabelText('Eliminar Congelador 1');

        expect(editBtn2).toBeInTheDocument();
        expect(deleteBtn2).toBeInTheDocument();
    });

    it('buttons contain icon elements', () => {
        render(<PCCConfiguration />);

        const editBtn = screen.getByLabelText('Editar Nevera 1');
        expect(editBtn.querySelector('svg')).toBeInTheDocument();
    });
});
