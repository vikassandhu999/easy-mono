// PROTOTYPE — throwaway. Route: /prototype/client-week
// Question: how does a coach design a client's repeating training week? No dates in the UI for now.
// No API, no login, state lives in memory.
import {ArrowLeft, Check, Plus} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Button} from '../ui/button';
import {current, daysLabel, initialState, occasionLabel, type Schedule, type State, weekdays, workoutOf} from './model';
import {AddToDayDialog, type Commit, ScheduledDialog} from './parts';

type Day = (typeof weekdays)[number];
type Undo = {message: string; before: State};

export function ClientWeekPrototype() {
  const [state, setState] = useState<State>(initialState);
  const [open, setOpen] = useState<{schedule: Schedule; day: Day} | null>(null);
  const [adding, setAdding] = useState<Day | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const rows = current(state);

  useEffect(() => {
    if (!undo) {
      return;
    }
    const timer = window.setTimeout(() => setUndo(null), 8000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  const commit: Commit = (next, message) => {
    setUndo({message, before: state});
    setState(next);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <p className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950">
        Prototype — throwaway. Reload resets the week.
      </p>
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <a
            href="#client"
            className="flex min-h-11 items-center gap-2 font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft
              aria-hidden="true"
              size={18}
            />
            Maya Patel
          </a>
          <p
            role="status"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <Check
              aria-hidden="true"
              size={16}
              className="text-emerald-700"
            />
            All changes saved
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Training week</h1>
          <p className="text-muted-foreground">
            {rows.length === 0
              ? 'Nothing planned yet. Add a workout to a day; it repeats every week.'
              : 'Repeats every week. Changes apply from today.'}
          </p>
        </div>

        <ol className="grid gap-2 md:grid-cols-7">
          {weekdays.map((day) => {
            const items = rows.filter((schedule) => schedule.mask & day.bit);
            return (
              <li
                key={day.bit}
                aria-label={day.long}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2"
              >
                <h2 className="px-1 text-sm font-semibold text-muted-foreground">{day.long}</h2>
                {items.map((schedule) => {
                  const workout = workoutOf(state, schedule);
                  const occasion = occasionLabel(schedule);
                  const others = schedule.mask & ~day.bit;
                  return (
                    <Button
                      key={schedule.id}
                      variant="outline"
                      className="h-auto w-full flex-col items-start gap-0.5 whitespace-normal px-3 py-2 text-left"
                      onPress={() => setOpen({schedule, day})}
                    >
                      <span className="font-semibold">{workout?.name}</span>
                      {occasion && <span className="text-xs font-medium text-muted-foreground">{occasion}</span>}
                      {others !== 0 && (
                        <span className="text-xs font-medium text-muted-foreground">Also {daysLabel(others)}</span>
                      )}
                    </Button>
                  );
                })}
                {items.length === 0 && <p className="px-1 text-sm text-muted-foreground">Rest day</p>}
                <Button
                  size="xs"
                  variant="ghost"
                  aria-label={`Add a workout on ${day.long}`}
                  className="self-start"
                  onPress={() => setAdding(day)}
                >
                  <Plus />
                  Add
                </Button>
              </li>
            );
          })}
        </ol>

        <details className="rounded-2xl border border-border bg-surface p-4">
          <summary className="cursor-pointer font-semibold">Schedule rows (what would be saved)</summary>
          <pre className="mt-3 max-h-96 overflow-auto text-xs">{JSON.stringify(state.schedules, null, 2)}</pre>
        </details>
      </main>

      {open && (
        <ScheduledDialog
          key={`${open.schedule.id}-${open.day.bit}`}
          state={state}
          commit={commit}
          schedule={open.schedule}
          day={open.day}
          onClose={() => setOpen(null)}
        />
      )}
      {adding && (
        <AddToDayDialog
          state={state}
          commit={commit}
          day={adding}
          onClose={() => setAdding(null)}
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
                setState(undo.before);
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
