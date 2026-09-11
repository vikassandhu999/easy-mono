import {useEffect, useState} from 'react';
import {errorMessage} from '../api/client';
import {type ExerciseRelation, useExerciseRelations} from '../api/exercises';
import {Button} from '../ui/button';
import {Checkbox} from '../ui/checkbox';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {Input} from '../ui/input';

export function ExerciseRelations({
  kind,
  value,
  onChange,
  disabled,
}: {
  kind: 'muscles' | 'equipment';
  value: ExerciseRelation[];
  onChange: (value: ExerciseRelation[]) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section
      className="space-y-2"
      aria-label={kind === 'muscles' ? 'Muscles' : 'Equipment'}
    >
      <h3 className="font-medium capitalize">{kind}</h3>
      <p className="text-sm text-muted-foreground">
        {value.length > 0 ? value.map((item) => item.name).join(' · ') : 'Not specified'}
      </p>
      <Button
        variant="outline"
        isDisabled={disabled}
        onPress={() => setOpen(true)}
      >
        Choose {kind}
      </Button>
      {open && (
        <Picker
          kind={kind}
          initial={value}
          onClose={() => setOpen(false)}
          onSave={(selected) => {
            onChange(selected);
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}

function Picker({
  kind,
  initial,
  onClose,
  onSave,
}: {
  kind: 'muscles' | 'equipment';
  initial: ExerciseRelation[];
  onClose: () => void;
  onSave: (value: ExerciseRelation[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Map(initial.map((item) => [item.id, item])));
  const query = useExerciseRelations(kind, search);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(draft.trim()), 300);
    return () => clearTimeout(timer);
  }, [draft]);
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
        <DialogTitle>Choose {kind}</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <label
          htmlFor={`search-${kind}`}
          className="grid gap-2 text-sm"
        >
          Search {kind}
          <Input
            autoFocus
            id={`search-${kind}`}
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        {query.isPending ? (
          <p role="status">Loading {kind}…</p>
        ) : query.isError ? (
          <div className="space-y-3">
            <FormError message={errorMessage(query.error, `Could not load ${kind}. Your selections are still here.`)} />
            <Button
              variant="outline"
              isPending={query.isFetching}
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : query.data.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching {kind}. Try another name.</p>
        ) : (
          <div className="grid gap-x-4 sm:grid-cols-2">
            {query.data.data.map((item) => (
              <Checkbox
                key={item.id}
                isSelected={selected.has(item.id)}
                onChange={(checked) =>
                  setSelected((previous) => {
                    const next = new Map(previous);
                    if (checked) {
                      next.set(item.id, item);
                    } else {
                      next.delete(item.id);
                    }
                    return next;
                  })
                }
              >
                {item.name}
              </Checkbox>
            ))}
          </div>
        )}
        {selected.size > 0 && (
          <section
            className="space-y-2"
            aria-label="Selected items"
          >
            <h3 className="text-sm font-medium">Selected</h3>
            <div className="flex flex-wrap gap-2">
              {[...selected.values()].map((item) => (
                <Button
                  key={item.id}
                  variant="secondary"
                  aria-label={`Remove ${item.name}`}
                  onPress={() =>
                    setSelected((previous) => {
                      const next = new Map(previous);
                      next.delete(item.id);
                      return next;
                    })
                  }
                >
                  {item.name} ×
                </Button>
              ))}
            </div>
          </section>
        )}
      </div>
      <div className="flex justify-between gap-3 border-t border-border p-4">
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Cancel
        </Button>
        <Button onPress={() => onSave([...selected.values()])}>Use selection</Button>
      </div>
    </Dialog>
  );
}
