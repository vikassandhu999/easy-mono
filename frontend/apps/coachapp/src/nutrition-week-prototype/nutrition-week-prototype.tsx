// PROTOTYPE. Route: /prototype/nutrition-week
// Question: how does a coach design a client's repeating nutrition week? No dates in the UI for now.
// The meal editor opens in place and shares this state. No API, no login, state lives in memory.
import {ArrowLeft, Pill, Plus, Target} from 'lucide-react';
import {useCallback, useRef, useState, useSyncExternalStore} from 'react';
import {Tab, TabList, TabPanel, Tabs} from 'react-aria-components';
import {Button} from '../ui/button';
import {MealEditor} from './meal-editor';
import {
  actions,
  byTime,
  current,
  type Day,
  energyText,
  initialState,
  type Meal,
  newMeal,
  presetOf,
  presetSummary,
  presetTitle,
  type Schedule,
  type State,
  targetsOn,
  weekdays,
} from './model';
import {AddDialog, type Commit, ScheduleDialog, TargetsDialog, type Undo, UndoToast} from './parts';

type Editing = {meal: Meal; newOn: Day | null; scrollY: number; focus: string};

// Seven columns need about 150px each; below that one day shows at a time (responsive-paradigms).
const wide = '(min-width: 80rem)';
const subscribe = (notify: () => void) => {
  const query = window.matchMedia(wide);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const useWide = () => useSyncExternalStore(subscribe, () => window.matchMedia(wide).matches);

// A save replaces the schedule row (W14), so cards are found by their meal, not their row id.
const cardId = (schedule: Schedule, day: Day) => `card-${schedule.presetId}-${day.bit}`;
const targetsId = (day: Day) => `targets-${day.bit}`;
const addId = (day: Day) => `add-${day.bit}`;

// After a dialog or the editor closes, focus returns to the card, or to the day's Add when the card is gone.
const refocus = (id: string, fallback: string) =>
  requestAnimationFrame(() => (document.getElementById(id) ?? document.getElementById(fallback))?.focus());

export function NutritionWeekPrototype() {
  const [state, setState] = useState<State>(initialState);
  const [open, setOpen] = useState<{schedule: Schedule; day: Day} | null>(null);
  const [adding, setAdding] = useState<Day | null>(null);
  const [targets, setTargets] = useState<Day | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [undo, setUndo] = useState<Undo<State> | null>(null);
  const clearUndo = useCallback(() => setUndo(null), []);
  const [shown, setShown] = useState<number>(weekdays[0].bit);
  const isWide = useWide();
  const rows = current(state);
  const lastDay = useRef<Day>(weekdays[0]);

  const commit: Commit = (next, message) => {
    setUndo({message, before: state});
    setState(next);
  };
  const edit = (meal: Meal, newOn: Day | null, focus: string) => {
    setOpen(null);
    setAdding(null);
    setEditing({meal, newOn, scrollY: window.scrollY, focus});
  };
  const closeEditor = (current: Editing) => {
    setEditing(null);
    requestAnimationFrame(() => window.scrollTo(0, current.scrollY));
    refocus(current.focus, addId(lastDay.current));
  };

  const column = (day: Day) => {
    const items = rows.filter((schedule) => schedule.mask & day.bit).sort(byTime);
    const set = targetsOn(state, day.bit);
    return (
      <>
        {isWide && <h2 className="px-1 text-base font-semibold">{day.long}</h2>}
        <Button
          id={targetsId(day)}
          variant="ghost"
          className="h-auto w-full items-start justify-start gap-2 whitespace-normal px-3 py-2 text-left hover:bg-background"
          onPress={() => setTargets(day)}
        >
          <Target
            aria-hidden="true"
            size={16}
            className="mt-0.5 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0">
            <span className="sr-only">{day.long} targets: </span>
            <span className="block text-sm font-medium">{set ? set.name : 'No targets'}</span>
            <span className="block text-sm text-muted-foreground tabular-nums">
              {set ? energyText(set) : 'Set targets'}
            </span>
          </span>
        </Button>
        {items.map((schedule) => {
          const preset = presetOf(state, schedule.presetId);
          if (!preset) {
            return null;
          }
          const summary = presetSummary(preset);
          return (
            <Button
              key={schedule.id}
              id={cardId(schedule, day)}
              variant="outline"
              className="h-auto w-full flex-col items-start gap-0.5 whitespace-normal border-transparent px-3 py-2 text-left font-normal"
              onPress={() => {
                lastDay.current = day;
                setOpen({schedule, day});
              }}
            >
              <span className="text-sm font-medium text-muted-foreground tabular-nums">
                {schedule.time ?? 'Any time'}
              </span>
              <span className="flex items-start gap-1.5 font-semibold">
                {preset.type === 'supplement' && (
                  <>
                    <Pill
                      aria-hidden="true"
                      size={16}
                      className="mt-0.5 shrink-0 text-muted-foreground"
                    />
                    <span className="sr-only">Supplement: </span>
                  </>
                )}
                {presetTitle(preset)}
              </span>
              <span
                title={summary}
                className="line-clamp-2 text-sm text-muted-foreground"
              >
                {summary}
              </span>
            </Button>
          );
        })}
        {items.length === 0 && <p className="px-1 text-sm text-muted-foreground">Nothing planned</p>}
        <Button
          id={addId(day)}
          size="sm"
          variant="ghost"
          aria-label={`Add to ${day.long}`}
          className="mt-auto self-start hover:bg-background"
          onPress={() => {
            lastDay.current = day;
            setAdding(day);
          }}
        >
          <Plus />
          Add
        </Button>
      </>
    );
  };
  const columnClass = 'flex min-w-0 flex-col gap-2 rounded-2xl bg-muted p-2';

  return (
    <>
      {editing && (
        <MealEditor
          key={editing.meal.id}
          state={state}
          initial={editing.meal}
          newOn={editing.newOn}
          onClose={() => closeEditor(editing)}
          onSave={(meal) => {
            const saved = actions.savePreset(state, meal);
            commit(
              editing.newOn
                ? actions.addSchedule(saved, {presetId: meal.id, time: null, mask: editing.newOn.bit})
                : saved,
              editing.newOn ? `${meal.name} added to ${editing.newOn.long}.` : `${meal.name} saved.`,
            );
            closeEditor(editing);
          }}
        />
      )}
      {/* The week stays mounted while the editor is open, so its tab and scroll position survive. */}
      <div
        hidden={editing !== null}
        className="min-h-dvh bg-background pb-24"
      >
        <p className="bg-muted px-4 py-2 text-center text-sm font-medium text-muted-foreground">
          Prototype. Reload resets the week.
        </p>
        <div className="border-b border-border">
          <div className="mx-auto flex max-w-screen-2xl items-center px-4 py-2 sm:px-6">
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
          </div>
        </div>

        <main className="mx-auto max-w-screen-2xl space-y-5 px-4 py-6 sm:px-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Nutrition week</h1>
            <p className="text-muted-foreground">
              {rows.length === 0
                ? 'Nothing planned yet. Add a meal, food or supplement to a day; it repeats every week.'
                : 'Repeats every week. Changes apply from today; earlier weeks stay as they were.'}
            </p>
          </div>

          {isWide ? (
            <ol className="grid grid-cols-7 gap-2">
              {weekdays.map((day) => (
                <li
                  key={day.bit}
                  aria-label={day.long}
                  className={columnClass}
                >
                  {column(day)}
                </li>
              ))}
            </ol>
          ) : (
            <Tabs
              selectedKey={String(shown)}
              onSelectionChange={(key) => setShown(Number(key))}
            >
              <TabList
                aria-label="Day"
                className="grid grid-cols-7 border-b border-border"
              >
                {weekdays.map((day) => (
                  <Tab
                    key={day.bit}
                    id={String(day.bit)}
                    aria-label={day.long}
                    className="-mb-px flex min-h-11 cursor-pointer items-center justify-center border-b-2 border-transparent text-sm font-medium text-muted-foreground outline-none data-focus-visible:ring-2 data-focus-visible:ring-ring data-selected:border-foreground data-selected:font-semibold data-selected:text-foreground"
                  >
                    {day.short}
                  </Tab>
                ))}
              </TabList>
              {weekdays.map((day) => (
                <TabPanel
                  key={day.bit}
                  id={String(day.bit)}
                  className={`${columnClass} mt-3 outline-none`}
                >
                  {column(day)}
                </TabPanel>
              ))}
            </Tabs>
          )}

          <details className="rounded-2xl border border-border bg-surface p-4">
            <summary className="cursor-pointer font-semibold">Week state (what would be saved)</summary>
            <pre className="mt-3 max-h-96 overflow-auto text-xs">{JSON.stringify(state, null, 2)}</pre>
          </details>
        </main>
      </div>

      {open && (
        <ScheduleDialog
          key={`${open.schedule.id}-${open.day.bit}`}
          state={state}
          commit={commit}
          schedule={open.schedule}
          day={open.day}
          onEditMeal={(meal) => {
            if (meal.type === 'meal') {
              edit(meal, null, cardId(open.schedule, open.day));
            }
          }}
          onClose={() => {
            setOpen(null);
            refocus(cardId(open.schedule, open.day), addId(open.day));
          }}
        />
      )}
      {adding && (
        <AddDialog
          state={state}
          commit={commit}
          day={adding}
          onCreateMeal={() => edit(newMeal(), adding, addId(adding))}
          onClose={() => {
            setAdding(null);
            refocus(addId(adding), addId(adding));
          }}
        />
      )}
      {targets && (
        <TargetsDialog
          key={targets.bit}
          state={state}
          commit={commit}
          day={targets}
          onClose={() => {
            setTargets(null);
            refocus(targetsId(targets), targetsId(targets));
          }}
        />
      )}

      <UndoToast
        undo={undo}
        onExpire={clearUndo}
        onUndo={(before) => {
          setState(before);
          setUndo(null);
        }}
      />
    </>
  );
}
