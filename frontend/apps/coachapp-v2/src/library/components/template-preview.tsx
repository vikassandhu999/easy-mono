/**
 * TemplatePreview — read-only preview modal for any Builder item (design:
 * Coachez-Builder preview window). Type-specific body from the existing
 * get-detail endpoints; footer = Duplicate + Edit (navigates to the item's
 * primary screen, where assign/edit flows already live).
 */
import {MEAL_SLOT_LABELS, MEAL_SLOTS} from '@easy/utils';
import {Button, Modal, Skeleton, Spinner, toast} from '@heroui/react';
import {Copy} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {toastMutationError} from '@/@components/mutation-toast';
import {useGetFormTemplateQuery} from '@/api/checkins';
import {
  type ClientProfileFormTemplate,
  type Food,
  type NutritionMeal,
  type NutritionPlan,
  type Recipe,
  type TrainingExercise,
  type TrainingPlan,
  useGetExerciseQuery,
  useGetFoodQuery,
  useGetNutritionPlanQuery,
  useGetRecipeQuery,
  useGetTrainingPlanQuery,
  useListMealsQuery,
} from '@/api/generated';
import {type BuilderTypeKey, builderType} from '@/library/lib/builder-types';
import {useBuilderMenuActions} from '@/library/lib/use-menu-actions';
import type {NutritionPlanDay} from '@/nutrition-plans/plan-builder/plan-days';

export interface PreviewTarget {
  id: string;
  name: string;
  type: BuilderTypeKey;
}

const INSIDE_LABEL: Record<BuilderTypeKey, string> = {
  exercises: 'Details',
  foods: 'Nutrition facts',
  forms: 'Questions',
  nutrition: 'Daily meals',
  recipes: 'Ingredients & method',
  training: 'Training days',
};

const QTYPE_LABELS: Record<string, string> = {
  boolean: 'Yes / No',
  date: 'Date',
  multi_select: 'Multi choice',
  number: 'Number',
  photo: 'Photo upload',
  rating: 'Scale 1–10',
  select: 'Choice',
  text: 'Long answer',
  weight: 'Weight',
};

const numBadge = 'flex size-[26px] shrink-0 items-center justify-center rounded-[8px] text-[11px] font-bold';

function GroupCard({children, header}: {children: React.ReactNode; header: React.ReactNode}) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-separator">
      <div className="flex items-center gap-2.5 border-b border-separator bg-surface-secondary/60 px-[15px] py-3">
        {header}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Row({detail, text}: {detail?: string | null; text: string}) {
  return (
    <div className="border-t border-surface-secondary px-[15px] py-[11px] first:border-t-0">
      <div className="text-[13.5px] font-semibold">{text}</div>
      {detail ? <div className="mt-0.5 text-xs text-muted">{detail}</div> : null}
    </div>
  );
}

function amountLabel(amount: number | null, unit: string | null, weightG: number | null) {
  if (amount != null) {
    return `${amount}${unit ? ` ${unit}` : ''}`;
  }
  if (weightG != null) {
    return `${weightG} g`;
  }
  return null;
}

function TrainingBody({plan, tint}: {plan: TrainingPlan; tint: {bg: string; fg: string}}) {
  return (
    <div className="flex flex-col gap-4">
      {plan.workouts.map((workout, i) => (
        <GroupCard
          header={
            <>
              <span className={`${numBadge} ${tint.bg} ${tint.fg}`}>{i + 1}</span>
              <span className="font-grotesk text-[14.5px] font-bold tracking-[-0.01em]">{workout.name}</span>
            </>
          }
          key={workout.id}
        >
          {workout.workout_elements.map((el) => {
            const sets = el.planned_sets.length;
            const reps = el.planned_sets
              .map((s) => s.reps)
              .filter(Boolean)
              .join(' / ');
            return (
              <Row
                detail={[sets ? `${sets} set${sets === 1 ? '' : 's'}` : null, reps ? `${reps} reps` : null, el.notes]
                  .filter(Boolean)
                  .join(' · ')}
                key={el.id}
                text={el.exercise?.name ?? 'Exercise'}
              />
            );
          })}
          {workout.workout_elements.length === 0 ? <Row text="No exercises yet" /> : null}
        </GroupCard>
      ))}
      {plan.workouts.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted">No workout days yet.</div>
      ) : null}
    </div>
  );
}

