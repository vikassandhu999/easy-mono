// PROTOTYPE — throwaway. One card per block (group), one chip per target, edit inline; a separate reorder mode.
import {ArrowDown, ArrowUp, ArrowUpDown, Minus, Plus, Trash2, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {
  actions,
  formatTarget,
  groupLabel,
  groupSummary,
  groupTitle,
  keysOf,
  letterOf,
  metricInfo,
  type Where,
  type Workout,
} from './model';
import {type BuilderProps, ExercisePicker, fieldClass, TargetEditor} from './parts';

type Undo = {message: string; before: Workout};

export function CardsBuilder({workout, setWorkout}: BuilderProps) {
  const [editing, setEditing] = useState<Where | null>(null);
  // A group index adds to that group; 'new' adds a new single-exercise group.
  const [picker, setPicker] = useState<number | 'new' | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    if (!undo) {
      return;
    }
    const timer = window.setTimeout(() => setUndo(null), 8000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  const same = (where: Where) =>
    editing?.group === where.group &&
    editing.exercise === where.exercise &&
    editing.key === where.key &&
    editing.round === where.round;
  const toggle = (where: Where) => setEditing(same(where) ? null : where);
  const remove = (message: string, next: Workout) => {
    setEditing(null);
    setUndo({message, before: workout});
    setWorkout(next);
  };
  const editorId = (gi: number, ei: number) => `target-editor-${gi}-${ei}`;
  const pickerGroup = typeof picker === 'number' ? workout.groups[picker] : undefined;
  const pickerKind = ['', ' (superset)', ' (circuit)'][Math.min(pickerGroup?.exercises.length ?? 0, 2)];
  const pickerTitle =
    pickerGroup && typeof picker === 'number'
      ? `Add to ${groupTitle(pickerGroup, picker)}${pickerKind}`
      : 'Add an exercise';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{reordering ? 'Reorder the workout' : 'Exercises'}</h2>
        <Button
          variant={reordering ? 'default' : 'outline'}
          aria-pressed={reordering}
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
              key={group.id}
              aria-labelledby={`group-${group.id}-label`}
              className="rounded-2xl border border-border bg-surface"
            >
              <header className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 pt-3 pb-1">
                <div className="min-w-0 flex-1">
                  <label
                    id={`group-${group.id}-label`}
                    htmlFor={`group-${group.id}-name`}
                    className="text-sm font-semibold text-muted-foreground"
                  >
                    {groupLabel(group, gi)}
                  </label>
                  <input
                    id={`group-${group.id}-name`}
                    placeholder="Add a name, for example Main lift"
                    value={group.name}
                    onChange={(event) => setWorkout(actions.renameGroup(workout, gi, event.target.value))}
                    className="block w-full rounded-md bg-transparent text-lg font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
                  />
                  <p className="text-sm font-medium text-muted-foreground">{groupSummary(group, gi)}</p>
                </div>
                <Button
                  size="icon-xs"
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
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Fewer rounds"
                    isDisabled={group.rounds <= 1}
                    onPress={() => setWorkout(actions.setRounds(workout, gi, group.rounds - 1))}
                  >
                    <Minus />
                  </Button>
                  <output
                    aria-live="polite"
                    className="min-w-24 text-center font-semibold"
                  >
                    {group.rounds} {group.rounds === 1 ? 'round' : 'rounds'}
                  </output>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="More rounds"
                    onPress={() => setWorkout(actions.setRounds(workout, gi, group.rounds + 1))}
                  >
                    <Plus />
                  </Button>
                </div>
              </header>

              <ol className="space-y-1 px-2">
                {group.exercises.map((exercise, ei) => {
                  const keys = keysOf(exercise);
                  const open = editing?.group === gi && editing.exercise === ei ? editing : null;
                  return (
                    <li
                      key={exercise.id}
                      className="space-y-3 rounded-xl px-2 py-2"
                    >
                      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                        <span className="w-7 shrink-0 pt-2.5 font-mono text-sm font-medium text-muted-foreground">
                          {letterOf(gi)}
                          {ei + 1}
                        </span>
                        <p className="min-w-0 flex-1 pt-2 font-semibold md:w-52 md:flex-none">
                          {exercise.name}
                          {exercise.unilateral && (
                            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                              each side
                            </span>
                          )}
                        </p>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Remove ${exercise.name}`}
                          className="text-muted-foreground hover:text-destructive md:order-last"
                          onPress={() => remove(`${exercise.name} removed.`, actions.removeExercise(workout, gi, ei))}
                        >
                          <X />
                        </Button>
                        <div className="w-full pl-10 md:w-auto md:flex-1 md:pl-0">
                          {exercise.perRound ? (
                            <div className="overflow-x-auto">
                              <table className="border-separate border-spacing-1">
                                <caption className="sr-only">Targets for {exercise.name} by round</caption>
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
                                        {metricInfo[key].label}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {exercise.roundTargets.map((targets, ri) => (
                                    <tr key={`${exercise.id}-round-${ri + 1}`}>
                                      <th
                                        scope="row"
                                        className="px-1 text-left font-mono text-sm font-medium"
                                      >
                                        {ri + 1}
                                      </th>
                                      {keys.map((key) => {
                                        const where = {group: gi, exercise: ei, key, round: ri};
                                        return (
                                          <td key={key}>
                                            <Button
                                              size="xs"
                                              variant="outline"
                                              aria-expanded={same(where)}
                                              {...(same(where) && {'aria-controls': editorId(gi, ei)})}
                                              className={cn(
                                                'min-w-20 justify-start font-mono',
                                                ['choose', 'none'].includes(targets[key]?.mode ?? 'choose') &&
                                                  'font-sans font-medium text-muted-foreground',
                                                same(where) && 'border-primary bg-primary/5',
                                              )}
                                              onPress={() => toggle(where)}
                                            >
                                              {formatTarget(key, targets[key], exercise.unilateral)}
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
                                const soft = !target || target.mode === 'choose' || target.mode === 'none';
                                return (
                                  <Button
                                    key={key}
                                    size="xs"
                                    variant="outline"
                                    aria-expanded={same(where)}
                                    {...(same(where) && {'aria-controls': editorId(gi, ei)})}
                                    className={cn('gap-1.5 px-3', same(where) && 'border-primary bg-primary/5')}
                                    onPress={() => toggle(where)}
                                  >
                                    <span className="font-medium text-muted-foreground">{metricInfo[key].label}</span>
                                    <span className={cn(soft ? 'font-medium text-muted-foreground' : 'font-mono')}>
                                      {formatTarget(key, target, exercise.unilateral)}
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
                          onClose={() => setEditing(null)}
                          onPerRound={(perRound) => {
                            if (perRound !== exercise.perRound) {
                              setWorkout(actions.togglePerRound(workout, gi, ei));
                            }
                            setEditing({...open, round: perRound ? 0 : null});
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
                  {group.exercises.length === 1 ? 'Add exercise (superset)' : 'Add exercise'}
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
                ? actions.addExercise(actions.addGroup(workout), workout.groups.length, exercise)
                : actions.addExercise(workout, picker, exercise);
            setWorkout(next);
            setPicker(null);
          }}
        />
      )}

      <div
        role="status"
        className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
      >
        {undo && (
          <div className="flex items-center gap-3 rounded-xl bg-foreground py-2 pr-2 pl-4 text-background shadow-lg">
            <span>{undo.message}</span>
            <Button
              size="xs"
              variant="ghost"
              className="bg-background text-foreground hover:bg-background/90"
              onPress={() => {
                setWorkout(undo.before);
                setUndo(null);
              }}
            >
              Undo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReorderList({workout, setWorkout}: BuilderProps) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Move exercises up or down. Give an exercise another letter to pair it into a superset or circuit.
      </p>
      <ol className="space-y-4">
        {workout.groups.map((group, gi) => (
          <li
            key={group.id}
            className="rounded-2xl border border-border bg-surface p-3"
          >
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 font-semibold">
                {groupLabel(group, gi)}
                {group.name ? ` · ${group.name}` : ''}
              </p>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Move ${groupTitle(group, gi)} up`}
                isDisabled={gi === 0}
                onPress={() => setWorkout(actions.moveGroup(workout, gi, -1))}
              >
                <ArrowUp />
              </Button>
              <Button
                size="icon-xs"
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
                  key={exercise.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 py-1 pr-1 pl-3"
                >
                  <span className="w-7 font-mono text-sm font-medium text-muted-foreground">
                    {letterOf(gi)}
                    {ei + 1}
                  </span>
                  <span className="min-w-0 flex-1 basis-40 font-medium">{exercise.name}</span>
                  <label className="ml-auto flex items-center gap-2 text-sm font-medium">
                    <span className="sr-only">Letter for {exercise.name}</span>
                    <select
                      value={gi}
                      onChange={(event) =>
                        setWorkout(actions.moveExerciseToGroup(workout, gi, ei, Number(event.target.value)))
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
                    </select>
                  </label>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Move ${exercise.name} up`}
                    isDisabled={ei === 0}
                    onPress={() => setWorkout(actions.moveExercise(workout, gi, ei, -1))}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Move ${exercise.name} down`}
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
