import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    message = "Ha ocurrido un error al cargar los datos.",
    onRetry
}) => {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
            <div className="bg-red-500/10 p-4 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Error</h3>
            <p className="max-w-md mb-6">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <RefreshCcw className="w-4 h-4" />
                    <span>Reintentar</span>
                </button>
            )}
        </div>
    );
};
