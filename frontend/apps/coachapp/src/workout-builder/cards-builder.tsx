import {AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Minus, Plus, Trash2, X} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Button} from '../ui/button';
import {Checkbox} from '../ui/checkbox';
import {cn} from '../ui/cn';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {type Undo, UndoToast} from '../ui/week-editor';
import {
  actions,
  groupLabel,
  groupSummary,
  groupTitle,
  hasDifferentRounds,
  keysOf,
  labelFor,
  letterOf,
  restoreRemoval,
  restoreRounds,
  restoreTargetMode,
  targetLabel,
  targetProblem,
  type Where,
  type Workout,
} from './model';
import {type BuilderProps, ExercisePicker, fieldClass, TargetEditor} from './parts';

export function CardsBuilder({
  workout,
  setWorkout,
  onUndoActive,
  validationVisible = false,
}: BuilderProps & {onUndoActive: (active: boolean) => void; validationVisible?: boolean}) {
  const [editing, setEditing] = useState<Where | null>(null);
  // A group index adds to that group; 'new' adds a new single-exercise group.
  const [picker, setPicker] = useState<number | 'new' | null>(null);
  const [undo, setUndo] = useState<Undo<(current: Workout) => Workout> | null>(null);
  const [confirmTargets, setConfirmTargets] = useState<Where | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const expireUndo = useCallback(() => setUndo(null), []);
  useEffect(() => {
    onUndoActive(Boolean(undo));
    return () => onUndoActive(false);
  }, [undo, onUndoActive]);
  const [reordering, setReordering] = useState(false);

  const same = (where: Where) =>
    editing?.group === where.group &&
    editing.exercise === where.exercise &&
    editing.key === where.key &&
    editing.round === where.round;
  const toggle = (where: Where) => setEditing(same(where) ? null : where);
  const changeWithUndo = (message: string, next: Workout, restore: (current: Workout) => Workout) => {
    setEditing(null);
    setUndo({message, before: restore});
    setWorkout(next);
  };
  const remove = (message: string, next: Workout) => {
    changeWithUndo(message, next, (current) => restoreRemoval(current, workout));
  };
  const changeTargetMode = (where: Where, perRound: boolean) => {
    const exercise = workout.groups[where.group]?.exercises[where.exercise];
    if (!exercise || exercise.perRound === perRound) {
      return;
    }
    const next = actions.togglePerRound(workout, where.group, where.exercise);
    changeWithUndo(`${exercise.source.name} targets changed.`, next, (current) => restoreTargetMode(current, exercise));
    setEditing({...where, round: perRound ? 0 : null});
  };
  const editorId = (gi: number, ei: number) => `target-editor-${gi}-${ei}`;
  const pickerGroup = typeof picker === 'number' ? workout.groups[picker] : undefined;
  const pickerKind = ['', ' (superset)', ' (circuit)'][Math.min(pickerGroup?.exercises.length ?? 0, 2)];
  const pickerTitle =
    pickerGroup && typeof picker === 'number'
      ? `Add to ${groupTitle(pickerGroup, picker)}${pickerKind}`
      : 'Add an exercise';

  return (
    <div
      ref={root}
      className="min-w-0 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{reordering ? 'Reorder the workout' : 'Exercises'}</h2>
        <Button
          variant={reordering ? 'default' : 'outline'}
          aria-pressed={reordering}
          isDisabled={workout.groups.length === 0}
          onPress={() => {
            setEditing(null);
            setReordering(!reordering);
          }}
        >
          {reordering ? (
            'Done reordering'
          ) : (
            <>
              <ArrowUpDown />
              Reorder
            </>
          )}
        </Button>
      </div>

      {reordering ? (
        <ReorderList
          workout={workout}
          setWorkout={setWorkout}
        />
      ) : (
        <>
          {workout.groups.map((group, gi) => (
            <section
              key={group.uiId}
              aria-labelledby={`group-${group.uiId}-label`}
              className="min-w-0 rounded-2xl border border-border bg-surface"
            >
              <header className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 pt-3 pb-1">
                <div className="min-w-0 flex-1">
                  <label
                    id={`group-${group.uiId}-label`}
                    htmlFor={`group-${group.uiId}-name`}
                    className="text-sm font-semibold text-muted-foreground"
                  >
                    {groupLabel(group, gi)}
                  </label>
                  <input
                    id={`group-${group.uiId}-name`}
                    placeholder="Add a name, for example Main lift"
                    value={group.name}
                    onChange={(event) => setWorkout(actions.renameGroup(workout, gi, event.target.value))}
                    className="block w-full rounded-md bg-transparent text-lg font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
                  />
                  <p className="text-sm font-medium text-muted-foreground">{groupSummary(group, gi)}</p>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${groupTitle(group, gi)}`}
                  className="text-muted-foreground hover:text-destructive sm:order-last"
                  onPress={() => remove(`${groupTitle(group, gi)} removed.`, actions.removeGroup(workout, gi))}
                >
                  <Trash2 />
                </Button>
                <div
                  role="group"
                  aria-label={`Rounds for ${groupTitle(group, gi)}`}
                  className="flex w-full items-center justify-between rounded-xl border border-border sm:w-auto sm:self-center"
                >
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Fewer rounds"
                    isDisabled={group.rounds <= 1}
                    onPress={() => {
                      const rounds = group.rounds - 1;
                      changeWithUndo(
                        `${groupTitle(group, gi)} reduced to ${rounds} ${rounds === 1 ? 'round' : 'rounds'}.`,
                        actions.setRounds(workout, gi, rounds),
                        (current) => restoreRounds(current, group, rounds),
                      );
                    }}
                  >
                    <Minus />
                  </Button>
                  <output
                    aria-live="polite"
                    className="min-w-0 flex-1 break-words px-1 text-center font-semibold sm:min-w-24"
                  >
                    {group.rounds} {group.rounds === 1 ? 'round' : 'rounds'}
                  </output>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="More rounds"
                    isDisabled={group.rounds >= 100}
                    onPress={() => setWorkout(actions.setRounds(workout, gi, Math.min(100, group.rounds + 1)))}
                  >
                    <Plus />
                  </Button>
                </div>
              </header>

              <ol className="min-w-0 space-y-1 px-2">
                {group.exercises.map((exercise, ei) => {
                  const keys = keysOf(exercise);
                  const open = editing?.group === gi && editing.exercise === ei ? editing : null;
                  return (
                    <li
                      key={exercise.uiId}
                      className="min-w-0 space-y-3 rounded-xl px-2 py-2"
                    >
                      <div className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-2">
                        <span className="w-7 shrink-0 pt-2.5 tabular-nums text-sm font-medium text-muted-foreground">
                          {letterOf(gi)}
                          {ei + 1}
                        </span>
                        <p className="min-w-0 flex-1 break-words pt-2 font-semibold md:w-52 md:flex-none">
                          {exercise.source.name}
                          {exercise.sideMode === 'per_side' && (
                            <span className="ml-2 inline-flex whitespace-nowrap rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                              each side
                            </span>
                          )}
                        </p>
                        <Checkbox
                          aria-label={`Each side for ${exercise.source.name}`}
                          isSelected={exercise.sideMode === 'per_side'}
                          onChange={(selected) =>
                            setWorkout(actions.setSideMode(workout, gi, ei, selected ? 'per_side' : 'combined'))
                          }
                        >
                          Each side
                        </Checkbox>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Remove ${exercise.source.name}`}
                          className="text-muted-foreground hover:text-destructive md:order-last"
                          onPress={() =>
                            remove(`${exercise.source.name} removed.`, actions.removeExercise(workout, gi, ei))
                          }
                        >
                          <X />
                        </Button>
                        <div className="min-w-0 w-full pl-10 md:w-auto md:flex-1 md:pl-0">
                          {exercise.perRound ? (
                            <div className="min-w-0 max-w-full overflow-x-auto">
                              <table className="border-separate border-spacing-1">
                                <caption className="sr-only">Targets for {exercise.source.name} by round</caption>
                                <thead>
                                  <tr className="text-left text-xs text-muted-foreground">
                                    <th
                                      scope="col"
                                      className="px-1 font-medium"
                                    >
                                      Round
                                    </th>
                                    {keys.map((key) => (
                                      <th
                                        key={key}
                                        scope="col"
                                        className="px-1 font-medium"
                                      >
                                        {labelFor(key, exercise.source)}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {exercise.roundTargets.map((targets, ri) => (
                                    <tr key={`${exercise.uiId}-round-${ri + 1}`}>
                                      <th
                                        scope="row"
                                        className="px-1 text-left tabular-nums text-sm font-medium"
                                      >
                                        {ri + 1}
                                      </th>
                                      {keys.map((key) => {
                                        const where = {group: gi, exercise: ei, key, round: ri};
                                        const invalid =
                                          validationVisible &&
                                          Boolean(
                                            targetProblem(
                                              key,
                                              targets[key] ?? {mode: 'client_chooses'},
                                              exercise.source,
                                            ),
                                          );
                                        return (
                                          <td key={key}>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              aria-label={`${exercise.source.name} round ${ri + 1} ${labelFor(key, exercise.source)}: ${targetLabel(key, targets[key])}`}
                                              aria-expanded={same(where)}
                                              aria-invalid={invalid}
                                              {...(same(where) && {'aria-controls': editorId(gi, ei)})}
                                              className={cn(
                                                'min-w-16 justify-start tabular-nums sm:min-w-20',
                                                ['client_chooses', 'none'].includes(
                                                  targets[key]?.mode ?? 'client_chooses',
                                                ) && 'font-sans font-medium text-muted-foreground',
                                                same(where) && 'border-primary bg-primary/5',
                                                invalid && 'border-destructive',
                                              )}
                                              onPress={(event) => {
                                                trigger.current =
                                                  event.target instanceof HTMLElement ? event.target : null;
                                                toggle(where);
                                              }}
                                            >
                                              {targetLabel(key, targets[key])}
                                              {invalid && <AlertCircle aria-label="Invalid target" />}
                                            </Button>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {keys.map((key) => {
                                const where = {group: gi, exercise: ei, key, round: null};
                                const target = exercise.targets[key];
                                const soft = !target || target.mode === 'client_chooses' || target.mode === 'none';
                                const invalid =
                                  validationVisible &&
                                  Boolean(targetProblem(key, target ?? {mode: 'client_chooses'}, exercise.source));
                                return (
                                  <Button
                                    key={key}
                                    size="sm"
                                    variant="outline"
                                    aria-expanded={same(where)}
                                    aria-invalid={invalid}
                                    {...(same(where) && {'aria-controls': editorId(gi, ei)})}
                                    className={cn(
                                      'h-auto min-h-11 max-w-full min-w-0 gap-1.5 whitespace-normal px-3',
                                      same(where) && 'border-primary bg-primary/5',
                                      invalid && 'border-destructive',
                                    )}
                                    onPress={(event) => {
                                      trigger.current = event.target instanceof HTMLElement ? event.target : null;
                                      toggle(where);
                                    }}
                                  >
                                    <span className="min-w-0 break-words font-medium text-muted-foreground">
                                      {labelFor(key, exercise.source)}
                                    </span>
                                    {invalid && <AlertCircle aria-label="Invalid target" />}
                                    <span className={cn(soft ? 'font-medium text-muted-foreground' : 'tabular-nums')}>
                                      {targetLabel(key, target)}
                                    </span>
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {open && (
                        <TargetEditor
                          id={editorId(gi, ei)}
                          className="md:ml-10"
                          workout={workout}
                          setWorkout={setWorkout}
                          where={open}
                          validationVisible={validationVisible}
                          onClose={() => {
                            const origin = trigger.current?.isConnected
                              ? trigger.current
                              : document.querySelector<HTMLElement>(
                                  `button[aria-controls="${editorId(gi, ei)}"][aria-expanded="true"]`,
                                );
                            setEditing(null);
                            origin?.focus();
                          }}
                          onPerRound={(perRound) => {
                            if (!perRound && hasDifferentRounds(exercise)) {
                              setConfirmTargets(open);
                              return;
                            }
                            changeTargetMode(open, perRound);
                          }}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>

              <footer className="px-4 pt-1 pb-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => setPicker(gi)}
                >
                  <Plus />
                  {group.exercises.length === 1 ? 'Add exercise (superset)' : 'Add exercise (circuit)'}
                </Button>
              </footer>
            </section>
          ))}

          <Button
            variant="outline"
            className="h-14 w-full border-dashed"
            onPress={() => setPicker('new')}
          >
            <Plus />
            Add exercise
          </Button>
        </>
      )}

      {picker !== null && (
        <ExercisePicker
          title={pickerTitle}
          onClose={() => setPicker(null)}
          onPick={(exercise) => {
            const next =
              picker === 'new'
                ? actions.addExercise(workout, 'new', exercise)
                : actions.addExercise(workout, picker, exercise);
            setWorkout(next);
            setPicker(null);
          }}
        />
      )}

      <UndoToast
        undo={undo}
        onExpire={expireUndo}
        onUndo={(restore) => {
          setEditing(null);
          setWorkout(restore(workout));
          setUndo(null);
          requestAnimationFrame(() => {
            root.current
              ?.querySelector<HTMLButtonElement>('button:not([disabled]):not([aria-disabled="true"])')
              ?.focus();
          });
        }}
      />
      {confirmTargets && (
        <Dialog
          className="workout-editor"
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              setConfirmTargets(null);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Use the first round for every round?</DialogTitle>
          </DialogHeader>
          <div className="dialog-body space-y-4">
            <p>
              The rounds have different targets. This replaces all of this exercise’s targets with the first round’s
              values. You can Undo this change.
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                onPress={() => setConfirmTargets(null)}
              >
                Keep per-round targets
              </Button>
              <Button
                onPress={() => {
                  changeTargetMode(confirmTargets, false);
                  setConfirmTargets(null);
                }}
              >
                Use first round
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function ReorderList({workout, setWorkout}: BuilderProps) {
  return (
    <div className="min-w-0 space-y-4">
      <p className="text-muted-foreground">
        Move exercises up or down. Give an exercise another letter to pair it into a superset or circuit.
      </p>
      <ol className="space-y-4">
        {workout.groups.map((group, gi) => (
          <li
            key={group.uiId}
            className="rounded-2xl border border-border bg-surface p-3"
          >
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 font-semibold">
                {groupLabel(group, gi)}
                {group.name ? ` · ${group.name}` : ''}
              </p>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Move ${groupTitle(group, gi)} up`}
                isDisabled={gi === 0}
                onPress={() => setWorkout(actions.moveGroup(workout, gi, -1))}
              >
                <ArrowUp />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Move ${groupTitle(group, gi)} down`}
                isDisabled={gi === workout.groups.length - 1}
                onPress={() => setWorkout(actions.moveGroup(workout, gi, 1))}
              >
                <ArrowDown />
              </Button>
            </div>
            <ol className="mt-2 space-y-2">
              {group.exercises.map((exercise, ei) => (
                <li
                  key={exercise.uiId}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 py-1 pr-1 pl-3"
                >
                  <span className="w-7 tabular-nums text-sm font-medium text-muted-foreground">
                    {letterOf(gi)}
                    {ei + 1}
                  </span>
                  <span className="min-w-0 flex-1 basis-40 font-medium">{exercise.source.name}</span>
                  <label className="ml-auto flex items-center gap-2 text-sm font-medium">
                    <span className="sr-only">Letter for {exercise.source.name}</span>
                    <select
                      value={gi}
                      onChange={(event) =>
                        setWorkout(
                          actions.moveExerciseToGroup(
                            workout,
                            gi,
                            ei,
                            event.target.value === 'new' ? 'new' : Number(event.target.value),
                          ),
                        )
                      }
                      className={cn(fieldClass, 'h-11 bg-surface pr-8')}
                    >
                      {workout.groups.map((option, index) => (
                        <option
                          key={option.id}
                          value={index}
                        >
                          {letterOf(index)}
                          {option.name ? ` · ${option.name}` : ''}
                        </option>
                      ))}
                      {group.exercises.length > 1 && <option value="new">New straight-sets card</option>}
                    </select>
                  </label>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Move ${exercise.source.name} up`}
                    isDisabled={ei === 0}
                    onPress={() => setWorkout(actions.moveExercise(workout, gi, ei, -1))}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Move ${exercise.source.name} down`}
                    isDisabled={ei === group.exercises.length - 1}
                    onPress={() => setWorkout(actions.moveExercise(workout, gi, ei, 1))}
                  >
                    <ArrowDown />
                  </Button>
                </li>
              ))}
              {group.exercises.length === 0 && <li className="px-3 text-sm text-muted-foreground">No exercises.</li>}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}
