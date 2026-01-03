import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getDocumentById, updateDocument } from '@/services/firestoreService';
import { useStore } from '@/presentation/store/useStore';
import { Mail, XCircle, Loader2 } from 'lucide-react';

export const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);

  const invitationId = searchParams.get('token');

  useEffect(() => {
    async function loadInvitation() {
      if (!invitationId) {
        setError('Token de invitación no válido');
        setLoading(false);
        return;
      }

      try {
        const data = await getDocumentById<any>('invitations', invitationId);

        if (!data) {
          setError('Invitación no encontrada');
          setLoading(false);
          return;
        }

        // Validar status
        if (data.status !== 'pending' && data.status !== 'sent') {
          setError('Esta invitación ya fue usada');
          setLoading(false);
          return;
        }

        setInvitation({ id: invitationId, ...data });
        setLoading(false);
      } catch (err) {
        console.error('Error loading invitation:', err);
        setError('Error al cargar la invitación');
        setLoading(false);
      }
    }

    loadInvitation();
  }, [invitationId]);

  const handleAccept = async () => {
    if (!currentUser || !invitation) return;

    setLoading(true);
    try {
      // Actualizar usuario
      await updateDocument('users', currentUser.id, {
        role: invitation.role,
        allowedOutlets: invitation.allowedOutlets || [],
        active: true,
        updatedAt: new Date().toISOString(),
      });

      // Marcar invitación como aceptada
      await updateDocument('invitations', invitation.id, {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        acceptedBy: currentUser.id,
      });

      // Redirigir a dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Error al aceptar la invitación');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-2xl p-8 max-w-md w-full">
        {loading ? (
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-500" size={48} />
          </div>
        ) : error ? (
          <div className="text-center">
            <XCircle className="mx-auto text-red-400 mb-4" size={48} />
            <h2 className="text-xl font-bold text-white mb-2">Error</h2>
            <p className="text-slate-400">{error}</p>
          </div>
        ) : invitation ? (
          <div>
            <Mail className="mx-auto text-indigo-400 mb-4" size={48} />
            <h2 className="text-xl font-bold text-white mb-4 text-center">Invitación a ChefOS</h2>
            <div className="space-y-3 mb-6">
              <div className="bg-black/20 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-white">{invitation.email}</p>
              </div>
              <div className="bg-black/20 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Rol asignado</p>
                <p className="text-white">{invitation.role}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-medium"
              >
                Aceptar Invitación
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
