import {Button, Card, Input, Label, TextField, toast} from '@heroui/react';
import {ArrowLeft, Plus} from 'lucide-react';
import {useState} from 'react';

import {useCreatePlannedWorkoutMutation} from '@/api/trainingPlans';

interface AddDayFormProps {
  nextDayNumber: number;
  onNavigateBack: () => void;
  planId: string;
  planName: string;
}

export function AddDayForm({planName, nextDayNumber, planId, onNavigateBack}: AddDayFormProps) {
  const [createPlannedWorkout, {isLoading: isCreating}] = useCreatePlannedWorkoutMutation();

  const [dayNumber, setDayNumber] = useState(String(nextDayNumber));
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;

    try {
      await createPlannedWorkout({
        body: {
          day_number: Number(dayNumber),
          name: name.trim(),
          notes: notes.trim() || undefined,
        },
        planId,
      }).unwrap();
      toast.success(`Day ${dayNumber} added`);
      onNavigateBack();
    } catch {
      toast.danger('Failed to add day');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button
        className="min-h-11 w-fit gap-2 px-2"
        onPress={onNavigateBack}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to builder
      </Button>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">Training plan</p>
        <h1 className="text-2xl font-semibold text-foreground">Add day</h1>
        <p className="text-sm text-muted">{planName}</p>
      </div>

      <Card className="rounded-xl border border-separator bg-surface p-5">
        <div className="flex flex-col gap-4">
          <TextField>
            <Label className="text-sm font-medium text-foreground">Day number</Label>
            <Input
              max={7}
              min={1}
              onChange={(e) => setDayNumber(e.target.value)}
              placeholder={String(nextDayNumber)}
              type="number"
              value={dayNumber}
              variant="secondary"
            />
          </TextField>

          <TextField>
            <Label className="text-sm font-medium text-foreground">Workout name</Label>
            <Input
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Push Day, Leg Day"
              value={name}
              variant="secondary"
            />
          </TextField>

          <TextField>
            <Label className="text-sm font-medium text-foreground">Notes (optional)</Label>
            <Input
              onChange={(e) => setNotes(e.target.value)}
              value={notes}
              variant="secondary"
            />
          </TextField>

          <div className="flex justify-end gap-2">
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
              isDisabled={isCreating || !name.trim()}
              onPress={handleAdd}
              size="md"
              variant="primary"
            >
              <Plus className="h-4 w-4" />
              Add day
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
