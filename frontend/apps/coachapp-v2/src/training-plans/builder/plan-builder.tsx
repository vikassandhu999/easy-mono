/**
 * The training builder's composition root.
 *
 * It owns the three pieces of screen state — which workout is showing, which
 * workout is being renamed, which set is being edited — and hands everything
 * else down as props. There is exactly ONE set editor for the screen: it used
 * to be mounted per exercise row, which meant an editor, a set index and an
 * anchor-ref array per row, all of which had to be kept in step by hand.
 */
import {Typography} from '@heroui/react';
import {useRef, useState} from 'react';

import type {TrainingPlan} from '@/api/generated';

import {PlanPeriodCard} from './components/plan-period-card';
import {SetEditor} from './components/set-editor';
import {WorkoutPanel} from './components/workout-panel';
import {WorkoutTabs} from './components/workout-tabs';
import {findElement} from './plan-tree';
import {daysForWorkout} from './schedule';
import {useActiveWorkout, usePlanBuilder, workoutActions} from './use-plan-builder';

export function PlanBuilder({plan}: {plan: TrainingPlan}) {
  const commands = usePlanBuilder(plan);
  // A stale `?w=` — after deleting the workout it named — falls through to the
  // first workout. That fallback is the only correction needed, and it self-heals
  // on the next tab press.
  const [activeWorkout, selectWorkout] = useActiveWorkout(plan.workouts);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [editingSet, setEditingSet] = useState<{elementId: string; setIndex: number} | null>(null);
  // The row (or button) the coach pressed, captured from the press event — so
  // the desktop popover has an anchor without any ref registry.
  const editorAnchor = useRef<HTMLElement | null>(null);

  const editingElement = editingSet ? findElement(plan, editingSet.elementId)?.element : undefined;

  const addWorkout = async () => {
    const workout = await commands.addWorkout();
    if (workout) {
      selectWorkout(workout.id);
      setRenamingId(workout.id);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {plan.client_id ? (
        <PlanPeriodCard
          endDate={plan.end_date}
          onChange={commands.setPlanDate}
          startDate={plan.start_date}
        />
      ) : null}

      <WorkoutTabs
        activeId={activeWorkout?.id}
        isAdding={commands.isAddingWorkout}
        onAdd={() => {
          addWorkout().catch(() => undefined);
        }}
        onSelect={(workoutId) => {
          selectWorkout(workoutId);
          setRenamingId(null);
        }}
        workouts={plan.workouts}
      />

      {activeWorkout ? (
        <WorkoutPanel
          key={activeWorkout.id}
          actions={workoutActions(commands, activeWorkout.id)}
          autoRename={renamingId === activeWorkout.id}
          onOpenSet={(elementId, setIndex, anchor) => {
            editorAnchor.current = anchor;
            setEditingSet({elementId, setIndex});
          }}
          onRenameSettled={() => setRenamingId(null)}
          scheduledDays={daysForWorkout(plan.plan_items, activeWorkout.id)}
          workout={activeWorkout}
        />
      ) : (
        <Typography
          className="py-2"
          color="muted"
          type="body-sm"
        >
          No workouts yet — add the first one above.
        </Typography>
      )}

      {editingSet && editingElement ? (
        <SetEditor
          anchorRef={editorAnchor}
          element={editingElement}
          isOpen
          onChange={(values) => commands.editSet(editingSet.elementId, editingSet.setIndex, values)}
          onClose={() => setEditingSet(null)}
          onSelectIndex={(setIndex) => setEditingSet({...editingSet, setIndex})}
          setIndex={editingSet.setIndex}
        />
      ) : null}
    </div>
  );
}
