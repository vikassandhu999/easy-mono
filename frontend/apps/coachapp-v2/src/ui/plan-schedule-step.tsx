/**
 * PlanScheduleStep — the date step of every plan→client assign flow: a
 * required start (defaulting to the client’s calendar day), an optional
 * open-ended end with 4/8/12-week presets, then confirm. The parent owns the
 * mutation and surfaces its failure via `errorMessage`.
 */
import {formatIsoDateOnly} from '@easy/utils';
import {Button, Label, Spinner, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {ChevronLeft, Dumbbell, Utensils} from 'lucide-react';
import {useRef} from 'react';
import {Controller, useForm} from 'react-hook-form';

import DateInput from '@/ui/date-input';
import {
  addAssignmentWeeks,
  PLAN_ASSIGNMENT_DURATIONS,
  type PlanAssignmentDates,
  type PlanKind,
  planAssignmentDatesSchema,
} from '@/ui/plan-assignment-dates';

interface Props {
  backLabel?: string;
  kind: PlanKind;
  planName: string;
  planMeta?: string;
  clientName: string;
  defaultStart: string;
  isSubmitting: boolean;
  errorMessage?: null | string;
  onBack: () => void;
  /** Fires on any date edit — the parent clears a stale server error. */
  onChange?: () => void;
  onConfirm: (dates: PlanAssignmentDates) => Promise<void>;
}

export default function PlanScheduleStep({
  backLabel = 'Back to plans',
  kind,
  planName,
  planMeta,
  clientName,
  defaultStart,
  isSubmitting,
  errorMessage,
  onBack,
  onChange,
  onConfirm,
}: Props) {
  // Guards the gap between an Enter-key resubmit and `isSubmitting` rendering.
  const submitLocked = useRef(false);
  const form = useForm<PlanAssignmentDates>({
    defaultValues: {endDate: null, startDate: defaultStart},
    mode: 'onChange',
    resolver: zodResolver(planAssignmentDatesSchema),
  });
  const start = form.watch('startDate');
  const end = form.watch('endDate');
  const activeDuration = PLAN_ASSIGNMENT_DURATIONS.find(
    (weeks) => end && start && addAssignmentWeeks(start, weeks) === end,
  );
  const setEnd = (value: null | string) => {
    form.setValue('endDate', value, {shouldDirty: true, shouldValidate: true});
    onChange?.();
  };

  const Icon = kind === 'nutrition' ? Utensils : Dumbbell;
  const iconWrap = kind === 'nutrition' ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent';

  return (
    <form
      className="space-y-4 pb-2"
      onSubmit={form.handleSubmit(async (dates) => {
        if (isSubmitting || submitLocked.current) {
          return;
        }
        submitLocked.current = true;
        try {
          await onConfirm(dates);
        } finally {
          submitLocked.current = false;
        }
      })}
    >
      <Button
        className="-ml-2 text-muted"
        isDisabled={isSubmitting}
        onPress={onBack}
        size="sm"
        variant="ghost"
      >
        <ChevronLeft size={14} />
        {backLabel}
      </Button>

      <div className="flex items-center gap-3 rounded-card border border-separator p-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-panel ${iconWrap}`}>
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <Typography
            truncate
            type="body-sm"
            weight="semibold"
          >
            {planName}
          </Typography>
          <Typography
            color="muted"
            truncate
            type="body-xs"
          >
            {planMeta || `Assigning to ${clientName}`}
          </Typography>
        </div>
      </div>

      <Controller
        control={form.control}
        name="startDate"
        render={({field, fieldState}) => (
          <DateInput
            errorMessage={fieldState.error?.message}
            isDisabled={isSubmitting}
            isRequired
            label="Start date"
            onChange={(value) => {
              field.onChange(value ?? '');
              onChange?.();
            }}
            value={field.value}
          />
        )}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="type-body font-medium">End date</Label>
          {end ? (
            <Button
              isDisabled={isSubmitting}
              onPress={() => setEnd(null)}
              size="sm"
              variant="ghost"
            >
              Clear
            </Button>
          ) : null}
        </div>

        {end ? (
          <>
            <div className="flex flex-wrap gap-2">
              {PLAN_ASSIGNMENT_DURATIONS.map((weeks) => (
                <Button
                  isDisabled={isSubmitting || !start}
                  key={weeks}
                  onPress={() => setEnd(addAssignmentWeeks(start, weeks))}
                  size="sm"
                  variant={activeDuration === weeks ? 'secondary' : 'outline'}
                >
                  {weeks} weeks
                </Button>
              ))}
            </div>
            <Controller
              control={form.control}
              name="endDate"
              render={({field, fieldState}) => (
                <DateInput
                  ariaLabel="End date"
                  errorMessage={fieldState.error?.message}
                  isDisabled={isSubmitting}
                  onChange={(value) => {
                    field.onChange(value);
                    onChange?.();
                  }}
                  value={field.value}
                />
              )}
            />
            {!form.formState.errors.endDate ? (
              <Typography
                color="muted"
                type="body-xs"
              >
                Ends {formatIsoDateOnly(end)}
              </Typography>
            ) : null}
          </>
        ) : (
          <>
            <Button
              className="w-full border-dashed"
              isDisabled={isSubmitting || !start}
              onPress={() => setEnd(addAssignmentWeeks(start, 8))}
              variant="outline"
            >
              Add an end date
            </Button>
            <Typography
              color="muted"
              type="body-xs"
            >
              Plan runs open-ended until you end it.
            </Typography>
          </>
        )}
      </div>

      {errorMessage ? (
        <div
          className="rounded-panel border border-danger/20 bg-danger-soft p-3"
          role="alert"
        >
          <Typography
            className="text-danger"
            type="body-sm"
          >
            {errorMessage}
          </Typography>
        </div>
      ) : null}

      <Button
        className="relative w-full"
        isDisabled={!form.formState.isValid || isSubmitting}
        isPending={isSubmitting}
        type="submit"
      >
        <span className={isSubmitting ? 'invisible' : undefined}>Assign to {clientName}</span>
        {isSubmitting ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner
              color="current"
              size="sm"
            />
            <span className="sr-only">Assigning plan</span>
          </span>
        ) : null}
      </Button>
    </form>
  );
}
