import {formatIsoDateOnly} from '@easy/utils';
import {AlertDialog, Button, Chip, Typography, toast} from '@heroui/react';
import {Copy, Dumbbell, Image as ImageIcon, Pencil, Trash2} from 'lucide-react';
import type {ReactNode} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {OUTLINE_CHIP_CLASS} from '@/@components/browse-list-box';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {coachApi, useCopyExerciseMutation, useDeleteExerciseMutation, useGetExerciseQuery} from '@/api/generated';
import {useAppDispatch} from '@/store';

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

function SectionHeading({title}: {title: string}) {
  return <Typography type="h6">{title}</Typography>;
}

// The exercise API stores instructions as a single free-text field; render each
// non-empty line as a numbered step (GAPS #14 — number adornment, plain text).
// Strip any leading enumerator the coach typed ("1.", "2)") so the number badge
// isn't duplicated.
function toSteps(instructions: string): string[] {
  return instructions
    .split('\n')
    .map((line) => line.trim().replace(/^\d+[.)]\s*/, ''))
    .filter(Boolean);
}

export default function ExerciseDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const goBack = useGoBack(ROUTES.EXERCISES);
  const {data, isError, isLoading} = useGetExerciseQuery({id: id!});
  const [deleteExercise, {isLoading: isDeleting}] = useDeleteExerciseMutation();
  const [copyExercise, {isLoading: isDuplicating}] = useCopyExerciseMutation();

  const handleDuplicate = async () => {
    const exercise = data?.data;
    try {
      const result = await copyExercise({
        id: id!,
        trainingExerciseCopyRequest: {name: `${exercise?.name ?? 'Exercise'} (copy)`},
      }).unwrap();
      // copyExercise is tag:false — invalidate the list so the copy is present
      // when the coach navigates back to it (mirrors handleDelete below).
      dispatch(coachApi.util.invalidateTags([{type: 'TrainingExercise', id: 'LIST'}]));
      toast.success('Exercise duplicated');
      navigate(`/library/exercises/${result.data.id}`);
    } catch {
      toast.danger("Exercise wasn't duplicated");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteExercise({id: id!}).unwrap();
      // Generated mutation is tag:false — invalidate the list so the deleted
      // item doesn't linger when we land back on it.
      dispatch(coachApi.util.invalidateTags([{type: 'TrainingExercise', id: 'LIST'}]));
      navigate(ROUTES.EXERCISES, {replace: true});
    } catch {
      toast.danger("Couldn't delete exercise");
    }
  };

  const renderDeleteDialog = (trigger: ReactNode, exerciseName: string) => (
    <AlertDialog>
      {trigger}
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete exercise?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>
                This will permanently delete <strong>{exerciseName}</strong>. This action cannot be undone.
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
                onPress={handleDelete}
                variant="danger"
              >
                {isDeleting ? 'Deleting' : 'Delete'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );

  if (isLoading) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <Page.Title>Exercise</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="pb-6">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup className={'flex items-center'}>
            <BackButton onPress={goBack} />
            <Page.Title>Exercise</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="pb-6">
          <ErrorState message="Exercise couldn't load. It may not exist, or you may not have access" />
        </Page.Content>
      </Page>
    );
  }

  const exercise = data.data;
  const isSystemExercise = exercise.source === 'system';
  const mechanicsLabel = exercise.mechanics ? MECHANICS_LABEL[exercise.mechanics] : null;
  const forceLabel = exercise.force ? FORCE_LABEL[exercise.force] : null;
  const sourceLabel = isSystemExercise ? 'System' : 'Custom';
  const muscleNames = exercise.muscles.map((m) => m.name);
  const equipmentNames = exercise.equipment.map((e) => e.name);
  const steps = exercise.instructions ? toSteps(exercise.instructions) : [];

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup className={'flex items-center'}>
          <BackButton onPress={goBack} />
          <Page.Title className="sm:hidden">Exercise</Page.Title>
        </Page.TitleGroup>
        <Page.Actions className="hidden sm:flex">
          {!isSystemExercise && (
            <Button
              className="bg-ink text-ink-foreground"
              onPress={() => navigate(`/library/exercises/${exercise.id}/edit`)}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
          <Button
            isPending={isDuplicating}
            onPress={handleDuplicate}
            variant="outline"
          >
            <Copy className="size-4" />
            Duplicate
          </Button>
          {!isSystemExercise &&
            renderDeleteDialog(
              <Button
                aria-label="Delete exercise"
                className="text-danger"
                variant="outline"
              >
                <Trash2 className="size-4" />
              </Button>,
              exercise.name,
            )}
        </Page.Actions>
      </Page.Header>

      <Page.Content className="pb-6">
        <div className="max-w-2xl">
          {/* Identity + media: media leads on mobile, identity leads on desktop */}
          <div className="flex flex-col gap-6">
            <div className="order-2 flex items-start gap-4 sm:order-1">
              <div className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-surface-secondary sm:flex">
                <Dumbbell className="size-6 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <Typography
                  className="break-words"
                  type="h3"
                >
                  {exercise.name}
                </Typography>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {mechanicsLabel && (
                    <Chip
                      className={OUTLINE_CHIP_CLASS}
                      variant="secondary"
                    >
                      {mechanicsLabel}
                    </Chip>
                  )}
                  {forceLabel && (
                    <Chip
                      className={OUTLINE_CHIP_CLASS}
                      variant="secondary"
                    >
                      {forceLabel}
                    </Chip>
                  )}
                  <Chip
                    className={OUTLINE_CHIP_CLASS}
                    variant="secondary"
                  >
                    {sourceLabel}
                  </Chip>
                </div>
              </div>
            </div>

            <div className="order-1 sm:order-2">
              {exercise.images[0] ? (
                <img
                  alt={exercise.name}
                  className="aspect-[4/3] w-full rounded-card border border-border object-cover sm:aspect-video"
                  src={exercise.images[0]}
                />
              ) : (
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface-secondary sm:aspect-video">
                  <ImageIcon className="size-7 text-muted-2" />
                  <Typography
                    color="muted"
                    type="body-sm"
                  >
                    No demo added yet
                  </Typography>
                </div>
              )}
            </div>
          </div>

          {exercise.description && (
            <section className="mt-8">
              <SectionHeading title="About this movement" />
              <Typography
                className="mt-3 whitespace-pre-wrap"
                color="muted"
              >
                {exercise.description}
              </Typography>
            </section>
          )}

          {steps.length > 0 && (
            <section className="mt-8">
              <SectionHeading title="Instructions" />
              <div className="mt-3 flex flex-col gap-4">
                {steps.map((step, i) => (
                  <div
                    className="flex items-start gap-3"
                    key={i}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                      {i + 1}
                    </span>
                    <Typography>{step}</Typography>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(muscleNames.length > 0 || equipmentNames.length > 0) && (
            <section className="mt-8 border-t border-separator pt-6">
              {muscleNames.length > 0 && (
                <div>
                  <Typography
                    color="muted"
                    type="body-sm"
                  >
                    Target muscles
                  </Typography>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {muscleNames.map((name) => (
                      <Chip
                        className={OUTLINE_CHIP_CLASS}
                        key={name}
                        variant="secondary"
                      >
                        {name}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              {equipmentNames.length > 0 && (
                <div className="mt-5">
                  <Typography
                    color="muted"
                    type="body-sm"
                  >
                    Equipment
                  </Typography>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {equipmentNames.map((name) => (
                      <Chip
                        className={OUTLINE_CHIP_CLASS}
                        key={name}
                        variant="secondary"
                      >
                        {name}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="mt-8 border-t border-separator pt-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  Created
                </Typography>
                <Typography type="body-sm">{formatIsoDateOnly(exercise.inserted_at)}</Typography>
              </div>
              <div>
                <Typography
                  color="muted"
                  type="body-sm"
                >
                  Updated
                </Typography>
                <Typography type="body-sm">{formatIsoDateOnly(exercise.updated_at)}</Typography>
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-10 mt-6 flex items-center gap-2 border-t border-separator bg-surface px-4 py-3 sm:hidden">
          {!isSystemExercise && (
            <Button
              className="flex-1"
              onPress={() => navigate(`/library/exercises/${exercise.id}/edit`)}
              variant="primary"
            >
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
          <Button
            aria-label="Duplicate exercise"
            isPending={isDuplicating}
            onPress={handleDuplicate}
            variant="outline"
          >
            <Copy className="size-4" />
          </Button>
          {!isSystemExercise &&
            renderDeleteDialog(
              <Button
                aria-label="Delete exercise"
                className="text-danger"
                variant="outline"
              >
                <Trash2 className="size-4" />
              </Button>,
              exercise.name,
            )}
        </div>
      </Page.Content>
    </Page>
  );
}
