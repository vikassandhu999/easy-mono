import {Button, Card, Label, Radio, RadioGroup, toast} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router';

import {useListPlanItemsQuery, useUpdatePlanItemMutation} from '@/api/nutritionPlans';
import {DAYS, MEAL_TYPES, toSentenceLabel} from '@/pages/library/nutritionPlanBuilderShared';

export default function NutritionPlanAssignmentEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id, planItemId} = useParams();
  const planId = id ?? '';
  const assignmentId = planItemId ?? '';

  const returnTo =
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    typeof location.state.from === 'string'
      ? location.state.from
      : `/library/nutrition-plans/${planId}/builder`;

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
    if (!assignment) {
      return;
    }

    setSelectedDay(assignment.day);
    setSelectedMealType(assignment.meal_type);
  }, [assignment]);

  const didChange = Boolean(
    assignment && (assignment.day !== selectedDay || assignment.meal_type !== selectedMealType),
  );

  const handleSave = async () => {
    if (!planId || !assignment) {
      return;
    }

    try {
      await updatePlanItem({
        body: {day: selectedDay, meal_type: selectedMealType},
        id: assignment.id,
        planId,
      }).unwrap();
      toast.success('Day assignment updated.');
      navigate(returnTo);
    } catch {
      toast.danger('Unable to update assignment. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="text-sm text-muted">Loading assignment...</p>
      </Card>
    );
  }

  if (!assignment) {
    return (
      <Card className="border border-separator bg-surface p-6">
        <p className="font-semibold text-foreground">Assignment not found.</p>
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
        <h1 className="text-2xl font-semibold md:text-3xl">Edit assignment</h1>
        <p className="text-sm text-muted">Update this day assignment without changing global meal details.</p>
      </div>

      <Card className="border border-separator bg-surface p-4 sm:p-5">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Day</Label>
            <RadioGroup
              aria-label="Day"
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              onChange={(value: string) => setSelectedDay(value)}
              orientation="horizontal"
              value={selectedDay}
            >
              {DAYS.map((day) => (
                <label
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all ${selectedDay === day ? 'border-accent bg-accent/5' : 'border-separator hover:border-muted'}`}
                  key={day}
                >
                  <Radio
                    aria-label={toSentenceLabel(day)}
                    className="shrink-0"
                    value={day}
                  />
                  <span className="text-sm text-foreground">{toSentenceLabel(day)}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">Meal type</Label>
            <RadioGroup
              aria-label="Meal type"
              className="grid grid-cols-1 gap-2"
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
              isDisabled={!didChange || isSaving}
              size="md"
              type="submit"
              variant="primary"
            >
              {isSaving ? 'Saving...' : 'Save assignment'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
