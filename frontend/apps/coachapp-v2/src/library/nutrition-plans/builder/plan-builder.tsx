import {getFullName, WEEKDAYS} from '@easy/utils';
import {AlertDialog, Button, Typography} from '@heroui/react';
import {useCallback, useRef, useState} from 'react';
import {useBeforeUnload, useBlocker, useSearchParams} from 'react-router-dom';
import {ApiError} from '@/api/client';
import {type NutritionPlan, useSaveNutritionMenuMutation} from '@/api/nutrition-plans';
import {getApiErrorMessage} from '@/api/shared';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {Page} from '@/ui/page';
import {useGoBack} from '@/ui/use-go-back';
import {AddItemsFlow} from './add-items-flow';
import {AmountSheet} from './amount-sheet';
import {DayEnergyHeader} from './day-energy-header';
import {DayHeader} from './day-header';
import {DeleteDayDialog} from './delete-day-dialog';
import {MealCard} from './meal-card';
import {AddMealControl} from './meal-palette';
import {dayRows, dayTotals, editMenu, firstFreeSlot, type Menu, type MenuEdit} from './menu';
import {NutritionPlanActions} from './plan-actions';
import {PlanAddToClient} from './plan-add-to-client';

type Editor =
  | {kind: 'closed'}
  | {kind: 'addItems'; mealId: string}
  | {kind: 'amount'; mealId: string; itemId: string; anchor: HTMLElement}
  | {kind: 'deleteDay'; dayId: string};

