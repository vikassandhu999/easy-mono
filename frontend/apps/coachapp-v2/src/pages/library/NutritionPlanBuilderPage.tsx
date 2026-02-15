import { Button, Card, toast } from "@heroui/react";
import { ArrowLeft, Copy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import {
  useCreateMealItemMutation,
  useCreateMealMutation,
  useListMealsQuery,
} from "@/api/meals";
import {
  useCopyNutritionPlanDayMutation,
  useDeletePlanItemMutation,
  useDuplicateNutritionPlanMutation,
  useGetNutritionPlanQuery,
  useListPlanItemsQuery,
  useUpdatePlanItemMutation,
} from "@/api/nutritionPlans";
import type { PlanItem } from "@/api/nutritionPlans";
import NutritionPlanDayView from "@/pages/library/NutritionPlanDayView";
import {
  DAYS,
  getDayMealCounts,
  getItemsByDay,
  getMealUsageCountByMealId,
  toSentenceLabel,
} from "@/pages/library/nutritionPlanBuilderShared";

export default function NutritionPlanBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const planId = id ?? "";

  const returnTo =
    typeof location.state === "object" &&
    location.state &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : "/library";

  const [planItemsOverride, setPlanItemsOverride] = useState<null | PlanItem[]>(
    null,
  );
  const [duplicatingAssignmentId, setDuplicatingAssignmentId] = useState<
    null | string
  >(null);

  const {
    data: planData,
    isError: isPlanError,
    isLoading: isPlanLoading,
  } = useGetNutritionPlanQuery(planId, { skip: !planId });

  const { data: mealsData } = useListMealsQuery({ planId }, { skip: !planId });
  const { data: planItemsData } = useListPlanItemsQuery(planId, {
    skip: !planId,
  });

  const meals = useMemo(
    () => [...(mealsData?.data ?? [])].sort((a, b) => a.position - b.position),
    [mealsData?.data],
  );
  const mealsById = useMemo(
    () =>
      meals.reduce<Record<string, (typeof meals)[number]>>((acc, meal) => {
        acc[meal.id] = meal;
        return acc;
      }, {}),
    [meals],
  );

  const planItems = planItemsData?.data ?? [];
  const effectivePlanItems = planItemsOverride ?? planItems;

  useEffect(() => {
    if (planItemsOverride !== null) {
      setPlanItemsOverride(null);
    }
  }, [planItems]);

  const itemsByDay = useMemo(
    () => getItemsByDay(effectivePlanItems),
    [effectivePlanItems],
  );
  const dayMealCounts = useMemo(
    () => getDayMealCounts(itemsByDay),
    [itemsByDay],
  );
  const mealUsageCountByMealId = useMemo(
    () => getMealUsageCountByMealId(effectivePlanItems),
    [effectivePlanItems],
  );

  const [duplicateNutritionPlan, { isLoading: isDuplicatingPlan }] =
    useDuplicateNutritionPlanMutation();
  const [copyNutritionPlanDay, { isLoading: isCopyingDay }] =
    useCopyNutritionPlanDayMutation();
  const [deletePlanItem, { isLoading: isDeletingPlanItem }] =
    useDeletePlanItemMutation();
  const [createMeal] = useCreateMealMutation();
  const [createMealItem] = useCreateMealItemMutation();
  const [updatePlanItem] = useUpdatePlanItemMutation();

  const duplicatePlanHandler = async () => {
    if (!planId) {
      return;
    }

    try {
      const response = await duplicateNutritionPlan(planId).unwrap();
      toast.success("Plan duplicated.");
      navigate(`/library/nutrition-plans/${response.data.id}/builder`, {
        state: { from: returnTo },
      });
    } catch {
      toast.danger("Unable to duplicate plan. Please try again.");
    }
  };

  const copyDayHandler = async (sourceDay: string) => {
    if (!planId || isCopyingDay) {
      return;
    }

    const targetInput = window.prompt(
      `Copy from ${toSentenceLabel(sourceDay)} to which day?\n${DAYS.filter(
        (day) => day !== sourceDay,
      )
        .map(
          (day) =>
            `- ${toSentenceLabel(day)} (${dayMealCounts[day] ?? 0} assignments)`,
        )
        .join("\n")}`,
      DAYS.find((day) => day !== sourceDay) ?? DAYS[0],
    );
    if (!targetInput) {
      return;
    }

    const targetDay = targetInput.trim().toLowerCase();
    if (
      !DAYS.includes(targetDay as (typeof DAYS)[number]) ||
      targetDay === sourceDay
    ) {
      toast.danger("Invalid target day.");
      return;
    }

    const confirmed = window.confirm(
      `Replace all assignments on ${toSentenceLabel(targetDay)} with assignments from ${toSentenceLabel(sourceDay)}?`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await copyNutritionPlanDay({
        body: { source_day: sourceDay, target_day: targetDay },
        id: planId,
      }).unwrap();
      toast.success("Day assignments replaced successfully.");
    } catch {
      toast.danger("Unable to copy day assignments. Please try again.");
    }
  };

  const removeAssignmentHandler = async (planItemId: string) => {
    if (!planId) {
      return;
    }

    const confirmed = window.confirm(
      "Remove this day assignment? This does not delete the meal.",
    );
    if (!confirmed) {
      return;
    }

    const previous = effectivePlanItems;
    setPlanItemsOverride(previous.filter((item) => item.id !== planItemId));

    try {
      await deletePlanItem({ id: planItemId, planId }).unwrap();
      toast.success("Day assignment removed.");
    } catch {
      setPlanItemsOverride(previous);
      toast.danger("Unable to remove assignment. Changes were rolled back.");
    }
  };

  const clearDayHandler = async (day: string) => {
    if (!planId || isDeletingPlanItem) {
      return;
    }

    const count = dayMealCounts[day] ?? 0;
    if (count === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Clear ${count} day assignments from ${toSentenceLabel(day)}? Meals remain unchanged.`,
    );
    if (!confirmed) {
      return;
    }

    const targetIds = effectivePlanItems
      .filter((item) => item.day === day)
      .map((item) => item.id);
    const previous = effectivePlanItems;
    setPlanItemsOverride(effectivePlanItems.filter((item) => item.day !== day));

    try {
      await Promise.all(
        targetIds.map((id) => deletePlanItem({ id, planId }).unwrap()),
      );
      toast.success(`Cleared ${toSentenceLabel(day)} assignments only.`);
    } catch {
      setPlanItemsOverride(previous);
      toast.danger(
        "Unable to clear day assignments. Changes were rolled back.",
      );
    }
  };

  const duplicateForDayHandler = async (assignment: PlanItem) => {
    if (!planId) {
      return;
    }

    const sourceMeal = mealsById[assignment.meal_id];
    if (!sourceMeal) {
      toast.danger("Unable to duplicate meal. Source meal was not found.");
      return;
    }

    setDuplicatingAssignmentId(assignment.id);

    try {
      const newMealResponse = await createMeal({
        body: {
          macros: sourceMeal.macros,
          name: `${sourceMeal.name} (Copy)`,
          position: meals.length,
        },
        planId,
      }).unwrap();

      await Promise.all(
        sourceMeal.meal_items.map((mealItem, index) =>
          createMealItem({
            body: {
              amount: mealItem.amount ?? undefined,
              food_id: mealItem.food_id ?? undefined,
              position: index,
              recipe_id: mealItem.recipe_id ?? undefined,
              unit: mealItem.unit ?? undefined,
              weight_g: mealItem.weight_g ?? undefined,
            },
            mealId: newMealResponse.data.id,
            planId,
          }).unwrap(),
        ),
      );

      const previous = effectivePlanItems;
      const next = previous.map((item) =>
        item.id === assignment.id
          ? { ...item, meal_id: newMealResponse.data.id }
          : item,
      );
      setPlanItemsOverride(next);

      try {
        await updatePlanItem({
          body: { meal_id: newMealResponse.data.id },
          id: assignment.id,
          planId,
        }).unwrap();
      } catch {
        setPlanItemsOverride(previous);
        throw new Error("repoint_failed");
      }

      toast.success(
        "Duplicated for this day. Local changes are isolated to this assignment.",
      );
    } catch {
      toast.danger("Unable to duplicate for this day. Please try again.");
    } finally {
      setDuplicatingAssignmentId(null);
    }
  };

  if (isPlanLoading) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="text-sm text-muted">Loading nutrition plan...</p>
      </Card>
    );
  }

  if (isPlanError || !planData?.data) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="font-semibold text-foreground">Could not load plan.</p>
        <p className="mt-2 text-sm text-muted">Please go back and try again.</p>
      </Card>
    );
  }

  const plan = planData.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Button
            className="min-h-11 w-fit gap-2 px-2"
            onPress={() => navigate(returnTo)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to library
          </Button>
          <p className="text-sm text-muted">Library</p>
          <h1 className="text-2xl font-semibold md:text-3xl">{plan.name}</h1>
          <p className="max-w-2xl text-sm text-muted">
            {plan.type} plan · {plan.status} · Build and manage weekly meal
            schedule
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className="min-h-11"
            onPress={() =>
              navigate(`/library/nutrition-plans/${plan.id}/edit`, {
                state: { from: returnTo },
              })
            }
            size="md"
            variant="outline"
          >
            Edit metadata
          </Button>
          <Button
            className="min-h-11 gap-2"
            isDisabled={isDuplicatingPlan}
            onPress={duplicatePlanHandler}
            size="md"
            variant="secondary"
          >
            <Copy className="h-4 w-4" />
            {isDuplicatingPlan ? "Duplicating..." : "Duplicate"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {DAYS.map((day) => (
          <NutritionPlanDayView
            day={day}
            dayMealCount={dayMealCounts[day] ?? 0}
            key={day}
            mealsById={mealsById}
            onAddMeal={(targetDay) =>
              navigate(
                `/library/nutrition-plans/${planId}/builder/add-assignment?day=${targetDay}`,
                {
                  state: { from: `/library/nutrition-plans/${planId}/builder` },
                },
              )
            }
            onClearDay={clearDayHandler}
            onCopyDay={copyDayHandler}
            onDuplicateForDay={duplicateForDayHandler}
            onEditAssignment={(assignment) =>
              navigate(
                `/library/nutrition-plans/${planId}/builder/assignments/${assignment.id}/edit`,
                {
                  state: { from: `/library/nutrition-plans/${planId}/builder` },
                },
              )
            }
            onEditMeal={(mealId) =>
              navigate(
                `/library/nutrition-plans/${planId}/builder/meals/${mealId}/edit`,
                {
                  state: { from: `/library/nutrition-plans/${planId}/builder` },
                },
              )
            }
            onRemoveMealFromDay={removeAssignmentHandler}
            planItems={itemsByDay[day] ?? []}
          />
        ))}
      </div>

      {duplicatingAssignmentId ? (
        <Card className="border border-separator bg-surface p-4">
          <p className="text-sm text-muted">
            Duplicating assignment for local day changes...
          </p>
        </Card>
      ) : null}

      <Card className="border border-separator bg-background p-4">
        <p className="text-sm text-muted">
          Edit meal opens full-page meal editing (global). Edit assignment opens
          full-page assignment editing (local). Used in current plan:{" "}
          {Object.keys(mealUsageCountByMealId).length} meals.
        </p>
      </Card>
    </div>
  );
}
