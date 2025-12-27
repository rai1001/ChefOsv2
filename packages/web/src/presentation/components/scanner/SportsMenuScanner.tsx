import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Brain, AlertCircle } from 'lucide-react';
import { scanSportsTeamMenu } from '@/services/geminiService';
import { useToast } from '@/presentation/components/ui/Toast';
import { AIExtractReviewModal } from './AIExtractReviewModal';
import type { Event } from '@/types';

interface SportsMenuScannerProps {
    event: Event;
    onClose: () => void;
    onScanComplete: (data: any) => void;
}

export const SportsMenuScanner: React.FC<SportsMenuScannerProps> = ({ event, onClose, onScanComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [scanResults, setScanResults] = useState<any | null>(null);
    const { addToast } = useToast();

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setStream(mediaStream);
            if (videoRef.current) videoRef.current.srcObject = mediaStream;
            setIsCameraActive(true);
        } catch (error) {
            console.error("Camera error:", error);
            addToast("No se pudo acceder a la cámara", "error");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
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
                setImage(canvas.toDataURL('image/jpeg'));
                stopCamera();
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setIsAnalyzing(true);
        try {
            console.log("[SportsMenuScanner] Starting analysis...");
            const base64Data = image.split(',')[1] || image;

            // Explicit error handling for the AI call
            const result = await scanSportsTeamMenu(base64Data);
            console.log("[SportsMenuScanner] Received result:", result);

            if (!result) {
                console.error("[SportsMenuScanner] Result is null or undefined!");
                addToast("Error crítico: No se recibió respuesta de la IA", "error");
                return;
            }

            if (result.success && result.data) {
                console.log("[SportsMenuScanner] Success! Data:", result.data);
                addToast("Menú deportivo analizado con éxito", "success");
                setScanResults(result.data);
            } else {
                console.warn("[SportsMenuScanner] Analysis failed or data missing:", result.error);
                addToast(result.error || "No se pudo interpretar el menú. ¿Es una foto clara?", "error");
            }
        } catch (error: any) {
            console.error("[SportsMenuScanner] CRASH in handleAnalyze:", error);
            addToast(`Error inesperado: ${error.message || "Conexión fallida"}`, "error");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg">
                            <Brain className="text-primary w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-tight">AI Sports Scanner</h3>
                            <p className="text-xs text-slate-400">Escanea menús físicos y notas a mano</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {!image && !isCameraActive && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={startCamera}
                                    className="flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                >
                                    <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                                        <Camera size={40} className="text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <span className="block text-lg font-semibold text-white">Usar Cámara</span>
                                        <span className="text-sm text-slate-500">Foto en tiempo real</span>
                                    </div>
                                </button>

                                <label className="flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed border-white/10 rounded-2xl hover:border-blue-400/50 hover:bg-blue-400/5 transition-all group cursor-pointer">
                                    <div className="p-4 bg-blue-400/10 rounded-full group-hover:scale-110 transition-transform">
                                        <Upload size={40} className="text-blue-400" />
                                    </div>
                                    <div className="text-center">
                                        <span className="block text-lg font-semibold text-white">Subir Archivo</span>
                                        <span className="text-sm text-slate-500">Imagen o PDF</span>
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3">
                                <AlertCircle className="text-yellow-500 shrink-0" size={20} />
                                <p className="text-xs text-yellow-200/70 leading-relaxed">
                                    Para mejores resultados, asegúrate de que el papel esté bien iluminado y de que las notas a mano sean legibles. Nuestro modelo detectará automáticamente correcciones y tachones.
                                </p>
                            </div>
                        </div>
                    )}

                    {isCameraActive && (
                        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] flex items-center justify-center shadow-inner">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="absolute inset-x-0 bottom-8 flex justify-center gap-6">
                                <button
                                    onClick={captureImage}
                                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    <div className="w-12 h-12 border-2 border-slate-900 rounded-full" />
                                </button>
                                <button
                                    onClick={stopCamera}
                                    className="w-16 h-16 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-full flex items-center justify-center backdrop-blur-md border border-red-500/30 transition-all"
                                >
                                    <X size={32} />
                                </button>
                            </div>
                        </div>
                    )}

                    {image && (
                        <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                            <div className="relative rounded-2xl overflow-hidden bg-slate-800 aspect-[3/4] border border-white/10 group shadow-2xl">
                                <img src={image} alt="Preview" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                    <button
                                        onClick={() => setImage(null)}
                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg flex items-center gap-2"
                                    >
                                        <X size={16} /> Cambiar Foto
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className="w-full bg-primary hover:bg-blue-600 text-white py-4 rounded-xl font-bold transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 size={24} className="animate-spin" />
                                            <span className="animate-pulse">Gemini está analizando tu menú...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Brain size={24} />
                                            Digitalizar Menú con IA
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setImage(null)}
                                    disabled={isAnalyzing}
                                    className="text-slate-400 hover:text-white transition-colors py-2 text-sm font-medium"
                                >
                                    Cancelar y volver un paso atrás
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {scanResults && (
                <AIExtractReviewModal
                    event={event}
                    data={scanResults}
                    onClose={() => setScanResults(null)}
                    onSyncComplete={() => {
                        onScanComplete(scanResults);
                        onClose();
                    }}
                />
            )}
        </div>
    );
};

