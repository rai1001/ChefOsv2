import { injectable } from 'inversify';
import { supabase } from '@/config/supabase';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { User, UserFilters, PaginatedUsers } from '@/domain/entities/User';
import { Invitation } from '@/domain/entities/Invitation';

@injectable()
export class SupabaseUserRepository implements IUserRepository {
  private readonly usersTable = 'profiles'; // Supabase common pattern or just 'users'
  private readonly invitationsTable = 'invitations';

  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase.from(this.usersTable).select('*').eq('id', id).single();

    if (error) return null;
    return data as User;
  }

  async findAll(filters?: UserFilters): Promise<PaginatedUsers> {
    let query = supabase.from(this.usersTable).select('*', { count: 'exact' });

    if (filters?.role) query = query.eq('role', filters.role);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.search) query = query.ilike('email', `%${filters.search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      users: data as User[],
      total: count || 0,
    };
  }

  async save(user: User): Promise<void> {
    const { error } = await supabase.from(this.usersTable).upsert(user);
    if (error) throw error;
  }

  async update(id: string, user: Partial<User>): Promise<void> {
    const { error } = await supabase.from(this.usersTable).update(user).eq('id', id);
    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.usersTable).delete().eq('id', id);
    if (error) throw error;
  }

  async findInvitationByToken(token: string): Promise<Invitation | null> {
    const { data, error } = await supabase
      .from(this.invitationsTable)
      .select('*')
      .eq('token', token)
      .single();

    if (error) return null;
    return data as Invitation;
  }

  async saveInvitation(invitation: Invitation): Promise<void> {
    const { error } = await supabase.from(this.invitationsTable).upsert(invitation);
    if (error) throw error;
  }

  async deleteInvitation(id: string): Promise<void> {
    const { error } = await supabase.from(this.invitationsTable).delete().eq('id', id);
    if (error) throw error;
  }

  async findAllInvitations(): Promise<Invitation[]> {
    const { data, error } = await supabase.from(this.invitationsTable).select('*');
    if (error) throw error;
    return data as Invitation[];
  }
}
