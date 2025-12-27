import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateFichaTecnicaUseCase } from './UpdateFichaTecnicaUseCase';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';

describe('UpdateFichaTecnicaUseCase', () => {
  let useCase: UpdateFichaTecnicaUseCase;
  let mockRepository: IFichaTecnicaRepository;

  beforeEach(() => {
    mockRepository = {
      update: vi.fn(),
    } as any;
    useCase = new UpdateFichaTecnicaUseCase(mockRepository);
  });

  it('should delegate update to the repository', async () => {
    const mockFicha = { id: '1', name: 'Updated' } as any;
    vi.mocked(mockRepository.update).mockResolvedValue(mockFicha);

    const result = await useCase.execute('1', { name: 'Updated' });

    expect(result).toEqual(mockFicha);
    expect(mockRepository.update).toHaveBeenCalledWith('1', { name: 'Updated' });
  });
});
