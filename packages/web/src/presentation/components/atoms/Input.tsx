import React, { type InputHTMLAttributes, forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    className = '',
    label,
    error,
    leftIcon,
    rightIcon,
    containerClassName = '',
    disabled,
    ...props
}, ref) => {
    return (
        <div className={`space-y-1 ${containerClassName}`}>
            {label && (
                <label className="block text-sm font-medium text-slate-300">
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        {leftIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    disabled={disabled}
                    className={`
            block w-full rounded-xl border border-white/10 bg-black/20 text-white 
            placeholder:text-slate-500 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 
            transition-all duration-200
            ${leftIcon ? 'pl-10' : 'pl-4'}
            ${rightIcon || error ? 'pr-10' : 'pr-4'}
            ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed bg-white/5' : ''}
            py-2.5 sm:text-sm
            ${className}
          `}
                    {...props}
                />
                {rightIcon && !error && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                        {rightIcon}
                    </div>
                )}
                {error && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-red-500 animate-in fade-in zoom-in duration-200">
                        <AlertCircle size={16} />
                    </div>
                )}
            </div>
            {error && (
                <p className="text-sm text-red-400 animate-in slide-in-from-top-1 duration-200">
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';
