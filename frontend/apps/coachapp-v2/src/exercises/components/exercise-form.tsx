import {
  Button,
  Checkbox,
  CheckboxGroup,
  Description,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  TextArea,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

import {type Equipment, type ExerciseForce, type ExerciseMechanics, type Muscle} from '@/api/exercises';

const MECHANICS_OPTIONS: {label: string; value: ExerciseMechanics}[] = [
  {label: 'Compound', value: 'compound'},
  {label: 'Isolation', value: 'isolation'},
  {label: 'Isometric', value: 'isometric'},
];

const FORCE_OPTIONS: {label: string; value: ExerciseForce}[] = [
  {label: 'Push', value: 'push'},
  {label: 'Pull', value: 'pull'},
  {label: 'Static', value: 'static'},
];

export const exerciseFormSchema = z.object({
  description: z.string().optional(),
  equipment_ids: z.array(z.string()).optional(),
  force: z.enum(['pull', 'push', 'static']).optional().or(z.literal('')),
  instructions: z.string().optional(),
  mechanics: z.enum(['compound', 'isolation', 'isometric']).optional().or(z.literal('')),
  muscle_ids: z.array(z.string()).optional(),
  name: z.string().min(1, 'Name is required'),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;

export const EXERCISE_FORM_DEFAULTS: ExerciseFormValues = {
  description: '',
  equipment_ids: [],
  force: '',
  instructions: '',
  mechanics: '',
  muscle_ids: [],
  name: '',
};

/** Hook wrapper so screens don't need to import zod/resolver separately */
export function useExerciseForm(options?: {values?: ExerciseFormValues}) {
  return useForm<ExerciseFormValues>({
    defaultValues: options?.values ? undefined : EXERCISE_FORM_DEFAULTS,
    resolver: zodResolver(exerciseFormSchema),
    values: options?.values,
  });
}

type ExerciseFormProps = {
  /** The react-hook-form instance returned by useExerciseForm */
  form: ReturnType<typeof useExerciseForm>;
  /** Available muscles from the API */
  muscles: Muscle[];
  /** Available equipment from the API */
  equipment: Equipment[];
  /** Called with validated form data */
  onSubmit: (data: ExerciseFormValues) => void;
  /** Whether the mutation is in progress */
  isSubmitting: boolean;
  /** Label for the submit button (e.g. "Create Exercise" or "Save Changes") */
  submitLabel: string;
  /** Label shown while submitting (e.g. "Creating..." or "Saving...") */
  submittingLabel: string;
  /** Called when Cancel is pressed */
  onCancel: () => void;
};

export default function ExerciseForm({
  form,
  muscles,
  equipment,
  onSubmit,
  isSubmitting,
  submitLabel,
  submittingLabel,
  onCancel,
}: ExerciseFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
    register,
  } = form;

  return (
    <form
      className="flex max-w-lg flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">
          Name <span className="text-danger">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g. Barbell Bench Press"
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <TextArea
          id="description"
          placeholder="Brief description of the exercise..."
          rows={2}
          {...register('description')}
        />
        {errors.description && <p className="text-xs text-danger">{errors.description.message}</p>}
      </div>

      {/* Instructions */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="instructions">Instructions</Label>
        <TextArea
          id="instructions"
          placeholder="Step-by-step instructions..."
          rows={3}
          {...register('instructions')}
        />
        {errors.instructions && <p className="text-xs text-danger">{errors.instructions.message}</p>}
      </div>

      {/* Mechanics + Force side by side on md */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Controller
            control={control}
            name="mechanics"
            render={({field}) => (
              <Select
                onSelectionChange={(key) => field.onChange(key)}
                placeholder="Select mechanics"
                selectedKey={field.value || null}
              >
                <Label>Mechanics</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {MECHANICS_OPTIONS.map((opt) => (
                      <ListBox.Item
                        id={opt.value}
                        key={opt.value}
                        textValue={opt.label}
                      >
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
          {errors.mechanics && <p className="text-xs text-danger">{errors.mechanics.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Controller
            control={control}
            name="force"
            render={({field}) => (
              <Select
                onSelectionChange={(key) => field.onChange(key)}
                placeholder="Select force"
                selectedKey={field.value || null}
              >
                <Label>Force</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {FORCE_OPTIONS.map((opt) => (
                      <ListBox.Item
                        id={opt.value}
                        key={opt.value}
                        textValue={opt.label}
                      >
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
          />
          {errors.force && <p className="text-xs text-danger">{errors.force.message}</p>}
        </div>
      </div>

      {/* Muscles */}
      {muscles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Controller
            control={control}
            name="muscle_ids"
            render={({field}) => (
              <CheckboxGroup
                onChange={field.onChange}
                value={field.value}
              >
                <Label>Target Muscles</Label>
                <Description>Select all muscles this exercise targets</Description>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {muscles.map((muscle) => (
                    <Checkbox
                      key={muscle.id}
                      value={muscle.id}
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label>{muscle.name}</Label>
                      </Checkbox.Content>
                    </Checkbox>
                  ))}
                </div>
              </CheckboxGroup>
            )}
          />
          {errors.muscle_ids && <p className="text-xs text-danger">{errors.muscle_ids.message}</p>}
        </div>
      )}

      {/* Equipment */}
      {equipment.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Controller
            control={control}
            name="equipment_ids"
            render={({field}) => (
              <CheckboxGroup
                onChange={field.onChange}
                value={field.value}
              >
                <Label>Equipment</Label>
                <Description>Select all equipment needed</Description>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {equipment.map((item) => (
                    <Checkbox
                      key={item.id}
                      value={item.id}
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label>{item.name}</Label>
                      </Checkbox.Content>
                    </Checkbox>
                  ))}
                </div>
              </CheckboxGroup>
            )}
          />
          {errors.equipment_ids && <p className="text-xs text-danger">{errors.equipment_ids.message}</p>}
        </div>
      )}

      {/* Root error */}
      {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

      {/* Actions */}
      <div className="flex flex-row gap-2 pt-2">
        <Button
          isPending={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <Spinner
                color="current"
                size="sm"
              />
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
        <Button
          onPress={onCancel}
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
