import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateFichaTecnicaUseCase } from './CreateFichaTecnicaUseCase';
import { IFichaTecnicaRepository } from '../../infrastructure/repositories/IFichaTecnicaRepository';

describe('CreateFichaTecnicaUseCase', () => {
  let useCase: CreateFichaTecnicaUseCase;
  let mockRepo: IFichaTecnicaRepository;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
    } as unknown as IFichaTecnicaRepository;
    useCase = new CreateFichaTecnicaUseCase(mockRepo);
  });

  it('should create a ficha successfully', async () => {
    const dto = { name: 'New Recipe', outletId: 'outlet-1' } as any;
    const mockFicha = { id: '1', ...dto } as any;
    vi.mocked(mockRepo.create).mockResolvedValue(mockFicha);

    const result = await useCase.execute(dto);

    expect(result).toBe(mockFicha);
    expect(mockRepo.create).toHaveBeenCalledWith(dto);
  });

  it('should throw error if name is missing', async () => {
    const dto = { outletId: 'outlet-1' } as any;
    await expect(useCase.execute(dto)).rejects.toThrow('Name is required');
  });

  it('should throw error if outletId is missing', async () => {
    const dto = { name: 'Recipe' } as any;
    await expect(useCase.execute(dto)).rejects.toThrow('Outlet ID is required');
  });
});
