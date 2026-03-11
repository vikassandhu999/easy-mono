import {Button, FieldError, Input, Label, TextField} from '@heroui/react';
import {Minus, Plus} from 'lucide-react';
import {type Control, type FieldErrors, useFieldArray, type UseFormRegister} from 'react-hook-form';

import type {ExerciseFormValues} from '@/features/library/exercises/exerciseFormTypes';

import {createEmptyExerciseImageField} from '@/features/library/exercises/exerciseFormSchema';

const SECTION = 'flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5';

type ExerciseImageUrlsSectionProps = {
  control: Control<ExerciseFormValues>;
  errors: FieldErrors<ExerciseFormValues>;
  register: UseFormRegister<ExerciseFormValues>;
};

export default function ExerciseImageUrlsSection({control, errors, register}: ExerciseImageUrlsSectionProps) {
  const {fields, append, remove} = useFieldArray({
    control,
    name: 'images',
  });

  return (
    <section className={SECTION}>
      <div className="flex items-center justify-between gap-3 border-b border-separator pb-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Image URLs</p>
          <p className="text-xs text-muted">
            {fields.length} image{fields.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          className="min-h-11 gap-1 px-3"
          onPress={() => append(createEmptyExerciseImageField())}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          <span>Add image</span>
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-separator bg-surface-secondary p-4 text-center">
          <p className="text-sm font-medium text-foreground">No image URLs yet</p>
          <p className="mt-1 text-xs text-muted">Add an image URL to help identify this exercise.</p>
          <div className="mt-3">
            <Button
              className="min-h-11"
              onPress={() => append(createEmptyExerciseImageField())}
              size="sm"
              type="button"
              variant="outline"
            >
              Add first image
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
            <span className="text-xs font-medium text-muted">Image {index + 1}</span>
            <Button
              aria-label="Remove image"
              className="min-h-11 px-3"
              onPress={() => remove(index)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>

          <TextField isInvalid={Boolean(errors.images?.[index]?.url?.message)}>
            <Label className="text-xs font-medium text-foreground">Image URL</Label>
            <Input
              placeholder="https://example.com/exercise.jpg"
              variant="secondary"
              {...register(`images.${index}.url`)}
            />
            {errors.images?.[index]?.url?.message ? (
              <FieldError>{errors.images[index]?.url?.message}</FieldError>
            ) : null}
          </TextField>
        </div>
      ))}
    </section>
  );
}
