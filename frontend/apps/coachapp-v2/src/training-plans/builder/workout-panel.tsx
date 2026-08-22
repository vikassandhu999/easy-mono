/**
 * The active workout's body (badge TB): a stack of exercise cards, then
 * `+ Add exercise`. Only the selected workout renders — the tabs above pick it
 * — so this is a plain section rather than an accordion.
 *
 * There is no card around the stack. A workout relates to its exercises the way
 * a nutrition day relates to its meals, and that screen puts its day header
 * straight on the page with the meal cards below; wrapping the training
 * equivalent in a second card nested every exercise card inside another box for
 * no reason the design asks for.
 *
 * The header region and the delete confirm live with `WorkoutHeader` in
 * `plan-builder`, because the tab row lists EVERY workout while this component
 * only ever knows about one.
 */
import {Button} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useState} from 'react';

import type {TrainingPlanWorkout} from '@/api/training-plan-builder';
import {ExerciseCard} from '@/training-plans/builder/exercise-card';
import {ExercisePicker} from '@/training-plans/builder/exercise-picker';
import type {PlanBuilderCommands} from '@/training-plans/builder/use-plan-builder';

interface WorkoutPanelProps {
  workout: TrainingPlanWorkout;
  onOpenSet: (elementId: string, setIndex: number, anchor: HTMLElement) => void;
  commands: PlanBuilderCommands;
}

export function WorkoutPanel({workout, onOpenSet, commands}: WorkoutPanelProps) {
  const [isPickerOpen, setPickerOpen] = useState(false);
  const elements = workout.workout_elements;

  return (
    <div
      className="relative"
      data-testid="tb-card"
    >
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
    </div>
  );
}
