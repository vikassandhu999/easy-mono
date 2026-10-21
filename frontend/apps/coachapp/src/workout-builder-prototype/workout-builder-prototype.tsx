// PROTOTYPE — throwaway. Route: /prototype/workout-builder
// Question: what should the coach's workout builder look like? No API, no login, state lives in memory.
import {ArrowLeft, Check, CloudOff, LoaderCircle} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {Button} from '../ui/button';
import {CardsBuilder} from './cards-builder';
import {initialWorkout, type Workout} from './model';
import {OtherTypePanel, WorkoutHeader} from './parts';

type SaveState = 'saved' | 'saving' | 'failed';

export function WorkoutBuilderPrototype() {
  const [workout, setWorkout] = useState<Workout>(initialWorkout);
  const [offline, setOffline] = useState(false);
  const [save, setSave] = useState<SaveState>('saved');
  const timer = useRef<number | undefined>(undefined);

  // Simulates autosave: every change saves after a short delay; "no connection" makes it fail.
  const runSave = () => {
    setSave('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSave(offline ? 'failed' : 'saved'), 700);
  };
  const change = (next: Workout) => {
    setWorkout(next);
    runSave();
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950">
        <span>Prototype — throwaway. Reload resets the workout.</span>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={offline}
            onChange={(event) => setOffline(event.target.checked)}
            className="size-4"
          />
          Simulate no connection
        </label>
      </div>

      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2 sm:px-6">
          <a
            href="#library"
            className="flex min-h-11 items-center gap-2 font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft
              aria-hidden="true"
              size={18}
            />
            Workout library
          </a>
          <div
            role="status"
            className="flex items-center gap-2 text-sm font-medium"
          >
            {save === 'saved' && (
              <>
                <Check
                  aria-hidden="true"
                  size={16}
                  className="text-emerald-700"
                />
                All changes saved
              </>
            )}
            {save === 'saving' && (
              <>
                <LoaderCircle
                  aria-hidden="true"
                  size={16}
                  className="animate-spin text-muted-foreground"
                />
                Saving…
              </>
            )}
            {save === 'failed' && (
              <>
                <CloudOff
                  aria-hidden="true"
                  size={16}
                  className="text-destructive"
                />
                <span>Not saved. Your changes stay on this device.</span>
                <Button
                  size="xs"
                  variant="outline"
                  onPress={runSave}
                >
                  Retry
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
        <WorkoutHeader
          workout={workout}
          setWorkout={change}
        />
        {workout.type === 'prescribed' ? (
          <CardsBuilder
            workout={workout}
            setWorkout={change}
          />
        ) : (
          <OtherTypePanel type={workout.type} />
        )}
        <details className="rounded-2xl border border-border bg-surface p-4">
          <summary className="cursor-pointer font-semibold">Workout state (what would be saved)</summary>
          <pre className="mt-3 max-h-96 overflow-auto text-xs">{JSON.stringify(workout, null, 2)}</pre>
        </details>
      </main>
    </div>
  );
}
