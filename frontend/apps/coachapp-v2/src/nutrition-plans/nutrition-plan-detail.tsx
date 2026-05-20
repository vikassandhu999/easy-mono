import {
  AlertDialog,
  Button,
  Chip,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextField,
  toast,
  Typography,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Archive, ArchiveRestore, ArrowLeft, Pencil, Plus, Trash2} from 'lucide-react';
import {useCallback, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate, useParams} from 'react-router-dom';
import {z} from 'zod';

import type {Client} from '@/api/clients';
import type {NutritionPlanStatus} from '@/api/nutritionPlans';
import type {Macros} from '@/api/shared';

import ClientPicker from '@/@components/client-picker';
import ClientPlanBanner from '@/@components/client-plan-banner';
import CopyMenu from '@/@components/copy-menu';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useCreateMealMutation} from '@/api/meals';
import {
  useAssignNutritionPlanMutation,
  useDeleteNutritionPlanMutation,
  useDuplicateNutritionPlanMutation,
  useGetNutritionPlanMacrosQuery,
  useGetNutritionPlanQuery,
  useUpdateNutritionPlanMutation,
} from '@/api/nutritionPlans';
import DayPlanner from '@/nutrition-plans/components/day-planner';
import MealSection from '@/nutrition-plans/components/meal-section';

const STATUS_MAP: Record<NutritionPlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

const UNKNOWN_STATUS = {color: 'default' as const, label: 'Unknown'};

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

const MACRO_KEYS = ['calories', 'protein_g', 'carbs_g', 'fats_g'] as const;

const addMealFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter meal name'),
});

type AddMealFormValues = z.infer<typeof addMealFormSchema>;

function getProgressColor(percentage: number): string {
  if (percentage >= 90 && percentage <= 110) return 'bg-success';
  if (percentage > 120) return 'bg-danger';
  return 'bg-warning';
}

function AddMealForm({
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: AddMealFormValues) => Promise<void>;
}) {
  const form = useForm<AddMealFormValues>({
    defaultValues: {name: ''},
    resolver: zodResolver(addMealFormSchema),
  });

  return (
    <Form
      className="flex items-end gap-2"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <Controller
        control={form.control}
        name="name"
        render={({field}) => (
          <TextField
            className="flex-1"
            isInvalid={!!form.formState.errors.name}
            name={field.name}
            onBlur={field.onBlur}
            onChange={field.onChange}
            value={field.value}
          >
            <Label>Meal name</Label>
            {form.formState.errors.name && <FieldError>{form.formState.errors.name.message}</FieldError>}
            <Input placeholder="Breakfast or snack 1" />
          </TextField>
        )}
      />
      <Button
        isPending={isSubmitting}
        size="sm"
        type="submit"
      >
        {isSubmitting ? 'Adding' : 'Add'}
      </Button>
      <Button
        onPress={onCancel}
        size="sm"
        variant="ghost"
      >
        Cancel
      </Button>
    </Form>
  );
}

