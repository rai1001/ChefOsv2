import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { User, UserUpdateDTO, Invitation, InviteUserDTO } from '@/types';
import { UserRole } from '@/domain/entities/User';

@injectable()
export class SupabaseUserRepository implements IUserRepository {
  private readonly usersTable = 'profiles'; // Supabase common pattern or just 'users' -> usually 'profiles' table linked to auth.users
  private readonly invitationsTable = 'invitations';

  // Read
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase.from(this.usersTable).select('*');
    if (error) throw error;
    return data as User[];
  }

  getAllUsersStream(callback: (users: User[]) => void): () => void {
    // Basic implementation using fetch-interval or realtime if available
    // For now, fetch once and return unsubscribe no-op to unblock
    this.getAllUsers().then(callback).catch(console.error);

    const channel = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: this.usersTable }, () => {
        this.getAllUsers().then(callback);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async getUserById(uid: string): Promise<User | null> {
    const { data, error } = await supabase.from(this.usersTable).select('*').eq('id', uid).single();
    if (error) return null;
    return data as User;
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    const { data, error } = await supabase.from(this.usersTable).select('*').eq('role', role);
    if (error) throw error;
    return data as User[];
  }

  async getActiveUsers(): Promise<User[]> {
    const { data, error } = await supabase.from(this.usersTable).select('*').eq('status', 'active');
    if (error) throw error;
    return data as User[];
  }

  // Write
  async updateUser(uid: string, updates: Partial<UserUpdateDTO>): Promise<void> {
    const { error } = await supabase.from(this.usersTable).update(updates).eq('id', uid);
    if (error) throw error;
  }

  async activateUser(uid: string): Promise<void> {
    const { error } = await supabase
      .from(this.usersTable)
      .update({ status: 'active' })
      .eq('id', uid);
    if (error) throw error;
  }

  async deactivateUser(uid: string): Promise<void> {
    const { error } = await supabase
      .from(this.usersTable)
      .update({ status: 'inactive' })
      .eq('id', uid);
    if (error) throw error;
  }

  async deleteUser(uid: string): Promise<void> {
    // Usually soft delete or call edge function to delete from auth as well
    const { error } = await supabase.from(this.usersTable).delete().eq('id', uid);
    if (error) throw error;
  }

  async assignOutlets(uid: string, outletIds: string[]): Promise<void> {
    // update array column or join table
    const { error } = await supabase
      .from(this.usersTable)
      .update({ allowed_outlets: outletIds })
      .eq('id', uid);
    if (error) throw error;
  }

  async setDefaultOutlet(uid: string, outletId: string): Promise<void> {
    const { error } = await supabase
      .from(this.usersTable)
      .update({ default_outlet_id: outletId })
      .eq('id', uid);
    if (error) throw error;
  }

  async changeUserRole(uid: string, role: UserRole): Promise<void> {
    const { error } = await supabase.from(this.usersTable).update({ role: role }).eq('id', uid);
    if (error) throw error;
  }

  // Invitations
  async createInvitation(invitation: InviteUserDTO): Promise<string> {
    const { data, error } = await supabase
      .from(this.invitationsTable)
      .insert(invitation)
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  getPendingInvitationsStream(callback: (invitations: Invitation[]) => void): () => void {
    const fetchInvitations = async () => {
      const { data } = await supabase.from(this.invitationsTable).select('*'); // Should filter pending?
      if (data) callback(data as Invitation[]);
    };

    fetchInvitations();

    const channel = supabase
      .channel('public:invitations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: this.invitationsTable },
        () => {
          fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async deleteInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase.from(this.invitationsTable).delete().eq('id', invitationId);
    if (error) throw error;
  }
}
