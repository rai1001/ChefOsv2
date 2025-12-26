import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

interface NavGroupProps {
    label: string;
    icon: React.ReactElement<{ size?: number; className?: string }>;
    children: React.ReactNode;
    activePaths: string[];
}

export const NavGroup = ({ label, icon, children, activePaths }: NavGroupProps) => {
    const location = useLocation();
    const isAnyChildActive = activePaths.some(path => location.pathname.startsWith(path));
    const [isOpen, setIsOpen] = useState(isAnyChildActive);

    // Auto-expand if a child becomes active
    useEffect(() => {
        if (isAnyChildActive) setIsOpen(true);
    }, [isAnyChildActive]);

    return (
        <div className="space-y-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-xl transition-all hover:bg-white/5 group ${isAnyChildActive ? 'text-white' : 'text-slate-500'
                    }`}
            >
                <div className="flex items-center gap-3">
                    {React.cloneElement(icon as React.ReactElement<any>, { size: 18, className: isAnyChildActive ? 'text-primary' : '' })}
                    <span className={`font-semibold text-[10px] uppercase tracking-[0.1em] ${isAnyChildActive ? 'text-slate-200' : 'text-slate-500'}`}>{label}</span>
                </div>
                <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isAnyChildActive ? 'text-primary' : 'text-slate-600'}`}
                />
            </button>
            {isOpen && (
                <div className="pl-3 space-y-1 mt-1 border-l border-white/5 ml-4 animate-in fade-in slide-in-from-left-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};
