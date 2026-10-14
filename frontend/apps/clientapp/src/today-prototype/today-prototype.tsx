// PROTOTYPE. Route: /prototype/today
// Question: what does the client see today, and how do they record what they did? (.scratch/client/concept.md)
// No API, no login, state lives in memory.
import {ChevronRight, Dumbbell, Pill, Plus, Utensils} from 'lucide-react';
import {type ReactNode, useCallback, useEffect, useState} from 'react';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {MealLogger} from './meal-logger';
import {
  actions,
  amountText,
  boundsText,
  dayLabel,
  dayName,
  dayTotal,
  difficultyLabel,
  draftKey,
  extrasOn,
  foodOf,
  type MealDraft,
  type NutritionLog,
  newFoodLog,
  nowTime,
  nutritionFor,
  optionLabel,
  type Preset,
  presetOf,
  presetTitle,
  type Schedule,
  type State,
  schedules,
  schedulesOn,
  seed,
  targetsOn,
  today,
  totalOf,
  valuesLine,
  type WorkoutLog,
  week,
  workoutFor,
  workoutOf,
} from './model';
import {ScreenHeader, StatusPill, type Toast, ToastRegion, useFocusOnMount} from './parts';
import {WorkoutLogger} from './workout-logger';

type View =
  | {name: 'day'}
  | {name: 'meal'; scheduleId: string | null; logId?: string}
  | {name: 'workout'; scheduleId: string};

const scheduleOf = (id: string) => schedules.find((row) => row.id === id) as Schedule;
const cardId = (key: string) => `card-${key}`;
const kcalOf = (log: NutritionLog) => {
  const kcal = totalOf(log.items).values.kcal;
  return kcal === undefined ? null : `${Math.round(kcal)} kcal`;
};

export function TodayPrototype() {
  const [state, setState] = useState<State>(seed);
  const [date, setDate] = useState(today);
  const [view, setView] = useState<View>({name: 'day'});
  const [drafts, setDrafts] = useState<Record<string, MealDraft>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preset | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: each screen starts at its top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view.name]);
  // Back on the day, focus returns to the card that was opened.
  useEffect(() => {
    if (view.name === 'day' && returnTo) {
      requestAnimationFrame(() => document.getElementById(cardId(returnTo))?.focus());
    }
  }, [view.name, returnTo]);

  // Every change can be undone from its message (notifications-and-recovery).
  const commit = (next: State, text: string) => {
    const before = state;
    setState(next);
    setToast({text, undo: () => setState(before)});
  };
  const open = (next: View, from: string) => {
    setReturnTo(from);
    setView(next);
  };
  const backToDay = () => setView({name: 'day'});
  const back = dayName(date);

  let screen: ReactNode;
  if (view.name === 'meal') {
    const schedule = view.scheduleId ? scheduleOf(view.scheduleId) : null;
    const saved = view.logId ? state.nutrition.find((log) => log.id === view.logId) : undefined;
    const preset = schedule?.kind === 'nutrition' ? presetOf(schedule.presetId) : null;
    const key = draftKey(date, view.scheduleId, view.logId);
    screen = (
      <MealLogger
        key={key}
        date={date}
        scheduleId={view.scheduleId}
        preset={preset}
        time={schedule?.time ?? null}
        saved={saved}
        draft={drafts[key]}
        back={back}
        onDraft={(draft) =>
          setDrafts((all) => {
            const {[key]: _old, ...rest} = all;
            return draft ? {...rest, [key]: draft} : rest;
          })
        }
        onClose={backToDay}
        onSave={(log) => {
          setDrafts(({[key]: _saved, ...rest}) => rest);
          commit(
            actions.saveNutrition(state, log),
            saved ? 'Record updated.' : `${preset ? presetTitle(preset) : 'Food'} recorded.`,
          );
          backToDay();
        }}
        onDelete={(log) => {
          commit(actions.deleteNutrition(state, log.id), 'Record deleted.');
          backToDay();
        }}
      />
    );
  } else if (view.name === 'workout') {
    const schedule = scheduleOf(view.scheduleId) as Extract<Schedule, {kind: 'workout'}>;
    const log = workoutFor(state, schedule.id, date) ?? null;
    const active = state.workouts.find((row) => row.state === 'active');
    const update = (next: WorkoutLog) => setState(actions.updateWorkout(state, next));
    screen = (
      <WorkoutLogger
        key={`${schedule.id}-${date}-${log?.id ?? 'preview'}`}
        workout={workoutOf(schedule.workoutId)}
        log={log}
        date={date}
        time={schedule.time}
        coach={schedule.coach}
        back={back}
        canStart={date <= today && !active}
        onStart={() => setState(actions.startWorkout(state, schedule.id, schedule.workoutId, date)[0])}
        onChange={update}
        onFinish={(next) => {
          commit(actions.updateWorkout(state, next), 'Workout saved. Your coach can see it.');
          backToDay();
        }}
        onDiscard={(next) => {
          commit(actions.discardWorkout(state, next.id), 'Workout discarded.');
          backToDay();
        }}
        onDelete={(next) => {
          commit(actions.discardWorkout(state, next.id), 'Workout deleted.');
          backToDay();
        }}
        onClose={backToDay}
      />
    );
  } else {
    screen = (
      <DayView
        state={state}
        date={date}
        drafts={drafts}
        onDate={setDate}
        onOpenMeal={(scheduleId, logId, from) => open({name: 'meal', scheduleId, ...(logId ? {logId} : {})}, from)}
        onOpenWorkout={(scheduleId) => open({name: 'workout', scheduleId}, scheduleId)}
        onPreview={setPreview}
        onTaken={(log, title) => commit(actions.saveNutrition(state, log), `${title} recorded.`)}
        onStart={(schedule) => {
          setState(actions.startWorkout(state, schedule.id, schedule.workoutId, date)[0]);
          open({name: 'workout', scheduleId: schedule.id}, schedule.id);
        }}
      />
    );
  }

  return (
    <>
      {screen}
      {preview && (
        <PresetPreview
          preset={preview}
          onClose={() => setPreview(null)}
        />
      )}
      <ToastRegion
        toast={toast}
        onDone={clearToast}
        lifted={view.name !== 'day'}
      />
    </>
  );
}

