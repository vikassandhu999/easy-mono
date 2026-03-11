import {toast} from '@heroui/react';
import {useCallback, useMemo, useState} from 'react';

import type {PlanItem} from '@/entities/nutritionPlans/api/nutritionPlans';
import type {
  ConfirmDialogState,
  CopyDayDialogState,
  PendingConfirm,
  PendingCopyDay,
  UseNutritionPlanBuilderActionsResult,
} from '@/features/library/nutrition-plans/nutritionPlanBuilderTypes';

import {useCreateMealItemMutation, useCreateMealMutation} from '@/entities/meals/api/meals';
import {
  useCopyNutritionPlanDayMutation,
  useCreatePlanItemMutation,
  useDeletePlanItemMutation,
  useDuplicateNutritionPlanMutation,
  useUpdatePlanItemMutation,
} from '@/entities/nutritionPlans/api/nutritionPlans';
import {DAYS, toSentenceLabel} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';
import useNutritionPlanBuilderData from '@/features/library/nutrition-plans/useNutritionPlanBuilderData';

export default function useNutritionPlanBuilderActions(
  planId: string,
  navigateTo: (path: string) => void,
): UseNutritionPlanBuilderActionsResult {
  const {effectivePlanItems, itemsByDay, meals, mealsById, mealUsageCount, setPlanItemsOverride} =
    useNutritionPlanBuilderData(planId);

  const [isDuplicatingAssignment, setDuplicatingAssignment] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<null | PendingConfirm>(null);
  const [pendingCopyDay, setPendingCopyDay] = useState<null | PendingCopyDay>(null);

  const [duplicateNutritionPlan, {isLoading: isDuplicatingPlan}] = useDuplicateNutritionPlanMutation();
  const [copyNutritionPlanDay, {isLoading: isCopyingDay}] = useCopyNutritionPlanDayMutation();
  const [deletePlanItem, {isLoading: isDeletingPlanItem}] = useDeletePlanItemMutation();
  const [createMeal] = useCreateMealMutation();
  const [createMealItem] = useCreateMealItemMutation();
  const [updatePlanItem] = useUpdatePlanItemMutation();
  const [createPlanItem] = useCreatePlanItemMutation();

  const builderPath = `/library/nutrition-plans/${planId}/builder`;

  const duplicatePlan = useCallback(async () => {
    if (!planId) return;
    try {
      const res = await duplicateNutritionPlan(planId).unwrap();
      toast.success('Plan duplicated.');
      navigateTo(`/library/nutrition-plans/${res.data.id}/builder`);
    } catch {
      toast.danger('Unable to duplicate plan. Please try again.');
    }
  }, [duplicateNutritionPlan, navigateTo, planId]);

  const dayMealCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const day of DAYS) counts[day] = itemsByDay[day]?.length ?? 0;
    return counts;
  }, [itemsByDay]);

  const performCopyDay = useCallback(
    async (sourceDay: string, targetDay: string) => {
      try {
        await copyNutritionPlanDay({
          body: {source_day: sourceDay, target_day: targetDay},
          id: planId,
        }).unwrap();
        toast.success('Day assignments replaced successfully.');
      } catch {
        toast.danger('Unable to copy day assignments. Please try again.');
      }
    },
    [copyNutritionPlanDay, planId],
  );

  const onCopyDay = useCallback(
    (sourceDay: string) => {
      if (!planId || isCopyingDay) return;
      setPendingCopyDay({sourceDay});
    },
    [isCopyingDay, planId],
  );

  const handleCopyDayConfirm = useCallback(
    (targetDay: string) => {
      if (!pendingCopyDay) return;
      const {sourceDay} = pendingCopyDay;
      setPendingCopyDay(null);
      setPendingConfirm({
        confirmLabel: 'Replace',
        description: `Replace all assignments on ${toSentenceLabel(targetDay)} with assignments from ${toSentenceLabel(sourceDay)}?`,
        onConfirm: () => {
          setPendingConfirm(null);
          performCopyDay(sourceDay, targetDay);
        },
        title: 'Replace day assignments',
      });
    },
    [pendingCopyDay, performCopyDay],
  );

  const onRemoveFromDay = useCallback(
    (planItemId: string) => {
      if (!planId) return;
      setPendingConfirm({
        confirmLabel: 'Remove',
        description: 'Remove this day assignment? This does not delete the meal.',
        onConfirm: async () => {
          setPendingConfirm(null);
          const previous = effectivePlanItems;
          setPlanItemsOverride(previous.filter((i) => i.id !== planItemId));
          try {
            await deletePlanItem({id: planItemId, planId}).unwrap();
            toast.success('Day assignment removed.');
          } catch {
            setPlanItemsOverride(previous);
            toast.danger('Unable to remove assignment. Changes were rolled back.');
          }
        },
        title: 'Remove assignment',
      });
    },
    [deletePlanItem, effectivePlanItems, planId, setPlanItemsOverride],
  );

  const onClearDay = useCallback(
    (day: string) => {
      if (!planId || isDeletingPlanItem) return;
      const count = dayMealCounts[day] ?? 0;
      if (count === 0) return;
      setPendingConfirm({
        confirmLabel: 'Clear',
        description: `Clear ${count} day assignments from ${toSentenceLabel(day)}? Meals remain unchanged.`,
        onConfirm: async () => {
          setPendingConfirm(null);
          const targetIds = effectivePlanItems.filter((i) => i.day === day).map((i) => i.id);
          const previous = effectivePlanItems;
          setPlanItemsOverride(effectivePlanItems.filter((i) => i.day !== day));
          try {
            await Promise.all(targetIds.map((id) => deletePlanItem({id, planId}).unwrap()));
            toast.success(`Cleared ${toSentenceLabel(day)} assignments only.`);
          } catch {
            setPlanItemsOverride(previous);
            toast.danger('Unable to clear day assignments. Changes were rolled back.');
          }
        },
        title: 'Clear day',
      });
    },
    [dayMealCounts, deletePlanItem, effectivePlanItems, isDeletingPlanItem, planId, setPlanItemsOverride],
  );

  const onDuplicateForDay = useCallback(
    async (assignment: PlanItem) => {
      if (!planId) return;
      const sourceMeal = mealsById[assignment.meal_id];
      if (!sourceMeal) {
        toast.danger('Source meal not found.');
        return;
      }
      setDuplicatingAssignment(true);
      try {
        const newMeal = await createMeal({
          body: {
            macros: sourceMeal.macros,
            name: `${sourceMeal.name} (Copy)`,
            position: meals.length,
          },
          planId,
        }).unwrap();
        await Promise.all(
          sourceMeal.meal_items.map((mi, i) =>
            createMealItem({
              body: {
                amount: mi.amount ?? undefined,
                food_id: mi.food_id ?? undefined,
                position: i,
                recipe_id: mi.recipe_id ?? undefined,
                unit: mi.unit ?? undefined,
                weight_g: mi.weight_g ?? undefined,
              },
              mealId: newMeal.data.id,
              planId,
            }).unwrap(),
          ),
        );
        const previous = effectivePlanItems;
        setPlanItemsOverride(previous.map((i) => (i.id === assignment.id ? {...i, meal_id: newMeal.data.id} : i)));
        try {
          await updatePlanItem({
            body: {meal_id: newMeal.data.id},
            id: assignment.id,
            planId,
          }).unwrap();
        } catch {
          setPlanItemsOverride(previous);
          throw new Error('repoint_failed');
        }
        toast.success('Duplicated for this day.');
      } catch {
        toast.danger('Unable to duplicate for this day. Please try again.');
      } finally {
        setDuplicatingAssignment(false);
      }
    },
    [
      createMeal,
      createMealItem,
      effectivePlanItems,
      meals.length,
      mealsById,
      planId,
      setPlanItemsOverride,
      updatePlanItem,
    ],
  );

  const onCreateMealForDay = useCallback(
    async (day: string, mealName: string, mealType: string) => {
      if (!planId) return;
      try {
        const res = await createMeal({
          body: {name: mealName.trim(), position: meals.length},
          planId,
        }).unwrap();
        await createPlanItem({
          body: {day, meal_id: res.data.id, meal_type: mealType},
          planId,
        }).unwrap();
        toast.success(`Meal added to ${toSentenceLabel(day)}.`);
      } catch {
        toast.danger('Unable to add meal. Please try again.');
      }
    },
    [createMeal, createPlanItem, meals.length, planId],
  );

  const onLinkMealToDay = useCallback(
    async (day: string, mealId: string, mealType: string) => {
      if (!planId) return;
      try {
        await createPlanItem({
          body: {day, meal_id: mealId, meal_type: mealType},
          planId,
        }).unwrap();
        toast.success(`Meal assigned to ${toSentenceLabel(day)}.`);
      } catch {
        toast.danger('Unable to assign meal. Please try again.');
      }
    },
    [createPlanItem, planId],
  );

  const onEditAssignment = useCallback(
    (assignment: PlanItem) => {
      navigateTo(`${builderPath}/assignments/${assignment.id}/edit`);
    },
    [builderPath, navigateTo],
  );

  const onEditMeal = useCallback(
    (mealId: string) => {
      navigateTo(`${builderPath}/meals/${mealId}/edit`);
    },
    [builderPath, navigateTo],
  );

  const confirmDialog: ConfirmDialogState | null = pendingConfirm
    ? {
        confirmLabel: pendingConfirm.confirmLabel,
        description: pendingConfirm.description,
        isOpen: true,
        onConfirm: pendingConfirm.onConfirm,
        onOpenChange: (open) => {
          if (!open) setPendingConfirm(null);
        },
        title: pendingConfirm.title,
      }
    : null;

  const copyDayDialog: CopyDayDialogState | null = pendingCopyDay
    ? {
        dayMealCounts,
        isOpen: true,
        onConfirm: handleCopyDayConfirm,
        onOpenChange: (open) => {
          if (!open) setPendingCopyDay(null);
        },
        sourceDay: pendingCopyDay.sourceDay,
      }
    : null;

  return {
    confirmDialog,
    copyDayDialog,
    dayActions: {onClearDay, onCopyDay, onCreateMealForDay, onLinkMealToDay},
    duplicatePlan,
    isDuplicatingAssignment,
    isDuplicatingPlan,
    itemActions: {
      onDuplicateForDay,
      onEditAssignment,
      onEditMeal,
      onRemoveFromDay,
    },
    itemsByDay,
    meals,
    mealsById,
    mealUsageCount,
  };
}
