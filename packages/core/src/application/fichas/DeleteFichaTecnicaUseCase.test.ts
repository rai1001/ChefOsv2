import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteFichaTecnicaUseCase } from './DeleteFichaTecnicaUseCase';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';

describe('DeleteFichaTecnicaUseCase', () => {
  let useCase: DeleteFichaTecnicaUseCase;
  let mockRepository: IFichaTecnicaRepository;

  beforeEach(() => {
    mockRepository = {
      delete: vi.fn(),
    } as any;
    useCase = new DeleteFichaTecnicaUseCase(mockRepository);
  });

  it('should delegate delete to the repository', async () => {
    vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

    await useCase.execute('1');

    expect(mockRepository.delete).toHaveBeenCalledWith('1');
  });
});
