import {
  Button,
  Card,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextField,
  toast,
} from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";

import { useCreateMealMutation, useListMealsQuery } from "@/api/meals";
import {
  useCreatePlanItemMutation,
  useListPlanItemsQuery,
} from "@/api/nutritionPlans";
import {
  MEAL_TYPES,
  toSentenceLabel,
} from "@/pages/library/nutritionPlanBuilderShared";

const MEAL_TYPE_ORDER = [
  "breakfast",
  "pre_workout",
  "lunch",
  "snack",
  "post_workout",
  "dinner",
] as const;

export default function NutritionPlanAddAssignmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const planId = id ?? "";

  const returnTo =
    typeof location.state === "object" &&
    location.state &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : `/library/nutrition-plans/${planId}/builder`;

  const day = searchParams.get("day") ?? "monday";

  const [newMealName, setNewMealName] = useState("");
  const [selectedMealId, setSelectedMealId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMealType, setSelectedMealType] = useState<string>(
    MEAL_TYPES[0],
  );

  const { data: mealsData } = useListMealsQuery({ planId }, { skip: !planId });
  const { data: planItemsData } = useListPlanItemsQuery(planId, {
    skip: !planId,
  });
  const [createMeal, { isLoading: isCreatingMeal }] = useCreateMealMutation();
  const [createPlanItem, { isLoading: isCreatingPlanItem }] =
    useCreatePlanItemMutation();

  const meals = mealsData?.data ?? [];
  const planItems = planItemsData?.data ?? [];

  const filteredMeals = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return meals;
    }

    return meals.filter((meal) => meal.name.toLowerCase().includes(normalized));
  }, [meals, searchQuery]);

  const mealTypeChipsByMealId = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};

    for (const item of planItems) {
      const existing = counts[item.meal_id] ?? {};
      existing[item.meal_type] = (existing[item.meal_type] ?? 0) + 1;
      counts[item.meal_id] = existing;
    }

    return Object.fromEntries(
      Object.entries(counts).map(([mealId, typeCounts]) => {
        const sortedTypes = Object.entries(typeCounts)
          .sort((a, b) => {
            if (b[1] !== a[1]) {
              return b[1] - a[1];
            }

            return (
              MEAL_TYPE_ORDER.indexOf(
                a[0] as (typeof MEAL_TYPE_ORDER)[number],
              ) -
              MEAL_TYPE_ORDER.indexOf(b[0] as (typeof MEAL_TYPE_ORDER)[number])
            );
          })
          .map(([type]) => type);

        return [mealId, sortedTypes];
      }),
    );
  }, [planItems]);

  const suggestedMealType = useMemo(
    () =>
      selectedMealId ? mealTypeChipsByMealId[selectedMealId]?.[0] : undefined,
    [mealTypeChipsByMealId, selectedMealId],
  );

  useEffect(() => {
    if (selectedMealId && suggestedMealType) {
      setSelectedMealType(suggestedMealType);
    }
  }, [selectedMealId, suggestedMealType]);

  const isCreatingNew = Boolean(newMealName.trim());
  const isSelectingExisting = Boolean(selectedMealId);
  const isSaving = isCreatingMeal || isCreatingPlanItem;

  const handleSubmit = async () => {
    if (!planId) {
      return;
    }

    try {
      if (isCreatingNew) {
        const mealResponse = await createMeal({
          body: { name: newMealName.trim(), position: meals.length },
          planId,
        }).unwrap();

        await createPlanItem({
          body: {
            day,
            meal_id: mealResponse.data.id,
            meal_type: selectedMealType,
          },
          planId,
        }).unwrap();

        toast.success(`Meal assignment added to ${toSentenceLabel(day)}.`);
      } else if (isSelectingExisting) {
        await createPlanItem({
          body: { day, meal_id: selectedMealId, meal_type: selectedMealType },
          planId,
        }).unwrap();

        toast.success(`Meal assignment added to ${toSentenceLabel(day)}.`);
      }

      navigate(returnTo);
    } catch {
      toast.danger("Unable to save assignment. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button
          className="min-h-11 w-fit gap-2 px-2"
          onPress={() => navigate(returnTo)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to builder
        </Button>
        <h1 className="text-2xl font-semibold md:text-3xl">Add assignment</h1>
        <p className="text-sm text-muted">
          Add a meal assignment for {toSentenceLabel(day)}.
        </p>
      </div>

      <Card className="border border-separator bg-surface p-4 sm:p-5">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">
              Create new meal
            </Label>
            <TextField>
              <Input
                className="min-h-11"
                onChange={(event) => {
                  setNewMealName(event.target.value);
                  if (event.target.value.trim()) {
                    setSelectedMealId("");
                  }
                }}
                placeholder="Type a name for your new meal..."
                value={newMealName}
                variant="secondary"
              />
            </TextField>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-separator" />
            <span className="text-xs text-muted">or choose existing</span>
            <div className="h-px flex-1 bg-separator" />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">
              Choose existing meal
            </Label>
            <TextField>
              <Input
                className="min-h-11"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search your meals..."
                value={searchQuery}
                variant="secondary"
              />
            </TextField>

            <div className="max-h-56 overflow-y-auto rounded-lg bg-surface-secondary p-2">
              {filteredMeals.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  No meals found
                </p>
              ) : (
                <RadioGroup
                  aria-label="Select meal"
                  className="flex flex-col gap-1"
                  onChange={(value: string) => {
                    setSelectedMealId(value);
                    if (value) {
                      setNewMealName("");
                    }
                  }}
                  value={selectedMealId}
                >
                  {filteredMeals.map((meal) => (
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${selectedMealId === meal.id ? "bg-accent/10" : "hover:bg-surface"}`}
                      key={meal.id}
                    >
                      <Radio
                        aria-label={meal.name}
                        className="shrink-0"
                        value={meal.id}
                      />
                      <span
                        className={`text-sm ${selectedMealId === meal.id ? "font-medium text-foreground" : "text-muted"}`}
                      >
                        {meal.name}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">
              Meal type
            </Label>
            <RadioGroup
              aria-label="Meal type"
              className="grid grid-cols-2 gap-2"
              onChange={(value: string) => setSelectedMealType(value)}
              orientation="horizontal"
              value={selectedMealType}
            >
              {MEAL_TYPE_ORDER.map((mealType) => (
                <label
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all ${selectedMealType === mealType ? "border-accent bg-accent/5" : "border-separator hover:border-muted"}`}
                  key={mealType}
                >
                  <Radio
                    aria-label={toSentenceLabel(mealType)}
                    className="shrink-0"
                    value={mealType}
                  />
                  <span className="text-sm text-foreground">
                    {toSentenceLabel(mealType)}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              className="min-h-11"
              onPress={() => navigate(returnTo)}
              size="md"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              className="min-h-11"
              isDisabled={isSaving || (!isCreatingNew && !isSelectingExisting)}
              size="md"
              type="submit"
              variant="primary"
            >
              {isSaving ? "Saving..." : "Save assignment"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
