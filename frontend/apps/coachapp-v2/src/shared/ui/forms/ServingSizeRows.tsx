import {Button, FieldError, Input, Label, TextField} from '@heroui/react';
import {Minus} from 'lucide-react';
import {
  type Control,
  type FieldArrayPath,
  type FieldErrors,
  type FieldValues,
  type Path,
  useFieldArray,
  type UseFormRegister,
} from 'react-hook-form';

import type {ServingSizeFormRow} from '@/shared/types/forms';

type ServingSizeRowsProps<TFormValues extends FieldValues> = {
  control: Control<TFormValues>;
  errors: FieldErrors<TFormValues>;
  register: UseFormRegister<TFormValues>;
  title: string;
};

const createEmptyServingSize = (): ServingSizeFormRow => ({
  amount: '',
  unit: '',
  weight_g: '',
});

export default function ServingSizeRows<TFormValues extends FieldValues>({
  control,
  errors,
  register,
  title,
}: ServingSizeRowsProps<TFormValues>) {
  const {fields, append, remove} = useFieldArray({
    control,
    name: 'serving_sizes' as FieldArrayPath<TFormValues>,
  });

  const servingSizeErrors = errors.serving_sizes as
    | undefined
    | {
        amount?: {message?: string};
        unit?: {message?: string};
        weight_g?: {message?: string};
      }[];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-separator pb-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted">
            {fields.length} size{fields.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          className="min-h-11 gap-1 px-3"
          onPress={() => append(createEmptyServingSize() as never)}
          size="sm"
          type="button"
          variant="outline"
        >
          <span className="text-lg leading-none">+</span>
          <span>Add size</span>
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-separator bg-surface-secondary p-4 text-center">
          <p className="text-sm font-medium text-foreground">No serving sizes yet</p>
          <p className="mt-1 text-xs text-muted">Add a serving size to make portions easier to track.</p>
          <div className="mt-3">
            <Button
              className="min-h-11"
              onPress={() => append(createEmptyServingSize() as never)}
              size="sm"
              type="button"
              variant="outline"
            >
              Add first serving size
            </Button>
          </div>
        </div>
      ) : null}

      {fields.map((field, index) => (
        <div
          className="rounded-lg border border-separator bg-surface-secondary p-3"
          key={field.id}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Serving size {index + 1}</span>
            <Button
              aria-label="Remove serving size"
              className="min-h-11 px-3"
              onPress={() => remove(index)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField isInvalid={Boolean(servingSizeErrors?.[index]?.unit?.message)}>
              <Label className="text-xs font-medium text-foreground">Unit</Label>
              <Input
                placeholder="e.g. cup"
                variant="secondary"
                {...register(`serving_sizes.${index}.unit` as Path<TFormValues>)}
              />
              {servingSizeErrors?.[index]?.unit?.message ? (
                <FieldError>{servingSizeErrors[index]?.unit?.message}</FieldError>
              ) : null}
            </TextField>
            <TextField isInvalid={Boolean(servingSizeErrors?.[index]?.weight_g?.message)}>
              <Label className="text-xs font-medium text-foreground">Weight (g)</Label>
              <Input
                placeholder="e.g. 120"
                type="number"
                variant="secondary"
                {...register(`serving_sizes.${index}.weight_g` as Path<TFormValues>)}
              />
              {servingSizeErrors?.[index]?.weight_g?.message ? (
                <FieldError>{servingSizeErrors[index]?.weight_g?.message}</FieldError>
              ) : null}
            </TextField>
            <TextField isInvalid={Boolean(servingSizeErrors?.[index]?.amount?.message)}>
              <Label className="text-xs font-medium text-foreground">Amount</Label>
              <Input
                placeholder="e.g. 1"
                type="number"
                variant="secondary"
                {...register(`serving_sizes.${index}.amount` as Path<TFormValues>)}
              />
              {servingSizeErrors?.[index]?.amount?.message ? (
                <FieldError>{servingSizeErrors[index]?.amount?.message}</FieldError>
              ) : null}
            </TextField>
          </div>
        </div>
      ))}
    </div>
  );
}