function DayView({
  state,
  date,
  drafts,
  onDate,
  onOpenMeal,
  onOpenWorkout,
  onPreview,
  onTaken,
  onStart,
}: {
  state: State;
  date: string;
  drafts: Record<string, MealDraft>;
  onDate: (date: string) => void;
  onOpenMeal: (scheduleId: string | null, logId: string | undefined, from: string) => void;
  onOpenWorkout: (scheduleId: string) => void;
  onPreview: (preset: Preset) => void;
  onTaken: (log: Omit<NutritionLog, 'id' | 'type'>, title: string) => void;
  onStart: (schedule: Extract<Schedule, {kind: 'workout'}>) => void;
}) {
  const heading = useFocusOnMount();
  const past = date < today;
  const future = date > today;
  const items = schedulesOn(date);
  const extras = extrasOn(state, date);
  const recorded = state.nutrition.some((log) => log.date === date) || state.workouts.some((log) => log.date === date);
  const active = state.workouts.find((log) => log.state === 'active');
  // Only the next item due today gets the filled button (one primary per view).
  const nextDue =
    date === today
      ? items.find((schedule) =>
          schedule.kind === 'workout'
            ? !schedule.coach && !workoutFor(state, schedule.id, date)
            : presetOf(schedule.presetId).type !== 'meal' && !nutritionFor(state, schedule.id, date),
        )?.id
      : undefined;

  return (
    <main className="page pb-28">
      <p className="mb-4 rounded-2xl bg-muted px-4 py-2 text-center text-sm font-medium text-muted-foreground">
        Prototype. Reload resets your records.
      </p>
      <div className="flex items-start justify-between gap-3">
        <ScreenHeader
          title={dayName(date)}
          subtitle={dayLabel(date)}
          headingRef={heading}
        />
        {date !== today && (
          <Button
            size="sm"
            variant="outline"
            onPress={() => onDate(today)}
          >
            Today
          </Button>
        )}
      </div>

      <DayStrip
        date={date}
        state={state}
        onChange={onDate}
      />

      {active && active.date !== date && (
        <Button
          variant="secondary"
          className="mb-4 w-full justify-between"
          onPress={() => {
            onDate(active.date);
            if (active.scheduleId) {
              onOpenWorkout(active.scheduleId);
            }
          }}
        >
          {workoutOf(active.workoutId).name} is in progress
          <ChevronRight aria-hidden="true" />
        </Button>
      )}

      <Targets
        date={date}
        state={state}
        future={future}
      />

      {past && !recorded && <p className="mb-4 rounded-2xl bg-muted px-4 py-3 font-semibold">Not recorded</p>}
      {future && <p className="mb-4 text-muted-foreground">This is your plan. You can record it on the day.</p>}
      {items.length === 0 && <p className="mb-4 text-muted-foreground">Nothing planned for this day.</p>}

      <ol
        aria-label="Plan"
        className="grid gap-3"
      >
        {items.map((schedule) => (
          <li key={schedule.id}>
            {schedule.kind === 'workout' ? (
              <WorkoutCard
                schedule={schedule}
                date={date}
                state={state}
                primary={nextDue === schedule.id}
                onOpen={() => onOpenWorkout(schedule.id)}
                onStart={() => onStart(schedule)}
              />
            ) : (
              <NutritionCard
                schedule={schedule}
                date={date}
                state={state}
                primary={nextDue === schedule.id}
                hasDraft={Object.keys(drafts).some((key) => key.startsWith(`${date}:${schedule.id}:`))}
                onOpen={(logId) =>
                  future ? onPreview(presetOf(schedule.presetId)) : onOpenMeal(schedule.id, logId, schedule.id)
                }
                onTaken={(log) => onTaken(log, presetTitle(presetOf(schedule.presetId)))}
              />
            )}
          </li>
        ))}
      </ol>

      {extras.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">Also recorded</h2>
          <ul className="grid gap-2">
            {extras.map((log) => (
              <li key={log.id}>
                <Button
                  id={cardId(log.id)}
                  variant="outline"
                  className="h-auto min-h-14 w-full justify-between whitespace-normal px-4 py-3 text-left"
                  onPress={() => onOpenMeal(null, log.id, log.id)}
                >
                  <span>
                    <span className="block">
                      {log.time} · {log.items.map((row) => row.food.name).join(', ')}
                    </span>
                    <span className="block text-sm font-medium text-muted-foreground tabular-nums">
                      {valuesLine(totalOf(log.items))}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!future && (
        <Button
          id={cardId(`add-${date}`)}
          variant="outline"
          className="mt-6 w-full"
          onPress={() => onOpenMeal(null, undefined, `add-${date}`)}
        >
          <Plus />
          Add food you ate
        </Button>
      )}
    </main>
  );
}

function DayStrip({date, state, onChange}: {date: string; state: State; onChange: (date: string) => void}) {
  return (
    <div
      role="group"
      aria-label="Day"
      className="mb-5 grid grid-cols-7 gap-1"
    >
      {week.map((day) => {
        const selected = day === date;
        const has = state.nutrition.some((log) => log.date === day) || state.workouts.some((log) => log.date === day);
        return (
          <Button
            key={day}
            variant="ghost"
            aria-pressed={selected}
            {...(day === today ? {'aria-current': 'date' as const} : {})}
            aria-label={`${dayLabel(day)}${day === today ? ', today' : ''}${has ? ', has records' : ''}`}
            className={cn(
              'h-auto min-h-14 flex-col gap-0.5 rounded-2xl px-0 py-2',
              selected && 'bg-primary text-primary-foreground hover:bg-primary',
            )}
            onPress={() => onChange(day)}
          >
            <span className="text-sm font-semibold">{dayLabel(day, 'short').slice(0, 2)}</span>
            {/* Today is underlined, not only coloured. */}
            <span className={cn('text-lg tabular-nums', day === today && 'underline decoration-2 underline-offset-4')}>
              {Number(day.slice(8))}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                'size-1.5 rounded-full',
                has ? (selected ? 'bg-primary-foreground' : 'bg-primary') : 'bg-transparent',
              )}
            />
          </Button>
        );
      })}
    </div>
  );
}

// Recorded and target stay apart (C7). Compact, so the plan starts high on the screen. A bar only for lower bounds.
function Targets({date, state, future}: {date: string; state: State; future: boolean}) {
  const set = targetsOn(date);
  const total = dayTotal(state, date);
  const rows = [
    {key: 'kcal', label: 'Energy', unit: 'kcal'},
    {key: 'protein', label: 'Protein', unit: 'g'},
  ] as const;
  return (
    <section
      aria-label={`Targets: ${set.name}`}
      className="mb-5 rounded-3xl bg-[var(--progress)] px-4 py-3"
    >
      <h2 className="text-sm font-bold">{set.name}</h2>
      <dl className="mt-1 grid gap-1.5">
        {rows.map((row) => {
          const bounds = set[row.key];
          if (!bounds) {
            return null;
          }
          const value = total.values[row.key];
          const shown = total.empty ? 0 : Math.round(value ?? 0);
          return (
            <div key={row.key}>
              <div className="flex justify-between gap-3 text-sm">
                <dt>{row.label}</dt>
                <dd className="font-semibold tabular-nums">
                  {future ? '' : `${shown}${!total.empty && total.incomplete ? ' (incomplete)' : ''} / `}
                  {boundsText(bounds, row.unit)}
                </dd>
              </div>
              {!future && bounds.min !== undefined && (
                <div
                  aria-hidden="true"
                  className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{width: `${Math.min(100, (shown / bounds.min) * 100)}%`}}
                  />
                </div>
              )}
            </div>
          );
        })}
      </dl>
    </section>
  );
}

