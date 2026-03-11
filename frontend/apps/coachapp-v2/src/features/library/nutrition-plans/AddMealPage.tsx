import {Button, Card, Input, Skeleton, TextField} from '@heroui/react';
import {useNavigate, useParams} from '@tanstack/react-router';
import {ArrowLeft, ChevronRight, UtensilsCrossed} from 'lucide-react';
import {Fragment} from 'react';

import {toSentenceLabel} from '@/features/library/nutrition-plans/nutritionPlanBuilderShared';
import useAddMeal from '@/features/library/nutrition-plans/useAddMeal';

const MEAL_TYPE_ORDER = ['breakfast', 'pre_workout', 'lunch', 'snack', 'post_workout', 'dinner'] as const;

export default function AddMealPage() {
  const navigate = useNavigate();
  const {day = '', id: planId = ''} = useParams({strict: false});
  const backTo = `/library/nutrition-plans/${planId}/builder/days/${day}`;

  const {
    filteredMeals,
    handleCreateMeal,
    handleLinkMeal,
    isMealsLoading,
    isSaving,
    mealName,
    search,
    selectedMealType,
    setMealName,
    setSearch,
    setSelectedMealType,
    setTab,
    tab,
  } = useAddMeal({day, onSaved: () => navigate({to: backTo}), planId});

  if (isMealsLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate({to: backTo})}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Day
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Add meal</h1>
        <p className="mt-1 text-sm text-muted">{toSentenceLabel(day)}</p>
      </div>

      <div className="border-t border-separator" />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">Meal type</p>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPE_ORDER.map((mealType) => (
            <Button
              className="min-h-9"
              key={mealType}
              onPress={() => setSelectedMealType(mealType)}
              size="sm"
              variant={selectedMealType === mealType ? 'secondary' : 'ghost'}
            >
              {toSentenceLabel(mealType)}
            </Button>
          ))}
        </div>
      </div>

      <div className="border-t border-separator" />

      <div className="flex gap-2">
        <Button
          className="min-h-9"
          onPress={() => setTab('new')}
          size="sm"
          variant={tab === 'new' ? 'secondary' : 'ghost'}
        >
          New meal
        </Button>
        <Button
          className="min-h-9"
          onPress={() => setTab('existing')}
          size="sm"
          variant={tab === 'existing' ? 'secondary' : 'ghost'}
        >
          Existing meal
        </Button>
      </div>

      {tab === 'new' ? (
        <div className="flex flex-col gap-4">
          <TextField>
            <Input
              className="min-h-11"
              onChange={(e) => setMealName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateMeal();
              }}
              placeholder="Meal name…"
              value={mealName}
              variant="secondary"
            />
          </TextField>
          <Button
            className="min-h-11 w-full"
            isDisabled={!mealName.trim() || isSaving}
            onPress={handleCreateMeal}
            size="md"
            variant="primary"
          >
            {isSaving ? 'Adding…' : 'Create and add'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <TextField>
            <Input
              className="min-h-11"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meals…"
              value={search}
              variant="secondary"
            />
          </TextField>

          {filteredMeals.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <UtensilsCrossed className="h-8 w-8 text-muted" />
              <p className="text-sm text-muted">No meals found</p>
            </div>
          ) : (
            <Card className="overflow-hidden rounded-xl border border-separator bg-surface p-0">
              {filteredMeals.map((meal, i) => (
                <Fragment key={meal.id}>
                  {i > 0 && <div className="border-t border-separator" />}
                  <button
                    className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-3 text-left outline-none hover:bg-surface-secondary"
                    disabled={isSaving}
                    onClick={() => handleLinkMeal(meal.id)}
                    type="button"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
                      <UtensilsCrossed className="h-4 w-4 text-muted" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{meal.name}</p>
                      <p className="text-xs text-muted">
                        {meal.meal_items.length} item
                        {meal.meal_items.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                  </button>
                </Fragment>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
