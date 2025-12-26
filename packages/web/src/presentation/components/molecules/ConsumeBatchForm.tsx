import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@culinaryos/ui';
import { UnitType, ConsumeFIFODTO, Quantity, Unit, Batch } from '@culinaryos/core';

const consumeBatchSchema = z.object({
  quantityValue: z.number().min(0.001, 'Quantity is required'),
  reason: z.string().min(1, 'Reason is required'),
  reference: z.string().optional(),
});

type ConsumeBatchFormData = z.infer<typeof consumeBatchSchema>;

interface ConsumeBatchFormProps {
  ingredientId: string;
  batches: Batch[]; // Passed to show preview
  unit: string;
  onSuccess?: () => void;
  onSubmit: (dto: ConsumeFIFODTO) => Promise<any>;
}

export const ConsumeBatchForm: React.FC<ConsumeBatchFormProps> = ({
  ingredientId,
  batches,
  unit,
  onSuccess,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ConsumeBatchFormData>({
    resolver: zodResolver(consumeBatchSchema),
  });

  const quantityValue = watch('quantityValue');

  // Calculate preview
  const previewConsumption = () => {
    if (!quantityValue || quantityValue <= 0) return null;

    let remainingToConsume = quantityValue;
    const consumedBatches: { lot: string; amount: number }[] = [];

    for (const batch of batches) {
      if (remainingToConsume <= 0) break;
      // Assume batch unit is same as requested unit for simplicity or handled by backend
      // Visual approximation
      const canTake = Math.min(batch.remainingQuantity.value, remainingToConsume);
      consumedBatches.push({ lot: batch.lotNumber, amount: canTake });
      remainingToConsume -= canTake;
    }

    return consumedBatches;
  };

  const consumptionPreview = previewConsumption();

  const handleFormSubmit = async (data: ConsumeBatchFormData) => {
    try {
      const dto: ConsumeFIFODTO = {
        ingredientId,
        quantity: new Quantity(data.quantityValue, new Unit(unit as UnitType)),
        reason: data.reason,
        reference: data.reference,
      };

      await onSubmit(dto);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to consume:', error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-4 p-4 border rounded-lg bg-white shadow-sm"
    >
      <h3 className="text-lg font-medium text-gray-900">Consume Stock (FIFO)</h3>

      <div className="grid grid-cols-1 gap-4">
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <Input
              label={`Quantity (${unit})`}
              type="number"
              step="0.001"
              {...register('quantityValue', { valueAsNumber: true })}
              error={errors.quantityValue?.message}
            />
          </div>
        </div>

        <Input
          label="Reason"
          {...register('reason')}
          error={errors.reason?.message}
          placeholder="e.g. Production, Waste, Event"
        />

        <Input
          label="Reference (Optional)"
          {...register('reference')}
          error={errors.reference?.message}
          placeholder="Order #123"
        />
      </div>

      {consumptionPreview && consumptionPreview.length > 0 && (
        <div className="bg-gray-50 p-3 rounded text-sm">
          <p className="font-medium mb-1">FIFO Order Preview:</p>
          <ul className="list-disc pl-4 space-y-1">
            {consumptionPreview.map((c, idx) => (
              <li key={idx}>
                Taking{' '}
                <strong>
                  {c.amount.toFixed(3)} {unit}
                </strong>{' '}
                from Lot <strong>{c.lot}</strong>
              </li>
            ))}
            {quantityValue > consumptionPreview.reduce((acc, c) => acc + c.amount, 0) && (
              <li className="text-red-600">Warning: Insufficient stock for requested amount!</li>
            )}
          </ul>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="secondary" disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Consume'}
        </Button>
      </div>
    </form>
  );
};
