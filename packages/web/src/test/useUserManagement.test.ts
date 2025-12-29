import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useUserManagement } from '@/presentation/hooks/useUserManagement';
import { container } from '@/application/di/Container';
import { TYPES } from '@/application/di/types';

// Mock jotai
vi.mock('jotai', () => ({
  useAtomValue: vi.fn(() => ({ id: 'current-admin-id' })),
  atom: vi.fn(),
}));

// Mock Sonner/Toast - wait, hook defines simple toast object internally?
// Looking at the file, it defines `const toast = ...`.
// If it was imported, we would mock it.
// Since it's local, we can't easily assert on it unless we export it or inject it.
// But we can check state changes.

describe('useUserManagement', () => {
  const mockListUsers = { execute: vi.fn(), executeStream: vi.fn() };
  const mockUpdateUser = { execute: vi.fn() };
  const mockDeleteUser = { execute: vi.fn() };
  const mockActivate = { execute: vi.fn() };
  const mockDeactivate = { execute: vi.fn() };
  const mockChangeRole = { execute: vi.fn() };
  const mockAssignOutlets = { execute: vi.fn() };
  const mockInvite = { execute: vi.fn() };
  const mockListInvitations = { executeStream: vi.fn() };
  const mockDeleteInvitation = { execute: vi.fn() };

  const bindOrRebind = <T>(serviceIdentifier: symbol, value: T) => {
    if (container.isBound(serviceIdentifier)) {
      container.unbind(serviceIdentifier);
      container.bind(serviceIdentifier).toConstantValue(value as any);
    } else {
      container.bind(serviceIdentifier).toConstantValue(value as any);
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup container mocks
    bindOrRebind(TYPES.ListUsersUseCase, mockListUsers);
    bindOrRebind(TYPES.UpdateUserUseCase, mockUpdateUser);
    bindOrRebind(TYPES.DeleteUserUseCase, mockDeleteUser);
    bindOrRebind(TYPES.ActivateUserUseCase, mockActivate);
    bindOrRebind(TYPES.DeactivateUserUseCase, mockDeactivate);
    bindOrRebind(TYPES.ChangeUserRoleUseCase, mockChangeRole);
    bindOrRebind(TYPES.AssignOutletsUseCase, mockAssignOutlets);
    bindOrRebind(TYPES.InviteUserUseCase, mockInvite);
    bindOrRebind(TYPES.ListInvitationsUseCase, mockListInvitations);
    bindOrRebind(TYPES.DeleteInvitationUseCase, mockDeleteInvitation);

    mockListUsers.executeStream.mockReturnValue(() => {});
    mockListInvitations.executeStream.mockReturnValue(() => {});
  });

  afterEach(() => {
    cleanup();
  });

  it('should fetch users on initial load', async () => {
    mockListUsers.execute.mockResolvedValue([]);

    const { result } = renderHook(() => useUserManagement());

    // Trigger fetch
    await act(async () => {
      await result.current.fetchUsers();
    });

    expect(mockListUsers.execute).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('should call invite use case', async () => {
    const { result } = renderHook(() => useUserManagement());

    const inviteData = {
      email: 'test@test.com',
      role: 'staff' as any,
      allowedOutlets: [],
    };

    await act(async () => {
      await result.current.inviteUser(inviteData);
    });

    expect(mockInvite.execute).toHaveBeenCalledWith(inviteData);
  });
});
