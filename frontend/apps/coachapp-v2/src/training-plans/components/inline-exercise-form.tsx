import {Button, ErrorMessage, Form, Input, Label, TextField, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Dumbbell} from 'lucide-react';
import {useEffect, useId, useRef} from 'react';
import {Controller, useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';
import {FormTextAreaField, FormTextField} from '@/@components/form-fields';
import {applyFormErrors} from '@/api/shared';
import {
  buildPlannedSetsFromForm,
  deriveFormFromSets,
  deriveRestFromReps,
  isValidSetCountInput,
  toggleRestUnitValue,
} from '@/domain/training-exercise-form';
import UnitPicker, {type LoadUnitValue} from '@/training-plans/components/unit-picker';

export type InlineExerciseFormValues = {
  exerciseNotes: string;
  loadUnit: LoadUnitValue;
  loadValue: string;
  reps: string;
  rest: string;
  restUnit: 'min' | 'sec';
  sets: string;
};

const LOAD_UNITS: [LoadUnitValue, ...LoadUnitValue[]] = ['kg', 'lbs', 'bodyweight', 'percent_1rm', 'rpe', 'none'];

const schema = z.object({
  exerciseNotes: z.string().default(''),
  loadUnit: z.enum(LOAD_UNITS).default('kg'),
  loadValue: z.string().default(''),
  reps: z.string().min(1, 'Required'),
  rest: z.string().default(''),
  restUnit: z.enum(['min', 'sec']).default('sec'),
  sets: z.string().min(1, 'Required').refine(isValidSetCountInput, 'Must be at least 1'),
});

export const PRESETS = [
  {label: '3×10', reps: '10', sets: '3'},
  {label: '4×8-12', reps: '8-12', sets: '4'},
  {label: '5×5', reps: '5', sets: '5'},
  {label: '3×15', reps: '15', sets: '3'},
] as const;

export const EMPTY_DEFAULTS: InlineExerciseFormValues = {
  exerciseNotes: '',
  loadUnit: 'kg',
  loadValue: '',
  reps: '8-12',
  rest: '',
  restUnit: 'sec',
  sets: '4',
};

type InlineExerciseFormProps = {
  actionLabel: 'Add' | 'Save';
  defaultValues?: Partial<InlineExerciseFormValues>;
  exerciseName: string;
  isEditing?: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onLoadUnitChange?: (unit: LoadUnitValue) => void;
  onSubmit: (values: InlineExerciseFormValues) => Promise<void>;
};

export default function InlineExerciseForm({
  actionLabel,
  defaultValues,
  exerciseName,
  isEditing,
  isSubmitting,
  onCancel,
  onLoadUnitChange,
  onSubmit,
}: InlineExerciseFormProps) {
  const uid = useId();
  const loadInputRef = useRef<HTMLInputElement | null>(null);
  const focusLoadOnNextRender = useRef(false);

  const merged: InlineExerciseFormValues = {...EMPTY_DEFAULTS, ...defaultValues};
  // Seed rest from the default reps if the caller didn't provide one, so the
  // 5-tap "add exercise" path works even when the coach never taps a chip.
  if (!merged.rest.trim() && merged.reps.trim()) {
    merged.rest = deriveRestFromReps(merged.reps) || merged.rest;
  }

  const {
    control,
    formState: {errors},
    handleSubmit,
    setError,
    setValue,
  } = useForm<InlineExerciseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: merged,
  });

  // One subscription — `useWatch` is React-Compiler-safe where `watch()` isn't.
  const watched = useWatch({control});
  const setsValue = watched.sets ?? merged.sets;
  const repsValue = watched.reps ?? merged.reps;
  const loadUnitValue = (watched.loadUnit ?? merged.loadUnit) as LoadUnitValue;
  const restValue = watched.rest ?? merged.rest;
  const restUnitValue = watched.restUnit ?? merged.restUnit;

  // Move focus to Load input after chip tap — use a flag + effect to avoid
  // racing the controlled-input re-render.
  useEffect(() => {
    if (focusLoadOnNextRender.current) {
      focusLoadOnNextRender.current = false;
      loadInputRef.current?.focus();
    }
  });

  const handleChipTap = (preset: (typeof PRESETS)[number]) => {
    setValue('sets', preset.sets, {shouldDirty: true, shouldValidate: true});
    setValue('reps', preset.reps, {shouldDirty: true, shouldValidate: true});
    // Rest defaulting — only when empty, so we never trample typed values.
    if (!restValue.trim()) {
      const derived = deriveRestFromReps(preset.reps);
      if (derived) {
        setValue('rest', derived, {shouldDirty: true});
        setValue('restUnit', 'sec', {shouldDirty: true});
      }
    }
    focusLoadOnNextRender.current = true;
  };

  const handleRepsBlur = () => {
    if (restValue.trim()) {
      return;
    }
    const derived = deriveRestFromReps(repsValue);
    if (!derived) {
      return;
    }
    setValue('rest', derived, {shouldDirty: true});
    setValue('restUnit', 'sec', {shouldDirty: true});
  };

  const handleFormSubmit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      applyFormErrors(error, 'Failed to save exercise.', setError);
    }
  });

  const activeChip = PRESETS.find((p) => p.sets === setsValue && p.reps === repsValue);

  const getRestPillLabel = () => (restUnitValue === 'min' ? 'min' : 'sec');

  /**
   * Toggling the pill should change how the coach *reads* the rest value, not
   * silently reinterpret it. A field showing `90 sec` that the coach toggles
   * to `min` should read `1.5 min`, not become 90 minutes (= 5400 seconds).
   *
   * We normalize to a number, convert between units (rounding to at most 2
   * decimal places so "90 → 1.5" doesn't turn into "1.5000000001"), and skip
   * conversion when the field is empty.
   */
  const toggleRestUnit = () => {
    const next = toggleRestUnitValue({rest: restValue, restUnit: restUnitValue});
    setValue('rest', next.rest, {shouldDirty: true});
    setValue('restUnit', next.restUnit, {shouldDirty: true});
  };

  return (
    <Form
      autoComplete="off"
      className="flex flex-col gap-3.5 rounded-xl border border-divider bg-content1 p-3.5"
      onSubmit={handleFormSubmit}
    >
      <div className="flex items-center gap-2">
        <Dumbbell
          aria-hidden="true"
          className="shrink-0 text-foreground-400"
          size={16}
        />
        <Typography
          className="min-w-0 flex-1 truncate"
          type="body-sm"
          weight="semibold"
        >
          {exerciseName}
        </Typography>
        {isEditing ? (
          <Typography
            className="shrink-0"
            color="muted"
            type="body-xs"
            weight="medium"
          >
            Editing
          </Typography>
        ) : null}
      </div>

      {/* Chip row — tight, inline, not stretched. Secondary action: they
          shouldn't compete visually with the primary Add button. */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const isActive = activeChip?.label === preset.label;
          return (
            <Button
              className="h-9 min-h-9 px-3 text-xs"
              key={preset.label}
              onPress={() => handleChipTap(preset)}
              type="button"
              variant={isActive ? 'secondary' : 'ghost'}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>

      {/* Single-row layout only at ≥1280px (xl:). The form sits inside a
          workout card with padding, so a 1024px viewport doesn't give the
          card enough room to fit 5 columns + pills without Notes overflowing.
          At <xl the card stacks: Sets+Reps | Load+Rest | Notes. */}
      <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(70px,1fr)_minmax(90px,1fr)_minmax(150px,1.5fr)_minmax(140px,1.5fr)_minmax(160px,2fr)] xl:items-end xl:gap-3">
        <div className="grid grid-cols-2 gap-3 xl:contents">
          <div className="flex flex-col gap-1">
            <FormTextField
              control={control}
              inputProps={{
                className: 'h-12',
                id: `${uid}-sets`,
                inputMode: 'numeric',
                placeholder: '4',
              }}
              label="Sets"
              name="sets"
            />
          </div>
          <div className="flex flex-col gap-1">
            <FormTextField
              control={control}
              inputProps={{
                className: 'h-12',
                id: `${uid}-reps`,
                inputMode: 'text',
                placeholder: '8-12',
              }}
              label="Reps"
              name="reps"
              onFieldBlur={handleRepsBlur}
            />
          </div>
        </div>

        {/* Load + Rest row. <360px stacks, default 2-col, xl: flows into
            single-row grid via `xl:contents`. */}
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:contents">
          <div className="flex flex-col gap-1">
            <Controller
              control={control}
              name="loadValue"
              render={({field}) => (
                <TextField
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value}
                >
                  <Label>Load</Label>
                  <div className="flex gap-1">
                    <Input
                      className="h-12 min-w-0 flex-1"
                      id={`${uid}-load`}
                      inputMode="decimal"
                      placeholder="—"
                      ref={(el) => {
                        field.ref(el);
                        loadInputRef.current = el;
                      }}
                    />
                    <UnitPicker
                      className="min-h-12 shrink-0 px-3"
                      onChange={(unit) => {
                        setValue('loadUnit', unit, {shouldDirty: true});
                        onLoadUnitChange?.(unit);
                      }}
                      value={loadUnitValue}
                    />
                  </div>
                </TextField>
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Controller
              control={control}
              name="rest"
              render={({field}) => (
                <TextField
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value}
                >
                  <Label>Rest</Label>
                  <div className="flex gap-1">
                    <Input
                      className="h-12 min-w-0 flex-1"
                      id={`${uid}-rest`}
                      inputMode="decimal"
                      placeholder={restUnitValue === 'min' ? '1.5' : '90'}
                    />
                    <Button
                      aria-label={`Rest unit: ${getRestPillLabel()}`}
                      className="min-h-12 shrink-0 px-3"
                      onPress={toggleRestUnit}
                      type="button"
                      variant="secondary"
                    >
                      {getRestPillLabel()}
                    </Button>
                  </div>
                </TextField>
              )}
            />
          </div>
        </div>

        {/* Notes — full-width on mobile/mid; fifth cell at xl. */}
        <div className="flex min-w-0 flex-col gap-1 xl:col-start-5">
          <FormTextAreaField
            className="w-full"
            control={control}
            label="Notes (optional)"
            name="exerciseNotes"
            textAreaProps={{
              id: `${uid}-notes`,
              rows: 1,
            }}
          />
        </div>
      </div>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <div className="flex items-center justify-end gap-2">
        <Button
          className="min-h-11"
          onPress={onCancel}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          className="min-h-12"
          isPending={isSubmitting}
          type="submit"
        >
          {isSubmitting ? `${actionLabel}ing…` : actionLabel}
        </Button>
      </div>
    </Form>
  );
}
