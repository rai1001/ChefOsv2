import {
  IBatchRepository,
  Batch,
  BatchStatus,
  CreateBatchDTO,
  ConsumeBatchDTO,
  RepositoryOptions,
  Quantity,
  Money,
  Unit,
} from '@culinaryos/core';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  Transaction,
  collectionGroup,
  documentId,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const toDomain = (id: string, data: any): Batch => {
  return {
    id,
    ingredientId: data.ingredientId,
    outletId: data.outletId,
    lotNumber: data.lotNumber,
    quantity: new Quantity(data.quantity.value, new Unit(data.quantity.unit)),
    remainingQuantity: new Quantity(
      data.remainingQuantity.value,
      new Unit(data.remainingQuantity.unit)
    ),
    unitCost: new Money(data.unitCost.amount, data.unitCost.currency),
    totalCost: new Money(data.totalCost.amount, data.totalCost.currency),
    supplier: data.supplier,
    expiryDate: (data.expiryDate as Timestamp).toDate(),
    receivedDate: (data.receivedDate as Timestamp).toDate(),
    status: data.status as BatchStatus,
    invoiceReference: data.invoiceReference,
    notes: data.notes,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
};

import { injectable } from 'inversify';

@injectable()
export class FirestoreBatchRepository implements IBatchRepository {
  private getCollection(outletId: string, ingredientId: string) {
    return collection(db, 'outlets', outletId, 'ingredients', ingredientId, 'batches');
  }

  async create(dto: CreateBatchDTO, options?: RepositoryOptions): Promise<Batch> {
    const coll = this.getCollection(dto.outletId, dto.ingredientId);
    const docRef = doc(coll);
    const now = new Date();

    const totalCostAmount = dto.quantity.value * dto.unitCost.amount;
    const totalCost = new Money(totalCostAmount, dto.unitCost.currency);

    const data = {
      ingredientId: dto.ingredientId,
      outletId: dto.outletId,
      lotNumber: dto.lotNumber,
      quantity: dto.quantity.toJSON(),
      remainingQuantity: dto.quantity.toJSON(),
      unitCost: dto.unitCost.toJSON(),
      totalCost: totalCost.toJSON(),
      supplier: dto.supplier,
      expiryDate: dto.expiryDate,
      receivedDate: dto.receivedDate,
      status: BatchStatus.ACTIVE,
      invoiceReference: dto.invoiceReference || null,
      notes: dto.notes || null,
      createdAt: now,
      updatedAt: now,
    };

    if (options?.transaction) {
      const txn = options.transaction as Transaction;
      txn.set(docRef, data);
    } else {
      await setDoc(docRef, data);
    }

    return toDomain(docRef.id, data);
  }

  async findById(id: string): Promise<Batch | null> {
    const q = query(collectionGroup(db, 'batches'), where(documentId(), '==', id));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const firstDoc = snapshot.docs[0];
    if (!firstDoc) return null;
    return toDomain(firstDoc.id, firstDoc.data());
  }

  async findByIngredient(ingredientId: string): Promise<Batch[]> {
    const q = query(collectionGroup(db, 'batches'), where('ingredientId', '==', ingredientId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => toDomain(d.id, d.data()));
  }

  async findActiveBatchesFIFO(ingredientId: string): Promise<Batch[]> {
    const q = query(
      collectionGroup(db, 'batches'),
      where('ingredientId', '==', ingredientId),
      where('status', '==', BatchStatus.ACTIVE),
      orderBy('expiryDate', 'asc'),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => toDomain(d.id, d.data()));
  }

  async findExpiringSoon(outletId: string, daysAhead: number): Promise<Batch[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);

    const q = query(
      collectionGroup(db, 'batches'),
      where('outletId', '==', outletId),
      where('status', '==', BatchStatus.ACTIVE),
      where('expiryDate', '<=', targetDate)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => toDomain(d.id, d.data()));
  }

  async consume(dto: ConsumeBatchDTO, options?: RepositoryOptions): Promise<Batch> {
    // For consume, we assume access to batchId.
    const batch = await this.findByIdOrThrow(dto.batchId, options);
    const docRef = doc(
      db,
      'outlets',
      batch.outletId,
      'ingredients',
      batch.ingredientId,
      'batches',
      batch.id
    );

    const currentRemaining = batch.remainingQuantity;
    const consumed = dto.quantity; // Quantity to consume

    const newRemainingValue = currentRemaining.value - consumed.value;

    let newStatus = batch.status;
    if (newRemainingValue <= 0.0001) {
      newStatus = BatchStatus.DEPLETED;
    }

    const updates: any = {
      'remainingQuantity.value': newRemainingValue,
      status: newStatus,
      updatedAt: new Date(),
    };

    if (options?.transaction) {
      (options.transaction as Transaction).update(docRef, updates);
    } else {
      await updateDoc(docRef, updates);
    }

    return {
      ...batch,
      remainingQuantity: new Quantity(newRemainingValue, batch.remainingQuantity.unit),
      status: newStatus,
    };
  }

  async updateStatus(id: string, status: string, options?: RepositoryOptions): Promise<Batch> {
    const batch = await this.findByIdOrThrow(id, options);
    const docRef = doc(
      db,
      'outlets',
      batch.outletId,
      'ingredients',
      batch.ingredientId,
      'batches',
      id
    );

    const updates = { status, updatedAt: new Date() };

    if (options?.transaction) {
      (options.transaction as Transaction).update(docRef, updates);
    } else {
      await updateDoc(docRef, updates);
    }

    return { ...batch, status: status as BatchStatus };
  }

  async delete(id: string, options?: RepositoryOptions): Promise<void> {
    const batch = await this.findByIdOrThrow(id, options);
    const docRef = doc(
      db,
      'outlets',
      batch.outletId,
      'ingredients',
      batch.ingredientId,
      'batches',
      id
    );

    if (options?.transaction) {
      (options.transaction as Transaction).delete(docRef);
    } else {
      await deleteDoc(docRef);
    }
  }

  private async findByIdOrThrow(id: string, options?: RepositoryOptions): Promise<Batch> {
    // Start by checking if we already have the doc? No state here.
    // In Transaction, we MUST know path to read.
    // Without path knowledge, we cannot perform transactional read if we only have ID
    // UNLESS we did a non-transactional read first to get path, THEN transactional read?
    // FireStore transactions require all reads before writes.
    // If we read non-transactionally, standard concurrency issues apply (stale path?).
    // But Batch Path is immutable (location doesn't change).
    // So reading path non-transactionally is SAFE.

    // Step 1: Browse path via CollectionGroup (Non-transactional, effectively)
    const q = query(collectionGroup(db, 'batches'), where(documentId(), '==', id));
    const snapshot = await getDocs(q);

    if (snapshot.empty) throw new Error(`Batch ${id} not found`);
    const docData = snapshot.docs[0];
    if (!docData) throw new Error(`Batch ${id} not found`);

    // If NO transaction, we are done (but should return typed object)
    // If Transaction, we MUST read it AGAIN using transaction.get(ref).

    const ref = docData.ref;

    if (options?.transaction) {
      // Transactional READ
      const txnSnap = await (options.transaction as Transaction).get(ref);
      if (!txnSnap.exists()) throw new Error(`Batch ${id} not found in transaction`);
      return toDomain(txnSnap.id, txnSnap.data());
    }

    return toDomain(docData.id, docData.data());
  }
}
