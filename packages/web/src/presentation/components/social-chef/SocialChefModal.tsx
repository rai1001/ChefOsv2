import React, { useState, useEffect } from 'react';
import { X, Copy, Clock, Hash, Wand2, Loader2, Share2 } from 'lucide-react';
import { useToast } from '@/presentation/components/ui';

export interface SocialChefResult {
  copy: string;
  hashtags: string[];
  suggestedTime: string;
}

interface SocialChefModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeName: string;
  imagePath?: string;
  onGenerate: () => Promise<SocialChefResult>;
}

export const SocialChefModal: React.FC<SocialChefModalProps> = ({
  isOpen,
  onClose,
  recipeName,
  imagePath,
  onGenerate,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SocialChefResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen && !result && !loading && !error) {
      handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await onGenerate();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el contenido. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const fullText = `${result.copy}\n\n${result.hashtags.join(' ')}`;
    navigator.clipboard.writeText(fullText);
    addToast('¡Contenido copiado al portapapeles!', 'success');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-r from-purple-900/50 to-pink-900/50 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
          <div className="absolute top-0 right-0 p-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="text-center z-10 px-4">
            <h3 className="text-2xl font-black text-white flex items-center justify-center gap-2">
              <Wand2 className="w-6 h-6 text-pink-400" />
              Social Chef IA
            </h3>
            <p className="text-purple-200/80 text-sm mt-1 font-medium">
              Marketing automático para {recipeName}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error ? (
            <div className="text-center py-8">
              <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-4 text-sm font-medium border border-red-500/20">
                {error}
              </div>
              <button
                onClick={handleGenerate}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors font-medium border border-white/10"
              >
                Reintentar
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-white font-medium animate-pulse">
                  Analizando imagen y emplatado...
                </p>
                <p className="text-slate-500 text-xs">
                  Gemini Vision está creando tu copy perfecto
                </p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              {/* Image Preview (Optional) */}
              {imagePath && (
                <div className="w-20 h-20 rounded-xl overflow-hidden absolute top-24 left-6 border-4 border-surface shadow-lg hidden sm:block">
                  <img src={imagePath} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Copy Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Share2 className="w-3 h-3" /> Copy para Instagram
                </label>
                <div className="p-4 bg-black/20 rounded-xl border border-white/5 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {result.copy}
                </div>
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Hash className="w-3 h-3" /> Hashtags Optimizados
                </label>
                <div className="flex flex-wrap gap-2">
                  {result.hashtags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-purple-500/10 text-purple-300 rounded-md text-xs border border-purple-500/20"
                    >
                      #{tag.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Suggested Time */}
              <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Clock className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-blue-300/70">
                    Mejor hora para publicar
                  </p>
                  <p className="text-sm font-bold text-blue-100">{result.suggestedTime}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2">
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Copy className="w-4 h-4" />
                  Copiar Todo al Portapapeles
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
