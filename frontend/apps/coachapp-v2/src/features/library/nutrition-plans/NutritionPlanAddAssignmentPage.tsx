import {Button, Card, Input, Label, Radio, RadioGroup, TextField, toast} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useLocation, useNavigate, useParams, useSearchParams} from 'react-router';

import {useCreateMealMutation, useListMealsQuery} from '@/entities/meals/api/meals';
import {useCreatePlanItemMutation, useListPlanItemsQuery} from '@/entities/nutritionPlans/api/nutritionPlans';
import {getReturnTo} from '@/features/library/libraryFormShared';
import {MEAL_TYPES, toSentenceLabel} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';

const MEAL_TYPE_ORDER = ['breakfast', 'pre_workout', 'lunch', 'snack', 'post_workout', 'dinner'] as const;

export default function NutritionPlanAddAssignmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams();
  const [searchParams] = useSearchParams();
  const planId = id ?? '';
  const returnTo = getReturnTo(location, `/library/nutrition-plans/${planId}/builder`);
  const day = searchParams.get('day') ?? 'monday';

  const [newMealName, setNewMealName] = useState('');
  const [selectedMealId, setSelectedMealId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<string>(MEAL_TYPES[0]);

  const {data: mealsData} = useListMealsQuery({planId}, {skip: !planId});
  const {data: planItemsData} = useListPlanItemsQuery(planId, {
    skip: !planId,
  });
  const [createMeal, {isLoading: isCreatingMeal}] = useCreateMealMutation();
  const [createPlanItem, {isLoading: isCreatingPlanItem}] = useCreatePlanItemMutation();

  const meals = useMemo(() => mealsData?.data ?? [], [mealsData?.data]);
  const planItems = planItemsData?.data ?? [];
  const isSaving = isCreatingMeal || isCreatingPlanItem;

  const filteredMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q ? meals.filter((m) => m.name.toLowerCase().includes(q)) : meals;
  }, [meals, searchQuery]);

  const getSuggestedMealType = (mealId: string): string | undefined => {
    const counts: Record<string, number> = {};
    for (const item of planItems) {
      if (item.meal_id === mealId) counts[item.meal_type] = (counts[item.meal_type] ?? 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0];
  };

  const handleSelectMeal = (mealId: string) => {
    setSelectedMealId(mealId);
    if (mealId) {
      setNewMealName('');
      const suggested = getSuggestedMealType(mealId);
      if (suggested) setSelectedMealType(suggested);
    }
  };

  const handleSubmit = async () => {
    if (!planId) return;
    try {
      if (newMealName.trim()) {
        const res = await createMeal({
          body: {name: newMealName.trim(), position: meals.length},
          planId,
        }).unwrap();
        await createPlanItem({
          body: {day, meal_id: res.data.id, meal_type: selectedMealType},
          planId,
        }).unwrap();
      } else if (selectedMealId) {
        await createPlanItem({
          body: {day, meal_id: selectedMealId, meal_type: selectedMealType},
          planId,
        }).unwrap();
      }
      toast.success(`Meal assignment added to ${toSentenceLabel(day)}.`);
      navigate(returnTo);
    } catch {
      toast.danger('Unable to save assignment. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center">
        <Button
          className="min-h-11 w-fit gap-1.5 px-2 text-muted hover:text-foreground"
          onPress={() => navigate(returnTo)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Builder
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">Add meal</h1>
        <p className="mt-1 text-sm text-muted">Add a meal to {toSentenceLabel(day)}.</p>
      </div>

      <div className="border-t border-separator" />

      {/* Form */}
      <Card className="border border-separator bg-surface p-4">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-muted">Create new meal</Label>
            <TextField>
              <Input
                className="min-h-11"
                onChange={(e) => {
                  setNewMealName(e.target.value);
                  if (e.target.value.trim()) setSelectedMealId('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMealName.trim()) {
                    e.preventDefault();
                    handleSubmit();
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

          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-muted">Choose existing meal</Label>
            <TextField>
              <Input
                className="min-h-11"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your meals..."
                value={searchQuery}
                variant="secondary"
              />
            </TextField>
            <div className="max-h-56 overflow-y-auto rounded-lg bg-surface-secondary p-2">
              {filteredMeals.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">No meals found</p>
              ) : (
                <RadioGroup
                  aria-label="Select meal"
                  className="flex flex-col gap-1"
                  onChange={(v: string) => handleSelectMeal(v)}
                  value={selectedMealId}
                >
                  {filteredMeals.map((meal) => (
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${selectedMealId === meal.id ? 'bg-accent/10' : 'hover:bg-surface'}`}
                      key={meal.id}
                    >
                      <Radio
                        aria-label={meal.name}
                        className="shrink-0"
                        value={meal.id}
                      />
                      <span
                        className={`text-sm ${selectedMealId === meal.id ? 'font-medium text-foreground' : 'text-muted'}`}
                      >
                        {meal.name}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-muted">Meal type</Label>
            <RadioGroup
              aria-label="Meal type"
              className="grid grid-cols-2 gap-2"
              onChange={(v: string) => setSelectedMealType(v)}
              orientation="horizontal"
              value={selectedMealType}
            >
              {MEAL_TYPE_ORDER.map((mealType) => (
                <label
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all ${selectedMealType === mealType ? 'border-accent bg-accent/5' : 'border-separator hover:border-muted'}`}
                  key={mealType}
                >
                  <Radio
                    aria-label={toSentenceLabel(mealType)}
                    className="shrink-0"
                    value={mealType}
                  />
                  <span className="text-sm text-foreground">{toSentenceLabel(mealType)}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
        </form>
      </Card>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-separator bg-background pb-4 pt-4 sm:flex-row sm:justify-end">
        <Button
          className="min-h-11 w-full sm:w-auto"
          onPress={() => navigate(returnTo)}
          size="md"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          className="min-h-11 w-full sm:order-first sm:w-auto"
          isDisabled={isSaving || (!newMealName.trim() && !selectedMealId)}
          onPress={handleSubmit}
          size="md"
          variant="primary"
        >
          {isSaving ? 'Saving...' : 'Save assignment'}
        </Button>
      </div>
    </div>
  );
}
