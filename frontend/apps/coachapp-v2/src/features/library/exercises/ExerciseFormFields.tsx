import {Button, FieldError, Input, Label, TextArea, TextField} from '@heroui/react';
import {Minus, Plus} from 'lucide-react';
import {type Control, Controller, type FieldErrors, useFieldArray, type UseFormRegister} from 'react-hook-form';

import type {ExerciseFormValues} from '@/features/library/exercises/exerciseFormTypes';

import {createEmptyExerciseImageField} from '@/features/library/exercises/exerciseFormSchema';
import ExerciseTagSelector from '@/features/library/exercises/ExerciseTagSelector';

const MECHANICS_OPTIONS = [
  {label: 'Not set', value: ''},
  {label: 'Compound', value: 'compound'},
  {label: 'Isolation', value: 'isolation'},
  {label: 'Isometric', value: 'isometric'},
] as const;

const FORCE_OPTIONS = [
  {label: 'Not set', value: ''},
  {label: 'Push', value: 'push'},
  {label: 'Pull', value: 'pull'},
  {label: 'Static', value: 'static'},
] as const;

type TagSelectorData = {
  data: {id: string; name: string}[];
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
};

type ExerciseFormFieldsProps = {
  control: Control<ExerciseFormValues>;
  equipment: TagSelectorData;
  errors: FieldErrors<ExerciseFormValues>;
  muscles: TagSelectorData;
  register: UseFormRegister<ExerciseFormValues>;
};

const SECTION = 'flex flex-col gap-3 rounded-lg border border-separator bg-surface p-4 sm:p-5';

export default function ExerciseFormFields({control, equipment, errors, muscles, register}: ExerciseFormFieldsProps) {
  const {fields, append, remove} = useFieldArray({
    control,
    name: 'images',
  });

  return (
    <>
      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Basics</p>

        <TextField isInvalid={Boolean(errors.name?.message)}>
          <Label className="text-sm font-medium text-foreground">Exercise name</Label>
          <Input
            placeholder="e.g. Barbell Back Squat"
            variant="secondary"
            {...register('name')}
          />
          {errors.name?.message ? <FieldError>{errors.name.message}</FieldError> : null}
        </TextField>

        <TextField isInvalid={Boolean(errors.description?.message)}>
          <Label className="text-sm font-medium text-foreground">Description</Label>
          <TextArea
            placeholder="Optional short summary"
            variant="secondary"
            {...register('description')}
          />
          {errors.description?.message ? <FieldError>{errors.description.message}</FieldError> : null}
        </TextField>

        <TextField isInvalid={Boolean(errors.instructions?.message)}>
          <Label className="text-sm font-medium text-foreground">Instructions</Label>
          <TextArea
            placeholder="Cue setup, movement, and execution details"
            variant="secondary"
            {...register('instructions')}
          />
          {errors.instructions?.message ? <FieldError>{errors.instructions.message}</FieldError> : null}
        </TextField>
      </section>

      <section className={SECTION}>
        <p className="text-sm font-semibold text-foreground">Classification</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="mechanics"
            render={({field}) => (
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-foreground">Mechanics</Label>
                <div className="flex flex-wrap gap-2">
                  {MECHANICS_OPTIONS.map((option) => (
                    <Button
                      className="min-h-11"
                      key={option.value || 'empty'}
                      onPress={() => field.onChange(option.value)}
                      size="sm"
                      type="button"
                      variant={field.value === option.value ? 'secondary' : 'outline'}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                {errors.mechanics?.message ? <FieldError>{errors.mechanics.message}</FieldError> : null}
              </div>
            )}
          />

          <Controller
            control={control}
            name="force"
            render={({field}) => (
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-foreground">Force</Label>
                <div className="flex flex-wrap gap-2">
                  {FORCE_OPTIONS.map((option) => (
                    <Button
                      className="min-h-11"
                      key={option.value || 'empty'}
                      onPress={() => field.onChange(option.value)}
                      size="sm"
                      type="button"
                      variant={field.value === option.value ? 'secondary' : 'outline'}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                {errors.force?.message ? <FieldError>{errors.force.message}</FieldError> : null}
              </div>
            )}
          />
        </div>
      </section>

      <section className={SECTION}>
        {muscles.isError ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-separator bg-surface-secondary p-3">
            <p className="text-sm text-foreground">Could not load muscles.</p>
            <Button
              className="min-h-11"
              onPress={muscles.onRetry}
              size="sm"
              type="button"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        ) : null}
        <Controller
          control={control}
          name="muscle_ids"
          render={({field}) => (
            <ExerciseTagSelector
              emptyLabel="No muscles match your search."
              isLoading={muscles.isLoading}
              items={muscles.data}
              label="Target muscles"
              onChange={field.onChange}
              searchPlaceholder="Search muscles"
              selectedIds={field.value}
            />
          )}
        />
        {errors.muscle_ids?.message ? <FieldError>{errors.muscle_ids.message}</FieldError> : null}
      </section>

      <section className={SECTION}>
        {equipment.isError ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-separator bg-surface-secondary p-3">
            <p className="text-sm text-foreground">Could not load equipment.</p>
            <Button
              className="min-h-11"
              onPress={equipment.onRetry}
              size="sm"
              type="button"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        ) : null}
        <Controller
          control={control}
          name="equipment_ids"
          render={({field}) => (
            <ExerciseTagSelector
              emptyLabel="No equipment match your search."
              isLoading={equipment.isLoading}
              items={equipment.data}
              label="Equipment"
              onChange={field.onChange}
              searchPlaceholder="Search equipment"
              selectedIds={field.value}
            />
          )}
        />
        {errors.equipment_ids?.message ? <FieldError>{errors.equipment_ids.message}</FieldError> : null}
      </section>

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
    </>
  );
}
