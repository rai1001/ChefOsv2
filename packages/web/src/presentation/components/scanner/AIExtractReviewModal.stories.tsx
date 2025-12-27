import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AIExtractReviewModal } from './AIExtractReviewModal';

const meta: Meta<typeof AIExtractReviewModal> = {
    title: 'Scanner/AIExtractReviewModal',
    component: AIExtractReviewModal,
    parameters: {
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockEvent = {
    id: 'event-1',
    name: 'Cena de Gala Siemens',
    date: '2024-03-25',
    pax: 150,
    type: 'Cena' as any,
};

const mockAiData = {
    courses: [
        {
            category: 'Primers',
            items: [
                { name: 'Gazpacho Andaluz', notes: 'Servir muy frío', quantity: 150 },
                { name: 'Ensalada de Burrata', notes: 'Sin frutos secos', quantity: 20, isHandwritten: true }
            ]
        },
        {
            category: 'Segons',
            items: [
                { name: 'Solomillo al Whisky', notes: 'Punto medio', quantity: 130 },
                { name: 'Bacalao al Pil-Pil', notes: 'Opción pescado', quantity: 20 }
            ]
        }
    ]
};

export const Default: Story = {
    args: {
        event: mockEvent,
        data: mockAiData,
        onClose: () => console.log('Close'),
        onSyncComplete: () => console.log('Sync Complete'),
    },
};
