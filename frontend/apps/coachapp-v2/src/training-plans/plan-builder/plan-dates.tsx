/**
 * PlanDates — start/end dates for an ASSIGNED training plan.
 *
 * Kept beyond the TB reference: the plan edit screen (badge TE) only edits name
 * and description, so this is the single place a coach can set the assignment
 * period. Library templates have no period, so nothing renders for them.
 *
 * The plan-name field that used to live here is gone — it duplicated TE, which
 * the ⋯ menu reaches (mirrors the NB port).
 *
 * Cache: generated endpoints are `tag:false`, so each field optimistically merges
 * into the `getTrainingPlan({id})` cache and rolls back with patch.undo() +
 * toast.danger on failure.
 */
import {toast} from '@heroui/react';

import DateInput from '@/@components/date-input';
import {toastMutationError} from '@/@components/mutation-toast';
import type {TrainingPlan} from '@/api/generated';
import {coachApi, useUpdateTrainingPlanMutation} from '@/api/generated';
import {useAppDispatch} from '@/store';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlanDatesProps {
  plan: TrainingPlan;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanDates({plan}: PlanDatesProps) {
  const dispatch = useAppDispatch();
  const [updatePlan] = useUpdateTrainingPlanMutation();

  // Autosave a single date (optimistic). value is ISO "YYYY-MM-DD" or null.
  const saveDate = async (field: 'start_date' | 'end_date', value: string | null) => {
    if ((plan[field] ?? null) === value) {
      return;
    }
    // End before start would violate the backend's daterange constraint (a hard
    // Postgres error on assigned plans) — reject it with a clear message instead.
    const start = field === 'start_date' ? value : (plan.start_date ?? null);
    const end = field === 'end_date' ? value : (plan.end_date ?? null);
    if (start && end && end < start) {
      toast.danger('End date must be on or after the start date');
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
    } catch (e) {
      patch.undo();
      toastMutationError(e, "Couldn't save changes");
    }
  };

  // Only an assigned plan has an assignment period.
  if (plan.client_id === null) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 rounded-card border border-border bg-surface px-4 py-3">
      <div className="min-w-40 flex-1">
        <DateInput
          label="Start date"
          labelClassName="mb-1 block text-xs text-muted"
          onChange={(v) => {
            saveDate('start_date', v).catch(() => undefined);
          }}
          value={plan.start_date}
        />
      </div>
      <div className="min-w-40 flex-1">
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
  );
}
