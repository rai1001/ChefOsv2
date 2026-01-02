import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  description?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '2xl',
  description,
}) => {
  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-[95vw]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-surface-dim border border-white/10 rounded-2xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300`}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-start bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase">{title}</h2>
            {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
