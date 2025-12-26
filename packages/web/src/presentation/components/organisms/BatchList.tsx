import React, { useState } from 'react';
import { BatchStatus, Ingredient } from '@culinaryos/core';
import { Button } from '@culinaryos/ui';
import { useBatches } from '../../../application/hooks/useBatches';
import { AddBatchForm } from '../molecules/AddBatchForm';
import { ConsumeBatchForm } from '../molecules/ConsumeBatchForm';
import { ExpiryAlert } from '../molecules/ExpiryAlert';

interface BatchListProps {
  ingredient: Ingredient;
  outletId: string;
  onBack: () => void;
}

export const BatchList: React.FC<BatchListProps> = ({ ingredient, outletId, onBack }) => {
  const { batches, loading, error, addBatch, consumeBatch } = useBatches(ingredient.id);
  const [view, setView] = useState<'list' | 'add' | 'consume'>('list');

  // Simple expiry check (local) for visual
  const expiringBatches = batches.filter((b) => {
    const daysUntil = Math.ceil(
      (b.expiryDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)
    );
    return daysUntil <= 7 && daysUntil >= 0;
  });

  if (loading && batches.length === 0) return <div>Loading batches...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{ingredient.name}</h2>
            <div className="text-sm text-gray-500">
              Total Stock: {ingredient.currentStock.toString()}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {view === 'list' && (
            <>
              <Button variant="secondary" onClick={() => setView('consume')}>
                Consume
              </Button>
              <Button onClick={() => setView('add')}>Add Batch</Button>
            </>
          )}
          {view !== 'list' && (
            <Button variant="ghost" onClick={() => setView('list')}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {error && <div className="text-red-500">Error: {error.message}</div>}

      {/* Expiry Alerts */}
      {expiringBatches.length > 0 && view === 'list' && (
        <ExpiryAlert
          ingredient={ingredient}
          batches={expiringBatches}
          daysUntilExpiry={7} // Hardcoded threshold for warning
        />
      )}

      {view === 'add' && (
        <AddBatchForm
          ingredientId={ingredient.id}
          outletId={outletId}
          defaultUnit={ingredient.unit}
          onSubmit={addBatch}
          onSuccess={() => setView('list')}
        />
      )}

      {view === 'consume' && (
        <ConsumeBatchForm
          ingredientId={ingredient.id}
          batches={batches}
          unit={ingredient.unit}
          onSubmit={consumeBatch}
          onSuccess={() => setView('list')}
        />
      )}

      {view === 'list' && (
        <div className="overflow-hidden bg-white shadow rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Initial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batches.map((batch) => (
                <tr
                  key={batch.id}
                  className={batch.status === BatchStatus.EXPIRED ? 'bg-red-50' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {batch.lotNumber}
                    <div className="text-xs text-gray-500">{batch.supplier}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.expiryDate.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {batch.remainingQuantity.toString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.quantity.toString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.unitCost.toString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${batch.status === BatchStatus.ACTIVE ? 'bg-green-100 text-green-800' : ''}
                        ${batch.status === BatchStatus.DEPLETED ? 'bg-gray-100 text-gray-800' : ''}
                        ${batch.status === BatchStatus.EXPIRED ? 'bg-red-100 text-red-800' : ''}
                    `}
                    >
                      {batch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {batches.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No batches found for this ingredient.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
