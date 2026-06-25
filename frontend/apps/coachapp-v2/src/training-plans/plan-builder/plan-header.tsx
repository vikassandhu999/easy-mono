/**
 * PlanHeader — inline-editable plan name + (when assigned) start/end dates.
 *
 * Start/end dates only apply once the plan is assigned to a client (plan.client_id
 * set) — a library template has no assignment period, so the date fields are
 * hidden for unassigned plans.
 *
 * Dates use the HeroUI v3 DateField (segmented date input). Values cross the
 * string<->DateValue boundary via @internationalized/date.
 *
 * Cache: generated endpoints are `tag:false`, so each field optimistically merges
 * into the `getTrainingPlan({id})` cache and rolls back with patch.undo() +
 * toast.danger on failure. Mirrors nutrition-plans/plan-builder/plan-header.
 */
import {DateField, Label, Spinner, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {type DateValue, parseDate} from '@internationalized/date';
import {useForm} from 'react-hook-form';
import {FormTextField} from '@/@components/form-fields';
import type {TrainingPlan} from '@/api/generated';
import {coachApi, useUpdateTrainingPlanMutation} from '@/api/generated';
import {useAppDispatch} from '@/store';
import {schema, type TrainingPlanFormValues, trainingPlanToFormValues} from '../training-plan-form/training-plan-form';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ISO "YYYY-MM-DD" -> DateValue (or null). Tolerates a datetime by slicing. */
function toDateValue(iso: string | null): DateValue | null {
  if (!iso) {
    return null;
  }
  try {
    return parseDate(iso.slice(0, 10));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sub-component: a single HeroUI DateField bound to a string date
// ---------------------------------------------------------------------------

interface PlanDateFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

function PlanDateField({label, value, onChange}: PlanDateFieldProps) {
  return (
    <DateField
      onChange={(date) => onChange(date ? date.toString() : null)}
      value={toDateValue(value)}
    >
      <Label className="mb-1 block text-xs text-muted">{label}</Label>
      <DateField.Group className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-within:border-accent">
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
      </DateField.Group>
    </DateField>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlanHeaderProps {
  plan: TrainingPlan;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanHeader({plan}: PlanHeaderProps) {
  const dispatch = useAppDispatch();
  const [updatePlan, {isLoading: isSaving}] = useUpdateTrainingPlanMutation();

  const form = useForm<TrainingPlanFormValues>({
    defaultValues: trainingPlanToFormValues(plan),
    resolver: zodResolver(schema),
    // Re-sync when the plan prop changes (e.g. after a successful PATCH).
    values: trainingPlanToFormValues(plan),
  });

  const {control, getValues} = form;

  // Autosave the plan name on blur (ignores unchanged / invalid values).
  const handleNameBlur = async () => {
    const isValid = await form.trigger('name');
    if (!isValid) {
      return;
    }
    const name = getValues().name;
    if (name === (plan.name ?? '')) {
      return;
    }
    const patch = dispatch(
      coachApi.util.updateQueryData('getTrainingPlan', {id: plan.id}, (draft) => {
        draft.data.name = name;
      }),
    );
    try {
      await updatePlan({id: plan.id, trainingPlanUpdateRequest: {name}}).unwrap();
    } catch {
      patch.undo();
      toast.danger("Couldn't save changes");
    }
  };

  // Autosave a single date (optimistic). value is ISO "YYYY-MM-DD" or null.
  const saveDate = async (field: 'start_date' | 'end_date', value: string | null) => {
    if ((plan[field] ?? null) === value) {
      return;
    }
    const body = field === 'start_date' ? {start_date: value} : {end_date: value};
    const patch = dispatch(
      coachApi.util.updateQueryData('getTrainingPlan', {id: plan.id}, (draft) => {
        draft.data[field] = value;
      }),
    );
    try {
      await updatePlan({id: plan.id, trainingPlanUpdateRequest: body}).unwrap();
    } catch {
      patch.undo();
      toast.danger("Couldn't save changes");
    }
  };

  const isAssigned = plan.client_id !== null;

  return (
    <div className="w-full space-y-3 py-4">
      {/* Section title + saving indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Plan details</span>
        {isSaving && (
          <Spinner
            color="accent"
            size="sm"
          />
        )}
      </div>

      {/* Plan name — large inline input */}
      <div>
        <FormTextField
          control={control}
          inputProps={{
            id: 'training-plan-name-input',
            className:
              'bg-transparent border-0 border-b border-border rounded-none px-0 text-xl font-semibold focus:border-accent focus:ring-0 transition-colors placeholder:text-muted',
            placeholder: 'Plan name',
          }}
          label=""
          name="name"
          onFieldBlur={handleNameBlur}
        />
      </div>

      {/* Start / end dates — only meaningful once the plan is assigned to a client */}
      {isAssigned ? (
        <div className="flex gap-3">
          <div className="flex-1">
            <PlanDateField
              label="Start date"
              onChange={(v) => {
                saveDate('start_date', v).catch(() => undefined);
              }}
              value={plan.start_date}
            />
          </div>
          <div className="flex-1">
            <PlanDateField
              label="End date"
              onChange={(v) => {
                saveDate('end_date', v).catch(() => undefined);
              }}
              value={plan.end_date}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted">Start and end dates apply once the plan is assigned to a client.</p>
      )}
    </div>
  );
}