export function PlanBuilder({plan, reload}: {plan: NutritionPlan; reload: () => Promise<NutritionPlan | undefined>}) {
  const [draft, setDraft] = useState<{base: NutritionPlan; menu: Menu} | null>(null);
  const saved = draft?.base ?? plan;
  const menu = draft?.menu ?? plan.menu;
  const goBack = useGoBack(ROUTES.NUTRITION_PLANS);
  const [editor, setEditor] = useState<Editor>({kind: 'closed'});
  const [openMealId, setOpenMealId] = useState<string | null>(null);
  const [autoRenameMealId, setAutoRenameMealId] = useState<string | null>(null);
  const [showMacros, setShowMacros] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const saveMutation = useSaveNutritionMenuMutation();
  const busy = useRef(false);
  const [params, setParams] = useSearchParams();
  const dirty = draft !== null;
  const pending = saveMutation.isPending || reloading;
  const activeDay = menu.day_patterns.find((day) => day.id === params.get('d')) ?? menu.day_patterns[0];
  const rows = activeDay ? dayRows(activeDay) : [];

  const edit = (action: MenuEdit) => {
    if (busy.current) {
      return;
    }
    setDraft((draft) => {
      const base = draft?.base ?? plan;
      const menu = editMenu(draft?.menu ?? base.menu, action);
      return JSON.stringify(menu) === JSON.stringify(base.menu) ? null : {base, menu};
    });
    setError(null);
  };
  const closeEditor = () => setEditor({kind: 'closed'});
  const selectDay = (id: string) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('d', id);
        return next;
      },
      {replace: true},
    );
    setOpenMealId(null);
  };
  const accept = () => {
    setDraft(null);
    setError(null);
    closeEditor();
  };
  const save = async () => {
    if (busy.current || !dirty) {
      return;
    }
    busy.current = true;
    closeEditor();
    setError(null);
    try {
      await saveMutation.mutateAsync({id: saved.id, body: {expected_revision: saved.revision, menu}});
      accept();
    } catch (error) {
      setError(
        error instanceof ApiError && error.status === 409
          ? 'This plan changed elsewhere. Your draft is still here. Discard it to load the saved plan.'
          : getApiErrorMessage(error, "Couldn't save the menu. Your draft is still here; try again."),
      );
    } finally {
      busy.current = false;
    }
  };
  const discard = async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setReloading(true);
    try {
      const latest = await reload();
      if (latest) {
        accept();
      } else {
        setError("Couldn't load the saved plan. Your draft is still here.");
      }
    } catch {
      setError("Couldn't load the saved plan. Your draft is still here.");
    } finally {
      busy.current = false;
      setReloading(false);
    }
  };

  const blocker = useBlocker(
    ({currentLocation, nextLocation}) => dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (dirty) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty],
    ),
  );

  const editingMeal = 'mealId' in editor ? menu.meals.find((meal) => meal.id === editor.mealId) : undefined;
  const editingItem =
    editor.kind === 'amount' ? editingMeal?.meal_items.find((item) => item.id === editor.itemId) : undefined;
  const deletingDay =
    editor.kind === 'deleteDay' ? menu.day_patterns.find((day) => day.id === editor.dayId) : undefined;

  const clientName = saved.client ? getFullName(saved.client.first_name, saved.client.last_name) : '';
  const readOnly = saved.status === 'archived';
  return (
    <Page className="text-foreground leading-[normal]">
      <Page.Header
        className="gap-3"
        size="builder"
      >
        <Page.TitleGroup className="flex min-w-0 items-center">
          <BackButton
            onPress={goBack}
            testId="nb-back"
          />
          <Page.Title testId="nb-title">{clientName ? `${saved.name} — ${clientName}` : saved.name}</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <div
            inert={dirty || pending}
            className={dirty || pending ? 'flex items-center gap-2 opacity-50' : 'flex items-center gap-2'}
          >
            <PlanAddToClient plan={saved} />
            <NutritionPlanActions
              plan={saved}
              onDeleted={goBack}
              refetchLatest={reload}
            />
          </div>
        </Page.Actions>
      </Page.Header>
      <Page.Content
        bare
        className="pb-10"
      >
        <Page.Frame size="builder">
          <div className="flex flex-col gap-4">
            <div className="sticky top-0 z-10 grid grid-cols-2 items-center gap-2 rounded-card sm:flex border border-border bg-surface p-3">
              <Typography
                className="col-span-2 flex-1"
                type="body-sm"
                aria-live="polite"
              >
                {reloading
                  ? 'Loading saved menu…'
                  : pending
                    ? 'Saving…'
                    : dirty
                      ? 'Unsaved menu changes'
                      : 'Menu saved'}
              </Typography>
              <Button
                isDisabled={!dirty || pending}
                onPress={discard}
                variant="tertiary"
              >
                Discard
              </Button>
              <Button
                isDisabled={readOnly || !dirty || pending || editor.kind !== 'closed'}
                isPending={saveMutation.isPending}
                onPress={save}
                variant="primary"
              >
                Save menu
              </Button>
            </div>
            {readOnly ? <p className="type-body-sm text-muted">Archived menu. Restore the plan to edit it.</p> : null}
            {error ? (
              <p
                role="alert"
                className="type-body-sm text-danger"
              >
                {error}
              </p>
            ) : null}
            <div
              inert={pending || readOnly}
              className="flex flex-col gap-4"
            >
              {activeDay ? (
                <>
                  <DayHeader
                    key={activeDay.id}
                    assignedDays={WEEKDAYS.filter((weekday) => menu.schedule[weekday] === activeDay.id)}
                    name={activeDay.name}
                    onRename={(name) => edit({type: 'renameDay', dayId: activeDay.id, name})}
                    onRequestDelete={() => setEditor({kind: 'deleteDay', dayId: activeDay.id})}
                    onScheduleWeekday={(weekday) => edit({type: 'schedule', weekday, dayId: activeDay.id})}
                    tabs={{
                      days: menu.day_patterns,
                      activeDayId: activeDay.id,
                      onSelect: selectDay,
                      onAdd: () => {
                        const id = crypto.randomUUID();
                        edit({type: 'addDay', id});
                        selectDay(id);
                      },
                      isFirst: menu.day_patterns[0]?.id === activeDay.id,
                      isLast: menu.day_patterns[menu.day_patterns.length - 1]?.id === activeDay.id,
                      ...(menu.day_patterns.length > 1
                        ? {
                            onMove: (direction: -1 | 1) => {
                              const from = menu.day_patterns.findIndex((day) => day.id === activeDay.id);
                              edit({type: 'moveDay', from, to: from + direction});
                            },
                          }
                        : {}),
                    }}
                  />
                  {dirty ? (
                    <p className="type-body-sm text-muted">Save the menu to calculate nutrition totals.</p>
                  ) : (
                    <DayEnergyHeader
                      onToggleMacros={() => setShowMacros((value) => !value)}
                      showMacros={showMacros}
                      targets={{
                        calories: saved.target_calories,
                        protein_g: saved.target_protein_g,
                        carbs_g: saved.target_carbs_g,
                        fat_g: saved.target_fat_g,
                      }}
                      totals={dayTotals(activeDay, menu.meals)}
                    />
                  )}
                  {rows.length === 0 ? (
                    <p className="rounded-card border border-dashed border-border p-5 type-body-sm text-muted">
                      No meals on this day yet.
                    </p>
                  ) : null}
                  {rows.map(({slot, primary, alternates}) => {
                    const meal = menu.meals.find((meal) => meal.id === primary.nutrition_meal_id);
                    if (!meal) {
                      return null;
                    }
                    const assignedIds = new Set([primary, ...alternates].map((option) => option.nutrition_meal_id));
                    const count = menu.day_patterns.filter((day) =>
                      day.slots.some((slot) => slot.options.some((option) => option.nutrition_meal_id === meal.id)),
                    ).length;
                    return (
                      <MealCard
                        key={primary.id}
                        meal={meal}
                        edit={edit}
                        dayId={activeDay.id}
                        optionId={primary.id}
                        slot={slot}
                        assignmentCount={count}
                        showNutrition={!dirty}
                        open={openMealId === meal.id}
                        autoRename={autoRenameMealId === meal.id}
                        onToggle={() => {
                          setOpenMealId((value) => (value === meal.id ? null : meal.id));
                          setAutoRenameMealId(null);
                        }}
                        onAddItems={() => setEditor({kind: 'addItems', mealId: meal.id})}
                        onEditItem={(item, anchor) =>
                          setEditor({kind: 'amount', mealId: meal.id, itemId: item.id, anchor})
                        }
                        swaps={alternates.flatMap((option) => {
                          const meal = menu.meals.find((meal) => meal.id === option.nutrition_meal_id);
                          return meal ? [{optionId: option.id, meal}] : [];
                        })}
                        swapCandidates={menu.meals
                          .filter((meal) => !assignedIds.has(meal.id))
                          .map((meal) => ({id: meal.id, name: meal.name}))}
                      />
                    );
                  })}
                  <AddMealControl
                    planMealCount={menu.meals.length}
                    onCreate={() => {
                      const id = crypto.randomUUID();
                      edit({type: 'addMeal', id, dayId: activeDay.id, optionId: crypto.randomUUID()});
                      setOpenMealId(id);
                      setAutoRenameMealId(id);
                    }}
                    onReuse={(mealId) =>
                      edit({
                        type: 'addOption',
                        dayId: activeDay.id,
                        slot: firstFreeSlot(activeDay),
                        mealId,
                        id: crypto.randomUUID(),
                      })
                    }
                    reusable={menu.meals.map((meal) => ({id: meal.id, name: meal.name}))}
                  />
                </>
              ) : (
                <p>No days in this menu.</p>
              )}
            </div>
            {deletingDay ? (
              <DeleteDayDialog
                assignments={menu.schedule}
                day={deletingDay}
                days={menu.day_patterns}
                isOpen
                onOpenChange={(open) => {
                  if (!open) {
                    closeEditor();
                  }
                }}
                onConfirm={() => {
                  edit({type: 'removeDay', dayId: deletingDay.id});
                  closeEditor();
                }}
              />
            ) : null}
            {editor.kind === 'addItems' && editingMeal ? (
              <AddItemsFlow
                open
                mealName={editingMeal.name}
                onClose={closeEditor}
                onAdd={(items) =>
                  edit({
                    type: 'addItems',
                    mealId: editingMeal.id,
                    items: items.map((item) => ({...item, id: crypto.randomUUID()})),
                  })
                }
              />
            ) : null}
            {editor.kind === 'amount' && editingItem ? (
              <AmountSheet
                open
                existingItem={editingItem}
                anchorEl={editor.anchor}
                onClose={closeEditor}
                onEditAmount={(portion) => {
                  edit({type: 'amount', mealId: editor.mealId, itemId: editingItem.id, portion});
                  closeEditor();
                }}
              />
            ) : null}
            <AlertDialog.Backdrop
              isOpen={blocker.state === 'blocked'}
              onOpenChange={(open) => {
                if (!open) {
                  blocker.reset?.();
                }
              }}
            >
              <AlertDialog.Container>
                <AlertDialog.Dialog>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>Leave without saving?</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>Your menu changes will be discarded.</AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button
                      variant="tertiary"
                      onPress={() => blocker.reset?.()}
                    >
                      Keep editing
                    </Button>
                    <Button
                      variant="danger"
                      isDisabled={pending}
                      onPress={() => blocker.proceed?.()}
                    >
                      Discard and leave
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </div>
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
