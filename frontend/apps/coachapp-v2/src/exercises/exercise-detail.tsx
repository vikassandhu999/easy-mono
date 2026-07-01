import {formatIsoDateOnly} from '@easy/utils';
import {AlertDialog, Button, Chip, Spinner, Typography, toast} from '@heroui/react';
import {ArrowLeft, Copy, Dumbbell, Pencil, Trash2} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
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

  if (isLoading) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Exercise</Page.Title>
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
            <Page.Title>Exercise</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Exercises
          </Button>
        </Page.Toolbar>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
            <Typography
              className="text-danger"
              type="body-sm"
            >
              Exercise couldn&apos;t load. It may not exist, or you may not have access
            </Typography>
          </div>
        </Page.Content>
      </Page>
    );
  }

  const exercise = data.data;
  const isSystemExercise = exercise.source === 'system';
  const mechanicsLabel = exercise.mechanics ? MECHANICS_LABEL[exercise.mechanics] : null;
  const forceLabel = exercise.force ? FORCE_LABEL[exercise.force] : null;
  const muscleNames = exercise.muscles.map((m) => m.name);
  const equipmentNames = exercise.equipment.map((e) => e.name);

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup className={'flex items-center'}>
          <Button
            onPress={goBack}
            size="md"
            variant="ghost"
            isIconOnly
          >
            <ArrowLeft size={20} />
          </Button>
          <Page.Title>Exercise</Page.Title>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar className="flex flex-wrap items-center gap-2">
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
                    <Typography>
                      This will permanently delete <strong>{exercise.name}</strong>. This action cannot be undone.
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
        )}
      </Page.Toolbar>

      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-lg">
          <div className="flex items-start gap-4 pb-6">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-surface-secondary">
              {exercise.images[0] ? (
                <img
                  alt={exercise.name}
                  className="size-14 rounded-xl object-cover"
                  src={exercise.images[0]}
                />
              ) : (
                <Dumbbell
                  className="text-muted"
                  size={24}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Typography
                className="wrap-break-word"
                type="h5"
              >
                {exercise.name}
              </Typography>
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

          {exercise.description && (
            <section className="border-t border-border py-4">
              <Typography
                className="mb-2"
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                Description
              </Typography>
              <Typography
                className="whitespace-pre-wrap"
                type="body-sm"
              >
                {exercise.description}
              </Typography>
            </section>
          )}

          {exercise.instructions && (
            <section className="border-t border-border py-4">
              <Typography
                className="mb-2"
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                Instructions
              </Typography>
              <Typography
                className="whitespace-pre-wrap"
                type="body-sm"
              >
                {exercise.instructions}
              </Typography>
            </section>
          )}

          {muscleNames.length > 0 && (
            <section className="border-t border-border py-4">
              <Typography
                className="mb-2"
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                Target muscles
              </Typography>
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

          {equipmentNames.length > 0 && (
            <section className="border-t border-border py-4">
              <Typography
                className="mb-2"
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                Equipment
              </Typography>
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

          {exercise.images.length > 0 && (
            <section className="border-t border-border py-4">
              <Typography
                className="mb-2"
                color="muted"
                type="body-xs"
                weight="semibold"
              >
                Images
              </Typography>
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

          <section className="border-t border-border py-4">
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
                <Typography>{formatIsoDateOnly(exercise.inserted_at)}</Typography>
              </div>
              <div>
                <Typography
                  color="muted"
                  type="body-xs"
                >
                  Last updated
                </Typography>
                <Typography>{formatIsoDateOnly(exercise.updated_at)}</Typography>
              </div>
            </div>
          </section>
        </div>
      </Page.Content>
    </Page>
  );
}
