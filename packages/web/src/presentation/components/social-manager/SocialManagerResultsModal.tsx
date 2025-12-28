import React, { useState } from 'react';
import {
  X,
  Copy,
  Clock,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  MessageSquare,
  Briefcase,
  Share2,
  Check,
} from 'lucide-react';
import { useToast } from '@/presentation/components/ui';
import type { GeneratedSocialContent, SocialPlatform } from '@/types/socialManager';
import { useStore } from '@/presentation/store/useStore';

interface SocialManagerResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: GeneratedSocialContent;
  imagePreview: string | null;
}

export const SocialManagerResultsModal: React.FC<SocialManagerResultsModalProps> = ({
  isOpen,
  onClose,
  data,
  imagePreview,
}) => {
  const { addToast } = useToast();
  const { settings } = useStore();
  const [activeTab, setActiveTab] = useState<SocialPlatform>('instagram');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    addToast('Contenido copiado al portapapeles', 'success');
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isHotel = settings.businessType === 'HOTEL';
  const platforms: { id: SocialPlatform; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'instagram', label: 'Instagram', icon: <Instagram size={18} />, show: true },
    { id: 'facebook', label: 'Facebook', icon: <Facebook size={18} />, show: true },
    { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin size={18} />, show: isHotel },
    { id: 'twitter', label: 'Twitter / X', icon: <Twitter size={18} />, show: true },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-surface-dark">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Share2 className="text-primary" /> Estrategia Generada
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Image & Analysis */}
          <div className="w-1/3 bg-black/20 p-6 border-r border-white/5 overflow-y-auto hidden md:block">
            {imagePreview && (
              <div className="rounded-xl overflow-hidden mb-6 border border-white/10 shadow-lg">
                <img src={imagePreview} alt="Preview" className="w-full h-auto" />
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Análisis Visual
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.analysis.visualElements.map((el, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-white/5 rounded-md text-xs text-slate-300 border border-white/5"
                    >
                      {el}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Momento Detectado
                </h4>
                <p className="text-sm text-slate-200 italic">"{data.analysis.detectedMoment}"</p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Objetivo Sugerido
                </h4>
                <p className="text-sm text-slate-200 italic">
                  "{data.analysis.suggestedObjective}"
                </p>
              </div>
            </div>
          </div>

          {/* Right: Content Tabs */}
          <div className="flex-1 flex flex-col bg-surface">
            {/* Tabs */}
            <div className="flex border-b border-white/10 overflow-x-auto">
              {platforms
                .filter((p) => p.show)
                .map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => setActiveTab(platform.id)}
                    className={`
                                        flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                                        ${
                                          activeTab === platform.id
                                            ? 'border-primary text-white bg-white/5'
                                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                        }
                                    `}
                  >
                    {platform.icon}
                    {platform.label}
                  </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* INSTAGRAM CONTENT */}
              {activeTab === 'instagram' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 uppercase">
                        Copy Principal
                      </label>
                      <button
                        onClick={() => handleCopy(data.instagram.copy, 'ig-copy')}
                        className="text-xs text-primary hover:text-primary-light flex items-center gap-1 transition-colors"
                      >
                        {copiedField === 'ig-copy' ? <Check size={14} /> : <Copy size={14} />}
                        {copiedField === 'ig-copy' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <div className="p-4 bg-black/30 rounded-xl border border-white/10 text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                      {data.instagram?.copy || 'Sin contenido'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 uppercase">Hashtags</label>
                      <button
                        onClick={() => handleCopy(data.instagram.hashtags.join(' '), 'ig-tags')}
                        className="text-xs text-primary hover:text-primary-light flex items-center gap-1 transition-colors"
                      >
                        {copiedField === 'ig-tags' ? <Check size={14} /> : <Copy size={14} />}
                        Copiar Todos
                      </button>
                    </div>
                    <div className="p-4 bg-black/30 rounded-xl border border-white/10">
                      <div className="flex flex-wrap gap-2">
                        {data.instagram?.hashtags?.map((tag, i) => (
                          <span key={i} className="text-blue-400 text-sm">
                            #{tag.replace(/^#/, '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                      <p className="text-xs font-bold text-purple-300 uppercase mb-1">
                        Call to Action
                      </p>
                      <p className="text-sm text-white">{data.instagram?.callToAction || '-'}</p>
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center gap-3">
                      <Clock className="text-blue-400" />
                      <div>
                        <p className="text-xs font-bold text-blue-300 uppercase mb-1">
                          Hora Publicación
                        </p>
                        <p className="text-lg font-mono font-bold text-white">
                          {data.instagram?.suggestedTime || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FACEBOOK CONTENT */}
              {activeTab === 'facebook' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 uppercase">
                        Post Content
                      </label>
                      <button
                        onClick={() => handleCopy(data.facebook.copy, 'fb-copy')}
                        className="text-xs text-primary hover:text-primary-light flex items-center gap-1 transition-colors"
                      >
                        {copiedField === 'fb-copy' ? <Check size={14} /> : <Copy size={14} />}
                        Copiar
                      </button>
                    </div>
                    <div className="p-4 bg-black/30 rounded-xl border border-white/10 text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                      {data.facebook?.copy || 'Sin contenido'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-600/10 rounded-xl border border-blue-600/20">
                      <p className="text-xs font-bold text-blue-400 uppercase mb-1 flex items-center gap-2">
                        <MessageSquare size={14} /> Pregunta Engagement
                      </p>
                      <p className="text-sm text-white italic">
                        "{data.facebook?.engagementQuestion || '-'}"
                      </p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                        Tipo Recomendado
                      </p>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-lg border border-green-500/20 font-bold">
                        {data.facebook?.postType || 'Standard'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* LINKEDIN CONTENT */}
              {activeTab === 'linkedin' && data.linkedin && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 uppercase">
                        Corporate Text
                      </label>
                      <button
                        onClick={() => handleCopy(data.linkedin!.copy, 'li-copy')}
                        className="text-xs text-primary hover:text-primary-light flex items-center gap-1 transition-colors"
                      >
                        {copiedField === 'li-copy' ? <Check size={14} /> : <Copy size={14} />}
                        Copiar
                      </button>
                    </div>
                    <div className="p-4 bg-black/30 rounded-xl border border-white/10 text-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-serif">
                      {data.linkedin.copy}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-800/10 rounded-xl border border-blue-800/20">
                    <p className="text-xs font-bold text-blue-300 uppercase mb-2 flex items-center gap-2">
                      <Briefcase size={14} /> Enfoque Corporativo
                    </p>
                    <p className="text-sm text-white mb-3">{data.linkedin.corporateFocus}</p>
                    <div className="flex flex-wrap gap-2">
                      {data.linkedin.hashtags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-blue-200 text-xs bg-blue-800/30 px-2 py-1 rounded"
                        >
                          #{tag.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TWITTER CONTENT */}
              {activeTab === 'twitter' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-400 uppercase">
                        Tweet (
                        <span
                          className={
                            (data.twitter?.copy?.length || 0) > 280
                              ? 'text-red-400'
                              : 'text-green-400'
                          }
                        >
                          {data.twitter?.copy?.length || 0}/280
                        </span>
                        )
                      </label>
                      <button
                        onClick={() => handleCopy(data.twitter?.copy || '', 'tw-copy')}
                        className="text-xs text-primary hover:text-primary-light flex items-center gap-1 transition-colors"
                      >
                        {copiedField === 'tw-copy' ? <Check size={14} /> : <Copy size={14} />}
                        Copiar
                      </button>
                    </div>
                    <div className="p-4 bg-black/30 rounded-xl border border-white/10 text-slate-200 text-lg whitespace-pre-wrap leading-relaxed">
                      {data.twitter?.copy || 'Sin contenido'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {data.twitter?.hashtags?.map((tag, i) => (
                      <span key={i} className="text-sky-400 text-sm">
                        #{tag.replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
