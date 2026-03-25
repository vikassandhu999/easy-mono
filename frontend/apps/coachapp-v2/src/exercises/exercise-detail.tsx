import {AlertDialog, Button, Chip, Spinner, toast} from '@heroui/react';
import {ArrowLeft, Copy, Dumbbell, Pencil, Trash2} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useDeleteExerciseMutation, useDuplicateExerciseMutation, useGetExerciseQuery} from '@/api/exercises';

const MECHANICS_LABEL: Record<string, string> = {
  compound: 'Compound',
  isolation: 'Isolation',
  isometric: 'Isometric',
};

const FORCE_LABEL: Record<string, string> = {
  pull: 'Pull',
  push: 'Push',
  static: 'Static',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ExerciseDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isError, isLoading} = useGetExerciseQuery(id!);
  const [deleteExercise, {isLoading: isDeleting}] = useDeleteExerciseMutation();
  const [duplicateExercise, {isLoading: isDuplicating}] = useDuplicateExerciseMutation();

  const handleDuplicate = async () => {
    try {
      const result = await duplicateExercise(id!).unwrap();
      toast.success('Exercise duplicated');
      navigate(`/library/exercises/${result.data.id}`);
    } catch {
      toast.danger('Failed to duplicate exercise');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteExercise(id!).unwrap();
      navigate(ROUTES.EXERCISES, {replace: true});
    } catch {
      // Mutation error — could add a toast here in the future.
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Exercise">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError || !data) {
    return (
      <PageLayout title="Exercise">
        <div className="mb-4">
          <Button
            onPress={() => navigate(ROUTES.EXERCISES)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
          Failed to load exercise. It may not exist or you don&apos;t have access.
        </div>
      </PageLayout>
    );
  }

  const exercise = data.data;
  const isSystemExercise = exercise.business_id === null;
  const mechanicsLabel = exercise.mechanics ? MECHANICS_LABEL[exercise.mechanics] : null;
  const forceLabel = exercise.force ? FORCE_LABEL[exercise.force] : null;
  const muscleNames = exercise.muscles.map((m) => m.name);
  const equipmentNames = exercise.equipment.map((e) => e.name);

  return (
    <PageLayout title="Exercise">
      {/* Navigation */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          onPress={() => navigate(ROUTES.EXERCISES)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
        {!isSystemExercise && (
          <Button
            onPress={() => navigate(`/library/exercises/${exercise.id}/edit`)}
            size="sm"
            variant="secondary"
          >
            <Pencil size={16} />
            Edit
          </Button>
        )}
        <Button
          isPending={isDuplicating}
          onPress={handleDuplicate}
          size="sm"
          variant="secondary"
        >
          <Copy size={16} />
          Duplicate
        </Button>
        {!isSystemExercise && (
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
                    <AlertDialog.Heading>Delete exercise?</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p>
                      This will permanently delete <strong>{exercise.name}</strong>. This action cannot be undone.
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
        {/* Header — image/icon + name + chips */}
        <div className="flex items-start gap-4 pb-6">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-content2">
            {exercise.images[0] ? (
              <img
                alt={exercise.name}
                className="size-14 rounded-xl object-cover"
                src={exercise.images[0]}
              />
            ) : (
              <Dumbbell
                className="text-foreground-400"
                size={24}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{exercise.name}</h2>
            {(mechanicsLabel || forceLabel) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {mechanicsLabel && (
                  <Chip
                    size="sm"
                    variant="soft"
                  >
                    {mechanicsLabel}
                  </Chip>
                )}
                {forceLabel && (
                  <Chip
                    size="sm"
                    variant="soft"
                  >
                    {forceLabel}
                  </Chip>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {exercise.description && (
          <section className="border-t border-divider py-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Description</h3>
            <p className="whitespace-pre-wrap text-sm">{exercise.description}</p>
          </section>
        )}

        {/* Instructions */}
        {exercise.instructions && (
          <section className="border-t border-divider py-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Instructions</h3>
            <p className="whitespace-pre-wrap text-sm">{exercise.instructions}</p>
          </section>
        )}

        {/* Muscles */}
        {muscleNames.length > 0 && (
          <section className="border-t border-divider py-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Target Muscles</h3>
            <div className="flex flex-wrap gap-1.5">
              {muscleNames.map((name) => (
                <Chip
                  key={name}
                  size="sm"
                  variant="soft"
                >
                  {name}
                </Chip>
              ))}
            </div>
          </section>
        )}

        {/* Equipment */}
        {equipmentNames.length > 0 && (
          <section className="border-t border-divider py-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Equipment</h3>
            <div className="flex flex-wrap gap-1.5">
              {equipmentNames.map((name) => (
                <Chip
                  key={name}
                  size="sm"
                  variant="soft"
                >
                  {name}
                </Chip>
              ))}
            </div>
          </section>
        )}

        {/* Images */}
        {exercise.images.length > 0 && (
          <section className="border-t border-divider py-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Images</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {exercise.images.map((src, i) => (
                <img
                  alt={`${exercise.name} ${i + 1}`}
                  className="aspect-square rounded-lg object-cover"
                  key={src}
                  src={src}
                />
              ))}
            </div>
          </section>
        )}

        {/* Meta */}
        <section className="border-t border-divider py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-foreground-400">Created</p>
              <p>{formatDate(exercise.inserted_at)}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-400">Last updated</p>
              <p>{formatDate(exercise.updated_at)}</p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
