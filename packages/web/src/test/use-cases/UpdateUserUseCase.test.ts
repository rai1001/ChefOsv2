import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateUserUseCase } from '../../application/use-cases/user-management/UpdateUserUseCase';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  const mockRepository = {
    updateUser: vi.fn(),
  } as any;

  beforeEach(() => {
    useCase = new UpdateUserUseCase(mockRepository);
    vi.clearAllMocks();
  });

  it('should call repository update user', async () => {
    const updates = { active: true };
    await useCase.execute('123', updates);

    expect(mockRepository.updateUser).toHaveBeenCalledWith('123', updates);
  });

  it('should throw if no uid provided', async () => {
    await expect(useCase.execute('', {})).rejects.toThrow('User ID is required');
  });
});
