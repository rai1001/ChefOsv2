import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@culinaryos/ui';
import { UnitType, CreateBatchDTO, Quantity, Money, Unit } from '@culinaryos/core';

const addBatchSchema = z.object({
  lotNumber: z.string().min(1, 'Lot number is required'),
  quantityValue: z.number().min(0.001, 'Quantity must be positive'),
  quantityUnit: z.nativeEnum(UnitType),
  costAmount: z.number().min(0, 'Cost must be positive'),
  supplier: z.string().min(1, 'Supplier is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  receivedDate: z.string().min(1, 'Received date is required'),
  invoiceReference: z.string().optional(),
  notes: z.string().optional(),
});

type AddBatchFormData = z.infer<typeof addBatchSchema>;

interface AddBatchFormProps {
  ingredientId: string;
  outletId: string;
  defaultUnit?: string;
  onSuccess?: () => void;
  onSubmit: (dto: CreateBatchDTO) => Promise<any>;
}

export const AddBatchForm: React.FC<AddBatchFormProps> = ({
  ingredientId,
  outletId,
  defaultUnit,
  onSuccess,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AddBatchFormData>({
    resolver: zodResolver(addBatchSchema),
    defaultValues: {
      receivedDate: new Date().toISOString().split('T')[0],
      quantityUnit: (defaultUnit as UnitType) || UnitType.KG,
    },
  });

  const handleFormSubmit = async (data: AddBatchFormData) => {
    try {
      const dto: CreateBatchDTO = {
        ingredientId,
        outletId,
        lotNumber: data.lotNumber,
        quantity: new Quantity(data.quantityValue, new Unit(data.quantityUnit)),
        unitCost: Money.fromCents(Math.round(data.costAmount * 100)), // Input is in dollars/euros
        supplier: data.supplier,
        expiryDate: new Date(data.expiryDate),
        receivedDate: new Date(data.receivedDate),
        invoiceReference: data.invoiceReference,
        notes: data.notes,
      };

      await onSubmit(dto);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to add batch:', error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-4 p-4 border rounded-lg bg-white shadow-sm"
    >
      <h3 className="text-lg font-medium text-gray-900">Add New Batch</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Lot Number"
          {...register('lotNumber')}
          error={errors.lotNumber?.message}
          placeholder="e.g. L-2023-001"
        />

        <Input
          label="Supplier"
          {...register('supplier')}
          error={errors.supplier?.message}
          placeholder="Supplier Name"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              label="Quantity"
              type="number"
              step="0.001"
              {...register('quantityValue', { valueAsNumber: true })}
              error={errors.quantityValue?.message}
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              {...register('quantityUnit')}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Object.values(UnitType).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {errors.quantityUnit?.message && (
              <p className="mt-1 text-sm text-red-600">{errors.quantityUnit?.message}</p>
            )}
          </div>
        </div>

        <Input
          label="Unit Cost ($)"
          type="number"
          step="0.01"
          {...register('costAmount', { valueAsNumber: true })}
          error={errors.costAmount?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Received Date"
          type="date"
          {...register('receivedDate')}
          error={errors.receivedDate?.message}
        />

        <Input
          label="Expiry Date"
          type="date"
          {...register('expiryDate')}
          error={errors.expiryDate?.message}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Invoice Ref (Optional)"
          {...register('invoiceReference')}
          error={errors.invoiceReference?.message}
        />
        <Input label="Notes (Optional)" {...register('notes')} error={errors.notes?.message} />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Batch'}
        </Button>
      </div>
    </form>
  );
};
