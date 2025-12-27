import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast } from './Toast';

const ToastDemo = () => {
    const { addToast } = useToast();
    return (
        <div className="flex gap-2">
            <button
                onClick={() => addToast('¡Éxito!', 'success')}
                className="px-4 py-2 bg-emerald-600 rounded-lg text-white"
            >
                Success
            </button>
            <button
                onClick={() => addToast('Error crítico', 'error')}
                className="px-4 py-2 bg-red-600 rounded-lg text-white"
            >
                Error
            </button>
            <button
                onClick={() => addToast('Aviso importante', 'warning')}
                className="px-4 py-2 bg-amber-600 rounded-lg text-white"
            >
                Warning
            </button>
            <button
                onClick={() => addToast('Info del sistema', 'info')}
                className="px-4 py-2 bg-blue-600 rounded-lg text-white"
            >
                Info
            </button>
        </div>
    );
};

const meta: Meta<typeof ToastProvider> = {
    title: 'UI/Toast',
    component: ToastProvider,
    decorators: [
        (Story) => (
            <ToastProvider>
                <Story />
            </ToastProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => <ToastDemo />,
};
