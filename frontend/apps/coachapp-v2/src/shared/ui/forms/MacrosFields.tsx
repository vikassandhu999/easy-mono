import type {FieldErrors, UseFormRegister} from 'react-hook-form';

import {FieldError, Input, Label, TextField} from '@heroui/react';

import type {MacroFormFields} from '@/shared/types/forms';

type MacrosFieldsProps = {
  errors: FieldErrors<MacroFormFields>;
  register: UseFormRegister<MacroFormFields & Record<string, unknown>>;
  step?: number;
};

export default function MacrosFields({errors, register, step}: MacrosFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField isInvalid={Boolean(errors.calories?.message)}>
        <Label className="text-sm font-medium text-foreground">Calories</Label>
        <Input
          placeholder="e.g. 150…"
          step={step}
          type="number"
          variant="secondary"
          {...register('calories')}
        />
        {errors.calories?.message ? <FieldError>{errors.calories.message}</FieldError> : null}
      </TextField>

      <TextField isInvalid={Boolean(errors.protein?.message)}>
        <Label className="text-sm font-medium text-foreground">Protein (g)</Label>
        <Input
          placeholder="e.g. 12…"
          step={step}
          type="number"
          variant="secondary"
          {...register('protein')}
        />
        {errors.protein?.message ? <FieldError>{errors.protein.message}</FieldError> : null}
      </TextField>

      <TextField isInvalid={Boolean(errors.carbs?.message)}>
        <Label className="text-sm font-medium text-foreground">Carbs (g)</Label>
        <Input
          placeholder="e.g. 27…"
          step={step}
          type="number"
          variant="secondary"
          {...register('carbs')}
        />
        {errors.carbs?.message ? <FieldError>{errors.carbs.message}</FieldError> : null}
      </TextField>

      <TextField isInvalid={Boolean(errors.fat?.message)}>
        <Label className="text-sm font-medium text-foreground">Fat (g)</Label>
        <Input
          placeholder="e.g. 4.5…"
          step={step}
          type="number"
          variant="secondary"
          {...register('fat')}
        />
        {errors.fat?.message ? <FieldError>{errors.fat.message}</FieldError> : null}
      </TextField>
    </div>
  );
}
