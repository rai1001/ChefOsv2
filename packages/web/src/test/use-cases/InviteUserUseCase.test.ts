import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InviteUserUseCase } from '../../application/use-cases/user-management/InviteUserUseCase';
import { UserRole } from '../../domain/entities/User';

describe('InviteUserUseCase', () => {
  let useCase: InviteUserUseCase;
  const mockRepository = {
    createInvitation: vi.fn(),
    // Implement other methods as needed by interface strictness,
    // but for this test only createInvitation is needed if we cast or use partial
  } as any;

  beforeEach(() => {
    useCase = new InviteUserUseCase(mockRepository);
    vi.clearAllMocks();
  });

  it('should call repository with correct data', async () => {
    const mockData = {
      email: 'test@test.com',
      role: UserRole.STAFF,
      allowedOutlets: [],
    };

    mockRepository.createInvitation.mockResolvedValue('invitation-id');

    const result = await useCase.execute(mockData);

    expect(result).toBe('invitation-id');
    expect(mockRepository.createInvitation).toHaveBeenCalledWith(mockData);
  });
});