// One slot model for every card: the openable body, then one foot row with status and action.
function Card({
  id,
  icon,
  time,
  title,
  detail,
  note,
  status,
  action,
  onPress,
}: {
  id: string;
  icon: ReactNode;
  time: string | null;
  title: string;
  detail: string;
  note: string | null;
  status: ReactNode;
  action: ReactNode;
  onPress: () => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-3">
      <Button
        id={id}
        variant="ghost"
        className="h-auto w-full justify-start gap-3 whitespace-normal rounded-2xl p-1 text-left font-normal"
        onPress={onPress}
      >
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-10 shrink-0 place-items-center self-start rounded-full bg-[var(--training)]"
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-muted-foreground tabular-nums">{time ?? 'Any time'}</span>
          <span className="block text-lg font-bold">{title}</span>
          <span className="block text-sm text-muted-foreground">{detail}</span>
          {note && <span className="mt-1 block text-sm font-semibold">{note}</span>}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="shrink-0 self-center text-muted-foreground"
        />
      </Button>
      {(status || action) && (
        <div className="mt-2 flex min-h-11 items-center justify-between gap-2 pl-[3.25rem]">
          <span>{status}</span>
          {action}
        </div>
      )}
    </div>
  );
}

function NutritionCard({
  schedule,
  date,
  state,
  primary,
  hasDraft,
  onOpen,
  onTaken,
}: {
  schedule: Extract<Schedule, {kind: 'nutrition'}>;
  date: string;
  state: State;
  primary: boolean;
  hasDraft: boolean;
  onOpen: (logId?: string) => void;
  onTaken: (log: Omit<NutritionLog, 'id' | 'type'>) => void;
}) {
  const preset = presetOf(schedule.presetId);
  const title = presetTitle(preset);
  const log = nutritionFor(state, schedule.id, date);
  const past = date < today;
  const future = date > today;
  const detail =
    preset.type === 'meal'
      ? preset.options.map(optionLabel).join(' or ')
      : amountText(foodOf(preset.item.foodId), preset.item.amount, preset.item.unit);
  const chosen = log && preset.type === 'meal' ? preset.options.find((row) => row.id === log.optionId) : undefined;
  const note = log
    ? preset.type === 'meal'
      ? `Ate ${[chosen ? optionLabel(chosen) : null, kcalOf(log)].filter(Boolean).join(' · ')}`
      : `Took ${log.items.map((row) => amountText(row.food, row.amount, row.unit)).join(', ')}`
    : hasDraft
      ? 'Unsaved changes'
      : past
        ? 'Not recorded'
        : null;
  const status = log ? <StatusPill tone="done">{preset.type === 'meal' ? 'Done' : 'Taken'}</StatusPill> : null;
  // One tap for a single food or supplement (C4); the card opens the logger to change the amount.
  const action =
    preset.type !== 'meal' && !log && !future ? (
      <Button
        size="sm"
        variant={primary ? 'default' : 'outline'}
        aria-label={`Mark ${title} taken`}
        onPress={() =>
          onTaken({
            date,
            time: date === today ? nowTime() : (schedule.time ?? '12:00'),
            scheduleId: schedule.id,
            presetId: preset.id,
            optionId: null,
            items: [newFoodLog(foodOf(preset.item.foodId), preset.item.amount, preset.item.unit, preset.item.id)],
          })
        }
      >
        Taken
      </Button>
    ) : null;
  return (
    <Card
      id={cardId(schedule.id)}
      icon={preset.type === 'meal' ? <Utensils className="size-5" /> : <Pill className="size-5" />}
      time={schedule.time}
      title={title}
      detail={detail}
      note={note}
      status={status}
      action={action}
      onPress={() => onOpen(log?.id)}
    />
  );
}

