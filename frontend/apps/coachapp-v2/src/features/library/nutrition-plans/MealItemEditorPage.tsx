import {Button, Card, Input, Label, Skeleton, TextField} from '@heroui/react';
import {useLocation, useNavigate, useParams} from '@tanstack/react-router';
import {ArrowLeft, Save, Trash2} from 'lucide-react';

import useMealItemEditor from '@/features/library/nutrition-plans/useMealItemEditor';
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog';
import NotFoundCard from '@/shared/ui/feedback/NotFoundCard';

export default function MealItemEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id: planId = '', mealId = '', itemId, sourceType, sourceId: newSourceId} = useParams({strict: false});
  const mealDetailUrl = `/library/nutrition-plans/${planId}/builder/meals/${mealId}/edit`;

  const {
    amount,
    handleDelete,
    handleSave,
    isDeleteOpen,
    isDeleting,
    isEditMode,
    isLoading,
    isMutating,
    meal,
    resolvedName,
    setAmount,
    setIsDeleteOpen,
    setUnit,
    setWeightG,
    unit,
    weightG,
  } = useMealItemEditor({
    itemId,
    locationState: location.state as Record<string, unknown>,
    mealId,
    newSourceId,
    onSaved: () => navigate({to: mealDetailUrl}),
    planId,
    sourceType,
  });

  const backTo = isEditMode ? mealDetailUrl : `/library/nutrition-plans/${planId}/builder/meals/${mealId}/items/new`;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!meal) {
    return (
      <NotFoundCard
        backLabel="Back to plan"
        description="This meal may have been removed."
        onBack={() => navigate({to: `/library/nutrition-plans/${planId}/builder`})}
        title="Meal not found"
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate({to: backTo})}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEditMode ? 'Meal' : 'Choose item'}
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {resolvedName || (isEditMode ? 'Edit item' : 'Add item')}
        </h1>
        <p className="mt-1 text-sm text-muted">{meal.name}</p>
      </div>

      <div className="border-t border-separator" />

      <Card className="rounded-xl border border-separator bg-surface p-4">
        <div className="flex flex-col gap-4">
          <TextField>
            <Label className="text-sm font-medium text-foreground">Amount</Label>
            <Input
              className="min-h-11"
              inputMode="decimal"
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100…"
              value={amount}
              variant="secondary"
            />
          </TextField>
          <TextField>
            <Label className="text-sm font-medium text-foreground">Unit</Label>
            <Input
              className="min-h-11"
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. g, ml, pieces…"
              value={unit}
              variant="secondary"
            />
          </TextField>
          <TextField>
            <Label className="text-sm font-medium text-foreground">Weight (g)</Label>
            <Input
              className="min-h-11"
              inputMode="decimal"
              onChange={(e) => setWeightG(e.target.value)}
              placeholder="e.g. 100…"
              value={weightG}
              variant="secondary"
            />
          </TextField>
        </div>
      </Card>

      <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-separator bg-background pb-4 pt-4 sm:flex-row sm:items-center">
        {isEditMode ? (
          <Button
            className="min-h-11 w-full text-muted sm:mr-auto sm:w-auto"
            isDisabled={isMutating}
            onPress={() => setIsDeleteOpen(true)}
            size="md"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : null}
        <Button
          className="min-h-11 w-full sm:w-auto"
          isDisabled={isMutating}
          onPress={() => navigate({to: backTo})}
          size="md"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          className="min-h-11 w-full sm:w-auto"
          isDisabled={isMutating}
          onPress={handleSave}
          size="md"
          variant="primary"
        >
          <Save className="h-4 w-4" />
          {isEditMode ? 'Save changes' : 'Save item'}
        </Button>
      </div>

      {isEditMode ? (
        <ConfirmDialog
          confirmLabel="Delete"
          description="Delete this item? This cannot be undone."
          isLoading={isDeleting}
          isOpen={isDeleteOpen}
          onConfirm={handleDelete}
          onOpenChange={setIsDeleteOpen}
          title="Delete item"
        />
      ) : null}
    </div>
  );
}