function DailyTotals({totals, goal}: {goal?: Macros; totals: Macros}) {
  const columns = MACRO_KEYS.filter((key) => {
    const total = totals[key] ?? 0;
    const goalVal = goal?.[key] ?? 0;
    return total > 0 || goalVal > 0;
  });

  if (columns.length === 0) return null;

  return (
    <section className="border-t border-divider py-4">
      <Typography
        className="mb-2"
        color="muted"
        type="body-xs"
        weight="semibold"
      >
        Daily totals
      </Typography>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {columns.map((key) => {
          const meta = MACRO_LABELS[key];
          const total = Math.round(totals[key] ?? 0);
          const goalVal = goal?.[key] ? Math.round(goal[key]) : null;
          const percentage = goalVal ? Math.round((total / goalVal) * 100) : null;

          return (
            <div key={key}>
              <Typography
                color="muted"
                type="body-xs"
              >
                {meta ? meta.label : key}
              </Typography>
              <Typography weight="medium">
                {total}
                {meta ? meta.unit : ''}
                {goalVal ? (
                  <Typography
                    color="muted"
                    elementType="span"
                  >
                    {' '}
                    / {goalVal}
                    {meta ? meta.unit : ''}
                  </Typography>
                ) : null}
              </Typography>
              {percentage != null && (
                <>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-content2">
                    <div
                      className={`h-full rounded-full transition-all ${getProgressColor(percentage)}`}
                      style={{width: `${Math.min(percentage, 100)}%`}}
                    />
                  </div>
                  <Typography
                    className="mt-0.5"
                    color="muted"
                    type="body-xs"
                  >
                    {percentage}%
                  </Typography>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function NutritionPlanDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.NUTRITION_PLANS);
  const {data, isError, isLoading} = useGetNutritionPlanQuery(id!);
  const [deletePlan, {isLoading: isDeleting}] = useDeleteNutritionPlanMutation();
  const [assignPlan, {isLoading: isAssigning}] = useAssignNutritionPlanMutation();
  const [duplicatePlan] = useDuplicateNutritionPlanMutation();
  const [createMeal, {isLoading: isCreatingMeal}] = useCreateMealMutation();
  const [updatePlan, {isLoading: isUpdatingStatus}] = useUpdateNutritionPlanMutation();
  const {data: macrosData} = useGetNutritionPlanMacrosQuery(id!);

  const [showCopyToClient, setShowCopyToClient] = useState(false);

  const handleCopyToClient = async (client: Client) => {
    try {
      const result = await assignPlan({id: id!, body: {client_id: client.id}}).unwrap();
      const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email;
      toast.success(`Copied to ${clientName}`, {
        actionProps: {
          children: 'View',
          onPress: () => navigate(`/library/nutrition-plans/${result.data.id}`),
          variant: 'tertiary',
        },
      });
      setShowCopyToClient(false);
    } catch {
      toast.danger("Plan wasn't copied");
    }
  };

  const handleDuplicate = async () => {
    try {
      const result = await duplicatePlan(id!).unwrap();
      const label = data?.data.client_id ? 'Saved as template' : 'Duplicated as template';
      toast.success(label, {
        actionProps: {
          children: 'View',
          onPress: () => navigate(`/library/nutrition-plans/${result.data.id}`),
          variant: 'tertiary',
        },
      });
    } catch {
      toast.danger("Plan wasn't duplicated");
    }
  };

  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [scrollToMealId, setScrollToMealId] = useState<null | string>(null);

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

  const handleToggleArchive = async (nextStatus: NutritionPlanStatus) => {
    try {
      await updatePlan({id: id!, body: {status: nextStatus}}).unwrap();
      toast.success(nextStatus === 'archived' ? 'Plan archived' : 'Plan restored');
    } catch {
      toast.danger("Plan status wasn't updated");
    }
  };

  const handleAddMeal = async ({name}: AddMealFormValues) => {
    try {
      const result = await createMeal({
        planId: id!,
        body: {name},
      }).unwrap();
      setIsAddingMeal(false);
      setScrollToMealId(result.data.id);
    } catch {
      // Error handled by RTK Query cache
    }
  };

  if (isLoading) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Nutrition plan</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Nutrition plan</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Nutrition plans
          </Button>
        </Page.Toolbar>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
            <Typography
              className="text-danger"
              type="body-sm"
            >
              Nutrition plan couldn&apos;t load. It may not exist, or you may not have access
            </Typography>
          </div>
        </Page.Content>
      </Page>
    );
  }

  const plan = data.data;
  const status = STATUS_MAP[plan.status] ?? UNKNOWN_STATUS;
  const isTemplate = !plan.client_id;
  const macrosGoalEntries = plan.macros_goal ? Object.entries(plan.macros_goal) : [];
  const meals = plan.meals ?? [];
  const planItems = plan.plan_items ?? [];
  const sortedMeals = [...meals].sort((a, b) => a.position - b.position);

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Nutrition plan</Page.Title>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar className="flex flex-wrap items-center gap-2">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Nutrition plans
        </Button>
        <Button
          onPress={() => navigate(`/library/nutrition-plans/${plan.id}/edit`)}
          size="sm"
          variant="secondary"
        >
          <Pencil size={16} />
          Edit
        </Button>
        <CopyMenu
          clientId={plan.client_id}
          onCopyToClient={() => setShowCopyToClient((v) => !v)}
          onDuplicate={handleDuplicate}
        />
        {plan.status === 'active' ? (
          <Button
            isPending={isUpdatingStatus}
            onPress={() => handleToggleArchive('archived')}
            size="sm"
            variant="secondary"
          >
            <Archive size={16} />
            Archive
          </Button>
        ) : (
          <Button
            isPending={isUpdatingStatus}
            onPress={() => handleToggleArchive('active')}
            size="sm"
            variant="secondary"
          >
            <ArchiveRestore size={16} />
            Unarchive
          </Button>
        )}
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
                  <Typography>
                    This will permanently delete <strong>{plan.name}</strong> and all its meals. This action cannot be
                    undone.
                  </Typography>
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
                    {isDeleting ? 'Deleting' : 'Delete'}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </Page.Toolbar>

      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        {showCopyToClient && (
          <div className="mb-4 max-w-md rounded-xl border border-divider bg-content1 p-4">
            <Typography
              className="mb-2"
              color="muted"
              type="body-sm"
            >
              Search for a client. We&apos;ll create a new copy for the selected client
            </Typography>
            <ClientPicker
              excludeIds={plan.client_id ? [plan.client_id] : undefined}
              isDisabled={isAssigning}
              onSelect={handleCopyToClient}
              placeholder="Search clients"
            />
            {isAssigning && (
              <div className="mt-2 flex items-center gap-2">
                <Spinner size="sm" />
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  Copying plan
                </Typography>
              </div>
            )}
          </div>
        )}

        <div className="min-w-0 max-w-2xl overflow-hidden">
          {plan.client ? <ClientPlanBanner client={plan.client} /> : null}

          <div className="pb-6">
            <Typography type="h5">{plan.name}</Typography>
            {plan.description && (
              <Typography
                className="mt-1"
                color="muted"
                type="body-sm"
              >
                {plan.description}
              </Typography>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip
                color={status.color}
                size="sm"
                variant="soft"
              >
                {status.label}
              </Chip>
              {isTemplate ? (
                <Chip
                  color="default"
                  size="sm"
                  variant="soft"
                >
                  Template
                </Chip>
              ) : null}
            </div>
          </div>

          {macrosGoalEntries.length > 0 && (
            <section className="border-t border-divider py-4">
              <Typography
                className="mb-2"
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                Daily macro goal
              </Typography>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {macrosGoalEntries.map(([key, value]) => {
                  const meta = MACRO_LABELS[key];
                  return (
                    <div key={key}>
                      <Typography
                        color="muted"
                        type="body-xs"
                      >
                        {meta ? meta.label : key}
                      </Typography>
                      {value ? (
                        <Typography weight="medium">
                          {value}
                          {meta ? meta.unit : ''}
                        </Typography>
                      ) : (
                        <Typography color="muted">&mdash;</Typography>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {macrosData?.data && meals.some((m) => m.meal_items.length > 0) && (
            <DailyTotals
              goal={plan.macros_goal}
              totals={macrosData.data}
            />
          )}

          <section className="border-t border-divider py-4">
            <Typography
              className="mb-3"
              color="muted"
              type="body-xs"
              weight="semibold"
            >
              Meals
            </Typography>

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
              <Typography
                className="mb-3"
                color="muted"
                type="body-sm"
              >
                No meals yet. Add your first meal to start building the plan
              </Typography>
            )}

            <div className="mt-3">
              {isAddingMeal ? (
                <AddMealForm
                  isSubmitting={isCreatingMeal}
                  onCancel={() => setIsAddingMeal(false)}
                  onSubmit={handleAddMeal}
                />
              ) : (
                <Button
                  onPress={() => setIsAddingMeal(true)}
                  size="sm"
                  variant="secondary"
                >
                  <Plus size={14} />
                  Add meal
                </Button>
              )}
            </div>
          </section>

          <section className="border-t border-divider py-4">
            <Typography
              className="mb-3"
              color="muted"
              type="body-xs"
              weight="semibold"
            >
              Weekly schedule
            </Typography>
            <DayPlanner
              meals={sortedMeals}
              planId={plan.id}
              planItems={planItems}
            />
          </section>

          <section className="border-t border-divider py-4">
            <Typography
              className="mb-2"
              color="muted"
              type="body-xs"
              weight="semibold"
            >
              Details
            </Typography>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Typography
                  color="muted"
                  type="body-xs"
                >
                  Created
                </Typography>
                <Typography>{formatDate(plan.inserted_at)}</Typography>
              </div>
              <div>
                <Typography
                  color="muted"
                  type="body-xs"
                >
                  Last updated
                </Typography>
                <Typography>{formatDate(plan.updated_at)}</Typography>
              </div>
            </div>
          </section>
        </div>
      </Page.Content>
    </Page>
  );
}
