import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmModal } from './ConfirmModal';

const meta: Meta<typeof ConfirmModal> = {
    title: 'UI/ConfirmModal',
    component: ConfirmModal,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['info', 'warning', 'danger'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
    args: {
        isOpen: true,
        title: 'Información',
        message: 'Este es un mensaje informativo para el usuario.',
        variant: 'info',
        onConfirm: () => alert('Confirmado'),
        onCancel: () => alert('Cancelado'),
    },
};

export const Warning: Story = {
    args: {
        isOpen: true,
        title: 'Advertencia',
        message: '¿Estás seguro de que deseas realizar esta acción? Podría tener consecuencias.',
        variant: 'warning',
        confirmText: 'Continuar',
        onConfirm: () => alert('Confirmado'),
        onCancel: () => alert('Cancelado'),
    },
};

export const Danger: Story = {
    args: {
        isOpen: true,
        title: 'Eliminar Elemento',
        message: '¿Realmente deseas eliminar este elemento? Esta acción no se puede deshacer.',
        variant: 'danger',
        confirmText: 'Eliminar',
        onConfirm: () => alert('Confirmado'),
        onCancel: () => alert('Cancelado'),
    },
};
