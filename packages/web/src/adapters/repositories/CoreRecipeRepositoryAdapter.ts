import { injectable, inject } from 'inversify';
import { IFichaTecnicaRepository } from '@culinaryos/core/infrastructure/repositories/IFichaTecnicaRepository';
import {
  FichaTecnica,
  CreateFichaTecnicaDTO,
  UpdateFichaTecnicaDTO,
  FichaTecnicaVersion,
} from '@culinaryos/core/domain/entities/FichaTecnica';
import { IRecipeRepository as ILegacyRecipeRepository } from '@/domain/interfaces/repositories/IRecipeRepository';
import { TYPES } from '@/application/di/types';
import { RecipeAdapter } from '../RecipeAdapter';
import { v4 as uuidv4 } from 'uuid';
import { RepositoryOptions } from '@culinaryos/core/infrastructure/repositories/RepositoryOptions';

@injectable()
export class CoreRecipeRepositoryAdapter implements IFichaTecnicaRepository {
  constructor(@inject(TYPES.RecipeRepository) private legacyRepo: ILegacyRecipeRepository) {}

  async create(dto: CreateFichaTecnicaDTO, _options?: RepositoryOptions): Promise<FichaTecnica> {
    const id = uuidv4();
    const ficha: FichaTecnica = {
      id,
      ...dto,
      version: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ingredients: dto.ingredients.map((i) => ({
        ...i,
        ingredientName: 'Unknown', // Names are typically joined in the view or handled by enrichers
      })) as any,
    };
    const legacy = RecipeAdapter.toLegacy(ficha);
    await this.legacyRepo.createRecipe(legacy);
    return ficha;
  }

  async findById(id: string): Promise<FichaTecnica | null> {
    const legacy = await this.legacyRepo.getRecipeById(id);
    return legacy ? RecipeAdapter.toCore(legacy) : null;
  }

  async findByOutletId(outletId: string): Promise<FichaTecnica[]> {
    const legacies = await this.legacyRepo.getRecipes(outletId);
    return legacies.map(RecipeAdapter.toCore);
  }

  async findByCategory(outletId: string, category: string): Promise<FichaTecnica[]> {
    const all = await this.findByOutletId(outletId);
    return all.filter((f) => f.category === category);
  }

  async update(
    id: string,
    dto: UpdateFichaTecnicaDTO,
    _options?: RepositoryOptions
  ): Promise<FichaTecnica> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Ficha not found');

    const updated = { ...existing, ...dto, updatedAt: new Date() };
    const legacy = RecipeAdapter.toLegacy(updated as any);
    await this.legacyRepo.updateRecipe(id, legacy);
    return updated as any;
  }

  async delete(id: string, _options?: RepositoryOptions): Promise<void> {
    await this.legacyRepo.deleteRecipe(id);
  }

  async createVersion(
    _version: Omit<FichaTecnicaVersion, 'id' | 'createdAt'>
  ): Promise<FichaTecnicaVersion> {
    throw new Error('Versioning not supported in legacy adapter');
  }

  async getVersions(_fichaId: string): Promise<FichaTecnicaVersion[]> {
    return [];
  }

  async findVersionsByIngredient(
    _ingredientId: string,
    _outletId?: string
  ): Promise<FichaTecnicaVersion[]> {
    return [];
  }

  async getVersion(_fichaId: string, _versionNumber: number): Promise<FichaTecnicaVersion | null> {
    return null;
  }
}
