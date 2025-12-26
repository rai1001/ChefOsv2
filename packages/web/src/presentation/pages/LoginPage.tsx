import React, { useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Lock, ShieldCheck } from 'lucide-react';
import {
    loginWithGoogleAtom,
    userAtom,
    isLoadingAtom,
    errorAtom
} from '../store/authAtoms';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [, loginWithGoogle] = useAtom(loginWithGoogleAtom);
    const user = useAtomValue(userAtom);
    const isLoading = useAtomValue(isLoadingAtom);
    const error = useAtomValue(errorAtom);

    // Redirect if already authenticated
    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleGoogleLogin = async () => {
        await loginWithGoogle();
    };

    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="bg-surface p-8 rounded-2xl border border-white/10 max-w-md w-full text-center space-y-6 shadow-2xl glass-card">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Lock className="text-primary" size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Kitchen Manager V2</h1>
                    <p className="text-slate-400 text-sm">
                        Accede al sistema de gestión
                    </p>
                </div>

                {error && (
                    <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">
                        {error}
                    </div>
                )}

                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-surface px-2 text-slate-500 font-medium">Inicia Sesión</span></div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-white/10 active:scale-[0.98] glow-border group"
                >
                    <ShieldCheck size={20} className="text-slate-400 group-hover:text-primary transition-colors" />
                    Continuar con Google
                </button>

                <p className="text-slate-500 text-sm">
                    ¿Problemas de acceso?
                    <button
                        className="ml-2 text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline"
                    >
                        Contactar Soporte
                    </button>
                </p>
            </div>
        </div>
    );
};