function WorkoutCard({
  schedule,
  date,
  state,
  primary,
  onOpen,
  onStart,
}: {
  schedule: Extract<Schedule, {kind: 'workout'}>;
  date: string;
  state: State;
  primary: boolean;
  onOpen: () => void;
  onStart: () => void;
}) {
  const workout = workoutOf(schedule.workoutId);
  const log = workoutFor(state, schedule.id, date);
  const past = date < today;
  const future = date > today;
  const activeElsewhere = state.workouts.some((row) => row.state === 'active' && row.id !== log?.id);
  const detail = [
    workout.type === 'prescribed'
      ? `${workout.groups.reduce((n, group) => n + group.exercises.length, 0)} exercises`
      : workout.type === 'video'
        ? 'Video workout'
        : 'Session',
    schedule.place,
    schedule.coach ? `with ${schedule.coach}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  // A session led by a coach is recorded by that coach (W17).
  const note = schedule.coach
    ? `${schedule.coach} records this session`
    : log?.state === 'completed'
      ? [
          workout.type === 'prescribed' ? `${log.sets.length} sets` : null,
          log.difficulty ? difficultyLabel[log.difficulty] : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : log
        ? `${log.sets.length} sets recorded so far`
        : activeElsewhere && !future
          ? 'Finish your workout in progress first.'
          : past
            ? 'Not recorded'
            : null;
  const status = log ? (
    <StatusPill tone={log.state === 'completed' ? 'done' : 'active'}>
      {log.state === 'completed' ? 'Done' : 'In progress'}
    </StatusPill>
  ) : null;
  const action =
    !schedule.coach && !future && !log && !activeElsewhere ? (
      <Button
        size="sm"
        variant={primary ? 'default' : 'outline'}
        aria-label={`Start ${workout.name}`}
        onPress={onStart}
      >
        Start
      </Button>
    ) : null;
  return (
    <Card
      id={cardId(schedule.id)}
      icon={<Dumbbell className="size-5" />}
      time={schedule.time}
      title={workout.name}
      detail={detail}
      note={note}
      status={status}
      action={action}
      onPress={onOpen}
    />
  );
}

// A planned meal or supplement on a future day, read only (C2).
function PresetPreview({preset, onClose}: {preset: Preset; onClose: () => void}) {
  return (
    <BottomSheet
      title={presetTitle(preset)}
      onClose={onClose}
    >
      <p className="mb-4 text-muted-foreground">Planned. You can record it on the day.</p>
      {preset.type === 'meal' ? (
        <div className="grid gap-4">
          {preset.options.length > 1 && <p className="font-semibold">You choose one of these:</p>}
          {preset.options.map((option) => (
            <section key={option.id}>
              <h3 className="font-bold">{optionLabel(option)}</h3>
              <ul className="mt-1 text-muted-foreground">
                {option.items.map((row) => (
                  <li key={row.id}>
                    {foodOf(row.foodId).name} · {amountText(foodOf(row.foodId), row.amount, row.unit)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p>{amountText(foodOf(preset.item.foodId), preset.item.amount, preset.item.unit)}</p>
      )}
    </BottomSheet>
  );
}
