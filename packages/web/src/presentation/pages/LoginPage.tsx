import React, { useEffect, useState } from 'react';
import { Lock, Mail, Key, ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/presentation/store/useStore';
import { container } from '@/application/di/Container';
import { TYPES } from '@/application/di/types';
import { LoginUseCase } from '@/application/use-cases/auth/LoginUseCase';
import { LoginWithEmailUseCase } from '@/application/use-cases/auth/LoginWithEmailUseCase';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser: user, setCurrentUser } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loginUseCase = container.get<LoginUseCase>(TYPES.LoginUseCase);
      const loggedInUser = await loginUseCase.execute();
      setCurrentUser(loggedInUser as any);
    } catch (err) {
      console.error('Login failed:', err);
      setError('Failed to login with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);
    try {
      const loginUseCase = container.get<LoginWithEmailUseCase>(TYPES.LoginWithEmailUseCase);
      const loggedInUser = await loginUseCase.execute({ email, password });
      setCurrentUser(loggedInUser as any);
    } catch (err) {
      console.error('Email login failed:', err);
      setError('Credenciales incorrectas');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-slate-400 text-sm font-medium animate-pulse">
            Accediendo al sistema...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />

      <div className="bg-surface/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 max-w-md w-full text-center space-y-8 shadow-2xl relative z-10 glass-card">
        <div className="space-y-2">
          <div className="w-20 h-20 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-xl">
            <Lock className="text-primary" size={40} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Chef<span className="text-primary">OS</span>{' '}
            <span className="text-xs align-top font-bold text-slate-500 ml-1">V2</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">Plataforma de gestión pofesional</p>
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20 animate-in fade-in slide-in-from-top-2 duration-300">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-[10px] uppercase font-black text-slate-500 ml-1 tracking-widest"
            >
              Email
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-[10px] uppercase font-black text-slate-500 ml-1 tracking-widest"
            >
              Contraseña
            </label>
            <div className="relative group">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group active:scale-[0.98]"
          >
            <span>Entrar</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-tighter">
            <span className="bg-[#0b0e14] px-3 text-slate-600 font-black">O continúa con</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 border border-white/10 active:scale-[0.98] group"
        >
          <ShieldCheck
            size={20}
            className="text-slate-400 group-hover:text-primary transition-colors"
          />
          Google SSO
        </button>

        <div className="pt-4">
          <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
            ¿Has olvidado tu contraseña?
          </button>
        </div>
      </div>

      <p className="mt-8 text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em] relative z-10">
        &copy; 2025 Antigravity Lab. Todos los derechos reservados.
      </p>
    </div>
  );
};
