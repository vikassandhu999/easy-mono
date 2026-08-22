/**
 * The training builder's composition root. It owns the three pieces of screen
 * state — which workout is showing, which is being renamed, which set is being
 * edited — and hands everything else down as props. There is exactly ONE set
 * editor for the whole screen.
 */
import {AlertDialog, Button, Spinner, Typography, useOverlayState} from '@heroui/react';
import {useRef, useState} from 'react';
import type {TrainingPlan} from '@/api/training-plans';
import {PlanPeriodCard} from '@/library/plan-period-card';
import {findElement} from '@/library/training-plans/builder/plan-tree';
import {daysForWorkout} from '@/library/training-plans/builder/schedule';
import {SetEditor} from '@/library/training-plans/builder/set-editor';
import {useActiveWorkout, usePlanBuilder} from '@/library/training-plans/builder/use-plan-builder';
import {WorkoutHeader} from '@/library/training-plans/builder/workout-header';
import {WorkoutPanel} from '@/library/training-plans/builder/workout-panel';
import {WorkoutTabs} from '@/library/training-plans/builder/workout-tabs';

export function PlanBuilder({plan}: {plan: TrainingPlan}) {
  const commands = usePlanBuilder(plan.id);
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
  const deleteAlert = useOverlayState();

  const addWorkout = async () => {
    const workout = await commands.addWorkout();
    if (workout) {
      selectWorkout(workout.id);
      setRenamingId(workout.id);
    }
  };

  const tabs = {
    activeId: activeWorkout?.id,
    isAdding: commands.isAddingWorkout,
    onAdd: () => {
      addWorkout().catch(() => undefined);
    },
    onSelect: (workoutId: string) => {
      selectWorkout(workoutId);
      setRenamingId(null);
    },
    workouts: plan.workouts,
  };

  return (
    <div className="flex flex-col gap-4">
      {plan.client_id ? (
        <PlanPeriodCard
          endDate={plan.end_date}
          onSave={commands.setPlanPeriod}
          startDate={plan.start_date}
        />
      ) : null}

      {activeWorkout ? (
        <WorkoutHeader
          autoRename={renamingId === activeWorkout.id}
          name={activeWorkout.name}
          onRename={(name) => commands.renameWorkout(activeWorkout.id, name)}
          onRenameSettled={() => setRenamingId(null)}
          onRequestDelete={deleteAlert.open}
          onToggleDay={(day, isSelected) => commands.scheduleDay(day, isSelected ? activeWorkout.id : null)}
          scheduledDays={daysForWorkout(plan.schedule, activeWorkout.id)}
          tabs={tabs}
        />
      ) : (
        <WorkoutTabs {...tabs} />
      )}

      {activeWorkout ? (
        <WorkoutPanel
          key={activeWorkout.id}
          commands={commands}
          onOpenSet={(elementId, setIndex, anchor) => {
            editorAnchor.current = anchor;
            setEditingSet({elementId, setIndex});
          }}
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

      {activeWorkout ? (
        <AlertDialog.Backdrop
          isDismissable={!commands.isRemovingWorkout}
          isOpen={deleteAlert.isOpen}
          onOpenChange={deleteAlert.setOpen}
          variant="transparent"
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Delete "{activeWorkout.name}"?</AlertDialog.Heading>
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
                    commands.removeWorkout(activeWorkout.id).then(deleteAlert.close, () => undefined);
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
      ) : null}
    </div>
  );
}
