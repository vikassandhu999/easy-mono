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
import {Button, Spinner, Typography, toast} from '@heroui/react';
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
  const {data, isLoading, isError, refetch} = useGetNutritionPlanQuery({id: planId});
  const [createMeal, {isLoading: isCreating}] = useCreateMealMutation();

  const {openId, toggle, collapseAll} = useWorkoutAccordion();

  const meals = data?.data.meals ?? [];

  // ---------------------------------------------------------------------------
  // Add meal
  // ---------------------------------------------------------------------------

  const handleAddMeal = async () => {
    const name = `Meal ${meals.length + 1}`;
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
    } catch {
      // Create failed — nothing to roll back (optimistic push only runs on success)
      toast.danger("Couldn't add meal");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <section className="border-t border-divider py-4">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <Typography
          className="uppercase tracking-wider"
          color="muted"
          type="body-xs"
          weight="semibold"
        >
          Meals
        </Typography>

        {meals.length > 0 ? (
          <button
            className="text-xs text-foreground-500 hover:text-foreground transition-colors"
            onClick={collapseAll}
            type="button"
          >
            Collapse all
          </button>
        ) : null}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner
            color="accent"
            size="sm"
          />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          Failed to load meals.
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
        <div className="flex flex-col gap-2">
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              open={openId === meal.id}
              onToggle={() => toggle(meal.id)}
              planId={planId}
            />
          ))}
        </div>
      )}

      {/* Add meal */}
      <div className="mt-3">
        <Button
          isLoading={isCreating}
          onPress={() => {
            handleAddMeal().catch(() => undefined);
          }}
          size="sm"
          variant="ghost"
        >
          + Add meal
        </Button>
      </div>
    </section>
  );
}
