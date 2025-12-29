import { useState, useCallback, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/presentation/store/authAtoms';
import { container } from '@/application/di/Container';
import { TYPES } from '@/application/di/types';
import type { User, UserUpdateDTO } from '@/types';
import { UserRole } from '@/domain/entities/User';
import type { ListUsersUseCase } from '@/application/use-cases/user-management/ListUsersUseCase';
import type { UpdateUserUseCase } from '@/application/use-cases/user-management/UpdateUserUseCase';
import type { DeleteUserUseCase } from '@/application/use-cases/user-management/DeleteUserUseCase';
import type { ActivateUserUseCase } from '@/application/use-cases/user-management/ActivateUserUseCase';
import type { DeactivateUserUseCase } from '@/application/use-cases/user-management/DeactivateUserUseCase';
import type { ChangeUserRoleUseCase } from '@/application/use-cases/user-management/ChangeUserRoleUseCase';
import type { AssignOutletsUseCase } from '@/application/use-cases/user-management/AssignOutletsUseCase';
import type {
  InviteUserUseCase,
  InviteUserDTO,
} from '@/application/use-cases/user-management/InviteUserUseCase';
import type { ListInvitationsUseCase } from '@/application/use-cases/user-management/ListInvitationsUseCase';
import type { DeleteInvitationUseCase } from '@/application/use-cases/user-management/DeleteInvitationUseCase';
import type { Invitation } from '@/types';
import { toast } from 'sonner';

export const useUserManagement = () => {
  const currentUser = useAtomValue(userAtom);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use Case Instances
  const listUsersUseCase = container.get<ListUsersUseCase>(TYPES.ListUsersUseCase);
  const updateUserUseCase = container.get<UpdateUserUseCase>(TYPES.UpdateUserUseCase);
  const deleteUserUseCase = container.get<DeleteUserUseCase>(TYPES.DeleteUserUseCase);
  const activateUserUseCase = container.get<ActivateUserUseCase>(TYPES.ActivateUserUseCase);
  const deactivateUserUseCase = container.get<DeactivateUserUseCase>(TYPES.DeactivateUserUseCase);
  const changeUserRoleUseCase = container.get<ChangeUserRoleUseCase>(TYPES.ChangeUserRoleUseCase);
  const assignOutletsUseCase = container.get<AssignOutletsUseCase>(TYPES.AssignOutletsUseCase);

  const inviteUserUseCase = container.get<InviteUserUseCase>(TYPES.InviteUserUseCase);
  const listInvitationsUseCase = container.get<ListInvitationsUseCase>(
    TYPES.ListInvitationsUseCase
  );
  const deleteInvitationUseCase = container.get<DeleteInvitationUseCase>(
    TYPES.DeleteInvitationUseCase
  );

  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsersUseCase.execute();
      setUsers(data);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Error loading users');
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [listUsersUseCase]);

  // Real-time listener setup (optional, but good for admin panel)
  useEffect(() => {
    setLoading(true);
    // Users Subscription
    const unsubscribeUsers = listUsersUseCase.executeStream((data) => {
      setUsers(data);
      setLoading(false);
    });

    // Invitations Subscription
    const unsubscribeInvitations = listInvitationsUseCase.executeStream((data) => {
      setInvitations(data);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeInvitations();
    };
  }, [listUsersUseCase, listInvitationsUseCase]);

  const updateUser = async (uid: string, updates: Partial<UserUpdateDTO>) => {
    try {
      if (updates.role) {
        // Cast types.Role vs User.UserRole if needed, but they should match or be compatible
        await changeUserRoleUseCase.execute(uid, updates.role as unknown as UserRole);
        delete updates.role; // Handled separately
      }
      if (updates.allowedOutlets) {
        await assignOutletsUseCase.execute(uid, updates.allowedOutlets);
        delete updates.allowedOutlets;
      }

      // If there are remaining updates
      if (Object.keys(updates).length > 0) {
        await updateUserUseCase.execute(uid, updates);
      }

      toast.success('Usuario actualizado correctamente');
    } catch (err: any) {
      console.error('Error updating user:', err);
      toast.error('Error al actualizar usuario: ' + err.message);
      throw err;
    }
  };

  const deleteUser = async (uid: string) => {
    if (!currentUser) return;
    try {
      await deleteUserUseCase.execute(uid, currentUser.id);
      toast.success('Usuario eliminado correctamente');
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast.error('Error al eliminar usuario: ' + err.message);
      throw err;
    }
  };

  const toggleUserStatus = async (uid: string, isActive: boolean) => {
    if (!currentUser) return;
    try {
      if (isActive) {
        await deactivateUserUseCase.execute(uid, currentUser.id);
        toast.success('Usuario desactivado');
      } else {
        await activateUserUseCase.execute(uid);
        toast.success('Usuario activado');
      }
    } catch (err: any) {
      console.error('Error changing user status:', err);
      toast.error('Error al cambiar estado: ' + err.message);
      throw err;
    }
  };

  const inviteUser = async (data: InviteUserDTO) => {
    try {
      await inviteUserUseCase.execute(data);
      toast.success('Invitación enviada correctamente');
    } catch (err: any) {
      console.error('Error inviting user:', err);
      toast.error('Error al invitar usuario: ' + err.message);
      throw err;
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      await deleteInvitationUseCase.execute(invitationId);
      toast.success('Invitación cancelada');
    } catch (err: any) {
      console.error('Error cancelling invitation:', err);
      toast.error('Error al cancelar invitación: ' + err.message);
      throw err;
    }
  };

  return {
    users,
    invitations,
    loading,
    error,
    fetchUsers,
    updateUser,
    deleteUser,
    toggleUserStatus,
    inviteUser,
    cancelInvitation,
  };
};
