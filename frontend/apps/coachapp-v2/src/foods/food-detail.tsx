import {AlertDialog, Button, Chip, Spinner} from '@heroui/react';
import {Apple, ArrowLeft, Copy, Pencil, Trash2} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useDeleteFoodMutation, useGetFoodQuery} from '@/api/foods';
import {normalizeMacros} from '@/api/shared';

/** Well-known macro keys to display in a structured way */
const MACRO_LABELS: Record<string, {label: string; unit: string}> = {
  calories_per_100g: {label: 'Calories', unit: ''},
  protein_g: {label: 'Protein', unit: 'g'},
  carbs_g: {label: 'Carbs', unit: 'g'},
  fats_g: {label: 'Fats', unit: 'g'},
  fiber_g: {label: 'Fiber', unit: 'g'},
  sugar_g: {label: 'Sugar', unit: 'g'},
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function FoodDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isError, isLoading} = useGetFoodQuery(id!);
  const [deleteFood, {isLoading: isDeleting}] = useDeleteFoodMutation();

  const handleDelete = async () => {
    try {
      await deleteFood(id!).unwrap();
      navigate(ROUTES.FOODS, {replace: true});
    } catch {
      // Mutation error — could add a toast here in the future.
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Food">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError || !data) {
    return (
      <PageLayout title="Food">
        <div className="mb-4">
          <Button
            onPress={() => navigate(ROUTES.FOODS)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
          Failed to load food. It may not exist or you don&apos;t have access.
        </div>
      </PageLayout>
    );
  }

  const food = data.data;
  const isSystemFood = food.source === 'system';
  const normalizedMacros = normalizeMacros(food.macros);
  const macroEntries = Object.entries(normalizedMacros);
  const knownMacros = macroEntries.filter(([key, value]) => key in MACRO_LABELS && value !== 0);
  const unknownMacros = macroEntries.filter(([key, value]) => !(key in MACRO_LABELS) && value !== 0);

  return (
    <PageLayout title="Food">
      {/* Navigation */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          onPress={() => navigate(ROUTES.FOODS)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
        {!isSystemFood && (
          <Button
            onPress={() => navigate(`/library/foods/${food.id}/edit`)}
            size="sm"
            variant="secondary"
          >
            <Pencil size={16} />
            Edit
          </Button>
        )}
        <Button
          onPress={() => navigate(ROUTES.CREATE_FOOD, {state: {duplicateFrom: food}})}
          size="sm"
          variant="secondary"
        >
          <Copy size={16} />
          Duplicate
        </Button>
        {!isSystemFood && (
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
                    <AlertDialog.Heading>Delete food?</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p>
                      This will permanently delete <strong>{food.name}</strong>. This action cannot be undone.
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
                      onPress={handleDelete}
                      variant="danger"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        )}
      </div>

      <div className="max-w-lg">
        {/* Header — image/icon + name + category chip */}
        <div className="flex items-start gap-4 pb-6">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-content2">
            {food.image_url ? (
              <img
                alt={food.name}
                className="size-14 rounded-xl object-cover"
                src={food.image_url}
              />
            ) : (
              <Apple
                className="text-foreground-400"
                size={24}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{food.name}</h2>
            {(food.category || food.source) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {food.category && (
                  <Chip
                    size="sm"
                    variant="soft"
                  >
                    {food.category}
                  </Chip>
                )}
                {food.source && (
                  <Chip
                    color="default"
                    size="sm"
                    variant="soft"
                  >
                    {food.source}
                  </Chip>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Macros */}
        {(knownMacros.length > 0 || unknownMacros.length > 0) && (
          <section className="border-t border-divider py-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">
              Nutrition per 100g
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {knownMacros.map(([key, value]) => {
                const meta = MACRO_LABELS[key] as {
                  label: string;
                  unit: string;
                };
                return (
                  <div key={key}>
                    <p className="text-xs text-foreground-400">{meta.label}</p>
                    <p className="font-medium">
                      {value}
                      {meta.unit}
                    </p>
                  </div>
                );
              })}
              {unknownMacros.map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs text-foreground-400">{key}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Serving Sizes */}
        {food.serving_sizes.length > 0 && (
          <section className="border-t border-divider py-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Serving Sizes</h3>
            <div className="flex flex-col gap-2">
              {food.serving_sizes.map((serving, i) => (
                <div
                  className="flex items-center justify-between rounded-lg border border-divider px-3 py-2 text-sm"
                  key={i}
                >
                  <span className="font-medium">
                    {serving.amount ?? 1} {serving.unit}
                  </span>
                  {serving.weight_g != null && serving.weight_g > 0 && (
                    <span className="text-foreground-500">{serving.weight_g}g</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tags */}
        {food.tags.length > 0 && (
          <section className="border-t border-divider py-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {food.tags.map((tag) => (
                <Chip
                  key={tag}
                  size="sm"
                  variant="soft"
                >
                  {tag}
                </Chip>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {food.notes && (
          <section className="border-t border-divider py-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Notes</h3>
            <p className="whitespace-pre-wrap text-sm">{food.notes}</p>
          </section>
        )}

        {/* Meta */}
        <section className="border-t border-divider py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-foreground-400">Created</p>
              <p>{formatDate(food.inserted_at)}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-400">Last updated</p>
              <p>{formatDate(food.updated_at)}</p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
