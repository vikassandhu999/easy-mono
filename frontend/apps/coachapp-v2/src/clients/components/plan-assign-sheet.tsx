/**
 * PlanAssignSheet — the two-step "assign a plan to a client" flow, rendered in
 * the shared KeyboardSheet (bottom sheet on mobile, centered modal on desktop).
 *
 *  Step 1 "pick"    — search + browse plan templates (richer rows than the old
 *                     Autocomplete picker).
 *  Step 2 "schedule"— start/end dates (PlanScheduleStep), then assign.
 *
 * Used by ClientPlans for both nutrition and training. Replaces the old inline
 * Autocomplete pickers at this call site.
 */
import {SearchField, Spinner, Typography, toast} from '@heroui/react';
import {ArrowRight, Dumbbell, Plus, Utensils} from 'lucide-react';
import {useDeferredValue, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {
  coachApi,
  type NutritionPlan,
  type TrainingPlan,
  useAssignNutritionPlanMutation,
  useAssignTrainingPlanMutation,
} from '@/api/generated';
import {useCoachNutritionPlansInfiniteQuery} from '@/api/nutrition-plans-list';
import {useCoachTrainingPlansInfiniteQuery} from '@/api/training-plans-list';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import PlanScheduleStep from '@/clients/components/plan-schedule-step';
import {useAppDispatch} from '@/store';

type Kind = 'nutrition' | 'training';

interface Props {
  kind: Kind;
  clientId: string;
  clientName: string;
  open: boolean;
  onClose: () => void;
}

function nutritionMeta(plan: NutritionPlan): string {
  const parts: string[] = [];
  if (plan.target_calories) {
    parts.push(`${Math.round(plan.target_calories)} kcal`);
  }
  if (plan.target_protein_g) {
    parts.push(`${Math.round(plan.target_protein_g)}g protein`);
  }
  return parts.join(' · ') || plan.description || 'Nutrition plan';
}

function trainingMeta(plan: TrainingPlan): string {
  const n = plan.workouts.length;
  return n > 0 ? `${n} workout${n === 1 ? '' : 's'}` : plan.description || 'Training plan';
}

/** Map an assign failure to a coach-readable message. The DB rejects overlapping
 *  active plans (GiST exclusion); surface that specifically, generic otherwise. */
function assignErrorMessage(error: unknown, kind: Kind, clientName: string): string {
  const status = (error as {status?: number}).status;
  const data = (error as {data?: unknown}).data;
  const text = JSON.stringify(data ?? '').toLowerCase();
  const kindLabel = kind === 'nutrition' ? 'nutrition' : 'training';
  if (status === 409 || text.includes('overlap') || text.includes('active plan') || text.includes('exclusion')) {
    return `${clientName} already has an active ${kindLabel} plan during these dates. Adjust the dates or end the current plan first.`;
  }
  return 'Couldn’t assign the plan. Please check the dates and try again.';
}

export default function PlanAssignSheet({kind, clientId, clientName, open, onClose}: Props) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isNutrition = kind === 'nutrition';

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [step, setStep] = useState<'pick' | 'schedule'>('pick');
  const [selected, setSelected] = useState<NutritionPlan | TrainingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nutritionQuery = useCoachNutritionPlansInfiniteQuery({search: deferredSearch}, {skip: !open || !isNutrition});
  const trainingQuery = useCoachTrainingPlansInfiniteQuery({search: deferredSearch}, {skip: !open || isNutrition});
  const query = isNutrition ? nutritionQuery : trainingQuery;
  const items: (NutritionPlan | TrainingPlan)[] = isNutrition
    ? (nutritionQuery.data?.pages.flatMap((page) => page.data) ?? [])
    : (trainingQuery.data?.pages.flatMap((page) => page.data) ?? []);

  const [assignNutrition, {isLoading: assigningNutrition}] = useAssignNutritionPlanMutation();
  const [assignTraining, {isLoading: assigningTraining}] = useAssignTrainingPlanMutation();
  const assigning = isNutrition ? assigningNutrition : assigningTraining;

  // Reset everything when the sheet closes.
  useEffect(() => {
    if (!open) {
      setStep('pick');
      setSelected(null);
      setSearch('');
      setError(null);
    }
  }, [open]);

  const Icon = isNutrition ? Utensils : Dumbbell;
  const iconWrap = isNutrition ? 'bg-success/10 text-success' : 'bg-accent-soft text-accent';
  const title = isNutrition ? 'Assign nutrition plan' : 'Assign training plan';

  const handlePick = (plan: NutritionPlan | TrainingPlan) => {
    setSelected(plan);
    setError(null);
    setStep('schedule');
  };

  const handleConfirm = async (startDate: string, endDate: string | null) => {
    if (!selected) {
      return;
    }
    setError(null);
    try {
      if (isNutrition) {
        await assignNutrition({
          id: selected.id,
          nutritionPlanAssignRequest: {client_id: clientId, start_date: startDate, end_date: endDate},
        }).unwrap();
      } else {
        await assignTraining({
          id: selected.id,
          trainingPlanAssignRequest: {client_id: clientId, start_date: startDate, end_date: endDate},
        }).unwrap();
      }
      toast.success(`"${selected.name}" assigned to ${clientName}`);
      // CLIENT-LIST tag (enhanced) refreshes the assigned-plans list + stat strip.
      dispatch(
        coachApi.util.invalidateTags([{type: isNutrition ? 'NutritionPlan' : 'TrainingPlan', id: 'CLIENT-LIST'}]),
      );
      onClose();
    } catch (e) {
      setError(assignErrorMessage(e, kind, clientName));
    }
  };

  if (!open) {
    return null;
  }

  return (
    <KeyboardSheet
      onClose={onClose}
      open={open}
      title={title}
    >
      {step === 'pick' ? (
        <div className="space-y-3 pb-2">
          <Typography
            color="muted"
            type="body-xs"
          >
            Copies a template to {clientName}.
          </Typography>
          <SearchField
            aria-label="Search plan templates"
            onChange={setSearch}
            value={search}
            variant="secondary"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search plan templates…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          {query.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : items.length === 0 ? (
            <Typography
              align="center"
              className="py-8"
              color="muted"
              type="body-sm"
            >
              {deferredSearch ? 'No plans match your search' : 'No plan templates yet'}
            </Typography>
          ) : (
            <div className="flex flex-col gap-1">
              {items.map((plan) => (
                <button
                  className="group flex items-center gap-3 rounded-xl p-2.5 text-left hover:bg-surface-hover"
                  key={plan.id}
                  onClick={() => handlePick(plan)}
                  type="button"
                >
                  <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${iconWrap}`}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <Typography
                      truncate
                      type="body-sm"
                      weight="semibold"
                    >
                      {plan.name}
                    </Typography>
                    <Typography
                      color="muted"
                      truncate
                      type="body-xs"
                    >
                      {isNutrition ? nutritionMeta(plan as NutritionPlan) : trainingMeta(plan as TrainingPlan)}
                    </Typography>
                  </span>
                  <ArrowRight
                    className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                    size={16}
                  />
                </button>
              ))}
            </div>
          )}

          <button
            className="flex w-full items-center gap-2 rounded-xl border border-border p-2.5 text-sm font-medium hover:bg-surface-hover"
            onClick={() => navigate(isNutrition ? ROUTES.CREATE_NUTRITION_PLAN : ROUTES.CREATE_TRAINING_PLAN)}
            type="button"
          >
            <span className="grid size-6 place-items-center rounded-md bg-accent-soft text-accent">
              <Plus size={14} />
            </span>
            Create a new {isNutrition ? 'nutrition' : 'training'} plan
          </button>
        </div>
      ) : selected ? (
        <PlanScheduleStep
          clientName={clientName}
          errorMessage={error}
          isSubmitting={assigning}
          kind={kind}
          onBack={() => setStep('pick')}
          onConfirm={handleConfirm}
          planMeta={isNutrition ? nutritionMeta(selected as NutritionPlan) : trainingMeta(selected as TrainingPlan)}
          planName={selected.name}
          requireEnd={!isNutrition}
        />
      ) : null}
    </KeyboardSheet>
  );
}
