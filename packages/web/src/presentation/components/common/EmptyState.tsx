
import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    title: string;
    description: string;
    icon: LucideIcon;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon: Icon,
    actionLabel,
    onAction,
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-gray-800 bg-gray-900/50 ${className}`}>
            <div className="bg-primary/10 p-6 rounded-full mb-6 relative group">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Icon className="w-16 h-16 text-primary relative z-10" strokeWidth={1.5} />
            </div>

            <h3 className="text-xl font-semibold text-gray-100 mb-2">{title}</h3>
            <p className="text-gray-400 max-w-sm mb-8 leading-relaxed">
                {description}
            </p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/40 flex items-center gap-2"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};
