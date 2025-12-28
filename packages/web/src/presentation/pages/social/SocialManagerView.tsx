import React, { useState } from 'react';
import { Upload, Image as ImageIcon, Sparkles, History, Loader2, Share2 } from 'lucide-react';
import { useStore } from '@/presentation/store/useStore';
import { uploadFile } from '@/services/storage';
import { compressImage } from '@/utils/imageCompression';
import { generateSocialContent } from '@/services/socialManager';
import { SocialManagerResultsModal } from '@/presentation/components/social-manager/SocialManagerResultsModal';
import { SocialManagerHistory } from '@/presentation/components/social-manager/SocialManagerHistory';
import { db } from '@/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type {
  SocialContentType,
  GeneratedSocialContent,
  SocialManagerPost,
} from '@/types/socialManager';
import { useToast } from '@/presentation/components/ui';

export const SocialManagerView: React.FC = () => {
  const { settings, activeOutletId, currentUser } = useStore();
  const { addToast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [contentType, setContentType] = useState<SocialContentType>('GENERAL');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedSocialContent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('La imagen debe ser menor a 5MB', 'error');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!imageFile) {
      addToast('Por favor sube una imagen', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Compress and Upload image to Storage
      const compressedBase64 = await compressImage(imageFile, { quality: 0.6 });

      // Convert base64 back to File for uploadFile service
      const response = await fetch(compressedBase64);
      const blob = await response.blob();
      const compressedFile = new File([blob], imageFile.name, { type: 'image/jpeg' });

      const storagePath = `social-manager/${activeOutletId}/${Date.now()}_${imageFile.name}`;
      const uploadedImageUrl = await uploadFile(compressedFile, storagePath);

      // 2. Generate Content
      const generatedData = await generateSocialContent(
        uploadedImageUrl,
        contentType,
        (settings.businessType as 'HOTEL' | 'RESTAURANT') || 'RESTAURANT',
        additionalContext
      );

      // 3. Save to Firestore
      const newPost: Omit<SocialManagerPost, 'id'> = {
        userId: (currentUser as any)?.uid || 'unknown',
        businessId: activeOutletId || 'unknown',
        businessType: (settings.businessType as 'HOTEL' | 'RESTAURANT') || 'RESTAURANT',
        contentType,
        imageUrl: uploadedImageUrl,
        additionalContext,
        generatedAt: serverTimestamp(),
        data: generatedData,
      };

      await addDoc(collection(db, 'socialManagerPosts'), newPost);

      setResult(generatedData);
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
      addToast('Error al generar contenido. Inténtalo de nuevo.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Sparkles className="text-primary w-8 h-8" />
            Social Manager Pro
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Tu estratega de redes sociales con Inteligencia Artificial
          </p>
        </div>
        <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <History size={20} /> Historial
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Input */}
        <div className="space-y-6">
          {/* Image Upload */}
          <div className="glass-card p-6 bg-surface/50 border-white/5 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="text-blue-400" /> 1. Sube tu Imagen
            </h3>
            <div
              className={`
                                border-2 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all
                                ${imagePreview ? 'border-primary/50 bg-primary/5' : 'border-slate-700 hover:border-slate-500 hover:bg-white/5'}
                            `}
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-full object-contain rounded-xl"
                />
              ) : (
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Upload size={32} />
                  </div>
                  <p className="text-slate-300 font-medium">Arrastra una imagen o haz clic</p>
                  <p className="text-slate-500 text-xs">JPG, PNG, WEBP (Max 5MB)</p>
                </div>
              )}
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>

          {/* Configuration */}
          <div className="glass-card p-6 bg-surface/50 border-white/5 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Share2 className="text-purple-400" /> 2. Personaliza la Estrategia
            </h3>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Tipo de Contenido
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'EVENTO', label: '🎉 Evento' },
                  { id: 'INSTALACIONES', label: '🏨 Instalaciones' },
                  { id: 'PROMOCION', label: '🎯 Promoción' },
                  { id: 'GENERAL', label: '📢 General' },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setContentType(type.id as SocialContentType)}
                    className={`
                                            p-3 rounded-xl border text-sm font-medium transition-all text-left
                                            ${
                                              contentType === type.id
                                                ? 'bg-primary/20 border-primary text-white shadow-lg shadow-primary/10'
                                                : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                                            }
                                        `}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Contexto Adicional (Opcional)
              </label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Ej: 'Cena de San Valentín con música en vivo', 'Nuevas habitaciones con vista al mar'..."
                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:border-primary focus:outline-none min-h-[100px] resize-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!imageFile || isGenerating}
              className={`
                                w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 text-lg transition-all
                                ${
                                  !imageFile || isGenerating
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-primary to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-xl shadow-primary/20 hover:scale-[1.02]'
                                }
                            `}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" /> Generando Contenido...
                </>
              ) : (
                <>
                  <Sparkles className="fill-current" /> Generar Estrategia
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Preview / Feature Highlight */}
        <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-6 border border-white/5 bg-gradient-to-br from-surface to-surface/50">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 flex items-center justify-center animate-pulse-slow">
            <Sparkles className="w-16 h-16 text-primary/80" />
          </div>
          <div className="max-w-md space-y-4">
            <h2 className="text-2xl font-bold text-white">Potencia tus Redes Sociales</h2>
            <p className="text-slate-400">
              Sube una foto y nuestra IA analizará la imagen para crear copies perfectos,
              seleccionar hashtags virales y sugerir el mejor momento para publicar en Instagram,
              Facebook, LinkedIn y X.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="p-4 bg-white/5 rounded-xl">
                <span className="text-2xl mb-1 block">⚡</span>
                <span className="text-sm font-medium text-slate-300">Ahorra Tiempo</span>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <span className="text-2xl mb-1 block">🎯</span>
                <span className="text-sm font-medium text-slate-300">Más Impacto</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Grid */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="text-primary" /> Historial Reciente
        </h3>
        <SocialManagerHistory
          onSelect={(post) => {
            setResult(post.data);
            setIsModalOpen(true);
            setImageFile(null); // Clear current upload if viewing history
            setImagePreview(post.imageUrl);
          }}
        />
      </div>

      {/* Results Modal */}
      {result && (
        <SocialManagerResultsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={result}
          imagePreview={imagePreview}
        />
      )}
    </div>
  );
};
