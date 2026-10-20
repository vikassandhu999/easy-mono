import {effortLabel} from '@easy/workouts/session';
import {Plus} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {generatePath, Link, useBeforeUnload, useBlocker, useNavigate} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {
  useActiveWorkoutLog,
  useOccurrenceWorkoutLogs,
  useStartSession,
  useWorkoutLogs,
  type WorkoutLog,
} from '../api/workout-logs';
import {useWorkoutWeek, type WorkoutSchedule} from '../api/workout-week';
import {useWorkout, type Workout} from '../api/workouts';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {InfiniteList} from '../ui/infinite-list';
import {Page, PageHeader} from '../ui/page';
import {type Day, daysLabel} from '../ui/week';
import {WeekColumns} from '../ui/week-columns';
import {DraftGuard, SaveRecovery, UndoToast} from '../ui/week-editor';
import {byTime, occasionLabel, occursOn} from './model';
import {AddDialog, ScheduleDialog} from './parts';
import {useSaveWeek} from './save-week';

export function WorkoutWeek({clientId}: {clientId: string}) {
  return (
    <WeekScreen
      key={clientId}
      clientId={clientId}
    />
  );
}
const cardId = (row: WorkoutSchedule, day: Day) => `workout-card-${row.id}-${day.bit}`;
const addId = (day: Day) => `workout-add-${day.bit}`;
function WeekScreen({clientId}: {clientId: string}) {
  const query = useWorkoutWeek(clientId);
  const client = useClient(clientId);
  const sessions = useWorkoutLogs(clientId);
  const active = useActiveWorkoutLog(clientId);
  const occurrences = useOccurrenceWorkoutLogs(clientId, query.data?.data.today ?? '');
  const start = useStartSession(clientId);
  const navigate = useNavigate();
  const [startError, setStartError] = useState('');
  const state = query.data?.data;
  const todayBit = state ? 1 << ((new Date(`${state.today}T12:00:00Z`).getUTCDay() + 6) % 7) : 0;
  const write = useSaveWeek(clientId);
  const [open, setOpen] = useState<{schedule: WorkoutSchedule; day: Day} | null>(null);
  const [adding, setAdding] = useState<Day | null>(null);
  const [returnFocus, setReturnFocus] = useState<{id: string; fallback: string} | null>(null);
  useEffect(() => {
    if (returnFocus) {
      (document.getElementById(returnFocus.id) ?? document.getElementById(returnFocus.fallback))?.focus();
      setReturnFocus(null);
    }
  }, [returnFocus]);
  const guards = useRef(new Map<string, boolean>());
  const register = useCallback((id: string, active: boolean, pending: boolean) => {
    if (active) {
      guards.current.set(id, pending);
    } else {
      guards.current.delete(id);
    }
  }, []);
  const blocker = useBlocker(() => guards.current.size > 0 || write.pending || write.blocked);
  useBeforeUnload((event) => {
    if (guards.current.size > 0 || write.pending || write.blocked) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  const clearUndo = useCallback(() => write.setUndo(null), [write.setUndo]);
  const recovery = (
    <div className="space-y-3">
      <SaveRecovery
        recovery={{
          ...write,
          conflict: write.conflict || Boolean(write.intent && !write.uncertain),
          check: async () => {
            if (await write.check()) {
              setOpen(null);
              setAdding(null);
            }
          },
          discard: () => {
            write.discard();
            setOpen(null);
            setAdding(null);
          },
        }}
      />
      {write.intent && !write.uncertain && (
        <Button
          variant="outline"
          isPending={write.pending}
          onPress={async () => {
            if (await write.retry()) {
              setOpen(null);
              setAdding(null);
            }
          }}
        >
          Retry
        </Button>
      )}
    </div>
  );
  const closeSchedule = () => {
    if (open) {
      setReturnFocus({id: cardId(open.schedule, open.day), fallback: addId(open.day)});
    }
    setOpen(null);
  };
  const closeAdding = () => {
    if (adding) {
      setReturnFocus({id: addId(adding), fallback: addId(adding)});
    }
    setAdding(null);
  };
  const openSession = async (schedule: WorkoutSchedule) => {
    if (!state || start.isPending) {
      return;
    }
    setStartError('');
    try {
      const current = await occurrences.refetch({throwOnError: true});
      const existing = current.data?.data.find((log) => log.schedule_id === schedule.id && log.state !== 'discarded');
      if (existing) {
        navigate(sessionPath(clientId, existing.id));
        return;
      }
      const recording = await active.refetch({throwOnError: true});
      if (recording.data?.data) {
        navigate(sessionPath(clientId, recording.data.data.id));
        return;
      }
      const result = await start.mutateAsync({scheduleId: schedule.id, date: state.today});
      navigate(sessionPath(clientId, result.data.id));
    } catch (cause) {
      setStartError(errorMessage(cause, 'Could not open this session. Try again.'));
    }
  };
  return (
    <DraftGuard value={register}>
      <Page className="client-page pb-32">
        <PageHeader
          title="Training week"
          back={{to: `/clients/${clientId}`, label: client.data?.data.full_name ?? 'Client'}}
          description={
            state?.schedules.length === 0
              ? 'Nothing planned yet. Add a workout to a day; it repeats every week.'
              : 'Repeats every week. Changes apply from today; earlier weeks stay as they were.'
          }
        />
        {active.data?.data && (
          <Link
            className={buttonVariants({variant: 'outline'})}
            to={sessionPath(clientId, active.data.data.id)}
          >
            Open active session
          </Link>
        )}
        {active.isError && (
          <div className="space-y-2">
            <FormError message={errorMessage(active.error, 'Could not check the active session.')} />
            <Button
              variant="outline"
              onPress={() => {
                active.refetch();
              }}
            >
              Check active session
            </Button>
          </div>
        )}
        {occurrences.isError && (
          <FormError
            message={errorMessage(occurrences.error, 'Could not check today’s sessions. Try the session action again.')}
          />
        )}
        <FormError message={startError} />
        {query.isError && (
          <div className="space-y-3">
            <FormError
              message={errorMessage(
                query.error,
                state
                  ? 'Could not refresh this week. The previous week is still here.'
                  : 'Could not load this training week.',
              )}
            />
            <Button
              variant="outline"
              isPending={query.isFetching}
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        )}
        {!state && query.isPending && <p role="status">Loading training week…</p>}
        {state && (
          <WeekColumns defaultDay={todayBit}>
            {(day) => {
              const items = state.schedules.filter((row) => row.weekdays_mask & day.bit).sort(byTime);
              return (
                <>
                  {items.map((row) => {
                    const workout = state.workouts.find((item) => item.id === row.workout_id);
                    const occasion = occasionLabel(row, state.coaches);
                    const existingLog = occurrences.data?.data.find(
                      (log) => log.schedule_id === row.id && log.state !== 'discarded',
                    );
                    return (
                      <div
                        key={row.id}
                        className="min-w-0 space-y-1"
                      >
                        <Button
                          id={cardId(row, day)}
                          variant="outline"
                          isDisabled={write.pending || write.blocked}
                          data-workout-schedule
                          className="h-auto w-full flex-col items-start gap-1 whitespace-normal border-transparent px-3 py-3 text-left"
                          onPress={() => setOpen({schedule: row, day})}
                        >
                          <span className="font-semibold">{workout?.name ?? 'Workout'}</span>
                          {occasion && <span className="text-sm font-medium text-muted-foreground">{occasion}</span>}
                          {Boolean(row.weekdays_mask & ~day.bit) && (
                            <span className="text-sm font-medium text-muted-foreground">
                              Also {daysLabel(row.weekdays_mask & ~day.bit)}
                            </span>
                          )}
                        </Button>
                        {day.bit === todayBit && occursOn(row, state.today) && (
                          <Button
                            size="sm"
                            variant="outline"
                            isPending={start.isPending}
                            isDisabled={write.pending || write.blocked || active.isFetching || occurrences.isFetching}
                            onPress={() => openSession(row)}
                          >
                            {existingLog ? 'Open' : row.coach_id ? 'Start session' : 'Record session'}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {items.length === 0 && <p className="px-1 text-sm font-medium text-muted-foreground">Rest day</p>}
                  <Button
                    id={addId(day)}
                    size="sm"
                    variant="ghost"
                    aria-label={`Add to ${day.long}`}
                    isDisabled={write.pending || write.blocked}
                    className="mt-auto self-start hover:bg-background"
                    onPress={() => setAdding(day)}
                  >
                    <Plus />
                    Add
                  </Button>
                </>
              );
            }}
          </WeekColumns>
        )}
        {!open && !adding && write.error && recovery}
        <section
          className="space-y-4"
          aria-labelledby="recent-sessions-title"
        >
          <h2
            id="recent-sessions-title"
            className="editor-section-title"
          >
            Recent sessions
          </h2>
          <InfiniteList
            query={sessions}
            label="sessions"
            singular="session"
            empty={<p className="text-sm font-medium text-muted-foreground">No sessions recorded yet.</p>}
          >
            {(log) => (
              <RecentSession
                clientId={clientId}
                log={log}
                workouts={state?.workouts ?? []}
              />
            )}
          </InfiniteList>
        </section>
      </Page>
      {state && open && (
        <ScheduleDialog
          key={`${open.schedule.id}-${open.day.bit}`}
          clientId={clientId}
          state={state}
          schedule={open.schedule}
          day={open.day}
          apply={write.execute}
          pending={write.pending}
          blocked={write.blocked}
          recovery={recovery}
          onClose={closeSchedule}
        />
      )}
      {state && adding && (
        <AddDialog
          clientId={clientId}
          state={state}
          day={adding}
          apply={write.execute}
          pending={write.pending}
          blocked={write.blocked}
          recovery={recovery}
          onClose={closeAdding}
        />
      )}
      {/* Saved is the normal state and says nothing, as in the nutrition week; saving and failure show. */}
      <div role="status">
        {(write.pending || write.error) && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-4 py-3 text-sm font-medium">
            <div className="mx-auto flex max-w-6xl items-center gap-2">
              {write.pending ? 'Saving…' : 'Not saved. Your changes stay on this device.'}
            </div>
          </div>
        )}
      </div>
      <UndoToast
        undo={write.undo}
        pending={write.pending}
        onExpire={clearUndo}
        {...(write.undo && write.error ? {error: write.error} : {})}
        onUndo={async ({token, expected}) => {
          if (state) {
            await write.execute({kind: 'undo', before: state, expected, token, message: 'Change undone.'});
          }
        }}
      />
      <Dialog
        isOpen={blocker.state === 'blocked'}
        isDismissable={false}
        isKeyboardDismissDisabled
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Leave this training week?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-3">
          <p>Unsubmitted changes will be lost. Unconfirmed saves stay on this device; check them when you return.</p>
          <Button
            onPress={() => {
              if (blocker.state === 'blocked') {
                blocker.reset();
              }
            }}
          >
            Keep editing
          </Button>
          <Button
            variant="outline"
            isDisabled={write.pending || [...guards.current.values()].some(Boolean)}
            onPress={() => {
              if (blocker.state === 'blocked') {
                blocker.proceed();
              }
            }}
          >
            Leave week
          </Button>
        </div>
      </Dialog>
    </DraftGuard>
  );
}

const sessionPath = (clientId: string, logId: string) =>
  generatePath(routes.clientWorkoutSession, {id: clientId, logId});

function RecentSession({clientId, log, workouts}: {clientId: string; log: WorkoutLog; workouts: Workout[]}) {
  const name = workouts.find((workout) => workout.id === log.workout_id)?.name;
  if (log.workout_id && !name) {
    return (
      <HistoricalSession
        clientId={clientId}
        log={log}
      />
    );
  }
  return (
    <SessionLink
      clientId={clientId}
      log={log}
      name={name ?? 'Workout session'}
    />
  );
}

function HistoricalSession({clientId, log}: {clientId: string; log: WorkoutLog}) {
  const query = useWorkout(log.workout_id ?? '', clientId);
  return (
    <SessionLink
      clientId={clientId}
      log={log}
      name={query.data?.data.name ?? (query.isError ? 'Workout unavailable' : 'Opening workout…')}
    />
  );
}

function SessionLink({clientId, log, name}: {clientId: string; log: WorkoutLog; name: string}) {
  return (
    <Link
      to={sessionPath(clientId, log.id)}
      className="block space-y-1 p-4"
    >
      <p className="break-words font-semibold">{name}</p>
      <p className="text-sm font-medium text-muted-foreground">
        {log.date} · {log.state === 'active' ? 'In progress' : log.state === 'completed' ? 'Completed' : 'Discarded'} ·{' '}
        {log.recorder_name}
        {log.effort === null ? '' : ` · ${effortLabel(log.effort)}`}
      </p>
    </Link>
  );
}
