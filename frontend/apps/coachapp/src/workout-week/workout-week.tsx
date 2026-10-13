import {Plus} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useBeforeUnload, useBlocker} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {useWorkoutWeek, type WorkoutSchedule} from '../api/workout-week';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {Page, PageHeader} from '../ui/page';
import {type Day, daysLabel} from '../ui/week';
import {WeekColumns} from '../ui/week-columns';
import {DraftGuard, SaveRecovery, UndoToast} from '../ui/week-editor';
import {byTime, occasionLabel} from './model';
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
  const state = query.data?.data;
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
          <WeekColumns>
            {(day) => {
              const items = state.schedules.filter((row) => row.weekdays_mask & day.bit).sort(byTime);
              return (
                <>
                  {items.map((row) => {
                    const workout = state.workouts.find((item) => item.id === row.workout_id);
                    const occasion = occasionLabel(row, state.coaches);
                    return (
                      <Button
                        key={row.id}
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
