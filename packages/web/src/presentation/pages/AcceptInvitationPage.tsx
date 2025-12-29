import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

export const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invitationId = searchParams.get('inviteId'); // Changed from 'token' to 'inviteId' to match email link
  // Email is also passed for UX but verification happens on backend against auth token
  const emailParam = searchParams.get('email');

  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [role, setRole] = useState<string | null>(null);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!invitationId) {
      setStatus('error');
      setErrorMessage('Enlace de invitación inválido.');
    }
  }, [invitationId]);

  const handleAccept = async () => {
    if (!user) {
      // Should be handled by AuthWrapper or redirection logic, but just in case
      setStatus('error');
      setErrorMessage('Debes iniciar sesión para aceptar la invitación.');
      return;
    }

    setStatus('processing');
    try {
      const functions = getFunctions();
      const acceptInvitation = httpsCallable(functions, 'acceptInvitation');
      const result = await acceptInvitation({ invitationId });

      const data = result.data as any;
      if (data.success) {
        setRole(data.role);
        setStatus('success');
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Accept invitation error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Error al procesar la invitación.');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-surface border border-white/10 rounded-2xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="text-green-500" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white">¡Bienvenido a ChefOS!</h1>
          <p className="text-slate-400">
            Tu cuenta ha sido configurada correctamente con el rol de{' '}
            <span className="text-white font-bold uppercase">{role}</span>.
          </p>
          <p className="text-sm text-slate-500 animate-pulse">
            Redirigiendo al panel de control...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-2xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
        {status === 'processing' ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Loader2 className="text-indigo-500 animate-spin" size={32} />
            </div>
            <h2 className="text-xl font-bold text-white">Procesando...</h2>
            <p className="text-slate-400">Configurando tu perfil y accesos.</p>
          </div>
        ) : status === 'error' ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="text-red-500" size={32} />
            </div>
            <h2 className="text-xl font-bold text-white">Error</h2>
            <p className="text-red-400 text-sm">{errorMessage}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 text-slate-400 hover:text-white underline text-sm"
            >
              Volver al inicio
            </button>
          </div>
        ) : (
          // Idle State
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Invitación Recibida</h1>
              <p className="text-slate-400 text-sm">
                Has sido invitado a unirte al equipo de cocina.
              </p>
              {emailParam && (
                <div className="mt-4 p-3 bg-black/30 rounded-lg border border-white/5">
                  <p className="text-xs text-slate-500">Invitación para:</p>
                  <p className="text-white font-medium">{emailParam}</p>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-6">
              <p className="text-sm text-slate-400 mb-6">
                Al aceptar, se configurará tu cuenta y tendrás acceso inmediato a las herramientas
                asignadas.
              </p>
              <button
                onClick={handleAccept}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                <span>Aceptar e Ingresar</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
