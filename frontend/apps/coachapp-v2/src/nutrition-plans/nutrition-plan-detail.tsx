import {AlertDialog, Button, Chip, Input, Spinner, toast} from '@heroui/react';
import {ArrowLeft, Copy, Pencil, Plus, Trash2} from 'lucide-react';
import {useCallback, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import type {Client} from '@/api/clients';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useCreateMealMutation} from '@/api/meals';
import {
  useAssignNutritionPlanMutation,
  useDeleteNutritionPlanMutation,
  useGetNutritionPlanQuery,
} from '@/api/nutritionPlans';
import ClientPicker from '@/clients/components/client-picker';
import DayPlanner from '@/nutrition-plans/components/day-planner';
import MealSection from '@/nutrition-plans/components/meal-section';

const STATUS_MAP: Record<
  string,
  {
    color: 'accent' | 'danger' | 'default' | 'success' | 'warning';
    label: string;
  }
> = {
  active: {color: 'success', label: 'Active'},
  draft: {color: 'default', label: 'Draft'},
  archived: {color: 'warning', label: 'Archived'},
};

const MACRO_LABELS: Record<string, {label: string; unit: string}> = {
  calories: {label: 'Calories', unit: ''},
  protein_g: {label: 'Protein', unit: 'g'},
  carbs_g: {label: 'Carbs', unit: 'g'},
  fats_g: {label: 'Fats', unit: 'g'},
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function NutritionPlanDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isError, isLoading} = useGetNutritionPlanQuery(id!);
  const [deletePlan, {isLoading: isDeleting}] = useDeleteNutritionPlanMutation();
  const [assignPlan, {isLoading: isAssigning}] = useAssignNutritionPlanMutation();
  const [createMeal, {isLoading: isCreatingMeal}] = useCreateMealMutation();

  // Inline copy-to-client state
  const [showCopyToClient, setShowCopyToClient] = useState(false);

  const handleCopyToClient = async (client: Client) => {
    try {
      await assignPlan({id: id!, body: {client_id: client.id}}).unwrap();
      const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email;
      toast.success(`Plan copied to ${clientName}`);
      setShowCopyToClient(false);
    } catch {
      toast.danger('Failed to copy plan to client.');
    }
  };

  // Inline add-meal state
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [scrollToMealId, setScrollToMealId] = useState<null | string>(null);

  // Callback ref that scrolls a MealSection into view then clears the scroll target
  const scrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && scrollToMealId) {
        node.scrollIntoView({behavior: 'smooth', block: 'center'});
        setScrollToMealId(null);
      }
    },
    [scrollToMealId],
  );

  const handleDeletePlan = async () => {
    try {
      await deletePlan(id!).unwrap();
      navigate(ROUTES.NUTRITION_PLANS, {replace: true});
    } catch {
      // Error handled by RTK Query cache
    }
  };

  const handleAddMeal = async () => {
    if (!newMealName.trim()) return;
    try {
      const result = await createMeal({
        planId: id!,
        body: {name: newMealName.trim()},
      }).unwrap();
      setNewMealName('');
      setIsAddingMeal(false);
      setScrollToMealId(result.data.id);
    } catch {
      // Error handled by RTK Query cache
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Nutrition Plan">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError || !data) {
    return (
      <PageLayout title="Nutrition Plan">
        <div className="mb-4">
          <Button
            onPress={() => navigate(ROUTES.NUTRITION_PLANS)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
          Failed to load nutrition plan. It may not exist or you don&apos;t have access.
        </div>
      </PageLayout>
    );
  }

  const plan = data.data;
  const status = plan.status ? STATUS_MAP[plan.status] : null;
  const macrosGoalEntries = plan.macros_goal ? Object.entries(plan.macros_goal) : [];
  const sortedMeals = [...plan.meals].sort((a, b) => a.position - b.position);

  return (
    <PageLayout title="Nutrition Plan">
      {/* Navigation */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          onPress={() => navigate(ROUTES.NUTRITION_PLANS)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
        <Button
          onPress={() => navigate(`/library/nutrition-plans/${plan.id}/edit`)}
          size="sm"
          variant="secondary"
        >
          <Pencil size={16} />
          Edit
        </Button>
        <Button
          onPress={() => setShowCopyToClient((v) => !v)}
          size="sm"
          variant="secondary"
        >
          <Copy size={14} />
          Copy to Client
        </Button>
        <AlertDialog>
          <Button
            size="sm"
            variant="danger"
          >
            <Trash2 size={16} />
            Delete
          </Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>Delete plan?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    This will permanently delete <strong>{plan.name}</strong> and all its meals. This action cannot be
                    undone.
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button
                    slot="close"
                    variant="tertiary"
                  >
                    Cancel
                  </Button>
                  <Button
                    isPending={isDeleting}
                    onPress={handleDeletePlan}
                    variant="danger"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>

      {/* Copy to client — revealed inline below nav bar */}
      {showCopyToClient && (
        <div className="mb-4 max-w-md rounded-xl border border-divider bg-content1 p-4">
          <p className="mb-2 text-sm text-foreground-500">
            Search for a client to copy this plan to. A new plan will be created for the selected client.
          </p>
          <ClientPicker
            onSelect={handleCopyToClient}
            placeholder="Search clients..."
          />
          {isAssigning && (
            <div className="mt-2 flex items-center gap-2 text-sm text-foreground-400">
              <Spinner size="sm" />
              Copying plan...
            </div>
          )}
        </div>
      )}

      <div className="max-w-2xl">
        {/* Plan header */}
        <div className="pb-6">
          <h2 className="text-lg font-semibold">{plan.name}</h2>
          {plan.description && <p className="mt-1 text-sm text-foreground-500">{plan.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {status && (
              <Chip
                color={status.color}
                size="sm"
                variant="soft"
              >
                {status.label}
              </Chip>
            )}
            {plan.type && (
              <Chip
                size="sm"
                variant="soft"
              >
                {plan.type}
              </Chip>
            )}
          </div>
        </div>

        {/* Macros goal */}
        {macrosGoalEntries.length > 0 && (
          <section className="border-t border-divider py-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">
              Daily Macros Goal
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {macrosGoalEntries.map(([key, value]) => {
                const meta = MACRO_LABELS[key];
                return (
                  <div key={key}>
                    <p className="text-xs text-foreground-400">{meta ? meta.label : key}</p>
                    <p className="font-medium">
                      {value}
                      {meta ? meta.unit : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Meals builder */}
        <section className="border-t border-divider py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-400">Meals</h3>
          </div>

          {sortedMeals.length > 0 ? (
            <div className="flex flex-col gap-3">
              {sortedMeals.map((meal) => (
                <MealSection
                  key={meal.id}
                  meal={meal}
                  planId={plan.id}
                  sectionRef={meal.id === scrollToMealId ? scrollRef : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="mb-3 text-sm text-foreground-400">
              No meals yet. Add your first meal to start building the plan.
            </p>
          )}

          {/* Add meal — inline input (keyboard rule: single field = INLINE) */}
          <div className="mt-3">
            {isAddingMeal ? (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label
                    className="mb-1 block text-xs text-foreground-400"
                    htmlFor="new-meal-name"
                  >
                    Meal name
                  </label>
                  <Input
                    id="new-meal-name"
                    onChange={(e) => setNewMealName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMeal();
                      }
                    }}
                    placeholder="e.g. Breakfast, Snack 1"
                    value={newMealName}
                  />
                </div>
                <Button
                  isPending={isCreatingMeal}
                  onPress={handleAddMeal}
                  size="sm"
                >
                  {isCreatingMeal ? 'Adding...' : 'Add'}
                </Button>
                <Button
                  onPress={() => {
                    setIsAddingMeal(false);
                    setNewMealName('');
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                onPress={() => setIsAddingMeal(true)}
                size="sm"
                variant="secondary"
              >
                <Plus size={14} />
                Add Meal
              </Button>
            )}
          </div>
        </section>

        {/* Day planner — assign meals to days */}
        <section className="border-t border-divider py-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-400">Weekly Schedule</h3>
          <DayPlanner
            meals={sortedMeals}
            planId={plan.id}
            planItems={plan.plan_items}
          />
        </section>

        {/* Meta */}
        <section className="border-t border-divider py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-foreground-400">Created</p>
              <p>{formatDate(plan.inserted_at)}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-400">Last updated</p>
              <p>{formatDate(plan.updated_at)}</p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
