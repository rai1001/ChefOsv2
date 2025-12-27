import { injectable } from 'inversify';
import { db } from '@/config/firebase';
import { collection, doc, setDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { ProductionTask } from '@culinaryos/core';

export interface IProductionRepository {
    getTasksByEvent(eventId: string): Promise<ProductionTask[]>;
    createTask(task: ProductionTask): Promise<void>;
    updateTask(id: string, task: Partial<ProductionTask>): Promise<void>;
}

@injectable()
export class FirebaseProductionRepository implements IProductionRepository {
    private collectionName = 'productionTasks';

    async getTasksByEvent(eventId: string): Promise<ProductionTask[]> {
        const q = query(collection(db, this.collectionName), where('eventId', '==', eventId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProductionTask));
    }

    async createTask(task: ProductionTask): Promise<void> {
        await setDoc(doc(db, this.collectionName, task.id), {
            ...task,
            createdAt: task.createdAt.toISOString(),
            updatedAt: task.updatedAt.toISOString(),
            scheduledFor: task.scheduledFor.toISOString()
        });
    }

    async updateTask(id: string, task: Partial<ProductionTask>): Promise<void> {
        const updateData: any = { ...task, updatedAt: new Date().toISOString() };
        if (task.scheduledFor instanceof Date) updateData.scheduledFor = task.scheduledFor.toISOString();
        await updateDoc(doc(db, this.collectionName, id), updateData);
    }
}
