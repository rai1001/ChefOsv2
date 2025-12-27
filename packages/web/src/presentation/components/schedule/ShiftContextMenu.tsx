import React from 'react';
import { Sun, Moon, Trash2 } from 'lucide-react';

interface ShiftContextMenuProps {
    position: { x: number; y: number };
    onAction: (action: 'MORNING' | 'AFTERNOON' | 'DELETE') => void;
    menuRef: React.RefObject<HTMLDivElement>;
}

export const ShiftContextMenu: React.FC<ShiftContextMenuProps> = ({ position, onAction, menuRef }) => {
    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-surface border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-150"
            style={{ top: position.y, left: position.x }}
        >
            <button
                onClick={() => onAction('MORNING')}
                className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-white/5 flex items-center gap-2"
            >
                <Sun size={14} className="text-amber-400" /> Mañana
            </button>
            <button
                onClick={() => onAction('AFTERNOON')}
                className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-white/5 flex items-center gap-2"
            >
                <Moon size={14} className="text-indigo-400" /> Tarde
            </button>
            <div className="border-t border-white/10 my-1" />
            <button
                onClick={() => onAction('DELETE')}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
            >
                <Trash2 size={14} /> Quitar Turno
            </button>
        </div>
    );
};
