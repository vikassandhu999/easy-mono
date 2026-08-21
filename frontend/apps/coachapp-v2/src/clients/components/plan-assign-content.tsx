/**
 * PlanAssignContent — the surface-agnostic body of the assign flow (header +
 * two steps). Rendered inside an anchored Popover on desktop and a KeyboardSheet
 * on mobile by PlanAssignControl. Mounted only while open, so it needs no reset.
 *
 *  Step 1 "pick"     — search + browse plan templates.
 *  Step 2 "schedule" — start/end dates (PlanScheduleStep), then assign.
 */
import {Button, SearchField, Typography, toast} from '@heroui/react';
import {Dumbbell, Plus, Utensils, X} from 'lucide-react';
import {useDeferredValue, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import BrowseListBox, {BrowseRow} from '@/@components/browse-list-box';
import ListEmptyState from '@/@components/list-empty-state';
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

type SelectedPlan = {kind: 'nutrition'; plan: NutritionPlan} | {kind: 'training'; plan: TrainingPlan};

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
  const [selected, setSelected] = useState<SelectedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nutritionQuery = useCoachNutritionPlansInfiniteQuery(
    {archived: false, search: deferredSearch},
    {enabled: isNutrition},
  );
  const trainingQuery = useCoachTrainingPlansInfiniteQuery({search: deferredSearch}, {enabled: !isNutrition});
  const query = isNutrition ? nutritionQuery : trainingQuery;
  const nutritionItems = nutritionQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const trainingItems = trainingQuery.data?.pages.flatMap((page) => page.data) ?? [];

  const assignTrainingMutation = useAssignTrainingPlanMutation();
  const assignNutritionMutation = useAssignNutritionPlanMutation();
  const assigning = isNutrition ? assignNutritionMutation.isPending : assignTrainingMutation.isPending;

  const Icon = isNutrition ? Utensils : Dumbbell;
  const iconWrap = isNutrition ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent';
  const title = isNutrition ? 'Assign nutrition plan' : 'Assign training plan';

  const handlePickNutrition = (plan: NutritionPlan) => {
    setSelected({kind: 'nutrition', plan});
    setError(null);
    setStep('schedule');
  };

  const handlePickTraining = (plan: TrainingPlan) => {
    setSelected({kind: 'training', plan});
    setError(null);
    setStep('schedule');
  };

  const handleConfirm = async ({startDate, endDate}: PlanAssignmentDates) => {
    if (!selected) {
      return;
    }
    setError(null);
    try {
      if (selected.kind === 'nutrition') {
        await assignNutritionMutation.mutateAsync({
          clientId,
          id: selected.plan.id,
          body: {
            end_date: endDate,
            expected_revision: selected.plan.revision,
            start_date: startDate,
          },
        });
      } else {
        await assignTrainingMutation.mutateAsync({
          clientId,
          id: selected.plan.id,
          body: {start_date: startDate, end_date: endDate},
        });
      }
      toast.success(`"${selected.plan.name}" assigned to ${clientName}`);
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

          {isNutrition ? (
            <BrowseListBox
              ariaLabel="Nutrition plans"
              className="max-h-72 gap-0 overflow-y-auto p-0"
              emptyState={
                <ListEmptyState
                  emptyDescription="Create a plan template before assigning it to a client."
                  hasFilter={deferredSearch.trim().length > 0}
                  nounPlural="plan templates"
                  onClearFilters={() => setSearch('')}
                />
              }
              fetchNextPage={() => {
                query.fetchNextPage().catch(() => undefined);
              }}
              isError={query.isError}
              isLoading={query.isLoading || query.isFetchingNextPage}
              items={nutritionItems}
              onAction={(key) => {
                const plan = nutritionItems.find((item) => item.id === String(key));
                if (plan) {
                  handlePickNutrition(plan);
                }
              }}
              onRetry={() => {
                query.refetch().catch(() => undefined);
              }}
              renderItem={(plan) => (
                <BrowseRow
                  icon={<Icon size={16} />}
                  iconClassName={iconWrap}
                  id={plan.id}
                  meta={nutritionMeta(plan)}
                  textValue={plan.name}
                  title={plan.name}
                />
              )}
            />
          ) : (
            <BrowseListBox
              ariaLabel="Training plans"
              className="max-h-72 gap-0 overflow-y-auto p-0"
              emptyState={
                <ListEmptyState
                  emptyDescription="Create a plan template before assigning it to a client."
                  hasFilter={deferredSearch.trim().length > 0}
                  nounPlural="plan templates"
                  onClearFilters={() => setSearch('')}
                />
              }
              fetchNextPage={() => {
                query.fetchNextPage().catch(() => undefined);
              }}
              isError={query.isError}
              isLoading={query.isLoading || query.isFetchingNextPage}
              items={trainingItems}
              onAction={(key) => {
                const plan = trainingItems.find((item) => item.id === String(key));
                if (plan) {
                  handlePickTraining(plan);
                }
              }}
              onRetry={() => {
                query.refetch().catch(() => undefined);
              }}
              renderItem={(plan) => (
                <BrowseRow
                  icon={<Icon size={16} />}
                  iconClassName={iconWrap}
                  id={plan.id}
                  meta={trainingMeta(plan)}
                  textValue={plan.name}
                  title={plan.name}
                />
              )}
            />
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
          planMeta={selected.kind === 'nutrition' ? nutritionMeta(selected.plan) : trainingMeta(selected.plan)}
          planName={selected.plan.name}
        />
      ) : null}
    </div>
  );
}
