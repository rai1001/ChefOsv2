import { IEventRepository } from '../../infrastructure/repositories/IEventRepository';

export class DeleteEventUseCase {
  constructor(private readonly repository: IEventRepository) {}

  async execute(id: string): Promise<void> {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new Error('Event not found');
    }

    await this.repository.delete(id);
  }
}
