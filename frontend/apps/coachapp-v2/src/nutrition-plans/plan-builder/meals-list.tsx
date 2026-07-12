/**
 * MealsList — "MEALS" section of the nutrition plan builder.
 *
 * Renders the meal accordion (single-open), a "collapse-all" action on the
 * section header, a "+ Add meal" button, and an empty-state message when
 * no meals exist yet.
 *
 * Reads meals from the getNutritionPlan cache (single source of truth —
 * no separate listMeals query). Cache: create meal → optimistic
 * updateQueryData('getNutritionPlan', {id: planId}, …) + refetch so the
 * server-computed nutrition snapshots reconcile.
 */
import {Button, Typography} from '@heroui/react';
import {Plus} from 'lucide-react';
import {toastMutationError} from '@/@components/mutation-toast';
import {coachApi, useCreateMealMutation, useGetNutritionPlanQuery} from '@/api/generated';
import {useAppDispatch} from '@/store';

import {useWorkoutAccordion} from '@/training-plans/plan-builder/hooks/use-workout-accordion';
import {MealCard} from './meal-card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MealsListProps {
  planId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MealsList({planId}: MealsListProps) {
  const dispatch = useAppDispatch();
  const {data, isError, refetch} = useGetNutritionPlanQuery({id: planId});
  const [createMeal, {isLoading: isCreating}] = useCreateMealMutation();

  const {openId, toggle, collapseAll} = useWorkoutAccordion();

  const meals = data?.data.meals ?? [];

  // ---------------------------------------------------------------------------
  // Add meal
  // ---------------------------------------------------------------------------

  const handleAddMeal = async () => {
    // Next number after the highest existing "Meal N" — length+1 duplicates
    // names after a delete.
    const nextNum = meals.reduce((n, m) => Math.max(n, Number(/^Meal (\d+)$/.exec(m.name)?.[1] ?? 0)), 0) + 1;
    const name = `Meal ${nextNum}`;
    try {
      const result = await createMeal({
        planId,
        nutritionMealRequest: {name},
      }).unwrap();
      const newMeal = result.data;
      // Optimistic append into cache
      dispatch(
        coachApi.util.updateQueryData('getNutritionPlan', {id: planId}, (draft) => {
          if (!draft.data.meals) {
            draft.data.meals = [];
          }
          draft.data.meals.push(newMeal);
        }),
      );
      // Auto-open the newly created meal
      toggle(newMeal.id);
      // Reconcile server snapshot
      refetch().catch(() => undefined);
    } catch (e) {
      // Create failed — nothing to roll back (optimistic push only runs on success)
      toastMutationError(e, "Couldn't add meal");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <section className="border-t border-separator py-4">
      {/* Section header (design: editor structure title + count subtitle) */}
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <h3 className="font-grotesk text-[15px] font-bold tracking-[-0.01em]">Meals</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {meals.length} meal{meals.length === 1 ? '' : 's'} · tap to edit
          </p>
        </div>

        {meals.length > 0 ? (
          <Button
            className="text-xs"
            onPress={collapseAll}
            size="sm"
            variant="ghost"
          >
            Collapse all
          </Button>
        ) : null}
      </div>

      {/* Loading is handled by the page-level PageSkeleton (parent gates on
          the same getNutritionPlan query), so no loading branch here. */}
      {isError ? (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger-soft-foreground">
          Couldn't load meals.
        </div>
      ) : meals.length === 0 ? (
        /* Empty state */
        <Typography
          className="mb-3"
          color="muted"
          type="body-sm"
        >
          Add your first meal
        </Typography>
      ) : (
        /* Meal accordion */
        <div className="flex flex-col gap-2.5">
          {meals.map((meal, index) => (
            <MealCard
              index={index}
              key={meal.id}
              meal={meal}
              open={openId === meal.id}
              onToggle={() => toggle(meal.id)}
              planId={planId}
            />
          ))}
        </div>
      )}

      {/* Add meal — design: dashed add tile (structure-level = link-blue hover) */}
      <Button
        className="mt-3 h-12 w-full rounded-[14px]! border-[1.5px] border-dashed border-edge-strong bg-transparent text-[13px] font-semibold text-muted hover:border-link hover:bg-link-soft hover:text-link"
        isPending={isCreating}
        onPress={() => {
          handleAddMeal().catch(() => undefined);
        }}
        variant="ghost"
      >
        <Plus
          size={15}
          strokeWidth={2.2}
        />
        Add meal
      </Button>
    </section>
  );
}
