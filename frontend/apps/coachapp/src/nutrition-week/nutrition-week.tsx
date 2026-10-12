import {Pill, Plus, Target} from 'lucide-react';
import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {useBeforeUnload, useBlocker} from 'react-router-dom';
import {errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {useNutritionWeek, useUndoNutrition} from '../api/nutrition-week';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {Page, PageHeader} from '../ui/page';
import {Tab, TabList, TabPanel, Tabs} from '../ui/tabs';
import {AddDialog} from './add-dialog';
import {MealEditor} from './meal-editor';
import {
  byTime,
  type Day,
  energyText,
  type Meal,
  mealDraft,
  newMeal,
  presetOf,
  presetSummary,
  presetTitle,
  type Schedule,
  targetsOn,
  weekdays,
} from './model';
import {type Commit, DraftGuard, type Undo, UndoToast} from './parts';
import {ScheduleDialog} from './schedule-dialog';
import {TargetsDialog} from './targets-dialog';

type Editing = {meal: Meal; newOn: Day | null; scrollY: number; focus: string};
const wide = '(min-width: 80rem)';
const subscribe = (notify: () => void) => {
  const query = window.matchMedia(wide);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const useWide = () => useSyncExternalStore(subscribe, () => window.matchMedia(wide).matches);
const cardId = (schedule: Schedule, day: Day) => `card-${schedule.id}-${day.bit}`;
const targetsId = (day: Day) => `targets-${day.bit}`;
const addId = (day: Day) => `add-${day.bit}`;

export function NutritionWeek({clientId}: {clientId: string}) {
  return (
    <NutritionWeekScreen
      key={clientId}
      clientId={clientId}
    />
  );
}

function NutritionWeekScreen({clientId}: {clientId: string}) {
  const query = useNutritionWeek(clientId);
  const client = useClient(clientId);
  const clientName = client.data?.data.full_name ?? 'Client';
  const state = query.data?.data;
  const [open, setOpen] = useState<{schedule: Schedule; day: Day} | null>(null);
  const [adding, setAdding] = useState<Day | null>(null);
  const [targets, setTargets] = useState<Day | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [undo, setUndo] = useState<Undo<string> | null>(null);
  const [undoError, setUndoError] = useState<string>();
  const [returnFocus, setReturnFocus] = useState<{id: string; fallback: string} | null>(null);
  // Modal cleanup removes the page's inert state before this effect returns focus.
  useEffect(() => {
    if (returnFocus) {
      (document.getElementById(returnFocus.id) ?? document.getElementById(returnFocus.fallback))?.focus();
      setReturnFocus(null);
    }
  }, [returnFocus]);
  const refocus = (id: string, fallback: string) => setReturnFocus({id, fallback});
  const undoSave = useUndoNutrition(clientId);
  const clearUndo = useCallback(() => setUndo(null), []);
  const [shown, setShown] = useState<number>(weekdays[0].bit);
  const isWide = useWide();
  const lastDay = useRef<Day>(weekdays[0]);
  const guards = useRef(new Map<string, boolean>());
  const register = useCallback((id: string, active: boolean, pending: boolean) => {
    if (active) {
      guards.current.set(id, pending);
    } else {
      guards.current.delete(id);
    }
  }, []);
  const blocker = useBlocker(() => guards.current.size > 0 || undoSave.isPending);
  useBeforeUnload((event) => {
    if (guards.current.size > 0 || undoSave.isPending) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  const commit: Commit = (result, message) => {
    setUndo({message, before: result.undo_token});
    setUndoError(undefined);
  };
  const edit = (meal: Meal, newOn: Day | null, focus: string) => {
    setOpen(null);
    setAdding(null);
    setEditing({meal, newOn, scrollY: window.scrollY, focus});
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.nutrition-meal-editor input')?.focus());
  };
  const closeEditor = (current: Editing) => {
    setEditing(null);
    requestAnimationFrame(() => window.scrollTo(0, current.scrollY));
    refocus(current.focus, addId(lastDay.current));
  };
  const column = (day: Day) => {
    if (!state) {
      return null;
    }
    const items = state.schedules.filter((schedule) => (schedule.weekdays_mask ?? 0) & day.bit).sort(byTime);
    const set = targetsOn(state, day.bit);
    return (
      <>
        {isWide && <h2 className="px-1 text-base font-semibold">{day.long}</h2>}
        <Button
          id={targetsId(day)}
          variant="ghost"
          className="h-auto w-full items-start justify-start gap-2 whitespace-normal px-3 py-2 text-left hover:bg-background"
          isDisabled={undoSave.isPending}
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
          const preset = presetOf(state, schedule.nutrition_preset_id);
          if (!preset) {
            return null;
          }
          const summary = presetSummary(preset);
          return (
            <Button
              key={schedule.id}
              id={cardId(schedule, day)}
              variant="outline"
              isDisabled={undoSave.isPending}
              className="nutrition-schedule h-auto w-full flex-col items-start gap-0.5 whitespace-normal border-transparent px-3 py-2 text-left font-normal"
              onPress={() => {
                lastDay.current = day;
                setOpen({schedule, day});
              }}
            >
              <span className="text-sm font-medium text-muted-foreground tabular-nums">
                {schedule.time?.slice(0, 5) ?? 'Any time'}
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
          isDisabled={undoSave.isPending}
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
    <DraftGuard value={register}>
      {state && editing && (
        <MealEditor
          key={editing.meal.id}
          clientId={clientId}
          clientName={clientName}
          state={state}
          commit={commit}
          initial={editing.meal}
          newOn={editing.newOn}
          onClose={() => closeEditor(editing)}
        />
      )}
      <div hidden={editing !== null}>
        <Page className="nutrition-week client-page pb-24">
          <PageHeader
            title="Nutrition week"
            back={{to: `/clients/${clientId}`, label: clientName}}
            description={
              state && state.schedules.length === 0
                ? 'Nothing planned yet. Add a meal, food or supplement to a day; it repeats every week.'
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
                    : 'Could not load this nutrition week.',
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
          {!state ? (
            query.isPending && (
              <div
                role="status"
                className="space-y-3 rounded-2xl bg-muted p-5"
              >
                <p>Loading nutrition week…</p>
                <div
                  aria-hidden="true"
                  className="h-48 animate-pulse rounded-xl bg-surface"
                />
              </div>
            )
          ) : (
            <>
              {query.isFetching && (
                <p
                  role="status"
                  className="text-sm text-muted-foreground"
                >
                  Updating week…
                </p>
              )}
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
                        className="-mb-px flex min-h-11 items-center justify-center border-b-2 border-transparent text-sm font-medium text-muted-foreground data-selected:border-foreground data-selected:font-semibold data-selected:text-foreground"
                      >
                        {day.short}
                      </Tab>
                    ))}
                  </TabList>
                  {weekdays.map((day) => (
                    <TabPanel
                      key={day.bit}
                      id={String(day.bit)}
                      className={`${columnClass} mt-3`}
                    >
                      {column(day)}
                    </TabPanel>
                  ))}
                </Tabs>
              )}
            </>
          )}
        </Page>
      </div>
      {state && open && (
        <ScheduleDialog
          key={`${open.schedule.id}-${open.day.bit}`}
          clientId={clientId}
          state={state}
          commit={commit}
          schedule={open.schedule}
          day={open.day}
          onEditMeal={(meal) => edit(mealDraft(meal), null, cardId(open.schedule, open.day))}
          onClose={() => {
            setOpen(null);
            refocus(cardId(open.schedule, open.day), addId(open.day));
          }}
        />
      )}
      {state && adding && (
        <AddDialog
          clientId={clientId}
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
      {state && targets && (
        <TargetsDialog
          key={targets.bit}
          clientId={clientId}
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
        undo={editing ? null : undo}
        pending={undoSave.isPending}
        {...(undoError ? {error: undoError} : {})}
        onExpire={clearUndo}
        onUndo={async (token) => {
          setUndoError(undefined);
          try {
            await undoSave.mutateAsync(token);
            setUndo(null);
          } catch (cause) {
            setUndoError(errorMessage(cause, 'Could not undo this change. Try again.'));
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
          <DialogTitle>Leave without saving?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>Your unsaved changes will be lost.</p>
          <div className="flex flex-wrap gap-3">
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
              isDisabled={undoSave.isPending || [...guards.current.values()].some(Boolean)}
              onPress={() => {
                if (blocker.state === 'blocked') {
                  blocker.proceed();
                }
              }}
            >
              Discard changes
            </Button>
          </div>
        </div>
      </Dialog>
    </DraftGuard>
  );
}
