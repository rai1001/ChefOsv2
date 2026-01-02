import { useEffect, useState } from 'react';
import { container } from '../../application/di/Container';
import { TYPES } from '../../application/di/types';
import { IIngredientRepository } from '../../domain/interfaces/repositories/IIngredientRepository';

export const SupabaseTestPage = () => {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'firebase' | 'supabase'>('supabase');

  // Hardcoded ID from seed script
  const TEST_OUTLET_ID = '51f84de3-62e1-44c3-a6f8-b347285aca03';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setIngredients([]);

    try {
      let repo: IIngredientRepository;

      if (source === 'supabase') {
        // Get the specific Supabase implementation
        repo = container.get(TYPES.SupabaseIngredientRepository);
      } else {
        // Get the specific Firebase implementation
        repo = container.get(TYPES.FirebaseIngredientRepository);
      }

      console.log(`Fetching from ${source} for outlet ${TEST_OUTLET_ID}...`);
      const data = await repo.getIngredients(TEST_OUTLET_ID);
      console.log('Data received:', data);
      setIngredients(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let subscription: any = null;

    if (source === 'supabase') {
      console.log('Subscribing to realtime updates...');
      // In a real app, use the repository. Here we hack it for the PoC.
      import('../../config/supabase').then(({ supabase }) => {
        const channel = supabase
          .channel('room1')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'ingredients' },
            (payload: any) => {
              console.log('Change received!', payload);
              fetchData();
            }
          )
          .subscribe();
        subscription = channel;
      });
    }

    return () => {
      if (subscription) {
        import('../../config/supabase').then(({ supabase }) => {
          supabase.removeChannel(subscription);
        });
      }
    };
  }, [source]);

  useEffect(() => {
    fetchData();
  }, [source]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">🧪 Supabase Hybrid Verification</h1>
        <div className="space-x-4">
          <button
            onClick={() => setSource('firebase')}
            className={`px-4 py-2 rounded ${source === 'firebase' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
          >
            Test Firebase (Legacy)
          </button>
          <button
            onClick={() => setSource('supabase')}
            className={`px-4 py-2 rounded ${source === 'supabase' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            Test Supabase (New)
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-lg font-semibold mb-4">
          Resultados de: <span className="uppercase">{source}</span>
        </h2>

        {loading && <p>Cargando datos...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {!loading && !error && ingredients.length === 0 && (
          <p className="text-gray-500">
            No se encontraron ingredientes para el ID: {TEST_OUTLET_ID}
          </p>
        )}

        {ingredients.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ingredients.map((ing) => (
                  <tr key={ing.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ing.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ing.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ing.stock ?? ing.current_stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ing.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ing.costPerUnit ?? ing.cost_per_unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded text-xs text-gray-500 font-mono">
        Outlet ID: {TEST_OUTLET_ID}
      </div>
    </div>
  );
};
