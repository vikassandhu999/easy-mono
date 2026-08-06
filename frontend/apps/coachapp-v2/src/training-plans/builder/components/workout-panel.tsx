/**
 * The active workout (badge TB): header · schedule line · a stack of exercise
 * cards · `+ Add exercise`. Only the selected workout renders — the tabs above
 * pick it — so this is a plain section rather than an accordion.
 *
 * There is no card around the stack. A workout relates to its exercises the way
 * a nutrition day relates to its meals, and that screen puts its day header and
 * energy line straight on the page with the meal cards below; wrapping the
 * training equivalent in a second card nested every exercise card inside
 * another box for no reason the design asks for.
 */
import {AlertDialog, Button, Spinner, Typography, useOverlayState} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useState} from 'react';

import type {TrainingPlanWorkout} from '@/api/training-plan-builder';

import {type Day, scheduleLabel} from '../schedule';
import type {PlanBuilderCommands} from '../use-plan-builder';
import {ExerciseCard} from './exercise-card';
import {ExercisePicker} from './exercise-picker';
import {WorkoutHeader} from './workout-header';

interface WorkoutPanelProps {
  workout: TrainingPlanWorkout;
  scheduledDays: Day[];
  autoRename: boolean;
  onRenameSettled: () => void;
  onOpenSet: (elementId: string, setIndex: number, anchor: HTMLElement) => void;
  commands: PlanBuilderCommands;
}

export function WorkoutPanel({
  workout,
  scheduledDays,
  autoRename,
  onRenameSettled,
  onOpenSet,
  commands,
}: WorkoutPanelProps) {
  const deleteAlert = useOverlayState();
  const [isPickerOpen, setPickerOpen] = useState(false);
  const elements = workout.workout_elements;

  return (
    <div
      className="relative"
      data-testid="tb-card"
    >
      <WorkoutHeader
        autoRename={autoRename}
        name={workout.name}
        onDelete={deleteAlert.open}
        onRename={(name) => commands.renameWorkout(workout.id, name)}
        onRenameSettled={onRenameSettled}
        onToggleDay={(day, isSelected) => commands.scheduleDay(day, isSelected ? workout.id : null)}
        scheduledDays={scheduledDays}
      />

      <div
        className="flex flex-col pb-3 [row-gap:normal] [column-gap:normal]"
        data-testid="tb-sched-row"
      >
        <span
          className="font-count type-eyebrow font-semibold text-muted"
          data-testid="tb-sched-label"
        >
          {scheduleLabel(scheduledDays)}
        </span>

        {/* INTERACTIONS.md § TB — a workout on several weekdays is edited in one place. */}
        {scheduledDays.length > 1 ? (
          <Typography
            className="mt-0.5 text-muted-2"
            type="body-xs"
          >
            Edits apply to all of them.
          </Typography>
        ) : null}
      </div>

      <div
        className="flex flex-col gap-3"
        data-testid="tb-exercises"
      >
        {elements.length === 0 ? (
          <div
            className="rounded-panel border border-border border-dashed py-5 text-center type-eyebrow text-muted"
            data-testid="tb-empty"
          >
            No exercises yet — add the first one below.
          </div>
        ) : (
          elements.map((element, index) => (
            <ExerciseCard
              key={element.id}
              element={element}
              isFirst={index === 0}
              isLast={index === elements.length - 1}
              onAddSet={(anchor) => {
                commands.addSet(element.id);
                onOpenSet(element.id, element.planned_sets.length, anchor);
              }}
              onMove={(direction) => commands.moveExercise(workout.id, index, index + direction)}
              onOpenSet={(setIndex, anchor) => onOpenSet(element.id, setIndex, anchor)}
              onRemove={() => commands.removeExercise(workout.id, element.id)}
              onRemoveSet={(setIndex) => commands.dropSet(element.id, setIndex)}
            />
          ))
        )}
      </div>

      <div
        className="py-3"
        data-testid="tb-add-exercise-row"
      >
        <Button
          className="gap-1.5 rounded-none bg-transparent px-0 font-btn type-body font-semibold leading-[normal] text-accent"
          data-testid="tb-add-exercise"
          onPress={() => setPickerOpen(true)}
          variant="ghost"
        >
          <Plus />
          Add exercise
        </Button>
      </div>

      <ExercisePicker
        isOpen={isPickerOpen}
        onAdd={(exercises) => commands.addExercises(workout.id, exercises)}
        onClose={() => setPickerOpen(false)}
      />

      <AlertDialog.Backdrop
        isDismissable={!commands.isRemovingWorkout}
        isOpen={deleteAlert.isOpen}
        onOpenChange={deleteAlert.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete "{workout.name}"?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>Its exercises go with it, and it comes off the weekly schedule.</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={commands.isRemovingWorkout}
                slot="close"
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                className="relative"
                isPending={commands.isRemovingWorkout}
                onPress={() => {
                  // The dialog closes when the delete settles; commit's own
                  // catch has already toasted a failure.
                  commands.removeWorkout(workout.id).then(deleteAlert.close, () => undefined);
                }}
                variant="danger"
              >
                <span className={commands.isRemovingWorkout ? 'invisible' : undefined}>Delete</span>
                {commands.isRemovingWorkout ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Spinner
                      color="current"
                      size="sm"
                    />
                    <span className="sr-only">Deleting</span>
                  </span>
                ) : null}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  );
}
