import React, { type ReactNode } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

export type ModalVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ModalVariant;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'info',
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: <AlertTriangle className="w-6 h-6 text-red-400" />,
            iconBg: 'bg-red-500/10 border-red-500/20',
            confirmBtn: 'bg-red-600 hover:bg-red-500 text-white'
        },
        warning: {
            icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
            iconBg: 'bg-amber-500/10 border-amber-500/20',
            confirmBtn: 'bg-amber-600 hover:bg-amber-500 text-white'
        },
        info: {
            icon: <Info className="w-6 h-6 text-blue-400" />,
            iconBg: 'bg-blue-500/10 border-blue-500/20',
            confirmBtn: 'bg-primary hover:bg-blue-500 text-white'
        }
    };

    const styles = variantStyles[variant];

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div className="relative w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Close button */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl border ${styles.iconBg}`}>
                            {styles.icon}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                            <div className="text-slate-400 text-sm">{message}</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10 bg-black/20 rounded-b-2xl">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${styles.confirmBtn}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
