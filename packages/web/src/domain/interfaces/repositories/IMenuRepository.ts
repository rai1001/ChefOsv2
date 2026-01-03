import { Menu, MenuStatus } from '../../entities/Menu';

export interface IMenuRepository {
  create(menu: Menu): Promise<void>;
  findById(id: string): Promise<Menu | null>;
  update(id: string, menu: Partial<Menu>): Promise<void>;
  delete(id: string): Promise<void>;

  findByOutlet(outletId: string): Promise<Menu[]>;
  findByStatus(outletId: string, status: MenuStatus): Promise<Menu[]>;
  findActive(outletId: string): Promise<Menu[]>;
}
