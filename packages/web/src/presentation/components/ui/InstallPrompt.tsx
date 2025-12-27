import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show prompt after a small delay to not interrupt user
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if app was just installed
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
    };

    if (isInstalled || !showPrompt || !deferredPrompt) return null;

    return (
        <div className="fixed bottom-6 left-6 z-[100] animate-in slide-in-from-left fade-in duration-300">
            <div className="bg-slate-900 border border-white/20 rounded-xl p-4 shadow-2xl max-w-sm ring-1 ring-black/50">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/20 text-primary">
                        <Download className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-white text-sm">Instalar ChefOS</h4>
                        <p className="text-xs text-slate-400 mt-1">
                            Instala la app para acceso rápido y uso sin conexión
                        </p>
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleInstall}
                                className="bg-primary hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                                Instalar
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="text-slate-400 hover:text-white px-2 py-1.5 text-xs transition-colors"
                            >
                                Ahora no
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-slate-500 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
