import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Loader2, FileText } from 'lucide-react';
import { analyzeImage } from '@/services/geminiService';
import { compressImage } from '@/utils/imageCompression';

import { useToast } from '@/presentation/components/ui/Toast';

interface InvoiceScannerProps {
  onClose?: () => void;
  onScanComplete?: (data: any) => void;
}

export const InvoiceScanner: React.FC<InvoiceScannerProps> = ({ onClose, onScanComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const { addToast } = useToast();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      addToast('No se pudo acceder a la cámara', 'error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    try {
      // Compression
      const compressedBase64 = await compressImage(image, { quality: 0.6 });
      const base64Data = compressedBase64.split(',')[1] || compressedBase64;

      const prompt = `Analiza esta factura de restaurante. Extrae los siguientes datos en formato JSON:
            {
                "supplierName": "nombre del proveedor",
                "date": "YYYY-MM-DD",
                "total": 0.00,
                "items": [
                    { "name": "nombre producto", "quantity": 0, "price": 0.00, "unit": "kg/l/u" }
                ]
            }
            Si no puedes leer algo, omítelo.`;

      const result = await analyzeImage(base64Data, prompt);

      if (result.success && result.data) {
        console.log('Analysis Result:', result.data);
        addToast('Factura analizada correctamente', 'success');

        // Create a draft purchase order
        if (onScanComplete) {
          onScanComplete(result.data);
        }
      } else {
        addToast('No se pudieron extraer datos de la imagen', 'error');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      addToast('Error al analizar la imagen', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="text-primary" />
            Escanear Factura
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!image && !isCameraActive && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              <button
                onClick={startCamera}
                className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-primary/50 hover:bg-white/5 transition-all group"
              >
                <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                  <Camera size={40} className="text-primary" />
                </div>
                <span className="text-lg font-medium text-slate-300">Usar Cámara</span>
              </button>

              <label className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-primary/50 hover:bg-white/5 transition-all group cursor-pointer">
                <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                  <Upload size={40} className="text-primary" />
                </div>
                <span className="text-lg font-medium text-slate-300">Subir Imagen</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}

          {isCameraActive && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute insert-x-0 bottom-4 flex justify-center gap-4">
                <button
                  onClick={captureImage}
                  className="bg-white text-black p-4 rounded-full shadow-lg hover:scale-105 transition-transform"
                >
                  <Camera size={32} />
                </button>
                <button
                  onClick={stopCamera}
                  className="bg-red-500/80 text-white p-4 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                >
                  <X size={32} />
                </button>
              </div>
            </div>
          )}

          {image && (
            <div className="space-y-6">
              <div className="relative rounded-xl overflow-hidden bg-black/50 aspect-video flex items-center justify-center border border-white/10 group">
                <img src={image} alt="Preview" className="w-full h-full object-contain" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setImage(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  disabled={isAnalyzing}
                >
                  Intentar de nuevo
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-primary/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Procesar Factura
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
