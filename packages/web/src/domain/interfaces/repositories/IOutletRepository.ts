import { Outlet } from '@/types';

export interface IOutletRepository {
  getOutlets(): Promise<Outlet[]>;
  getOutletById(id: string): Promise<Outlet | null>;
  saveOutlet(outlet: Outlet): Promise<void>;
  updateOutlet(id: string, updates: Partial<Outlet>): Promise<void>;
  deleteOutlet(id: string): Promise<void>;
}
