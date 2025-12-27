import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, Loader2 } from 'lucide-react';
import { SCANNER } from '@/constants/scanner';

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastScanned, setLastScanned] = useState<string | null>(null);

    useEffect(() => {
        let scanner: Html5Qrcode | null = null;

        const startScanner = async () => {
            try {
                setIsScanning(true);
                setError(null);

                scanner = new Html5Qrcode('barcode-reader');
                scannerRef.current = scanner;

                const config = {
                    fps: SCANNER.BARCODE.FPS,
                    qrbox: {
                        width: SCANNER.BARCODE.SCAN_BOX_WIDTH,
                        height: SCANNER.BARCODE.SCAN_BOX_HEIGHT,
                    },
                    aspectRatio: SCANNER.BARCODE.ASPECT_RATIO,
                };

                await scanner.start(
                    { facingMode: 'environment' }, // Use back camera
                    config,
                    (decodedText: string) => {
                        // Prevent scanning the same code repeatedly
                        if (decodedText !== lastScanned) {
                            setLastScanned(decodedText);

                            // Haptic feedback on mobile
                            if ('vibrate' in navigator) {
                                navigator.vibrate(200);
                            }

                            onScan(decodedText);
                        }
                    },
                    () => {
                        // Scanning errors are normal, ignore
                    }
                );
            } catch (err) {
                console.error('Error starting scanner:', err);
                setError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
                setIsScanning(false);
            }
        };

        startScanner();

        return () => {
            if (scanner && scanner.isScanning) {
                scanner.stop().catch(console.error);
            }
        };
    }, [onScan, lastScanned]);

    const handleClose = () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(console.error);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-center absolute top-0 left-0 right-0 z-10">
                <div className="text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Camera size={24} />
                        Escanear Código de Barras
                    </h2>
                    <p className="text-sm text-gray-300 mt-1">
                        Coloca el código dentro del marco
                    </p>
                </div>
                <button
                    onClick={handleClose}
                    className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Scanner Area */}
            <div className="flex-1 flex items-center justify-center relative">
                <div id="barcode-reader" className="w-full h-full" />

                {!isScanning && !error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="text-white flex flex-col items-center gap-3">
                            <Loader2 className="animate-spin" size={48} />
                            <p className="text-lg">Iniciando cámara...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-red-500/20 border border-red-500 rounded-xl p-6 max-w-md mx-4">
                            <div className="flex items-start gap-3 text-white">
                                <AlertCircle className="flex-shrink-0 mt-1" size={24} />
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Error de Cámara</h3>
                                    <p className="text-sm text-gray-200">{error}</p>
                                    <button
                                        onClick={handleClose}
                                        className="mt-4 bg-white text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-t from-black/80 to-transparent p-6 absolute bottom-0 left-0 right-0">
                <div className="text-white text-center space-y-2">
                    <p className="font-medium">Instrucciones:</p>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Mantén el código de barras dentro del marco</li>
                        <li>• Asegúrate de tener buena iluminación</li>
                        <li>• El escaneo es automático</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
