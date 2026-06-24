/**
 * PlanHeader — inline-editable plan name + start/end dates.
 *
 * Renders the plan name as a large editable input and two date inputs
 * (start/end). Each field autosaves on blur via PATCH.
 *
 * Cache: the hand-written updateTrainingPlan mutation already updates
 * the getTrainingPlan cache on success via onQueryStarted in trainingPlans.ts.
 * On failure the cache stays at the last confirmed server state (no explicit
 * rollback needed here since we aren't doing an optimistic pre-patch).
 */
import {Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useEffect} from 'react';
import {useForm} from 'react-hook-form';

import {FormTextField} from '@/@components/form-fields';
import type {TrainingPlan} from '@/api/trainingPlans';
import {useUpdateTrainingPlanMutation} from '@/api/trainingPlans';
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
  const [updatePlan, {isLoading: isSaving}] = useUpdateTrainingPlanMutation();

  const form = useForm<TrainingPlanFormValues>({
    defaultValues: trainingPlanToFormValues(plan),
    resolver: zodResolver(schema),
    // Re-sync when the plan prop changes (e.g. after a successful PATCH).
    values: trainingPlanToFormValues(plan),
  });

  const {control, getValues, reset} = form;

  // Keep the form in sync if the plan identity changes (e.g. navigating between plans).
  useEffect(() => {
    reset(trainingPlanToFormValues(plan));
  }, [plan, reset]);

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

    const body: Parameters<typeof updatePlan>[0]['body'] = {};

    if (field === 'name') {
      body.name = values.name;
    } else if (field === 'start_date') {
      body.start_date = values.start_date || null;
    } else if (field === 'end_date') {
      body.end_date = values.end_date || null;
    }

    try {
      await updatePlan({id: plan.id, body}).unwrap();
    } catch {
      // Cache stays at last server state; show no toast (silent failure for autosave).
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-3 py-4">
      {/* Plan name — large inline input */}
      <div className="relative">
        <FormTextField
          control={control}
          inputProps={{
            className:
              'bg-transparent border-0 border-b border-divider rounded-none px-0 text-xl font-semibold focus:border-[#6c8cff] focus:ring-0 transition-colors placeholder:text-foreground-400',
            placeholder: 'Plan name',
          }}
          label=""
          name="name"
          onFieldBlur={() => handleBlur('name')}
        />
        {isSaving && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            <Spinner
              color="accent"
              size="sm"
            />
          </span>
        )}
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
