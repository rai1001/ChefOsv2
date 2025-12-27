import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
    title?: string;
    message?: string;
    action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    title = "No hay datos",
    message = "No se encontraron resultados.",
    action
}) => {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
            <div className="bg-surface/50 p-6 rounded-full mb-4">
                <Inbox className="w-10 h-10 opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-1">{title}</h3>
            <p className="max-w-xs text-sm mb-6">{message}</p>
            {action}
        </div>
    );
};
