/**
 * The workout switcher: one tab per workout with its exercise count, then
 * `+ Workout`.
 */
import {Button, ToggleButton, ToggleButtonGroup} from '@heroui/react';
import {Plus} from 'lucide-react';

import type {TrainingPlanWorkout} from '@/api/training-plans';

interface WorkoutTabsProps {
  workouts: TrainingPlanWorkout[];
  activeId: string | undefined;
  onSelect: (workoutId: string) => void;
  onAdd: () => void;
  isAdding: boolean;
}

export function WorkoutTabs({workouts, activeId, onSelect, onAdd, isAdding}: WorkoutTabsProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 pb-0.5 sm:flex-nowrap sm:overflow-x-auto"
      data-testid="tb-tabs-row"
    >
      {workouts.length > 0 ? (
        <ToggleButtonGroup
          aria-label="Workouts"
          className="flex flex-wrap gap-2 sm:flex-nowrap"
          isDetached
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (next) {
              onSelect(String(next));
            }
          }}
          selectedKeys={activeId ? [activeId] : []}
          selectionMode="single"
        >
          {workouts.map((workout) => (
            <ToggleButton
              className="shrink-0 toggle-button--ink"
              data-testid={workout.id === activeId ? 'tb-tab-on' : 'tb-tab-off'}
              id={workout.id}
              key={workout.id}
            >
              {workout.name}
              <span
                className="font-count type-eyebrow font-semibold opacity-60"
                data-testid={workout.id === activeId ? 'tb-tab-count' : undefined}
              >
                {/* A non-breaking space, written as an escape so the next reader
                    can see it. The tab is a flex container, so ordinary
                    whitespace between children collapses and "Upper A 3" would
                    read "Upper A3" (RM-140). Same trap, same fix as
                    `FilterCount` in `@/library/browse-screen`. */}
                {'\u00a0'}
                {workout.workout_elements.length}
              </span>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      ) : null}

      <Button
        className="shrink-0 gap-1 rounded-control border border-dashed border-border bg-transparent px-3 font-btn type-eyebrow font-semibold leading-none text-accent"
        data-testid="tb-add-workout"
        isPending={isAdding}
        onPress={onAdd}
        variant="ghost"
      >
        <Plus className="size-3.5" />
        Workout
      </Button>
    </div>
  );
}
