import {useState} from 'react';
import {errorMessage} from '../api/client';
import {type Exercise, useExercise} from '../api/exercises';
import {Button} from './button';
import {Dialog, DialogHeader, DialogTitle} from './dialog';
import {FormError} from './form-error';
import {MediaPreview} from './media-preview';

export function ExerciseDemonstration({exercise}: {exercise: Pick<Exercise, 'media' | 'images' | 'name'>}) {
  return (
    <div className="space-y-3">
      {exercise.media && (
        <MediaPreview
          key={exercise.media.id}
          url={exercise.media.url}
          kind={exercise.media.kind}
          label={`${exercise.name} demonstration`}
        />
      )}
      {exercise.images.map((url, index) => (
        <MediaPreview
          key={`${url}-${index}`}
          url={url}
          kind="image"
          label={`${exercise.name} reference photo ${index + 1}`}
        />
      ))}
    </div>
  );
}

export function ExercisePreview({id, name}: {id: string; name: string}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`View ${name} details`}
        onPress={() => setOpen(true)}
      >
        View movement
      </Button>
      {open && (
        <ExerciseReader
          id={id}
          name={name}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ExerciseReader({id, name, onClose}: {id: string; name: string; onClose: () => void}) {
  const query = useExercise(id);
  const exercise = query.data?.data;
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>{exercise?.name ?? name}</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        {query.isPending && <p role="status">Loading exercise…</p>}
        {query.isError && (
          <div className="space-y-3">
            <FormError message={errorMessage(query.error, 'Could not load this exercise.')} />
            <Button
              variant="outline"
              isPending={query.isFetching}
              onPress={() => {
                query.refetch();
              }}
            >
              Retry exercise details
            </Button>
          </div>
        )}
        {exercise && (
          <>
            <ExerciseDemonstration exercise={exercise} />
            <p className="whitespace-pre-wrap break-words text-sm">
              {exercise.instructions || 'No coaching instructions added.'}
            </p>
            {exercise.description && (
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{exercise.description}</p>
            )}
            {exercise.equipment.length > 0 && (
              <p className="text-sm text-muted-foreground">{exercise.equipment.map((item) => item.name).join(' · ')}</p>
            )}
          </>
        )}
        <Button
          variant="outline"
          onPress={onClose}
        >
          Back to plan
        </Button>
      </div>
    </Dialog>
  );
}
