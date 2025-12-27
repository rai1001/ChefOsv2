import React, { useRef, useState } from 'react';
import { Camera, X, AlertCircle, Loader2, Check } from 'lucide-react';
import { scanExpirationDate, type OCRResult } from '@/services/ocrService';

interface ExpiryDateScannerProps {
    onDateScanned: (date: Date) => void;
    onClose: () => void;
    productName?: string;
}

export const ExpiryDateScanner: React.FC<ExpiryDateScannerProps> = ({
    onDateScanned,
    onClose,
    productName,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
    const [manualDate, setManualDate] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);

    React.useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }

            setStream(mediaStream);
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
            setShowManualInput(true);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const captureAndScan = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setIsProcessing(true);
        setError(null);

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                setError('Error al procesar la imagen');
                setIsProcessing(false);
                return;
            }

            // Set canvas size to video size
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0);

            // Perform OCR
            const result = await scanExpirationDate(canvas);
            setOcrResult(result);

            if (result.success && result.date) {
                // Haptic feedback
                if ('vibrate' in navigator) {
                    navigator.vibrate([100, 50, 100]);
                }

                // Auto-confirm if confidence is very high
                if (result.confidence > 85) {
                    onDateScanned(result.date);
                }
            } else {
                setError(
                    `OCR no pudo detectar una fecha válida${result.confidence > 0
                        ? ` (confianza: ${result.confidence.toFixed(0)}%)`
                        : ''
                    }. Por favor, introduce la fecha manualmente.`
                );
                setShowManualInput(true);
            }
        } catch (err) {
            console.error('Error scanning date:', err);
            setError('Error al escanear la fecha. Por favor, inténtalo de nuevo.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualSubmit = () => {
        if (!manualDate) return;

        const date = new Date(manualDate);
        if (isNaN(date.getTime())) {
            setError('Fecha inválida');
            return;
        }

        onDateScanned(date);
    };

    const handleConfirmOCR = () => {
        if (ocrResult?.date) {
            onDateScanned(ocrResult.date);
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-center absolute top-0 left-0 right-0 z-10">
                <div className="text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Camera size={24} />
                        Escanear Fecha de Caducidad
                    </h2>
                    {productName && (
                        <p className="text-sm text-gray-300 mt-1">
                            Producto: {productName}
                        </p>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Camera View */}
            <div className="flex-1 flex items-center justify-center relative bg-black">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="max-w-full max-h-full object-contain"
                />

                {/* Hidden canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning Guide Overlay */}
                {!showManualInput && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-4 border-white rounded-lg w-80 h-32 relative">
                            <div className="absolute -top-8 left-0 right-0 text-center text-white text-sm font-medium bg-black/60 py-1 rounded-t-lg">
                                Alinea la fecha aquí
                            </div>
                            {/* Corner guides */}
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary" />
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary" />
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary" />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary" />
                        </div>
                    </div>
                )}

                {/* OCR Result Display */}
                {ocrResult && ocrResult.success && ocrResult.date && (
                    <div className="absolute top-24 left-0 right-0 mx-4">
                        <div className="bg-green-500/90 backdrop-blur-sm border border-green-400 rounded-xl p-4 text-white">
                            <div className="flex items-center gap-3 mb-2">
                                <Check size={24} className="flex-shrink-0" />
                                <div>
                                    <p className="font-bold">Fecha Detectada</p>
                                    <p className="text-2xl font-mono">
                                        {ocrResult.date.toLocaleDateString('es-ES')}
                                    </p>
                                    <p className="text-sm opacity-90 mt-1">
                                        Confianza: {ocrResult.confidence.toFixed(0)}%
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleConfirmOCR}
                                className="w-full bg-white text-green-600 font-bold py-2 rounded-lg mt-2 hover:bg-gray-100 transition-colors"
                            >
                                Confirmar Fecha
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="absolute top-24 left-0 right-0 mx-4">
                        <div className="bg-orange-500/90 backdrop-blur-sm border border-orange-400 rounded-xl p-4 text-white">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="flex-shrink-0 mt-1" size={20} />
                                <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Manual Input Section */}
            {showManualInput && (
                <div className="bg-gray-900 border-t border-gray-700 p-4 space-y-3">
                    <label className="block text-white text-sm font-medium">
                        Introducir Fecha Manualmente
                    </label>
                    <input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary"
                        min={new Date().toISOString().split('T')[0]}
                    />
                    <button
                        onClick={handleManualSubmit}
                        disabled={!manualDate}
                        className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirmar Fecha Manual
                    </button>
                </div>
            )}

            {/* Controls */}
            {!showManualInput && (
                <div className="bg-gradient-to-t from-black/80 to-transparent p-6 absolute bottom-0 left-0 right-0 space-y-3">
                    <button
                        onClick={captureAndScan}
                        disabled={isProcessing}
                        className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Camera size={20} />
                                Capturar y Escanear
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => setShowManualInput(true)}
                        className="w-full bg-white/20 backdrop-blur-sm text-white font-medium py-3 rounded-xl hover:bg-white/30 transition-colors"
                    >
                        Introducir Manualmente
                    </button>
                </div>
            )}
        </div>
    );
};
