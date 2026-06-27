/**
 * PlanHeader — inline-editable plan name + (when assigned) start/end dates.
 *
 * Start/end dates only apply once the plan is assigned to a client (plan.client_id
 * set) — a library template has no assignment period, so the date fields are
 * hidden for unassigned plans.
 *
 * Dates use the shared DateInput (segmented entry + calendar popover).
 *
 * Cache: generated endpoints are `tag:false`, so each field optimistically merges
 * into the `getTrainingPlan({id})` cache and rolls back with patch.undo() +
 * toast.danger on failure. Mirrors nutrition-plans/plan-builder/plan-header.
 */
import {Spinner, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import DateInput from '@/@components/date-input';
import {FormTextField} from '@/@components/form-fields';
import type {TrainingPlan} from '@/api/generated';
import {coachApi, useUpdateTrainingPlanMutation} from '@/api/generated';
import {useAppDispatch} from '@/store';
import {schema, type TrainingPlanFormValues, trainingPlanToFormValues} from '../training-plan-form/training-plan-form';

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
            <DateInput
              label="Start date"
              labelClassName="mb-1 block text-xs text-muted"
              onChange={(v) => {
                saveDate('start_date', v).catch(() => undefined);
              }}
              value={plan.start_date}
            />
          </div>
          <div className="flex-1">
            <DateInput
              label="End date"
              labelClassName="mb-1 block text-xs text-muted"
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
