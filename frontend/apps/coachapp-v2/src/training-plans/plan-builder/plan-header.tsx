/**
 * PlanHeader — inline-editable plan name + start/end dates.
 *
 * Renders the plan name as a large editable input and two date inputs
 * (start/end). Each field autosaves on blur via PATCH.
 *
 * Cache: generated endpoints are `tag:false`, so this optimistically merges
 * the changed field into the `getTrainingPlan({id: planId})` cache via
 * api.util.updateQueryData and rolls back with patch.undo() + toast.danger on
 * failure. Mirrors the pattern used in nutrition-plans/plan-builder/plan-header.
 */
import {Spinner, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {FormTextField} from '@/@components/form-fields';
import type {TrainingPlan, TrainingPlanUpdateRequest} from '@/api/generated';
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

  // Autosave a single field on blur. Ignores unchanged / invalid values.
  const handleBlur = async (field: keyof TrainingPlanFormValues) => {
    const isValid = await form.trigger(field);
    if (!isValid) {
      return;
    }

    const values = getValues();
    const current = values[field];

    // Skip if the value hasn't changed from what the server last returned.
    const serverValue = plan[field as keyof TrainingPlan] ?? '';
    if (current === serverValue) {
      return;
    }

    const body: TrainingPlanUpdateRequest = {};

    if (field === 'name') {
      body.name = values.name;
    } else if (field === 'start_date') {
      body.start_date = values.start_date || null;
    } else if (field === 'end_date') {
      body.end_date = values.end_date || null;
    }

    // Optimistic update — merge the changed field into the cached plan.
    const patch = dispatch(
      coachApi.util.updateQueryData('getTrainingPlan', {id: plan.id}, (draft) => {
        if (body.name !== undefined) {
          draft.data.name = body.name;
        }
        if ('start_date' in body) {
          draft.data.start_date = body.start_date ?? null;
        }
        if ('end_date' in body) {
          draft.data.end_date = body.end_date ?? null;
        }
      }),
    );

    try {
      await updatePlan({id: plan.id, trainingPlanUpdateRequest: body}).unwrap();
    } catch {
      patch.undo();
      toast.danger("Couldn't save changes");
    }
  };

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
            className:
              'bg-transparent border-0 border-b border-border rounded-none px-0 text-xl font-semibold focus:border-[#6c8cff] focus:ring-0 transition-colors placeholder:text-muted',
            placeholder: 'Plan name',
          }}
          label=""
          name="name"
          onFieldBlur={() => handleBlur('name')}
        />
      </div>

      {/* Start / end dates — side by side on narrow screens too */}
      <div className="flex gap-3">
        <div className="flex-1">
          <FormTextField
            control={control}
            inputProps={{type: 'date'}}
            label="Start date"
            name="start_date"
            onFieldBlur={() => handleBlur('start_date')}
          />
        </div>
        <div className="flex-1">
          <FormTextField
            control={control}
            inputProps={{type: 'date'}}
            label="End date"
            name="end_date"
            onFieldBlur={() => handleBlur('end_date')}
          />
        </div>
      </div>
    </div>
  );
}
