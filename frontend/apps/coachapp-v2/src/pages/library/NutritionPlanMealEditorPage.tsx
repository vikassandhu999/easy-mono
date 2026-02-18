import {
  Autocomplete,
  Button,
  Card,
  Input,
  Label,
  ListBox,
  SearchField,
  TextField,
  toast,
  useFilter,
} from "@heroui/react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import { useListFoodsQuery } from "@/api/foods";
import {
  useCreateMealItemMutation,
  useDeleteMealItemMutation,
  useGetMealQuery,
  useListMealItemsQuery,
  useUpdateMealItemMutation,
  useUpdateMealMutation,
} from "@/api/meals";
import { useListPlanItemsQuery } from "@/api/nutritionPlans";
import { useListRecipesQuery } from "@/api/recipes";
import { getReturnTo } from "@/pages/library/libraryFormShared";

type MealItemDraft = {
  amount: string;
  unit: string;
  weight_g: string;
};

const toNumber = (value: string) => {
  if (!value.trim()) {
    return undefined;
  }
  return Number(value);
};

export default function NutritionPlanMealEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, mealId } = useParams();
  const planId = id ?? "";
  const editingMealId = mealId ?? "";

  const returnTo = getReturnTo(
    location,
    `/library/nutrition-plans/${planId}/builder`,
  );

  const { contains } = useFilter({ sensitivity: "base" });

  const [mealNameDraft, setMealNameDraft] = useState("");
  const [newItemType, setNewItemType] = useState<"food" | "recipe">("food");
  const [newItemSourceId, setNewItemSourceId] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemWeight, setNewItemWeight] = useState("");
  const [itemDrafts, setItemDrafts] = useState<Record<string, MealItemDraft>>(
    {},
  );

  const { data: selectedMealData, isLoading: isMealLoading } = useGetMealQuery(
    editingMealId,
    {
      skip: !editingMealId,
    },
  );
  const { data: mealItemsData } = useListMealItemsQuery(editingMealId, {
    skip: !editingMealId,
  });
  const { data: foodsData } = useListFoodsQuery({ limit: 100, offset: 0 });
  const { data: recipesData } = useListRecipesQuery({ limit: 100, offset: 0 });
  const { data: planItemsData } = useListPlanItemsQuery(planId, {
    skip: !planId,
  });

  const [updateMeal, { isLoading: isUpdatingMeal }] = useUpdateMealMutation();
  const [createMealItem, { isLoading: isCreatingMealItem }] =
    useCreateMealItemMutation();
  const [updateMealItem, { isLoading: isUpdatingMealItem }] =
    useUpdateMealItemMutation();
  const [deleteMealItem, { isLoading: isDeletingMealItem }] =
    useDeleteMealItemMutation();

  const meal = selectedMealData?.data;
  const mealItems = mealItemsData?.data ?? [];
  const foods = foodsData?.data ?? [];
  const recipes = recipesData?.data ?? [];
  const mealUsageCount = (planItemsData?.data ?? []).filter(
    (item) => item.meal_id === editingMealId,
  ).length;

  useEffect(() => {
    setMealNameDraft(meal?.name ?? "");
  }, [meal?.name]);

  useEffect(() => {
    const drafts: Record<string, MealItemDraft> = {};
    mealItems.forEach((item) => {
      drafts[item.id] = {
        amount: item.amount === null ? "" : String(item.amount),
        unit: item.unit ?? "",
        weight_g: item.weight_g === null ? "" : String(item.weight_g),
      };
    });
    setItemDrafts(drafts);
  }, [mealItems]);

  const availableItems = useMemo(() => {
    if (newItemType === "food") {
      return foods.map((food) => ({ id: food.id, name: food.name }));
    }

    return recipes.map((recipe) => ({ id: recipe.id, name: recipe.name }));
  }, [foods, newItemType, recipes]);

  const isLoading =
    isUpdatingMeal ||
    isCreatingMealItem ||
    isUpdatingMealItem ||
    isDeletingMealItem;

  if (isMealLoading) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="text-sm text-muted">Loading meal...</p>
      </Card>
    );
  }

  if (!meal) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="font-semibold text-foreground">Meal not found.</p>
        <Button
          className="mt-4 min-h-11"
          onPress={() => navigate(returnTo)}
          variant="outline"
        >
          Back to builder
        </Button>
      </Card>
    );
  }

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
        <h1 className="text-2xl font-semibold md:text-3xl">Edit meal</h1>
        <p className="text-sm text-muted">
          Global meal changes apply to all linked assignments.
        </p>
      </div>

      <Card className="border border-separator bg-background p-4">
        <p className="text-sm font-medium text-foreground">
          Used in {mealUsageCount} day assignment
          {mealUsageCount === 1 ? "" : "s"}.
        </p>
        {mealUsageCount > 1 ? (
          <p className="mt-1 text-sm text-muted">
            Changes here update every linked assignment. Use Duplicate for this
            day in the planner when you need local changes.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">
            Changes here apply to this meal across the planner.
          </p>
        )}
      </Card>

      <Card className="border border-separator bg-surface p-4 sm:p-5">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!mealNameDraft.trim()) {
              return;
            }

            try {
              await updateMeal({
                body: { name: mealNameDraft.trim(), position: meal.position },
                id: editingMealId,
                planId,
              }).unwrap();
              toast.success("Meal updated.");
            } catch {
              toast.danger("Unable to update meal. Please try again.");
            }
          }}
        >
          <TextField className="flex-1">
            <Label className="text-sm font-medium text-foreground">
              Meal name
            </Label>
            <Input
              className="min-h-11"
              onChange={(event) => setMealNameDraft(event.target.value)}
              placeholder="Meal name"
              value={mealNameDraft}
              variant="secondary"
            />
          </TextField>
          <Button
            className="min-h-11"
            isDisabled={!mealNameDraft.trim() || isLoading}
            size="md"
            type="submit"
            variant="primary"
          >
            Save meal
          </Button>
        </form>
      </Card>

      <Card className="border border-separator bg-surface p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Items</p>
        {mealItems.length === 0 ? (
          <p className="text-sm text-muted">
            No items yet. Add food or recipe below.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {mealItems.map((item) => {
              const draft = itemDrafts[item.id] ?? {
                amount: "",
                unit: "",
                weight_g: "",
              };
              return (
                <div
                  className="rounded-lg border border-separator bg-background p-3"
                  key={item.id}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {item.food_id ? "Food" : "Recipe"} item
                    </p>
                    <Button
                      className="min-h-11"
                      onPress={async () => {
                        const confirmed = window.confirm(
                          "Delete this meal item? This cannot be undone.",
                        );
                        if (!confirmed) {
                          return;
                        }

                        try {
                          await deleteMealItem({
                            id: item.id,
                            mealId: editingMealId,
                            planId,
                          }).unwrap();
                          toast.success("Meal item deleted.");
                        } catch {
                          toast.danger(
                            "Unable to delete meal item. Please try again.",
                          );
                        }
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <TextField>
                      <Label className="text-xs font-medium text-foreground">
                        Amount
                      </Label>
                      <Input
                        min="0"
                        onChange={(event) =>
                          setItemDrafts((prev) => ({
                            ...prev,
                            [item.id]: { ...draft, amount: event.target.value },
                          }))
                        }
                        type="number"
                        value={draft.amount}
                        variant="secondary"
                      />
                    </TextField>
                    <TextField>
                      <Label className="text-xs font-medium text-foreground">
                        Unit
                      </Label>
                      <Input
                        onChange={(event) =>
                          setItemDrafts((prev) => ({
                            ...prev,
                            [item.id]: { ...draft, unit: event.target.value },
                          }))
                        }
                        value={draft.unit}
                        variant="secondary"
                      />
                    </TextField>
                    <TextField>
                      <Label className="text-xs font-medium text-foreground">
                        Weight (g)
                      </Label>
                      <Input
                        min="0"
                        onChange={(event) =>
                          setItemDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...draft,
                              weight_g: event.target.value,
                            },
                          }))
                        }
                        type="number"
                        value={draft.weight_g}
                        variant="secondary"
                      />
                    </TextField>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Button
                      className="min-h-11"
                      isDisabled={isLoading}
                      onPress={async () => {
                        try {
                          await updateMealItem({
                            body: {
                              amount: toNumber(draft.amount),
                              unit: draft.unit.trim() || undefined,
                              weight_g: toNumber(draft.weight_g),
                            },
                            id: item.id,
                            mealId: editingMealId,
                            planId,
                          }).unwrap();
                          toast.success("Meal item updated.");
                        } catch {
                          toast.danger(
                            "Unable to update meal item. Please try again.",
                          );
                        }
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Save item
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="border border-separator bg-surface p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Add item</p>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!newItemSourceId || isLoading) {
              return;
            }

            try {
              await createMealItem({
                body: {
                  amount: toNumber(newItemAmount),
                  food_id: newItemType === "food" ? newItemSourceId : undefined,
                  position: mealItems.length,
                  recipe_id:
                    newItemType === "recipe" ? newItemSourceId : undefined,
                  unit: newItemUnit.trim() || undefined,
                  weight_g: toNumber(newItemWeight),
                },
                mealId: editingMealId,
                planId,
              }).unwrap();
              toast.success("Meal item added.");
              setNewItemSourceId("");
              setNewItemAmount("");
              setNewItemUnit("");
              setNewItemWeight("");
            } catch {
              toast.danger("Unable to add meal item. Please try again.");
            }
          }}
        >
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11"
              onPress={() => {
                setNewItemType("food");
                setNewItemSourceId("");
              }}
              size="sm"
              type="button"
              variant={newItemType === "food" ? "secondary" : "ghost"}
            >
              Food
            </Button>
            <Button
              className="min-h-11"
              onPress={() => {
                setNewItemType("recipe");
                setNewItemSourceId("");
              }}
              size="sm"
              type="button"
              variant={newItemType === "recipe" ? "secondary" : "ghost"}
            >
              Recipe
            </Button>
          </div>

          <Autocomplete
            allowsEmptyCollection
            fullWidth
            onChange={(value) => setNewItemSourceId(value?.toString() ?? "")}
            value={newItemSourceId || null}
            variant="secondary"
          >
            <Label className="text-xs font-medium text-foreground">
              {newItemType === "food" ? "Food" : "Recipe"}
            </Label>
            <Autocomplete.Trigger className="min-h-11">
              <Autocomplete.Value />
              <Autocomplete.ClearButton />
              <Autocomplete.Indicator />
            </Autocomplete.Trigger>
            <Autocomplete.Popover>
              <Autocomplete.Filter filter={contains}>
                <SearchField>
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input
                      placeholder={
                        newItemType === "food"
                          ? "Search food..."
                          : "Search recipe..."
                      }
                    />
                  </SearchField.Group>
                </SearchField>
                <ListBox>
                  {availableItems.map((entry) => (
                    <ListBox.Item
                      id={entry.id}
                      key={entry.id}
                      textValue={entry.name}
                    >
                      <span className="text-sm">{entry.name}</span>
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Autocomplete.Filter>
            </Autocomplete.Popover>
          </Autocomplete>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TextField>
              <Label className="text-xs font-medium text-foreground">
                Amount
              </Label>
              <Input
                min="0"
                onChange={(event) => setNewItemAmount(event.target.value)}
                type="number"
                value={newItemAmount}
                variant="secondary"
              />
            </TextField>
            <TextField>
              <Label className="text-xs font-medium text-foreground">
                Unit
              </Label>
              <Input
                onChange={(event) => setNewItemUnit(event.target.value)}
                value={newItemUnit}
                variant="secondary"
              />
            </TextField>
            <TextField>
              <Label className="text-xs font-medium text-foreground">
                Weight (g)
              </Label>
              <Input
                min="0"
                onChange={(event) => setNewItemWeight(event.target.value)}
                type="number"
                value={newItemWeight}
                variant="secondary"
              />
            </TextField>
          </div>

          <div className="flex justify-end">
            <Button
              className="min-h-11"
              isDisabled={!newItemSourceId || isLoading}
              size="md"
              type="submit"
              variant="primary"
            >
              Add item
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
