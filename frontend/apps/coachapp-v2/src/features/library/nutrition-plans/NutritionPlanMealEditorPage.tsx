import {Button, Card, Dropdown, Label, Skeleton} from '@heroui/react';
import {useLocation, useNavigate, useParams} from '@tanstack/react-router';
import {ArrowLeft, EllipsisVertical, Pencil, Plus, Trash2, UtensilsCrossed} from 'lucide-react';
import {Fragment} from 'react';

import {getReturnTo} from '@/features/library/libraryFormShared';
import {MealItemCard} from '@/features/library/nutrition-plans/MealItemCard';
import {RenameMealModal} from '@/features/library/nutrition-plans/RenameMealModal';
import useMealEditor from '@/features/library/nutrition-plans/useMealEditor';
import ConfirmDialog from '@/shared/ui/feedback/ConfirmDialog';
import NotFoundCard from '@/shared/ui/feedback/NotFoundCard';

export default function NutritionPlanMealEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id, mealId} = useParams({strict: false});
  const planId = id ?? '';
  const editingMealId = mealId ?? '';
  const returnTo = getReturnTo(location.state, `/library/nutrition-plans/${planId}/builder`);

  const {
    getItemName,
    handleDeleteMeal,
    handleMoveItem,
    handleRename,
    isDeleteMealOpen,
    isDeletingMeal,
    isMealLoading,
    isRenameOpen,
    isRenaming,
    meal,
    setIsDeleteMealOpen,
    setIsRenameOpen,
    sortedItems,
  } = useMealEditor(planId, editingMealId, () => navigate({to: returnTo}));

  const handleAction = (key: React.Key) => {
    switch (key) {
      case 'rename':
        setIsRenameOpen(true);
        break;
      case 'delete':
        setIsDeleteMealOpen(true);
        break;
    }
  };

  if (isMealLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!meal) {
    return (
      <NotFoundCard
        backLabel="Back"
        description="This meal may have been removed."
        onBack={() => navigate({to: returnTo})}
        title="Meal not found"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          className="min-h-11 w-fit gap-1.5 px-2 text-muted hover:text-foreground"
          onPress={() => navigate({to: returnTo})}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Day
        </Button>
        <Dropdown>
          <Dropdown.Trigger>
            <Button
              aria-label="More actions"
              className="min-h-11 min-w-11"
              size="md"
              variant="ghost"
            >
              <EllipsisVertical className="h-5 w-5" />
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom left">
            <Dropdown.Menu
              aria-label="Meal actions"
              onAction={handleAction}
            >
              <Dropdown.Item
                id="rename"
                textValue="Rename"
              >
                <Pencil className="h-4 w-4" />
                <Label>Rename</Label>
              </Dropdown.Item>
              <Dropdown.Item
                className="text-danger"
                id="delete"
                textValue="Delete meal"
              >
                <Trash2 className="h-4 w-4" />
                <Label>Delete meal</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{meal.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {sortedItems.length} item{sortedItems.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="border-t border-separator" />

      {sortedItems.length === 0 ? (
        <Card className="border border-dashed border-separator bg-surface p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
              <UtensilsCrossed className="h-8 w-8 text-muted" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">No items yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted">Add food or recipe items to build this meal.</p>
            </div>
            <Button
              className="mt-2 min-h-11"
              onPress={() =>
                navigate({to: `/library/nutrition-plans/${planId}/builder/meals/${editingMealId}/items/new`})
              }
              size="md"
              variant="primary"
            >
              <Plus className="h-4 w-4" />
              Add first item
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-xl border border-separator bg-surface p-0">
          {sortedItems.map((item, i) => (
            <Fragment key={item.id}>
              {i > 0 && <div className="border-t border-separator" />}
              <MealItemCard
                canMove={{down: i < sortedItems.length - 1, up: i > 0}}
                item={item}
                itemName={getItemName(item.food_id, item.recipe_id)}
                onMove={(dir) => handleMoveItem(item, dir)}
                onTap={() =>
                  navigate({to: `/library/nutrition-plans/${planId}/builder/meals/${editingMealId}/items/${item.id}`})
                }
              />
            </Fragment>
          ))}
        </Card>
      )}

      <Button
        className="min-h-11 w-full"
        onPress={() => navigate({to: `/library/nutrition-plans/${planId}/builder/meals/${editingMealId}/items/new`})}
        variant="secondary"
      >
        <Plus className="h-4 w-4" />
        Add item
      </Button>

      <RenameMealModal
        currentName={meal.name}
        isLoading={isRenaming}
        isOpen={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        onSave={handleRename}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description="Delete this meal and all its items? This cannot be undone."
        isLoading={isDeletingMeal}
        isOpen={isDeleteMealOpen}
        onConfirm={handleDeleteMeal}
        onOpenChange={setIsDeleteMealOpen}
        title="Delete meal"
      />
    </div>
  );
}
