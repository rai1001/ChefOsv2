import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetFichasTecnicasUseCase } from './GetFichasTecnicasUseCase';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';

describe('GetFichasTecnicasUseCase', () => {
  let useCase: GetFichasTecnicasUseCase;
  let mockRepo: IFichaTecnicaRepository;

  beforeEach(() => {
    mockRepo = {
      findByOutletId: vi.fn(),
    } as unknown as IFichaTecnicaRepository;
    useCase = new GetFichasTecnicasUseCase(mockRepo);
  });

  it('should return fichas for an outletId', async () => {
    const mockFichas = [{ id: '1', name: 'Recipe 1' }] as any[];
    vi.mocked(mockRepo.findByOutletId).mockResolvedValue(mockFichas);

    const result = await useCase.execute('outlet-123');

    expect(result).toBe(mockFichas);
    expect(mockRepo.findByOutletId).toHaveBeenCalledWith('outlet-123');
  });
});