function NutritionBody({
  meals,
  plan,
  tint,
}: {
  meals: NutritionMeal[];
  plan: NutritionPlan;
  tint: {bg: string; fg: string};
}) {
  // Day model: plan.days -> slot options referencing the plan's meals by id.
  const days = ((plan.days ?? []) as unknown as NutritionPlanDay[]).slice().sort((a, b) => a.position - b.position);
  const mealById = new Map(meals.map((meal) => [meal.id, meal]));
  return (
    <div className="flex flex-col gap-3.5">
      {days.map((day, i) => (
        <GroupCard
          header={
            <>
              <span className={`${numBadge} ${tint.bg} ${tint.fg}`}>{i + 1}</span>
              <span className="flex-1 font-grotesk text-[14.5px] font-bold tracking-[-0.01em]">{day.name}</span>
            </>
          }
          key={day.id}
        >
          {MEAL_SLOTS.map((slot) => {
            const options = (day.day_meals ?? [])
              .filter((dm) => dm.meal_slot === slot)
              .sort((a, b) => a.position - b.position);
            if (options.length === 0) {
              return null;
            }
            const defaultOption = options.find((o) => o.position === 0) ?? options[0];
            const meal = defaultOption ? mealById.get(defaultOption.nutrition_meal_id) : undefined;
            return (
              <Row
                detail={[MEAL_SLOT_LABELS[slot] ?? slot, options.length > 1 ? `${options.length} options` : null]
                  .filter(Boolean)
                  .join(' · ')}
                key={slot}
                text={meal?.name ?? 'Meal'}
              />
            );
          })}
          {(day.day_meals ?? []).length === 0 ? <Row text="No meals yet" /> : null}
        </GroupCard>
      ))}
      {days.length === 0 ? <div className="py-8 text-center text-sm text-muted">No days yet.</div> : null}
    </div>
  );
}

