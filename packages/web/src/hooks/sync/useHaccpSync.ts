import { useEffect, useState } from 'react';
// import { onSnapshot, query, where } from 'firebase/firestore';
import { collections } from '@/config/collections';
import { useStore } from '@/presentation/store/useStore';

export const useHaccpSync = () => {
  const { setHACCPLogs, setHACCPTasks, setHACCPTaskCompletions, setPCCs, activeOutletId } =
    useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Stubbed for Supabase migration
    const fetchHACCP = async () => {
      setLoading(false);
    };
    fetchHACCP();
    /*
    if (!activeOutletId) {
      setHACCPLogs([]);
      setHACCPTasks([]);
      setHACCPTaskCompletions([]);
      setPCCs([]);
      setLoading(false);
      return;
    }

    const qLogs = query(collections.haccpLogs, where('outletId', '==', activeOutletId));
    const qTasks = query(collections.haccpTasks, where('outletId', '==', activeOutletId));
    const qCompletions = query(
      collections.haccpTaskCompletions,
      where('outletId', '==', activeOutletId)
    );
    const qPCCs = query(collections.pccs, where('outletId', '==', activeOutletId));

    const unsubLogs = onSnapshot(
      qLogs,
      (snap) => {
        setHACCPLogs(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any));
      },
      (error) => console.error('Error syncing haccpLogs:', error)
    );

    const unsubTasks = onSnapshot(
      qTasks,
      (snap) => {
        setHACCPTasks(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any));
      },
      (error) => console.error('Error syncing haccpTasks:', error)
    );

    const unsubCompletions = onSnapshot(
      qCompletions,
      (snap) => {
        setHACCPTaskCompletions(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any));
      },
      (error) => console.error('Error syncing haccpTaskCompletions:', error)
    );

    const unsubPCCs = onSnapshot(
      qPCCs,
      (snap) => {
        setPCCs(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any));
        setLoading(false); // Assume loaded when PCCs load (approx)
      },
      (error) => {
        console.error('Error syncing PCCs:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubLogs();
      unsubTasks();
      unsubCompletions();
      unsubPCCs();
    };
    */
  }, [activeOutletId, setHACCPLogs, setHACCPTasks, setHACCPTaskCompletions, setPCCs]);

  return { loading };
};
