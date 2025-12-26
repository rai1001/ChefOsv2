import React from 'react';
import { Button } from '@culinaryos/ui';
import { Ingredient, Batch } from '@culinaryos/core';

interface ExpiryAlertProps {
  ingredient: Ingredient;
  batches: Batch[];
  daysUntilExpiry: number;
}

export const ExpiryAlert: React.FC<ExpiryAlertProps> = ({
  ingredient,
  batches,
  daysUntilExpiry,
}) => {
  const totalExpiring = batches.reduce((acc, b) => acc + b.remainingQuantity.value, 0);
  const unit = batches[0]?.remainingQuantity.unit.toString() || '';

  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex justify-between items-center shadow-sm">
      <div>
        <h4 className="font-semibold text-red-900 font-medium">{ingredient.name}</h4>
        <p className="text-sm text-red-700">
          <strong>
            {totalExpiring} {unit}
          </strong>{' '}
          expiring within {daysUntilExpiry} days.
        </p>
        <p className="text-xs text-red-600 mt-1">
          Lots: {batches.map((b) => b.lotNumber).join(', ')}
        </p>
      </div>
      <Button variant="danger" size="sm">
        Details
      </Button>
    </div>
  );
};
