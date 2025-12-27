import React, { type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    className = '',
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    icon,
    children,
    disabled,
    ...props
}) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-primary text-white hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 focus:ring-primary/50',
        secondary: 'bg-white/10 text-white hover:bg-white/20 focus:ring-white/20',
        outline: 'border border-white/20 text-slate-200 hover:bg-white/5 hover:border-white/40 focus:ring-white/20',
        ghost: 'text-slate-400 hover:text-white hover:bg-white/5 focus:ring-white/20',
        danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20'
    };

    const sizes = {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 p-2'
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!loading && (leftIcon || icon) && <span className={children ? "mr-2" : ""}>{leftIcon || icon}</span>}
            {children}
            {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
        </button>
    );
};
