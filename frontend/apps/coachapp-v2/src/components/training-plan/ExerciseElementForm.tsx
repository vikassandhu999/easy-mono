import {Autocomplete, Button, Card, Input, Label, ListBox, SearchField, useFilter} from '@heroui/react';
import {Plus, Save, Trash2} from 'lucide-react';
import {useState} from 'react';

import type {SetDraft} from '@/components/training-plan/WorkoutSetRow';

import {EMPTY_SET, SetRow} from '@/components/training-plan/WorkoutSetRow';

export type ExerciseElementData = {
  exerciseId: string;
  notes: string;
  position: string;
  sets: SetDraft[];
};

type ExerciseElementFormProps = {
  exercises: {id: string; name: string}[];
  isSubmitting: boolean;
  nextPosition: number;
  onCancel: () => void;
  onSave: (data: ExerciseElementData) => void;
};

export default function ExerciseElementForm({
  exercises,
  isSubmitting,
  nextPosition,
  onCancel,
  onSave,
}: ExerciseElementFormProps) {
  const {contains} = useFilter({sensitivity: 'base'});
  const [exerciseId, setExerciseId] = useState('');
  const [notes, setNotes] = useState('');
  const [position, setPosition] = useState('');
  const [sets, setSets] = useState<SetDraft[]>([{...EMPTY_SET}]);

  const handleClear = () => {
    setExerciseId('');
    setNotes('');
    setPosition('');
    setSets([{...EMPTY_SET}]);
  };

  const updateSet = (index: number, next: SetDraft) => {
    setSets((prev) => {
      const nextSets = [...prev];
      nextSets[index] = next;
      return nextSets;
    });
  };

  const removeSet = (index: number) => {
    setSets((prev) => {
      const nextSets = prev.filter((_, i) => i !== index);
      return nextSets.length > 0 ? nextSets : [{...EMPTY_SET}];
    });
  };

  return (
    <Card className="rounded-xl border border-separator bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-5">
        <Autocomplete
          allowsEmptyCollection
          fullWidth
          onChange={(value) => setExerciseId(value?.toString() ?? '')}
          value={exerciseId || null}
          variant="secondary"
        >
          <Label className="text-sm font-medium text-foreground">Exercise</Label>
          <Autocomplete.Trigger className="min-h-11">
            <Autocomplete.Value />
            <Autocomplete.ClearButton />
            <Autocomplete.Indicator />
          </Autocomplete.Trigger>
          <Autocomplete.Popover>
            <Autocomplete.Filter filter={contains}>
              <SearchField>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Search exercise..." />
                </SearchField.Group>
              </SearchField>
              <ListBox>
                {exercises.map((exercise) => (
                  <ListBox.Item
                    id={exercise.id}
                    key={exercise.id}
                    textValue={exercise.name}
                  >
                    <span className="text-sm">{exercise.name}</span>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Autocomplete.Filter>
          </Autocomplete.Popover>
        </Autocomplete>

        {exerciseId ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-sm font-medium text-foreground">Order</Label>
                <Input
                  className="min-h-11"
                  min={1}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder={String(nextPosition)}
                  type="number"
                  value={position}
                  variant="secondary"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Notes (optional)</Label>
                <Input
                  className="min-h-11"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Exercise notes..."
                  value={notes}
                  variant="secondary"
                />
              </div>
            </div>

            <div className="border-t border-separator" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Sets</p>
                <p className="text-xs text-muted">
                  {sets.length} set{sets.length === 1 ? '' : 's'} configured
                </p>
              </div>
              <Button
                className="min-h-9"
                onPress={() => setSets((prev) => [...prev, {...EMPTY_SET}])}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                Add set
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {sets.map((setDraft, index) => (
                <SetRow
                  key={index}
                  onChange={(next) => updateSet(index, next)}
                  onRemove={() => removeSet(index)}
                  setDraft={setDraft}
                  setIndex={index}
                />
              ))}
            </div>
          </>
        ) : null}

        <div className="flex justify-between border-t border-separator pt-4">
          <Button
            className="min-h-11 text-muted"
            onPress={handleClear}
            size="md"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
          <div className="flex gap-2">
            <Button
              className="min-h-11"
              onPress={onCancel}
              size="md"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              className="min-h-11"
              isDisabled={isSubmitting || !exerciseId}
              onPress={() => onSave({exerciseId, notes, position, sets})}
              size="md"
              variant="primary"
            >
              <Save className="h-4 w-4" />
              Save exercise
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
