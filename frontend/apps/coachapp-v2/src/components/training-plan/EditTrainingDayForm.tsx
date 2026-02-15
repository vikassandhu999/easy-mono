import {Button, Card, Input, Label, TextField, toast} from '@heroui/react';
import {Save, Trash2} from 'lucide-react';
import {useState} from 'react';

import {useDeletePlannedWorkoutMutation, useUpdatePlannedWorkoutMutation} from '@/api/trainingPlans';

// Defined strictly to match the API response shape we care about
export interface PlannedWorkoutData {
  day_number: number;
  id: string;
  name: string;
  notes?: null | string;
}

interface EditDayFormProps {
  onNavigateBack: () => void;
  planId: string;
  workout: PlannedWorkoutData;
}

export function EditDayForm({workout, planId, onNavigateBack}: EditDayFormProps) {
  const [updatePlannedWorkout, {isLoading: isUpdating}] = useUpdatePlannedWorkoutMutation();
  const [deletePlannedWorkout, {isLoading: isDeleting}] = useDeletePlannedWorkoutMutation();

  // Initialize state directly from props.
  // The parent component controls the `key` to reset this form when workout changes.
  const [dayNumber, setDayNumber] = useState(workout.day_number);
  const [name, setName] = useState(workout.name);
  const [notes, setNotes] = useState(workout.notes ?? '');

  const isMutating = isUpdating || isDeleting;

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      await updatePlannedWorkout({
        body: {
          day_number: dayNumber,
          name: name.trim(),
          notes: notes.trim() || undefined,
        },
        id: workout.id,
        planId,
      }).unwrap();
      toast.success('Changes saved');
      onNavigateBack();
    } catch {
      toast.danger('Failed to save changes');
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this day?');
    if (!confirmed) return;

    try {
      await deletePlannedWorkout({id: workout.id, planId}).unwrap();
      toast.success('Day deleted');
      onNavigateBack();
    } catch {
      toast.danger('Failed to delete day');
    }
  };

  return (
    <Card className="rounded-xl border border-separator bg-surface p-5">
      <div className="flex flex-col gap-4">
        <TextField>
          <Label className="text-sm font-medium text-foreground">Day number</Label>
          <Input
            max={7}
            min={1}
            onChange={(e) => setDayNumber(Math.max(1, Math.min(7, Number(e.target.value))))}
            type="number"
            value={String(dayNumber)}
            variant="secondary"
          />
        </TextField>

        <TextField>
          <Label className="text-sm font-medium text-foreground">Workout name</Label>
          <Input
            onChange={(e) => setName(e.target.value)}
            value={name}
            variant="secondary"
          />
        </TextField>

        <TextField>
          <Label className="text-sm font-medium text-foreground">Notes</Label>
          <Input
            onChange={(e) => setNotes(e.target.value)}
            value={notes}
            variant="secondary"
          />
        </TextField>

        <div className="flex justify-between">
          <Button
            className="min-h-11"
            isDisabled={isMutating}
            onPress={handleDelete}
            size="md"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button
              className="min-h-11"
              onPress={onNavigateBack}
              size="md"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              className="min-h-11"
              isDisabled={isMutating || !name.trim()}
              onPress={handleSave}
              size="md"
              variant="primary"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
