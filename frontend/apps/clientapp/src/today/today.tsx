import {effortLabel, plural} from '@easy/workouts/session';
import {ChevronRight, Dumbbell, Pill, Plus, Utensils} from 'lucide-react';
import {type ReactNode, useEffect, useState} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {errorMessage} from '../api/client';
import {type ClientDay, useClientDay, useWeekMarkers} from '../api/client-days';
import {readDraft} from '../api/drafts';
import {useDeleteNutrition, useSaveNutrition} from '../api/nutrition-logs';
import {getSession} from '../api/session';
import {BottomSheet} from '../ui/bottom-sheet';
import {Button} from '../ui/button';
import {cn} from '../ui/cn';
import {CoachingEnded, useCoaching} from '../ui/coaching';
import {ReadState} from '../ui/read-state';
import {useUndoMessage} from '../ui/undo-message';
import {
  activeWorkoutReason,
  amountText,
  asNutritionLog,
  asPreset,
  boundsText,
  dayLabel,
  dayName,
  draftKey,
  nowTime,
  optionLabel,
  type Preset,
  parseMealDraft,
  presetTitle,
  totalOf,
  valuesLine,
  weekOf,
} from './model';
import {ScreenHeader, StatusPill, useFocusOnMount} from './parts';

export function Today({children}: {children: ReactNode}) {
  const profile = useProfile();
  const [params, setParams] = useSearchParams();
  const date = params.get('date') ?? profile.data?.data.local_date ?? '';
  const query = useClientDay(date);
  const heading = useFocusOnMount();
  if (!query.data) {
    return (
      <main className="page">
        <ScreenHeader
          title="Today"
          subtitle="Your coaching and messages."
          headingRef={heading}
        />
        <ReadState
          label="your day"
          failed={query.isError}
          retry={() => {
            query.refetch();
          }}
        />
        {children}
      </main>
    );
  }
  return (
    <DayView
      key={date}
      day={query.data.data}
      onDate={(next) => setParams(next === query.data.data.today ? {} : {date: next})}
    >
      {children}
    </DayView>
  );
}
function DayView({day, onDate, children}: {day: ClientDay; onDate: (date: string) => void; children: ReactNode}) {
  const heading = useFocusOnMount();
  const navigate = useNavigate();
  const location = useLocation();
  const {canWrite} = useCoaching();
  const show = useUndoMessage();
  const save = useSaveNutrition();
  const remove = useDeleteNutrition();
  const [preview, setPreview] = useState<Preset | null>(null);
  const [error, setError] = useState('');
  const future = day.date > day.today;
  const past = day.date < day.today;
  const readOnly = future || !canWrite;
  const week = weekOf(day.date);
  const markers = useWeekMarkers(week[0] ?? day.date);
  useEffect(() => {
    const focus =
      location.state && typeof location.state === 'object' && 'focus' in location.state ? location.state.focus : null;
    if (typeof focus === 'string') {
      requestAnimationFrame(() => {
        document.getElementById(focus)?.focus({preventScroll: true});
      });
    }
  }, [location.state]);
  const [drafts, setDrafts] = useState<Set<string>>(new Set());
  useEffect(() => {
    const owner = getSession()?.id;
    let current = true;
    if (owner) {
      Promise.all(
        day.nutrition_schedules.map(async (schedule) => {
          const log = day.nutrition_logs.find(
            (row) => row.nutrition_schedule_id === schedule.id && row.scheduled_date === day.date,
          );
          const value = parseMealDraft(await readDraft(owner, draftKey(day.date, schedule.id, log?.id)));
          return value?.changed ? schedule.id : null;
        }),
      )
        .then((rows) => {
          if (current && getSession()?.id === owner) {
            setDrafts(new Set(rows.filter((row): row is string => row !== null)));
          }
        })
        .catch(() => undefined);
    }
    return () => {
      current = false;
    };
  }, [day.date, day.nutrition_logs, day.nutrition_schedules]);
  const nutrition = day.nutrition_logs.map(asNutritionLog);
  const totals = totalOf(nutrition.filter((log) => log.date === day.date).flatMap((log) => log.items));
  const active = day.active_workout;
  const recorded =
    nutrition.some((log) => log.date === day.date) ||
    day.workout_logs.some((log) => log.date === day.date && log.state !== 'discarded');
  const items = [
    ...day.nutrition_schedules.map((schedule) => ({kind: 'nutrition' as const, schedule})),
    ...day.workout_schedules.map((schedule) => ({kind: 'workout' as const, schedule})),
  ].sort((a, b) => (a.schedule.time ?? '99:99').localeCompare(b.schedule.time ?? '99:99'));
  const nutritionFor = (id: string) =>
    day.nutrition_logs.find((log) => log.nutrition_schedule_id === id && log.scheduled_date === day.date);
  const workoutFor = (id: string) =>
    day.workout_logs.find(
      (log) => log.schedule_id === id && log.scheduled_date === day.date && log.state !== 'discarded',
    );
  const nextDue =
    day.date === day.today
      ? items.find((item) =>
          item.kind === 'workout'
            ? !workoutFor(item.schedule.id)
            : day.presets.find((preset) => preset.id === item.schedule.nutrition_preset_id)?.type !== 'meal' &&
              !nutritionFor(item.schedule.id),
        )?.schedule.id
      : null;
  const mealRoute = (scheduleId: string | null, logId?: string) =>
    navigate(`/meals/${day.date}/${scheduleId ?? 'new'}${logId ? `?log=${logId}` : ''}`);
  const workoutRoute = (scheduleId: string, date = day.date, logId?: string) =>
    navigate(`/workouts/${date}/${scheduleId}${logId ? `?log=${logId}` : ''}`);
  return (
    <main className="page pb-28">
      <CoachingEnded />
      <div className="flex items-start justify-between gap-3">
        <ScreenHeader
          title={dayName(day.date, day.today)}
          subtitle={dayLabel(day.date)}
          headingRef={heading}
        />
        {day.date !== day.today && (
          <Button
            size="sm"
            variant="outline"
            onPress={() => onDate(day.today)}
          >
            Today
          </Button>
        )}
      </div>
      <div
        role="group"
        aria-label="Day"
        className="mb-5 grid grid-cols-7 gap-1"
      >
        {week.map((date) => {
          const selected = date === day.date;
          const has = markers.data?.data.find((row) => row.date === date)?.has_records ?? false;
          return (
            <Button
              key={date}
              variant="ghost"
              aria-pressed={selected}
              {...(date === day.today ? {'aria-current': 'date' as const} : {})}
              aria-label={`${dayLabel(date)}${date === day.today ? ', today' : ''}${has ? ', has records' : ''}`}
              className={cn(
                'h-auto min-h-14 flex-col gap-0.5 rounded-2xl px-0 py-2',
                selected && 'bg-primary text-primary-foreground hover:bg-primary',
              )}
              onPress={() => onDate(date)}
            >
              <span className="text-sm font-semibold">{dayLabel(date, 'short').slice(0, 2)}</span>
              <span
                className={cn(
                  'text-lg tabular-nums',
                  date === day.today && 'underline decoration-2 underline-offset-4',
                )}
              >
                {Number(date.slice(8))}
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
      {active && (active.date !== day.date || !day.workout_schedules.some((row) => row.id === active.schedule_id)) && (
        <Button
          variant="secondary"
          className="mb-4 w-full justify-between"
          onPress={() => workoutRoute(active.schedule_id ?? 'active', active.scheduled_date ?? active.date, active.id)}
        >
          {day.workouts.find((workout) => workout.id === active.workout_id)?.name ?? 'Your workout'} is in progress
          <ChevronRight aria-hidden="true" />
        </Button>
      )}
      {day.target_set && (
        <section
          aria-label={`Targets: ${day.target_set.name}`}
          className="mb-5 rounded-3xl bg-[var(--progress)] px-4 py-3"
        >
          <h2 className="text-sm font-bold">{day.target_set.name}</h2>
          <dl className="mt-1 grid gap-1.5">
            {Object.entries(day.target_set.targets).map(([code, bounds]) => {
              const nutrient = day.nutrients.find((row) => row.code === code);
              const value = totals.values[code];
              const known = nutrition.filter((log) => log.date === day.date).flatMap((log) => log.items);
              const incomplete = known.some((item) => item.food.nutrients[code] === undefined);
              const shown = value === undefined ? 'Nutrients not listed' : String(Math.round(value));
              return (
                <div key={code}>
                  <div className="flex justify-between gap-3 text-sm">
                    <dt>{nutrient?.name ?? code}</dt>
                    <dd className="text-right font-semibold tabular-nums">
                      {future
                        ? ''
                        : `${totals.empty ? 'Not recorded' : `${shown}${incomplete && value !== undefined ? ' (incomplete)' : ''}`} / `}
                      {boundsText(bounds, nutrient?.unit ?? '')}
                    </dd>
                  </div>
                  {!future && value !== undefined && bounds.min !== undefined && bounds.min > 0 && (
                    <div
                      aria-hidden="true"
                      className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface"
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{width: `${Math.min(100, (value / bounds.min) * 100)}%`}}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </dl>
        </section>
      )}
      {past && !recorded && <p className="mb-4 rounded-2xl bg-muted px-4 py-3 font-semibold">Not recorded</p>}
      {future && <p className="mb-4 text-muted-foreground">This is your plan. You can record it on the day.</p>}
      {items.length === 0 && <p className="mb-4 text-muted-foreground">Nothing planned for this day.</p>}
      {error && (
        <p
          role="alert"
          className="mb-4 font-medium text-destructive"
        >
          {error} Try the action again.
        </p>
      )}
      <ol
        aria-label="Plan"
        className="grid gap-3"
      >
        {items.map((item) => {
          const schedule = item.schedule;
          const primary = nextDue === schedule.id;
          if (item.kind === 'nutrition') {
            const rawPreset = day.presets.find((preset) => preset.id === item.schedule.nutrition_preset_id);
            if (!rawPreset) {
              return null;
            }
            const preset = asPreset(rawPreset);
            const title = presetTitle(preset);
            const rawLog = nutritionFor(schedule.id);
            const log = rawLog ? asNutritionLog(rawLog) : null;
            const chosen = preset.options.find((option) => option.id === log?.optionId);
            const detail =
              preset.type === 'meal'
                ? preset.options.map(optionLabel).join(' or ')
                : preset.item
                  ? amountText(preset.item.food, preset.item.amount, preset.item.unit)
                  : '';
            const note = log
              ? preset.type === 'meal'
                ? `Ate ${[chosen ? optionLabel(chosen) : null, totalOf(log.items).values.energy_kcal === undefined ? null : `${Math.round(totalOf(log.items).values.energy_kcal ?? 0)} kcal`].filter(Boolean).join(' · ')}`
                : `Took ${log.items.map((row) => amountText(row.food, row.amount, row.unit)).join(', ')}`
              : drafts.has(schedule.id)
                ? 'Unsaved changes'
                : past
                  ? 'Not recorded'
                  : null;
            return (
              <li key={schedule.id}>
                <Card
                  id={`card-${schedule.id}`}
                  icon={preset.type === 'meal' ? <Utensils className="size-5" /> : <Pill className="size-5" />}
                  time={schedule.time}
                  title={title}
                  detail={detail}
                  note={note}
                  status={log ? <StatusPill tone="done">{preset.type === 'meal' ? 'Done' : 'Taken'}</StatusPill> : null}
                  onPress={() => (future ? setPreview(preset) : mealRoute(schedule.id, log?.id))}
                  action={
                    preset.type !== 'meal' && !log && !readOnly && preset.item ? (
                      <Button
                        size="sm"
                        variant={primary ? 'default' : 'outline'}
                        aria-label={`Mark ${title} taken`}
                        isPending={save.isPending}
                        onPress={async () => {
                          if (!preset.item) {
                            return;
                          }
                          setError('');
                          try {
                            const result = await save.mutateAsync({
                              body: {
                                logged_on: day.date,
                                logged_at: day.date === day.today ? nowTime() : (schedule.time ?? '12:00'),
                                nutrition_schedule_id: schedule.id,
                                scheduled_date: day.date,
                                food_logs: [
                                  {food_id: preset.item.food.id, amount: preset.item.amount, unit: preset.item.unit},
                                ],
                              },
                            });
                            show({text: `${title} recorded.`, undo: () => remove.mutateAsync(result.data.id)});
                          } catch (cause) {
                            setError(errorMessage(cause, 'Could not record.'));
                          }
                        }}
                      >
                        Taken
                      </Button>
                    ) : null
                  }
                />
              </li>
            );
          }
          const workout = day.workouts.find((row) => row.id === item.schedule.workout_id);
          if (!workout) {
            return null;
          }
          const rawLog = workoutFor(schedule.id);
          const log = rawLog;
          const coach = day.coaches.find((row) => row.id === item.schedule.coach_id)?.name;
          const elsewhere = active && active.id !== log?.id;
          const detail = [
            workout.type === 'prescribed'
              ? plural(
                  workout.groups.reduce((n, group) => n + group.exercises.length, 0),
                  'exercise',
                )
              : workout.type === 'video'
                ? 'Video workout'
                : 'Session',
            item.schedule.place,
            coach ? `with ${coach}` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          const note =
            log?.state === 'completed'
              ? effortLabel(log.effort) || 'Session recorded'
              : log
                ? log.recorded_by === 'coach'
                  ? `${log.recorder_name} is recording this session`
                  : 'Session in progress'
                : elsewhere && !future
                  ? activeWorkoutReason(active, day.workouts)
                  : past
                    ? 'Not recorded'
                    : null;
          return (
            <li key={schedule.id}>
              <Card
                id={`card-${schedule.id}`}
                icon={<Dumbbell className="size-5" />}
                time={schedule.time}
                title={workout.name}
                detail={detail}
                note={note}
                status={
                  log ? (
                    <StatusPill tone={log.state === 'completed' ? 'done' : 'active'}>
                      {log.state === 'completed' ? 'Done' : 'In progress'}
                    </StatusPill>
                  ) : null
                }
                onPress={() => workoutRoute(schedule.id, day.date, log?.id)}
                action={
                  !readOnly && !log && !elsewhere ? (
                    <Button
                      size="sm"
                      variant={primary ? 'default' : 'outline'}
                      aria-label={`Open ${workout.name}`}
                      onPress={() => workoutRoute(schedule.id)}
                    >
                      Open workout
                    </Button>
                  ) : null
                }
              />
            </li>
          );
        })}
      </ol>
      {nutrition.some((log) => !log.scheduleId && log.date === day.date) && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">Also recorded</h2>
          <ul className="grid gap-2">
            {nutrition
              .filter((log) => !log.scheduleId && log.date === day.date)
              .map((log) => (
                <li key={log.id}>
                  <Button
                    id={`card-${log.id}`}
                    variant="outline"
                    className="h-auto min-h-14 w-full justify-between whitespace-normal px-4 py-3 text-left"
                    onPress={() => mealRoute(null, log.id)}
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
      {!readOnly && (
        <Button
          id={`card-add-${day.date}`}
          variant="outline"
          className="mt-6 mb-6 w-full"
          onPress={() => mealRoute(null)}
        >
          <Plus />
          Add food you ate
        </Button>
      )}
      {children}
      {preview && (
        <BottomSheet
          title={presetTitle(preview)}
          onClose={() => setPreview(null)}
        >
          <p className="mb-4 text-muted-foreground">Planned. You can record it on the day.</p>
          {preview.type === 'meal' ? (
            <div className="grid gap-4">
              {preview.options.length > 1 && <p className="font-semibold">You choose one of these:</p>}
              {preview.options.map((option) => (
                <section key={option.id}>
                  <h3 className="font-bold">{optionLabel(option)}</h3>
                  <ul className="mt-1 text-muted-foreground">
                    {option.items.map((row) => (
                      <li key={row.id}>
                        {row.food.name} · {amountText(row.food, row.amount, row.unit)}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            preview.item && <p>{amountText(preview.item.food, preview.item.amount, preview.item.unit)}</p>
          )}
        </BottomSheet>
      )}
    </main>
  );
}
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
