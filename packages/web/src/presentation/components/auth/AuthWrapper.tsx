import { useEffect, useState } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  type User,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useStore } from '@/presentation/store/useStore';
import { useSetAtom } from 'jotai';
import { userAtom } from '@/presentation/store/authAtoms';
import { User as DomainUser } from '@/domain/entities/User'; // Alias to avoid collision with Firebase User
import { ShieldCheck, Lock, LogOut, Store } from 'lucide-react';

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
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const { setActiveOutletId, setCurrentUser } = useStore();
  const setUserAtom = useSetAtom(userAtom);

  useEffect(() => {
    // E2E Bypass for Testing - Only allowed if environment variable is set
    // VITE_ALLOW_E2E_BYPASS must be 'true' in .env or CI environment to enable this logic.
    // If not set or false, localStorage variable is ignored for security.
    const e2eUserStr = localStorage.getItem('E2E_TEST_USER');
    const isE2EAllowed = import.meta.env.VITE_ALLOW_E2E_BYPASS === 'true';

    if (e2eUserStr && isE2EAllowed) {
      try {
        const userData = JSON.parse(e2eUserStr);
        // Mock Firebase User
        setUser({
          uid: userData.id,
          email: userData.email,
          displayName: userData.name,
          photoURL: userData.photoURL,
        } as any);
        // Mock Firestore Profile
        setUserProfile({
          uid: userData.id,
          email: userData.email,
          role: userData.role,
          active: true,
          allowedOutlets: userData.allowedOutlets,
          defaultOutletId: userData.activeOutletId,
        });
        // Set Global Store
        setCurrentUser(userData);
        if (userData.activeOutletId) {
          setActiveOutletId(userData.activeOutletId);
        }
        setLoading(false);
        return;
      } catch (e) {
        console.error('E2E Bypass Failed', e);
      }
    }

    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        setUserProfile(null);
        setCurrentUser(null);
        return;
      }

      // Subscribe to user profile in Firestore
      const userRef = doc(db, 'users', currentUser.uid);

      const unsubscribeProfile = onSnapshot(
        userRef,
        async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            setUserProfile(data);

            // Set default outlet if available and not set
            if (data.defaultOutletId && data.active) {
              const currentActiveId = useStore.getState().activeOutletId;
              if (currentActiveId !== data.defaultOutletId) {
                setActiveOutletId(data.defaultOutletId);
              }
            }

            const updatedUser = {
              id: data.uid,
              email: data.email,
              role: data.role as any,
              name: (data as any).displayName || data.email.split('@')[0],
              photoURL: (data as any).photoURL || currentUser.photoURL || undefined,
              allowedOutlets: data.allowedOutlets,
            };

            // Sync to global store (Zustand)
            setCurrentUser(updatedUser);

            // Sync to Atom (Jotai) - Critical for Sidebar visibility
            const mappedUserForAtom = new DomainUser({
              id: data.uid,
              email: data.email,
              displayName: (data as any).displayName || data.email.split('@')[0],
              photoURL: (data as any).photoURL || currentUser.photoURL || undefined,
              role: data.role as any,
              createdAt: new Date(), // Approximate, strictly for UI role check
              updatedAt: new Date(),
            });
            setUserAtom(mappedUserForAtom);

            // AUTO-FIX 1: Auto-Activate for Testing Phase
            if (!data.active) {
              console.log('Auto-activating tester account...');
              setDoc(userRef, { active: true }, { merge: true });
              // We return here because the snapshot will fire again with active=true
              // But to be safe, we let it fall through or we can just rely on the next update.
              // Better to rely on next update to avoid state flicker.
              return;
            }

            // AUTO-FIX: For the Tester Phase, if a user is active but has no outlets and is NOT admin,
            // promote them to ADMIN so they can onboard themselves.
            if (
              data.active &&
              data.role !== 'admin' &&
              (!data.allowedOutlets || data.allowedOutlets.length === 0)
            ) {
              console.log('Auto-promoting tester to admin...');
              setDoc(userRef, { ...data, role: 'admin' }, { merge: true });
            }
          } else {
            // Provisioning Logic: Create doc if missing
            console.log(
              `[${new Date().toISOString()}] Provisioning new user: ${currentUser.uid} (${currentUser.email})`
            );
            try {
              // For the Tester Version, we default to active: true so new testers can enter immediately.
              // We set role to 'admin' so they bypass the "No Outlet" screen and can set up their kitchen.
              const newProfile = {
                uid: currentUser.uid,
                email: currentUser.email || '',
                displayName: currentUser.displayName || '',
                photoURL: currentUser.photoURL || '',
                role: 'admin', // CHANGED: Admin by default for Testers
                active: true,
                allowedOutlets: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              await setDoc(userRef, newProfile);
              console.log(
                `[${new Date().toISOString()}] User provisioned successfully: ${currentUser.uid}`
              );
              // Snapshot listener will catch the update
            } catch (err) {
              console.error('Error provisioning user:', err);
              setError('Error creando perfil de usuario. Contacte al administrador.');
            }
          }
          setLoading(false);
        },
        (err) => {
          console.error('Profile sync error:', err);
          // If permission denied, it likely means they are not active or role issue?
          // Or rules prevent reading own doc? (Should not happen with our rules)
          setError('No se pudo cargar el perfil. Verifique su conexión o permisos.');
          setLoading(false);
        }
      );

      return () => unsubscribeProfile();
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogin = async () => {
    try {
      setAuthLoading(true);
      setError(null);
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('El inicio con Google no está habilitado. Use Email/Contraseña.');
      } else {
        setError('Error al iniciar sesión con Google.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setAuthLoading(true);
      setError(null);
      const auth = getAuth();

      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      let message = 'Error en la autenticación.';
      if (err.code === 'auth/user-not-found') message = 'Usuario no encontrado.';
      if (err.code === 'auth/wrong-password') message = 'Contraseña incorrecta.';
      if (err.code === 'auth/email-already-in-use') message = 'El email ya está en uso.';
      if (err.code === 'auth/weak-password') message = 'La contraseña es muy débil.';
      if (err.code === 'auth/invalid-email') message = 'Email no válido.';
      if (err.code === 'auth/invalid-credential')
        message = 'Credenciales incorrectas (Email o Contraseña). Revise mayúsculas.';
      setError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    await auth.signOut();
    // Force full page reload to clear any persisted state
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // State 1: Not Authenticated
  if (!user) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-surface p-8 rounded-2xl border border-white/10 max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Lock className="text-indigo-400" size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Kitchen Manager V2</h1>
            <p className="text-slate-400 text-sm">
              {isRegistering ? 'Crea tu cuenta' : 'Accede al sistema de gestión'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-all shadow-lg active:scale-[0.98]"
            >
              {authLoading ? 'Procesando...' : isRegistering ? 'Registrarse' : 'Entrar'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-2 text-slate-500 font-medium">O continúa con</span>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={authLoading}
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-white/10 active:scale-[0.98]"
          >
            <ShieldCheck size={20} className="text-slate-400" />
            Google
          </button>

          <p className="text-slate-500 text-sm">
            {isRegistering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium underline-offset-4 hover:underline"
            >
              {isRegistering ? 'Inicia Sesión' : 'Regístrate'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // State 2: Error
  if (error) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <div className="text-red-400 bg-red-900/20 p-6 rounded-xl border border-red-500/20 max-w-md text-center">
          <p className="font-bold mb-2">Error de Acceso</p>
          <p>{error}</p>
          <button
            onClick={handleLogout}
            className="mt-4 text-sm text-slate-400 hover:text-white underline"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // State 3: Account Inactive
  if (userProfile && !userProfile.active) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-surface p-8 rounded-2xl border border-red-500/20 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <Lock className="text-red-400" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white">Cuenta Desactivada</h2>
          <p className="text-slate-400">
            Su cuenta se ha creado correctamente pero está <strong>pendiente de activación</strong>{' '}
            por un administrador.
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

  // Happy Path: Authenticated, Profile Loaded, and Active
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
              Su usuario no tiene cocinas (outlets) asignadas. Contacte a su manager.
            </p>
            <button
              onClick={async () => {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, { role: 'admin' }, { merge: true });
                window.location.reload();
              }}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs uppercase"
            >
              Auto-Reparar Cuenta (Tester)
            </button>
            <button
              onClick={handleLogout}
              className="mt-4 flex items-center justify-center gap-2 text-slate-400 hover:text-white mx-auto"
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
          {/* Debug Overlay */}
          <div className="fixed bottom-2 right-2 text-[10px] text-slate-600 bg-black/40 px-2 py-1 rounded select-none pointer-events-none uppercase tracking-tighter">
            UID: {user.uid.slice(0, 8)} | Role: {userProfile.role} | Active:{' '}
            {userProfile.active ? 'Y' : 'N'}
          </div>
        </div>
      );
    }
    return (
      <>
        {children}
        {/* Debug Overlay */}
        <div className="fixed bottom-2 right-2 z-[9999] text-[10px] text-white bg-red-600 px-2 py-1 rounded select-none pointer-events-none uppercase font-bold tracking-widest shadow-lg">
          DEBUG: {userProfile.role} | {user.email?.split('@')[0]}
        </div>
      </>
    );
  }

  // Default fallback while loading or if profile is missing in DB
  return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );
};
