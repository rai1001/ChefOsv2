import { onSnapshot as firebaseOnSnapshot, Query } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';

export const onSnapshotMockable = <T = DocumentData>(
    query: Query<T>,
    collectionName: string,
    onNext: (snapshot: { docs: any[] }) => void,
    onError?: (error: Error) => void,
    filterOutletId?: string | null
) => {
    const mockDBStr = typeof localStorage !== 'undefined' ? localStorage.getItem('E2E_MOCK_DB') : null;

    if (mockDBStr) {
        const triggerUpdate = () => {
            try {
                const currentMockDBStr = localStorage.getItem('E2E_MOCK_DB');
                if (!currentMockDBStr) return;
                const db = JSON.parse(currentMockDBStr);
                let items = db[collectionName] || [];

                if (filterOutletId) {
                    items = items.filter((item: any) => item.outletId === filterOutletId);
                }

                onNext({
                    docs: items.map((item: any) => ({
                        id: item.id || 'mock-id',
                        data: () => item
                    }))
                });
            } catch (e) {
                console.error('[MockSnapshot] Error parsing mock DB', e);
            }
        };

        // Initial call
        triggerUpdate();

        // Listen for updates
        const handleUpdate = (e: any) => {
            if (e.detail?.collection === collectionName) {
                triggerUpdate();
            }
        };

        window.addEventListener('MOCK_DB_UPDATED', handleUpdate);

        // Return unsubscribe
        return () => {
            window.removeEventListener('MOCK_DB_UPDATED', handleUpdate);
        };
    }

    return firebaseOnSnapshot(query, (snapshot) => {
        onNext(snapshot as any);
    }, onError);
};
