import {
  FichaTecnica,
  CreateFichaTecnicaDTO,
  UpdateFichaTecnicaDTO,
  FichaTecnicaVersion,
} from '../../domain/entities/FichaTecnica';
import { RepositoryOptions } from './RepositoryOptions';

export interface IFichaTecnicaRepository {
  create(dto: CreateFichaTecnicaDTO, options?: RepositoryOptions): Promise<FichaTecnica>;
  findById(id: string): Promise<FichaTecnica | null>;
  findByOutletId(outletId: string): Promise<FichaTecnica[]>;
  findByCategory(outletId: string, category: string): Promise<FichaTecnica[]>;
  update(
    id: string,
    dto: UpdateFichaTecnicaDTO,
    options?: RepositoryOptions
  ): Promise<FichaTecnica>;
  delete(id: string, options?: RepositoryOptions): Promise<void>;

  // Versioning
  createVersion(
    version: Omit<FichaTecnicaVersion, 'id' | 'createdAt'>
  ): Promise<FichaTecnicaVersion>;
  getVersions(fichaId: string): Promise<FichaTecnicaVersion[]>;
  findVersionsByIngredient(ingredientId: string, outletId?: string): Promise<FichaTecnicaVersion[]>;
  getVersion(fichaId: string, versionNumber: number): Promise<FichaTecnicaVersion | null>;
}
