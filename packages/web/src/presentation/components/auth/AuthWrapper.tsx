import React, { useEffect, useState } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { useSetAtom } from 'jotai';
import { userAtom } from '@/presentation/store/authAtoms';
import { User as DomainUser } from '@/domain/entities/User';
import { Lock, LogOut, Store } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

interface UserProfile {
  uid: string;
  email: string;
  role: string;
  active: boolean;
  allowedOutlets: string[];
  defaultOutletId?: string;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const { setActiveOutletId, setCurrentUser } = useStore();
  const setUserAtom = useSetAtom(userAtom);

  useEffect(() => {
    const e2eUserStr = localStorage.getItem('E2E_TEST_USER');
    const isE2EAllowed = import.meta.env.VITE_ALLOW_E2E_BYPASS === 'true';

    const checkSupabaseAuth = async () => {
      try {
        const { container } = await import('@/application/di/Container');
        const { TYPES } = await import('@/application/di/types');
        const repo = container.get<any>(TYPES.SupabaseAuthRepository);

        // Set up auth state listener (includes immediate callback with current session)
        repo.onAuthStateChanged((domainUser: any) => {
          console.log('Auth State Changed:', domainUser ? 'USER ON' : 'USER OFF');

          // If no user and E2E bypass is enabled, try it
          if (!domainUser && e2eUserStr && isE2EAllowed) {
            try {
              const userData = JSON.parse(e2eUserStr);
              setUser({
                uid: userData.id,
                email: userData.email,
                displayName: userData.name,
                photoURL: userData.photoURL,
              } as any);
              setUserProfile({
                uid: userData.id,
                email: userData.email,
                role: userData.role,
                active: true,
                allowedOutlets: userData.allowedOutlets,
                defaultOutletId: userData.activeOutletId,
              });
              setCurrentUser(userData);
              const mappedUserForAtom = new DomainUser({
                id: userData.id,
                email: userData.email,
                displayName: userData.name,
                role: userData.role as any,
                active: true,
                allowedOutlets: userData.allowedOutlets || [],
                activeOutletId: userData.activeOutletId,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              setUserAtom(mappedUserForAtom);
              if (userData.activeOutletId) {
                setActiveOutletId(userData.activeOutletId);
              }
              setLoading(false);
              return;
            } catch (e) {
              console.error('E2E Bypass Failed', e);
            }
          }

          if (domainUser) {
            setUser({
              uid: domainUser.id,
              email: domainUser.email,
              displayName: domainUser.displayName,
              photoURL: domainUser.photoURL,
              getIdToken: async () => 'mock-supabase-token',
            } as any);

            setUserProfile({
              uid: domainUser.id,
              email: domainUser.email,
              role: domainUser.role || 'user',
              active: true,
              allowedOutlets: domainUser.allowedOutlets || [],
              defaultOutletId: domainUser.activeOutletId,
            });

            setCurrentUser(domainUser);
            const mappedUserForAtom = new DomainUser({
              id: domainUser.id,
              email: domainUser.email,
              displayName: domainUser.displayName || domainUser.email.split('@')[0],
              photoURL: domainUser.photoURL || undefined,
              role: domainUser.role as any,
              active: domainUser.active ?? true,
              allowedOutlets: domainUser.allowedOutlets || [],
              activeOutletId: domainUser.activeOutletId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            setUserAtom(mappedUserForAtom);
          } else {
            setUser(null);
            setUserProfile(null);
            setCurrentUser(null);
            setUserAtom(null);
          }

          setLoading(false);
        });
      } catch (e) {
        console.error('Supabase Auth Init Failed', e);
        setLoading(false);
      }
    };
    checkSupabaseAuth();
  }, [setActiveOutletId, setCurrentUser, setUserAtom]);

  const handleLogout = async () => {
    try {
      console.log('AuthWrapper: Starting logout...');
      localStorage.removeItem('E2E_TEST_USER');

      const { container } = await import('@/application/di/Container');
      const { TYPES } = await import('@/application/di/types');
      const repo = container.get<any>(TYPES.SupabaseAuthRepository);
      await repo.signOut();

      console.log('AuthWrapper: Logout successful, redirecting...');
      window.location.href = '/';
    } catch (e) {
      console.error('Logout error:', e);
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Handle redirects to login page (which is handled by children/routing in App.tsx)
  if (!user) {
    return <>{children}</>;
  }

  // State: Account Inactive
  if (userProfile && !userProfile.active) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-surface p-8 rounded-2xl border border-red-500/20 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <Lock className="text-red-400" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white">Cuenta Desactivada</h2>
          <p className="text-slate-400">
            Su cuenta está <strong>pendiente de activación</strong> por un administrador.
          </p>
          <div className="bg-black/20 p-4 rounded-lg text-left text-sm space-y-2 font-mono text-slate-300">
            <p>UID: {user.uid}</p>
            <p>Email: {user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 flex items-center justify-center gap-2 text-slate-400 hover:text-white mx-auto"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // Happy Path: Authenticated and Active
  if (user && userProfile && userProfile.active) {
    // Additional check for outlets if not admin
    if (userProfile.role !== 'admin' && (userProfile.allowedOutlets || []).length === 0) {
      return (
        <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-4">
          <div className="bg-surface p-8 rounded-2xl border border-yellow-500/20 max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto">
              <Store className="text-yellow-400" size={32} />
            </div>
            <h2 className="text-xl font-bold text-white">Sin Asignación</h2>
            <p className="text-slate-400">
              Su usuario no tiene cocinas asignadas. Contacte a su manager.
            </p>
            <button
              onClick={handleLogout}
              className="mt-4 flex items-center justify-center gap-2 text-slate-400 hover:text-white mx-auto"
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>
      );
    }
    return (
      <>
        {children}
        <div className="fixed bottom-2 right-2 z-[9999] text-[10px] text-white bg-red-600 px-2 py-1 rounded select-none pointer-events-none uppercase font-bold tracking-widest shadow-lg">
          SUPABASE DB: {userProfile.role} | {user.email?.split('@')[0]}
        </div>
      </>
    );
  }

  return <>{children}</>;
};
