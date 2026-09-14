import {ArrowDown, ArrowUp, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {type Exercise, useExercises} from '../api/exercises';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {ExerciseDemonstration} from '../ui/exercise-preview';
import {InfiniteList} from '../ui/infinite-list';
import {Input} from '../ui/input';
export function ExercisePicker({
  onSelect,
  onClose,
  workoutName,
  purpose = 'add',
}: {
  onSelect: (exercises: Exercise[]) => void;
  onClose: () => void;
  workoutName: string;
  purpose?: 'add' | 'replace';
}) {
  const [selected, setSelected] = useState(() => new Map<string, Exercise>());
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(draft.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [draft]);
  const query = useExercises(search);
  function moveSelection(index: number, target: number) {
    const entries = [...selected.entries()];
    const entry = entries[index];
    if (!entry) {
      return;
    }
    entries.splice(index, 1);
    entries.splice(target, 0, entry);
    setSelected(new Map(entries));
  }
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader className="block pr-12">
        <DialogTitle>{purpose === 'replace' ? 'Replace movement' : 'Add exercises'}</DialogTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {purpose === 'replace'
            ? `Choose a replacement for ${workoutName}.`
            : `Choose movements for ${workoutName || 'this workout'}. Arrange your selection below.`}
        </p>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <div className="grid gap-2">
          <label
            htmlFor="exercise-search"
            className="text-sm font-medium"
          >
            Search exercises
          </label>
          <Input
            autoFocus
            id="exercise-search"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search by name"
          />
        </div>
        <InfiniteList
          query={query}
          label="exercises"
          singular="exercise"
          empty={
            <p className="py-4 text-sm text-muted-foreground">
              {search
                ? 'No matching exercises. Try a different name.'
                : 'No exercises are available in your library yet.'}
            </p>
          }
        >
          {(exercise) => (
            <div className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{exercise.name}</p>
                {exercise.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{exercise.description}</p>
                )}
                {(exercise.instructions ||
                  exercise.equipment.length > 0 ||
                  exercise.media ||
                  exercise.images.length > 0) && <PickerDetails exercise={exercise} />}
              </div>
              <Button
                variant="outline"
                aria-label={`Select ${exercise.name}`}
                aria-pressed={selected.has(exercise.id)}
                onPress={() =>
                  setSelected((previous) => {
                    const next = purpose === 'replace' ? new Map<string, Exercise>() : new Map(previous);
                    if (next.has(exercise.id)) {
                      next.delete(exercise.id);
                    } else {
                      next.set(exercise.id, exercise);
                    }
                    return next;
                  })
                }
              >
                {selected.has(exercise.id) ? 'Selected' : 'Select'}
              </Button>
            </div>
          )}
        </InfiniteList>
      </div>
      <div className="space-y-3 border-t border-border p-4">
        {selected.size > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              {purpose === 'replace' ? 'Replacement' : 'Your exercise order'}
            </p>
            <ol
              aria-label="Selected exercises"
              className="max-h-36 overflow-y-auto"
            >
              {[...selected.values()].map((exercise, index) => (
                <li
                  key={exercise.id}
                  className="flex items-center gap-1"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {index + 1}. {exercise.name}
                  </span>
                  {purpose === 'add' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Move ${exercise.name} up`}
                        isDisabled={index === 0}
                        onPress={() => moveSelection(index, index - 1)}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Move ${exercise.name} down`}
                        isDisabled={index === selected.size - 1}
                        onPress={() => moveSelection(index, index + 1)}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${exercise.name} from selection`}
                    onPress={() =>
                      setSelected((previous) => {
                        const next = new Map(previous);
                        next.delete(exercise.id);
                        return next;
                      })
                    }
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onPress={onClose}
          >
            Cancel
          </Button>
          <Button
            isDisabled={selected.size === 0}
            onPress={() => onSelect([...selected.values()])}
          >
            {purpose === 'replace'
              ? 'Choose replacement'
              : `Add ${selected.size || ''} ${selected.size === 1 ? 'exercise' : 'exercises'}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function PickerDetails({exercise}: {exercise: Exercise}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <details
      className="mt-2 text-sm"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="cursor-pointer py-2 text-muted-foreground">Exercise details</summary>
      {expanded && <ExerciseDemonstration exercise={exercise} />}
      {exercise.equipment.length > 0 && (
        <p className="mt-1">{exercise.equipment.map((item) => item.name).join(', ')}</p>
      )}
      {exercise.instructions && (
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{exercise.instructions}</p>
      )}
    </details>
  );
}
