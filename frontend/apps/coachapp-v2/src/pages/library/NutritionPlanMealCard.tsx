import { Button, Card } from "@heroui/react";
import { Copy, Pencil, SquarePen, Trash2 } from "lucide-react";

import type { Meal } from "@/api/meals";
import type { PlanItem } from "@/api/nutritionPlans";

import { toSentenceLabel } from "@/pages/library/nutritionPlanBuilderShared";

type NutritionPlanMealCardProps = {
  meal: Meal | undefined;
  onDuplicateForDay: (planItem: PlanItem) => void;
  onEditAssignment: (planItem: PlanItem) => void;
  onEditMeal: (mealId: string) => void;
  onRemoveFromDay: (planItemId: string) => void;
  planItem: PlanItem;
};

const getCalories = (meal: Meal | undefined) => {
  if (!meal?.macros) {
    return null;
  }

  const caloriesEntry = Object.entries(meal.macros).find(([key]) => {
    const normalized = key.trim().toLowerCase();
    return (
      normalized === "calories" ||
      normalized === "kcal" ||
      normalized === "energy"
    );
  });

  return caloriesEntry?.[1] ?? null;
};

export default function NutritionPlanMealCard({
  meal,
  onDuplicateForDay,
  onEditAssignment,
  onEditMeal,
  onRemoveFromDay,
  planItem,
}: NutritionPlanMealCardProps) {
  const itemCount = meal?.meal_items.length ?? 0;
  const calories = getCalories(meal);
  const mealTypeLabel = toSentenceLabel(planItem.meal_type);

  return (
    <Card className="border border-separator bg-surface p-4">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium text-muted">{mealTypeLabel}</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {meal?.name ?? "Untitled meal"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {calories !== null
              ? `${Math.round(calories)} kcal`
              : "Calories unavailable"}{" "}
            · {itemCount} item
            {itemCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            className="min-h-11"
            onPress={() => onEditAssignment(planItem)}
            size="sm"
            variant="outline"
          >
            <SquarePen className="h-4 w-4" />
            Edit assignment
          </Button>
          <Button
            className="min-h-11"
            onPress={() => onDuplicateForDay(planItem)}
            size="sm"
            variant="outline"
          >
            <Copy className="h-4 w-4" />
            Duplicate for this day
          </Button>
          <Button
            className="min-h-11"
            onPress={() => onRemoveFromDay(planItem.id)}
            size="sm"
            variant="outline"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
          <Button
            className="min-h-11"
            onPress={() => onEditMeal(planItem.meal_id)}
            size="sm"
            variant="outline"
          >
            <Pencil className="h-4 w-4" />
            Edit meal
          </Button>
        </div>
      </div>
    </Card>
  );
}