function FormBody({template, tint}: {template: ClientProfileFormTemplate; tint: {bg: string; fg: string}}) {
  let n = 0;
  return (
    <div className="flex flex-col gap-3">
      {template.sections.flatMap((section) =>
        section.questions.map((q) => {
          n += 1;
          return (
            <div
              className="rounded-[14px] border border-separator p-4"
              key={q.id}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-[7px] text-xs font-bold ${tint.bg} ${tint.fg}`}
                >
                  {n}
                </span>
                <span className="flex-1 text-[13.5px] font-semibold">{q.label}</span>
                <span className="rounded-full bg-surface-secondary px-2.5 py-0.5 text-[10.5px] font-bold text-muted">
                  {QTYPE_LABELS[q.type] ?? q.type}
                </span>
              </div>
              {q.type === 'rating' ? (
                <div className="mt-3 flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                    <span
                      className="flex h-[30px] flex-1 items-center justify-center rounded-[8px] border border-separator bg-surface-secondary/60 text-[11px] font-semibold text-muted"
                      key={v}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              ) : q.type === 'select' || q.type === 'multi_select' || q.type === 'boolean' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(q.type === 'boolean' ? ['Yes', 'No'] : (q.options ?? [])).map((option) => (
                    <span
                      className="rounded-full border border-separator bg-surface-secondary/60 px-3.5 py-[7px] text-[12.5px] font-semibold text-muted"
                      key={option}
                    >
                      {option}
                    </span>
                  ))}
                </div>
              ) : q.type === 'photo' ? (
                <div className="mt-3 flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <span
                      className="size-[52px] rounded-[10px] border-[1.5px] border-dashed border-separator bg-surface-secondary/60"
                      key={i}
                    />
                  ))}
                </div>
              ) : q.type === 'text' ? (
                <div className="mt-3 h-[52px] rounded-[10px] border border-separator bg-surface-secondary/40" />
              ) : (
                <div className="mt-3 h-[34px] w-[120px] rounded-[10px] border border-separator bg-surface-secondary/40" />
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

function StatCell({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-[13px] border border-separator p-3.5 text-center">
      <div className="font-grotesk text-lg font-bold">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</div>
    </div>
  );
}

const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');

function ExerciseBody({exercise, tint}: {exercise: TrainingExercise; tint: {bg: string; fg: string}}) {
  // Instructions often arrive pre-numbered ("1. Grab…") — the badge numbers them.
  const cues = (exercise.instructions ?? '')
    .split('\n')
    .map((line) => line.trim().replace(/^\d+[.)]\s*/, ''))
    .filter(Boolean);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-[16px] border border-separator bg-surface-secondary/50 p-4">
        {exercise.images[0] ? (
          <img
            alt={exercise.name}
            className="size-16 shrink-0 rounded-[14px] border border-separator object-cover"
            src={exercise.images[0]}
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          {[...exercise.muscles, ...exercise.equipment].map((rel) => (
            <span
              className="rounded-full border border-separator bg-surface px-2.5 py-1 text-[11.5px] font-bold text-muted"
              key={rel.id}
            >
              {rel.name}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <StatCell
          label="Mechanics"
          value={exercise.mechanics ? capitalize(exercise.mechanics) : '—'}
        />
        <StatCell
          label="Force"
          value={exercise.force ? capitalize(exercise.force) : '—'}
        />
        <StatCell
          label="Tracking"
          value={exercise.tracking_type ? capitalize(exercise.tracking_type) : '—'}
        />
      </div>
      {cues.length > 0 ? (
        <div>
          <div className="mb-2.5 font-grotesk text-sm font-bold">How to perform</div>
          <div className="flex flex-col gap-2">
            {cues.map((cue, i) => (
              <div
                className="flex items-start gap-3 rounded-[12px] border border-separator px-3.5 py-3"
                key={cue}
              >
                <span
                  className={`flex size-[23px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${tint.bg} ${tint.fg}`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-[13px] font-medium">{cue}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MacroStrip({
  nutrition,
}: {
  nutrition?: {
    calories?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    protein_g?: number | null;
  } | null;
}) {
  const cells = [
    {label: 'kcal', value: nutrition?.calories},
    {label: 'Protein', suffix: 'g', value: nutrition?.protein_g},
    {label: 'Carbs', suffix: 'g', value: nutrition?.carbs_g},
    {label: 'Fat', suffix: 'g', value: nutrition?.fat_g},
  ];
  return (
    <div className="grid grid-cols-4 gap-2 rounded-[16px] border border-separator bg-surface-secondary/50 p-4">
      {cells.map((cell) => (
        <div
          className="text-center"
          key={cell.label}
        >
          <div className="font-grotesk text-lg font-bold">
            {cell.value != null ? `${Math.round(cell.value)}${cell.suffix ?? ''}` : '—'}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted">{cell.label}</div>
        </div>
      ))}
    </div>
  );
}

function RecipeBody({recipe, tint}: {recipe: Recipe; tint: {bg: string; fg: string}}) {
  const steps = (recipe.instructions ?? '')
    .split('\n')
    .map((line) => line.trim().replace(/^\d+[.)]\s*/, ''))
    .filter(Boolean);
  return (
    <div className="flex flex-col gap-4">
      <MacroStrip nutrition={recipe.nutrition} />
      <div>
        <div className="mb-2.5 font-grotesk text-sm font-bold">Ingredients</div>
        <div className="flex flex-col gap-2">
          {recipe.recipe_ingredients.map((ing) => (
            <div
              className="flex items-center gap-3 rounded-[12px] border border-separator px-3.5 py-[11px]"
              key={ing.food_id}
            >
              <span className="flex-1 text-[13.5px] font-semibold">{ing.food?.name ?? 'Ingredient'}</span>
              <span className="text-[12.5px] font-semibold text-muted">
                {amountLabel(ing.amount, ing.unit, ing.weight_g)}
              </span>
            </div>
          ))}
          {recipe.recipe_ingredients.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted">No ingredients yet.</div>
          ) : null}
        </div>
      </div>
      {steps.length > 0 ? (
        <div>
          <div className="mb-2.5 font-grotesk text-sm font-bold">Method</div>
          <div className="flex flex-col gap-2">
            {steps.map((step, i) => (
              <div
                className="flex items-start gap-3 rounded-[12px] border border-separator px-3.5 py-3"
                key={step}
              >
                <span
                  className={`flex size-[23px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${tint.bg} ${tint.fg}`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-[13px] font-medium">{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FoodBody({food}: {food: Food}) {
  return (
    <div className="flex flex-col gap-4">
      <MacroStrip
        nutrition={{
          calories: food.calories_per_100g,
          carbs_g: food.carbs_g_per_100g,
          fat_g: food.fat_g_per_100g,
          protein_g: food.protein_g_per_100g,
        }}
      />
      <div className="text-center text-xs font-semibold uppercase tracking-[0.05em] text-muted">Per 100 g</div>
      <div className="flex flex-wrap justify-center gap-2">
        {[food.brand, food.category].filter(Boolean).map((tag) => (
          <span
            className="rounded-full border border-separator bg-surface-secondary/60 px-3 py-1 text-[11.5px] font-bold text-muted"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

interface TemplatePreviewProps {
  onClose: () => void;
  target: PreviewTarget | null;
}

export default function TemplatePreview({onClose, target}: TemplatePreviewProps) {
  const navigate = useNavigate();
  const menuActions = useBuilderMenuActions();
  const [duplicating, setDuplicating] = useState(false);

  const key = target?.type;
  const id = target?.id ?? '';
  const training = useGetTrainingPlanQuery({id}, {skip: key !== 'training'});
  const nutrition = useGetNutritionPlanQuery({id}, {skip: key !== 'nutrition'});
  const planMeals = useListMealsQuery({planId: id}, {skip: key !== 'nutrition'});
  const form = useGetFormTemplateQuery({id}, {skip: key !== 'forms'});
  const exercise = useGetExerciseQuery({id}, {skip: key !== 'exercises'});
  const recipe = useGetRecipeQuery({id}, {skip: key !== 'recipes'});
  const food = useGetFoodQuery({id}, {skip: key !== 'foods'});

  if (!target) {
    return null;
  }
  const type = builderType(target.type);
  const tint = {bg: type.bg, fg: type.fg};
  const active = {exercises: exercise, foods: food, forms: form, nutrition, recipes: recipe, training}[target.type];
  const detail = active.data?.data;

  const duplicate = async () => {
    const action = menuActions(target.type, target).onDuplicate;
    if (!action) {
      return;
    }
    setDuplicating(true);
    try {
      await action();
      toast.success('Duplicated', {timeout: 1000});
      onClose();
    } catch (e) {
      toastMutationError(e, `Couldn't duplicate ${type.label.toLowerCase()}`);
    } finally {
      setDuplicating(false);
    }
  };

  const edit = () => {
    onClose();
    navigate(type.detailRoute.replace(':id', target.id));
  };

  return (
    <Modal.Backdrop
      className="bg-[rgba(24,24,27,0.25)] backdrop-blur-[6px]"
      isDismissable
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Modal.Container className="items-center p-4">
        <Modal.Dialog className="flex max-h-[88dvh] w-[580px] max-w-full flex-col overflow-hidden rounded-[24px]! bg-surface p-0 shadow-[0_40px_90px_-24px_rgba(24,24,27,0.5)]">
          <div className="border-b border-surface-secondary px-6 pt-[26px] pb-[22px] sm:px-7">
            <div className="flex items-start gap-4">
              <span className={`flex size-[52px] shrink-0 items-center justify-center rounded-[15px] ${type.bg}`}>
                <type.icon
                  className={type.fg}
                  size={25}
                  strokeWidth={1.9}
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">{type.label}</div>
                <h2 className="mt-1 truncate font-grotesk text-[23px] font-bold tracking-[-0.02em]">
                  {detail && 'name' in detail ? detail.name : target.name}
                </h2>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-[22px] sm:px-7">
            <div className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted">
              {INSIDE_LABEL[target.type]}
            </div>
            {active.isLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </div>
            ) : active.isError || !detail ? (
              <div className="py-8 text-center text-sm text-muted">Couldn't load {type.label.toLowerCase()}</div>
            ) : target.type === 'training' ? (
              <TrainingBody
                plan={detail as TrainingPlan}
                tint={tint}
              />
            ) : target.type === 'nutrition' ? (
              <NutritionBody
                meals={planMeals.data?.data ?? []}
                plan={detail as NutritionPlan}
                tint={tint}
              />
            ) : target.type === 'forms' ? (
              <FormBody
                template={detail as ClientProfileFormTemplate}
                tint={tint}
              />
            ) : target.type === 'exercises' ? (
              <ExerciseBody
                exercise={detail as TrainingExercise}
                tint={tint}
              />
            ) : target.type === 'recipes' ? (
              <RecipeBody
                recipe={detail as Recipe}
                tint={tint}
              />
            ) : (
              <FoodBody food={detail as Food} />
            )}
          </div>
          <div className="flex items-center gap-2.5 border-t border-surface-secondary px-6 py-4 sm:px-7">
            {menuActions(target.type, target).onDuplicate ? (
              <Button
                className="relative rounded-[12px]! border-[1.5px] border-separator bg-surface text-[13.5px] font-semibold hover:bg-surface-secondary"
                isPending={duplicating}
                onPress={() => duplicate()}
                variant="secondary"
              >
                <span className={duplicating ? 'invisible' : 'flex items-center gap-2'}>
                  <Copy size={15} />
                  Duplicate
                </span>
                {duplicating ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Spinner
                      color="current"
                      size="sm"
                    />
                  </span>
                ) : null}
              </Button>
            ) : null}
            <div className="flex-1" />
            <Button
              className="rounded-[12px]! px-[19px] text-[13.5px] font-semibold"
              onPress={edit}
              variant="primary"
            >
              Edit
            </Button>
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
