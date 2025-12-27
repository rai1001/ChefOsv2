import {
  FichaTecnica,
  CreateFichaTecnicaDTO,
  UpdateFichaTecnicaDTO,
  FichaTecnicaVersion,
} from '../../domain/entities/FichaTecnica';

export interface IFichaTecnicaRepository {
  create(dto: CreateFichaTecnicaDTO): Promise<FichaTecnica>;
  findById(id: string): Promise<FichaTecnica | null>;
  findByOutletId(outletId: string): Promise<FichaTecnica[]>;
  findByCategory(outletId: string, category: string): Promise<FichaTecnica[]>;
  update(id: string, dto: UpdateFichaTecnicaDTO): Promise<FichaTecnica>;
  delete(id: string): Promise<void>;
  createVersion(fichaId: string, reason?: string): Promise<FichaTecnicaVersion>;
  getVersions(fichaId: string): Promise<FichaTecnicaVersion[]>;
  getVersion(fichaId: string, versionNumber: number): Promise<FichaTecnicaVersion | null>;
}
