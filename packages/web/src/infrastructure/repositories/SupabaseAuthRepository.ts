import { injectable } from 'inversify';
import { IAuthRepository } from '@/domain/interfaces/repositories/IAuthRepository';
import { User } from '@/domain/entities/User';
import { supabase } from '@/config/supabase';

@injectable()
export class SupabaseAuthRepository implements IAuthRepository {
  private _currentUser: User | null = null;

  get currentUser(): User | null {
    return this._currentUser;
  }

  async signInWithGoogle(): Promise<User> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    // OAuth flow redirects, so we won't return immediately.
    // But for interface compliance:
    if (!data.url) throw new Error('No redirect URL returned');

    // This is a bit tricky with OAuth redirect flows vs Promise-based flows.
    // We'll trust the redirect happens.
    return null as any;
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    return this.mapToEntity(data.user);
  }

  async signOut(): Promise<void> {
    console.log('SupabaseAuthRepository: Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('SupabaseAuthRepository: SignOut Error:', error);
      throw error;
    }
    console.log('SupabaseAuthRepository: SignOut Success');
    this._currentUser = null;
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Supabase Auth Event: ${event}`, !!session);
      if (session?.user) {
        const user = await this.mapToEntity(session.user);
        this._currentUser = user;
        callback(user);
      } else {
        this._currentUser = null;
        callback(null);
      }
    });

    return () => data.subscription.unsubscribe();
  }

  private async mapToEntity(supabaseUser: any): Promise<User> {
    // Fetch Profile from 'profiles' table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    return new User({
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      displayName: profile?.full_name || supabaseUser.user_metadata?.full_name || '',
      photoURL: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url || '',
      role: profile?.role || 'staff',
      active: profile?.is_active ?? true,
      allowedOutlets: profile?.allowed_outlet_ids || [],
      activeOutletId: profile?.active_outlet_id,
      createdAt: profile?.created_at ? new Date(profile.created_at) : new Date(),
      updatedAt: profile?.updated_at ? new Date(profile.updated_at) : new Date(),
    });
  }
}
