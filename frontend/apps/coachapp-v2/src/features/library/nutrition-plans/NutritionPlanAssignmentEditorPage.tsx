import {Button, Card, Label, Radio, RadioGroup, Skeleton, toast} from '@heroui/react';
import {useLocation, useNavigate, useParams} from '@tanstack/react-router';
import {ArrowLeft} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';

import {useListPlanItemsQuery, useUpdatePlanItemMutation} from '@/entities/nutritionPlans/api/nutritionPlans';
import {getReturnTo} from '@/features/library/libraryFormShared';
import {DAYS, MEAL_TYPES, toSentenceLabel} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';
import NotFoundCard from '@/shared/ui/feedback/NotFoundCard';

export default function NutritionPlanAssignmentEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id, planItemId} = useParams({strict: false});
  const planId = id ?? '';
  const assignmentId = planItemId ?? '';

  const returnTo = getReturnTo(location.state, `/library/nutrition-plans/${planId}/builder`);

  const {data: planItemsData, isLoading} = useListPlanItemsQuery(planId, {
    skip: !planId,
  });
  const [updatePlanItem, {isLoading: isSaving}] = useUpdatePlanItemMutation();

  const assignment = useMemo(
    () => (planItemsData?.data ?? []).find((item) => item.id === assignmentId),
    [assignmentId, planItemsData?.data],
  );

  const [selectedDay, setSelectedDay] = useState<string>(DAYS[0]);
  const [selectedMealType, setSelectedMealType] = useState<string>(MEAL_TYPES[0]);

  useEffect(() => {
    if (!assignment) return;
    setSelectedDay(assignment.day);
    setSelectedMealType(assignment.meal_type);
  }, [assignment]);

  const didChange = Boolean(
    assignment && (assignment.day !== selectedDay || assignment.meal_type !== selectedMealType),
  );

  const handleSave = async () => {
    if (!planId || !assignment) return;
    try {
      await updatePlanItem({
        body: {day: selectedDay, meal_type: selectedMealType},
        id: assignment.id,
        planId,
      }).unwrap();
      toast.success('Day assignment updated.');
      navigate({to: returnTo});
    } catch {
      toast.danger('Unable to update assignment. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <NotFoundCard
        backLabel="Back to builder"
        description="This assignment may have been removed."
        onBack={() => navigate({to: returnTo})}
        title="Assignment not found"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center">
        <Button
          className="min-h-11 w-fit gap-1.5 px-2 text-muted hover:text-foreground"
          onPress={() => navigate({to: returnTo})}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Builder
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">Edit assignment</h1>
        <p className="mt-1 text-sm text-muted">Update day or meal type without changing global meal details.</p>
      </div>

      <div className="border-t border-separator" />

      {/* Form */}
      <Card className="border border-separator bg-surface p-4">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-muted">Day</Label>
            <RadioGroup
              aria-label="Day"
              className="grid grid-cols-2 gap-2"
              onChange={(value: string) => setSelectedDay(value)}
              orientation="horizontal"
              value={selectedDay}
            >
              {DAYS.map((dayOption) => (
                <label
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all ${selectedDay === dayOption ? 'border-accent bg-accent/5' : 'border-separator hover:border-muted'}`}
                  key={dayOption}
                >
                  <Radio
                    aria-label={toSentenceLabel(dayOption)}
                    className="shrink-0"
                    value={dayOption}
                  />
                  <span className="text-sm text-foreground">{toSentenceLabel(dayOption)}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium text-muted">Meal type</Label>
            <RadioGroup
              aria-label="Meal type"
              className="grid grid-cols-2 gap-2"
              onChange={(value: string) => setSelectedMealType(value)}
              orientation="horizontal"
              value={selectedMealType}
            >
              {MEAL_TYPES.map((mealType) => (
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
          onPress={() => navigate({to: returnTo})}
          size="md"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          className="min-h-11 w-full sm:order-first sm:w-auto"
          isDisabled={!didChange || isSaving}
          onPress={handleSave}
          size="md"
          variant="primary"
        >
          {isSaving ? 'Saving…' : 'Save assignment'}
        </Button>
      </div>
    </div>
  );
}
