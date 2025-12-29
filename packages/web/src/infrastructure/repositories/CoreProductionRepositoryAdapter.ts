import { injectable } from 'inversify';
import {
  IProductionTaskRepository,
  ProductionTask,
  CreateProductionTaskDTO,
  UpdateProductionTaskDTO,
  ProductionTaskStatus,
  ProductionStation,
  RepositoryOptions,
  Quantity,
  Unit,
} from '@culinaryos/core';
import { db } from '@/config/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { LoggingService } from '../services/LoggingService';

@injectable()
export class CoreProductionRepositoryAdapter implements IProductionTaskRepository {
  private collectionName = 'productionTasks';

  private mapDocToEntity(id: string, data: any): ProductionTask {
    return {
      ...data,
      id,
      quantity: new Quantity(
        data.quantity.value,
        typeof data.quantity.unit === 'string'
          ? Unit.from(data.quantity.unit)
          : (data.quantity.unit as Unit)
      ),
      scheduledFor:
        data.scheduledFor instanceof Timestamp
          ? data.scheduledFor.toDate()
          : new Date(data.scheduledFor),
      startedAt: data.startedAt
        ? data.startedAt instanceof Timestamp
          ? data.startedAt.toDate()
          : new Date(data.startedAt)
        : undefined,
      completedAt: data.completedAt
        ? data.completedAt instanceof Timestamp
          ? data.completedAt.toDate()
          : new Date(data.completedAt)
        : undefined,
      createdAt:
        data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt:
        data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
    } as ProductionTask;
  }

  async create(
    dto: CreateProductionTaskDTO,
    _options?: RepositoryOptions
  ): Promise<ProductionTask> {
    const id = doc(collection(db, this.collectionName)).id;
    const now = new Date();

    // Fetch ficha name if not provided (mocking logic or assuming it needs to be known)
    // For simplicity, we assume the DTO usually contains enough info or we'd need another repository.
    // However, the interface says `fichaName` is on the Entity but not explicitly required in DTO?
    // Wait, looking at Entity definition: fichaName IS in ProductionTask, but CreateProductionTaskDTO does NOT have it.
    // This implies we need to fetch it. For now, I'll use a placeholder.
    const FichaNamePlaceholder = 'Unknown Recipe';

    const task: ProductionTask = {
      id,
      outletId: dto.outletId,
      eventId: dto.eventId,
      fichaId: dto.fichaId,
      fichaName: FichaNamePlaceholder, // TODO: Fetch from FichaRepository
      quantity: dto.quantity,
      station: dto.station,
      priority: dto.priority || ('medium' as any), // Default to medium
      status: ProductionTaskStatus.PENDING,
      assignedTo: dto.assignedTo,
      scheduledFor: dto.scheduledFor,
      estimatedDuration: dto.estimatedDuration,
      notes: dto.notes,
      createdBy: 'system', // TODO: Get current user
      createdAt: now,
      updatedAt: now,
    };

    const firestoreData = {
      ...task,
      quantity: { value: task.quantity.value, unit: task.quantity.unit.toString() }, // Flatten Quantity correctly
      scheduledFor: Timestamp.fromDate(task.scheduledFor),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    // Remove undefined fields
    Object.keys(firestoreData).forEach(
      (key) => (firestoreData as any)[key] === undefined && delete (firestoreData as any)[key]
    );

    try {
      await setDoc(doc(db, this.collectionName, id), firestoreData);
      return task;
    } catch (error) {
      LoggingService.error(`Failed to create production task: ${id}`, { error, task });
      throw error;
    }
  }

  async findById(id: string): Promise<ProductionTask | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return this.mapDocToEntity(docSnap.id, docSnap.data());
  }

  async findByEvent(eventId: string): Promise<ProductionTask[]> {
    const q = query(collection(db, this.collectionName), where('eventId', '==', eventId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapDocToEntity(doc.id, doc.data()));
  }

  async findByOutlet(outletId: string): Promise<ProductionTask[]> {
    const q = query(collection(db, this.collectionName), where('outletId', '==', outletId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapDocToEntity(doc.id, doc.data()));
  }

  async findByStation(outletId: string, station: ProductionStation): Promise<ProductionTask[]> {
    const q = query(
      collection(db, this.collectionName),
      where('outletId', '==', outletId),
      where('station', '==', station)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapDocToEntity(doc.id, doc.data()));
  }

  async findByStatus(outletId: string, status: ProductionTaskStatus): Promise<ProductionTask[]> {
    const q = query(
      collection(db, this.collectionName),
      where('outletId', '==', outletId),
      where('status', '==', status)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapDocToEntity(doc.id, doc.data()));
  }

  async findByDateRange(
    outletId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProductionTask[]> {
    const q = query(
      collection(db, this.collectionName),
      where('outletId', '==', outletId),
      where('scheduledFor', '>=', Timestamp.fromDate(startDate)),
      where('scheduledFor', '<=', Timestamp.fromDate(endDate))
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapDocToEntity(doc.id, doc.data()));
  }

  async update(
    id: string,
    dto: UpdateProductionTaskDTO,
    _options?: RepositoryOptions
  ): Promise<ProductionTask> {
    const docRef = doc(db, this.collectionName, id);
    const currentDoc = await getDoc(docRef);
    if (!currentDoc.exists()) throw new Error('Task not found');

    const updates: any = { ...dto, updatedAt: Timestamp.now() };
    if (dto.scheduledFor) updates.scheduledFor = Timestamp.fromDate(dto.scheduledFor);
    if (dto.startedAt) updates.startedAt = Timestamp.fromDate(dto.startedAt);
    if (dto.completedAt) updates.completedAt = Timestamp.fromDate(dto.completedAt);

    await updateDoc(docRef, updates);

    const updatedDoc = await getDoc(docRef);
    return this.mapDocToEntity(updatedDoc.id, updatedDoc.data());
  }

  async updateStatus(
    id: string,
    status: ProductionTaskStatus,
    _options?: RepositoryOptions
  ): Promise<ProductionTask> {
    const docRef = doc(db, this.collectionName, id);
    const updates: any = {
      status,
      updatedAt: Timestamp.now(),
    };

    if (status === ProductionTaskStatus.IN_PROGRESS) {
      updates.startedAt = Timestamp.now();
    } else if (status === ProductionTaskStatus.COMPLETED) {
      updates.completedAt = Timestamp.now();
      // Calculate actual duration if startedAt exists
      const currentDoc = await getDoc(docRef);
      const data = currentDoc.data();
      if (data?.startedAt) {
        const start =
          data.startedAt instanceof Timestamp ? data.startedAt.toDate() : new Date(data.startedAt);
        const end = new Date();
        updates.actualDuration = Math.round((end.getTime() - start.getTime()) / 60000); // Minutes
      }
    }

    await updateDoc(docRef, updates);

    const updatedDoc = await getDoc(docRef);
    return this.mapDocToEntity(updatedDoc.id, updatedDoc.data());
  }

  async delete(id: string, _options?: RepositoryOptions): Promise<void> {
    await deleteDoc(doc(db, this.collectionName, id));
  }
}
