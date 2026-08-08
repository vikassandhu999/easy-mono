/**
 * PlanAssignContent — the surface-agnostic body of the assign flow (header +
 * two steps). Rendered inside an anchored Popover on desktop and a KeyboardSheet
 * on mobile by PlanAssignControl. Mounted only while open, so it needs no reset.
 *
 *  Step 1 "pick"     — search + browse plan templates.
 *  Step 2 "schedule" — start/end dates (PlanScheduleStep), then assign.
 */
import {Button, SearchField, Spinner, Typography, toast} from '@heroui/react';
import {ArrowRight, Dumbbell, Plus, Utensils, X} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ErrorState} from '@/@components/error-state';
import {
  type PlanAssignmentDates,
  type PlanKind,
  planAssignmentConflictMessage,
} from '@/@components/plan-assignment-dates';
import PlanScheduleStep from '@/@components/plan-schedule-step';
import {ROUTES} from '@/@config/routes';
import {
  type NutritionPlan,
  useAssignNutritionPlanMutation,
  useCoachNutritionPlansInfiniteQuery,
} from '@/api/nutrition-plans-list';
import type {TrainingPlan} from '@/api/training-plan-builder';
import {useAssignTrainingPlanMutation, useCoachTrainingPlansInfiniteQuery} from '@/api/training-plans-list';

export type {PlanKind};

interface Props {
  kind: PlanKind;
  clientId: string;
  clientName: string;
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

export default function PlanAssignContent({kind, clientId, clientName, onClose}: Props) {
  const navigate = useNavigate();
  const isNutrition = kind === 'nutrition';

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [step, setStep] = useState<'pick' | 'schedule'>('pick');
  const [selected, setSelected] = useState<NutritionPlan | TrainingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nutritionQuery = useCoachNutritionPlansInfiniteQuery({search: deferredSearch}, {enabled: isNutrition});
  const trainingQuery = useCoachTrainingPlansInfiniteQuery({search: deferredSearch}, {enabled: !isNutrition});
  const query = isNutrition ? nutritionQuery : trainingQuery;
  const items: (NutritionPlan | TrainingPlan)[] = isNutrition
    ? (nutritionQuery.data?.pages.flatMap((page) => page.data) ?? [])
    : (trainingQuery.data?.pages.flatMap((page) => page.data) ?? []);

  const assignNutritionMutation = useAssignNutritionPlanMutation();
  const assignTrainingMutation = useAssignTrainingPlanMutation();
  const assigning = isNutrition ? assignNutritionMutation.isPending : assignTrainingMutation.isPending;

  const Icon = isNutrition ? Utensils : Dumbbell;
  const iconWrap = isNutrition ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent';
  const title = isNutrition ? 'Assign nutrition plan' : 'Assign training plan';

  const handlePick = (plan: NutritionPlan | TrainingPlan) => {
    setSelected(plan);
    setError(null);
    setStep('schedule');
  };

  const handleConfirm = async ({startDate, endDate}: PlanAssignmentDates) => {
    if (!selected) {
      return;
    }
    setError(null);
    try {
      if (isNutrition) {
        await assignNutritionMutation.mutateAsync({
          id: selected.id,
          body: {client_id: clientId, start_date: startDate, end_date: endDate},
        });
      } else {
        await assignTrainingMutation.mutateAsync({
          id: selected.id,
          body: {client_id: clientId, start_date: startDate, end_date: endDate},
        });
      }
      toast.success(`"${selected.name}" assigned to ${clientName}`);
      onClose();
    } catch (e) {
      setError(
        planAssignmentConflictMessage(e, kind, clientName) ??
          "Couldn't assign the plan. Check the dates and try again.",
      );
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Typography
          type="body-sm"
          weight="semibold"
        >
          {title}
        </Typography>
        <Button
          aria-label="Close"
          className="text-muted hover:text-foreground"
          isIconOnly
          onPress={onClose}
          size="sm"
          variant="ghost"
        >
          <X size={16} />
        </Button>
      </div>

      {step === 'pick' ? (
        <div className="space-y-3">
          <Typography
            color="muted"
            type="body-xs"
          >
            Copies a template to {clientName}.
          </Typography>
          <div className="sticky top-0 z-10 bg-surface pb-1">
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
          </div>

          {query.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : query.isError ? (
            <ErrorState
              message={`Couldn't load ${isNutrition ? 'nutrition' : 'training'} plans.`}
              onRetry={() => query.refetch()}
            />
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
            <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {items.map((plan) => (
                <Button
                  className="group h-auto w-full justify-start gap-3 p-2 text-left"
                  key={plan.id}
                  onPress={() => handlePick(plan)}
                  variant="ghost"
                >
                  <span className={`grid size-9 shrink-0 place-items-center rounded-panel ${iconWrap}`}>
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
                </Button>
              ))}
            </div>
          )}

          <Button
            className="h-auto w-full justify-start gap-2 p-2"
            onPress={() => navigate(isNutrition ? ROUTES.CREATE_NUTRITION_PLAN : ROUTES.CREATE_TRAINING_PLAN)}
            variant="outline"
          >
            <span className="grid size-6 place-items-center rounded-panel bg-accent-soft text-accent">
              <Plus size={14} />
            </span>
            Create a new {isNutrition ? 'nutrition' : 'training'} plan
          </Button>
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
        />
      ) : null}
    </div>
  );
}
