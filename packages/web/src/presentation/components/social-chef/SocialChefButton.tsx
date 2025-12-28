import React from 'react';
import { Sparkles, Instagram } from 'lucide-react';

interface SocialChefButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const SocialChefButton: React.FC<SocialChefButtonProps> = ({ onClick, disabled }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={`
        group relative overflow-hidden flex items-center gap-2 px-4 py-2 rounded-full 
        font-medium text-sm transition-all duration-300 shadow-lg hover:shadow-xl
        ${
          disabled
            ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed border border-slate-700'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 border border-purple-400/30'
        }
      `}
    >
      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
      <div className="relative flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
        <span>Crear Post IA</span>
        <Instagram className="w-4 h-4 ml-1 opacity-80" />
      </div>
    </button>
  );
};
