// import { addDoc, collection } from 'firebase/firestore';
// import { db } from '@/config/firebase';

export type AuditAction =
  | 'PURCHASE_ORDER_Created'
  | 'PURCHASE_ORDER_Approved'
  | 'PURCHASE_ORDER_Rejected'
  | 'PURCHASE_ORDER_Sent'
  | 'PURCHASE_ORDER_Received'
  | 'PURCHASE_ORDER_Deleted'
  | 'USER_Login'
  | 'SETTINGS_Update';

export interface AuditEvent {
  action: AuditAction;
  entityId?: string; // e.g., PurchaseOrder ID
  userId: string;
  details?: any;
  timestamp: string; // ISO
  outletId?: string;
}

const COLLECTION_NAME = 'audit_logs';

export const auditService = {
  log: async (event: Omit<AuditEvent, 'timestamp'>): Promise<void> => {
    try {
      console.log(`[AUDIT] ${event.action} - ${event.entityId}`, event);
      // TODO: Implement Supabase audit logging
      /*
            await addDoc(collection(db, COLLECTION_NAME), {
                ...event,
                timestamp: new Date().toISOString()
            });
            */
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw, audit failure shouldn't block main flow usually
    }
  },
};
