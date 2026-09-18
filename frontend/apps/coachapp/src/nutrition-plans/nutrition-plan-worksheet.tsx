import {useCallback, useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {useForm} from 'react-hook-form';
import {generatePath, useBeforeUnload, useBlocker, useNavigate} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {
  type NutritionDetails,
  type NutritionMenu,
  type NutritionPlan,
  useNutritionPlan,
  useNutritionTemplates,
  usePreviewNutritionMenu,
  useSaveNutritionPlan,
} from '../api/nutrition-plans';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {NutritionMenuPreview} from '../ui/nutrition-plan-preview';
import {FormActions, Page, PageHeader} from '../ui/page';
import {emptyMenu, type MenuIssue, validateMenu} from './menu';
import {MenuEditor} from './menu-editor';

const targets = [
  ['target_calories', 'Calories · kcal'],
  ['target_protein_g', 'Protein · g'],
  ['target_carbs_g', 'Carbs · g'],
  ['target_fat_g', 'Fat · g'],
  ['target_fiber_g', 'Fiber · g'],
] as const;
function fields(plan?: NutritionPlan) {
  return {
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    target_calories: String(plan?.target_calories ?? ''),
    target_protein_g: String(plan?.target_protein_g ?? ''),
    target_carbs_g: String(plan?.target_carbs_g ?? ''),
    target_fat_g: String(plan?.target_fat_g ?? ''),
    target_fiber_g: String(plan?.target_fiber_g ?? ''),
  };
}
function details(values: ReturnType<typeof fields>): NutritionDetails {
  const number = (value: string) => (value.trim() ? Number(value) : null);
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    target_calories: number(values.target_calories),
    target_protein_g: number(values.target_protein_g),
    target_carbs_g: number(values.target_carbs_g),
    target_fat_g: number(values.target_fat_g),
    target_fiber_g: number(values.target_fiber_g),
  };
}
export type NutritionEditorContext = {kind: 'template'} | {kind: 'client'; clientId: string};

export function NutritionPlanWorksheet({
  initial,
  context,
}: {
  initial: NutritionPlan | undefined;
  context: NutritionEditorContext;
}) {
  const [plan, setPlan] = useState(initial);
  const form = useForm({defaultValues: fields(initial)});
  const [menu, setMenu] = useState(() => initial?.menu ?? emptyMenu());
  const [menuDirty, setMenuDirty] = useState(false);
  const [menuIssue, setMenuIssue] = useState<MenuIssue | null>(null);
  const [previewMenu, setPreviewMenu] = useState<NutritionMenu>();
  const [conflict, setConflict] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [notice, setNotice] = useState('');
  const noticeRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (notice) {
      noticeRef.current?.focus();
    }
  }, [notice]);
  const mounted = useRef(true);
  const leaving = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const save = useSaveNutritionPlan(context.kind === 'client' ? context.clientId : undefined);
  const preview = usePreviewNutritionMenu();
  const query = useNutritionPlan(plan?.id ?? '');
  const {to: libraryLocation, state} = useListLocation(routes.nutritionPlans);
  const clientPlan = context.kind === 'client';
  const to = context.kind === 'client' ? generatePath(routes.client, {id: context.clientId}) : libraryLocation;
  const clientName = `${plan?.client?.first_name ?? ''} ${plan?.client?.last_name ?? ''}`.trim() || 'this client';
  const navigate = useNavigate();
  const dirty = form.formState.isDirty || menuDirty;
  const pending = form.formState.isSubmitting || preview.isPending || reloading;
  const unavailable = plan?.lifecycle === 'archived';
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (form.formState.errors.root && !pending && !menuIssue) {
      errorRef.current?.focus();
      errorRef.current?.scrollIntoView({block: 'center'});
    }
  }, [form.formState.errors.root, pending, menuIssue]);
  const blocker = useBlocker(
    useCallback(
      ({currentLocation, nextLocation}) =>
        !leaving.current && (dirty || pending) && currentLocation.pathname !== nextLocation.pathname,
      [dirty, pending],
    ),
  );
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty || pending) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty, pending],
    ),
  );
  function reset(saved: NutritionPlan) {
    setPlan(saved);
    form.reset(fields(saved));
    setMenu(saved.menu);
    setMenuDirty(false);
    setMenuIssue(null);
    setConflict(false);
    setUncertain(false);
  }
  async function loadLatest() {
    setNotice('');
    setReloading(true);
    try {
      const result = await query.refetch();
      if (result.error) {
        throw result.error;
      }
      if (result.data && mounted.current) {
        reset(result.data.data);
        setReloadOpen(false);
        setNotice('Saved version loaded.');
      }
    } catch (error) {
      if (mounted.current) {
        form.setError('root', {
          message: errorMessage(error, 'Could not load the saved plan. Your draft is still here.'),
        });
        setReloadOpen(false);
      }
    } finally {
      if (mounted.current) {
        setReloading(false);
      }
    }
  }
  return (
    <Page className="editor-page">
      <PageHeader
        title={clientPlan ? `Nutrition for ${clientName}` : initial ? 'Edit nutrition plan' : 'Create nutrition plan'}
        description={
          clientPlan
            ? 'Changes apply to this client only. Your reusable template stays unchanged.'
            : 'Set daily targets and offer practical meal choices.'
        }
        back={{to, label: clientPlan ? 'Back to client' : 'Back to nutrition plans', state}}
        actions={
          plan && (
            <>
              {plan && !clientPlan && (
                <Button
                  variant="ghost"
                  isDisabled={pending}
                  onPress={() => navigate(generatePath(routes.manageNutritionPlan, {id: plan.id}), {state})}
                >
                  Manage template
                </Button>
              )}
              {plan && context.kind === 'client' && (
                <Button
                  variant="ghost"
                  isDisabled={pending}
                  onPress={() =>
                    navigate(
                      generatePath(routes.manageClientNutritionPlan, {id: plan.id, clientId: context.clientId}),
                      {
                        state,
                      },
                    )
                  }
                >
                  Manage dates and access
                </Button>
              )}
            </>
          )
        }
      />
      {clientPlan && plan && (
        <p className="text-sm text-muted-foreground">
          {plan.start_date ?? 'Start date not set'} → {plan.end_date ?? 'No end date'}
        </p>
      )}
      <form
        noValidate
        className="has-mobile-actions min-w-0 space-y-8"
        onSubmit={form.handleSubmit(async (values) => {
          if (uncertain) {
            return;
          }
          form.clearErrors('root');
          setNotice('');
          const invalid = validateMenu(menu);
          setMenuIssue(invalid);
          if (invalid) {
            form.setError('root', {message: invalid.message});
            return;
          }
          let saved = plan;
          try {
            const body = details(values);
            if (!saved) {
              const result = await save.mutateAsync({kind: 'create', body});
              if (!mounted.current) {
                return;
              }
              saved = result.data;
              setPlan(saved);
            } else if (JSON.stringify(body) !== JSON.stringify(details(fields(saved)))) {
              const result = await save.mutateAsync({
                kind: 'details',
                id: saved.id,
                body: {...body, expected_revision: saved.revision},
              });
              if (!mounted.current) {
                return;
              }
              saved = result.data;
              setPlan(saved);
            }
            const result = await save.mutateAsync({
              kind: 'menu',
              id: saved.id,
              body: {expected_revision: saved.revision, menu},
            });
            if (!mounted.current) {
              return;
            }
            reset(result.data);
            setNotice('Nutrition plan saved.');
            if (clientPlan) {
              leaving.current = true;
              navigate(to, {state: {...state, nutritionPlanSaved: result.data.name}});
            } else if (!initial) {
              leaving.current = true;
              navigate(generatePath(routes.editNutritionPlan, {id: result.data.id}), {replace: true, state});
            }
          } catch (error) {
            if (!mounted.current) {
              return;
            }
            const stale = error instanceof ApiError && error.status === 409;
            setConflict(stale);
            if (!saved && (!(error instanceof ApiError) || error.status >= 500)) {
              setUncertain(true);
            }
            form.setError('root', {
              message: stale
                ? 'This plan changed elsewhere. Your edits are still here. Load the saved version before editing again.'
                : !saved
                  ? errorMessage(
                      error,
                      'Creation could not be confirmed. Check saved plans before trying again; your draft is still here.',
                    )
                  : errorMessage(
                      error,
                      'The full save could not be confirmed. Targets may already be saved. Review the saved version or retry this draft.',
                    ),
            });
          }
        })}
      >
        <fieldset
          disabled={pending || unavailable || uncertain}
          className="min-w-0 space-y-8"
        >
          <legend className="sr-only">Nutrition plan details</legend>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              label="Plan name"
              emphasis="title"
              isRequired
              maxLength={255}
              rules={{validate: (value) => Boolean(String(value).trim()) || 'Enter a plan name.'}}
            />
            <details>
              <summary className="w-fit cursor-pointer py-2 text-sm text-muted-foreground">Plan guidance</summary>
              <FormField
                control={form.control}
                name="description"
                label="Description"
                multiline
                maxLength={5000}
              />
            </details>
          </div>
          <section className="editor-section space-y-4">
            <div>
              <h2 className="editor-section-title">Daily targets</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Leave any target blank if it isn't part of this plan.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {targets.map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  label={label}
                  inputMode="decimal"
                  rules={{
                    validate: (value) =>
                      !String(value).trim() ||
                      (Number.isFinite(Number(value)) && Number(value) >= 0) ||
                      'Enter zero or a positive number.',
                  }}
                />
              ))}
            </div>
          </section>
          <MenuEditor
            menu={menu}
            issue={menuIssue}
            pending={pending}
            onChange={(value) => {
              setMenu(value);
              setMenuDirty(true);
              setMenuIssue(null);
              form.clearErrors('root');
            }}
          />
        </fieldset>
        {unavailable && <FormError message="This nutrition plan is archived and cannot be edited here." />}
        {notice && !dirty && (
          <p
            ref={noticeRef}
            tabIndex={-1}
            role="status"
          >
            {notice}
          </p>
        )}
        <div
          ref={errorRef}
          tabIndex={-1}
          className="space-y-3 break-words"
        >
          <FormError message={form.formState.errors.root?.message} />
          {form.formState.errors.root && plan && (
            <Button
              variant="outline"
              isDisabled={pending}
              onPress={() => setReloadOpen(true)}
            >
              Review saved version
            </Button>
          )}
          {uncertain && (
            <Button
              variant="outline"
              onPress={() => setRecovering(true)}
            >
              Check saved plans
            </Button>
          )}
        </div>
        <p
          role="status"
          className="text-xs text-muted-foreground"
        >
          {dirty ? 'Unsaved changes' : plan ? 'All changes saved' : 'New plan'}
        </p>
        <FormActions>
          <Button
            variant="outline"
            isPending={preview.isPending}
            isDisabled={pending || unavailable}
            onPress={async () => {
              const invalid = validateMenu(menu);
              setMenuIssue(invalid);
              if (invalid) {
                form.setError('root', {message: invalid.message});
                return;
              }
              form.clearErrors('root');
              try {
                const result = await preview.mutateAsync({menu});
                if (mounted.current) {
                  setPreviewMenu(result.data);
                }
              } catch (error) {
                if (mounted.current) {
                  form.setError('root', {
                    message: errorMessage(error, 'Could not calculate the meal preview. Your draft is still here.'),
                  });
                }
              }
            }}
          >
            Preview meals
          </Button>
          <Button
            type="submit"
            isPending={form.formState.isSubmitting}
            isDisabled={pending || unavailable || conflict || uncertain || !dirty}
          >
            {clientPlan ? 'Save client plan' : 'Save nutrition plan'}
          </Button>
        </FormActions>
      </form>
      {previewMenu && (
        <Dialog
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              setPreviewMenu(undefined);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Meal preview</DialogTitle>
          </DialogHeader>
          <div className="dialog-body space-y-5">
            {clientPlan && (
              <p className="text-sm text-muted-foreground">
                Preview for {clientName}. Your client sees these changes after you save.
              </p>
            )}
            <NutritionMenuPreview menu={previewMenu} />
          </div>
          <div className="p-4">
            <Button onPress={() => setPreviewMenu(undefined)}>Back to editing</Button>
          </div>
        </Dialog>
      )}
      {recovering && (
        <Recovery
          name={form.getValues('name')}
          onClose={() => setRecovering(false)}
          onNew={() => {
            flushSync(() => {
              setRecovering(false);
              setUncertain(false);
              form.clearErrors('root');
            });
            form.setFocus('name');
          }}
          onUse={(saved) => {
            flushSync(() => {
              setPlan(saved);
              setUncertain(false);
              setRecovering(false);
              form.clearErrors('root');
            });
            form.setFocus('name');
          }}
        />
      )}
      <Dialog
        isOpen={reloadOpen}
        onOpenChange={(open) => {
          if (!reloading) {
            setReloadOpen(open);
          }
        }}
        isDismissable={!reloading}
      >
        <DialogHeader>
          <DialogTitle>Load saved version?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>Unsaved edits will be replaced with the saved plan.</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onPress={() => setReloadOpen(false)}
              isDisabled={reloading}
            >
              Keep editing
            </Button>
            <Button
              onPress={loadLatest}
              isPending={reloading}
            >
              Load saved plan
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        isOpen={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Leave without saving?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>Your unsaved changes will be lost.</p>
          <div className="flex gap-3">
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
              isDisabled={pending}
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
    </Page>
  );
}
function Recovery({
  name,
  onClose,
  onUse,
  onNew,
}: {
  name: string;
  onClose: () => void;
  onUse: (plan: NutritionPlan) => void;
  onNew: () => void;
}) {
  const query = useNutritionTemplates({search: name.trim(), archived: false});
  const [id, setId] = useState('');
  const detail = useNutritionPlan(id);
  const plan = detail.data?.data;
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Check saved plans</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p className="text-sm text-muted-foreground">
          If this attempt created an empty template, choose it to save your current worksheet there.
        </p>
        <InfiniteList
          query={query}
          label="matching nutrition plans"
          singular="matching nutrition plan"
          empty={<p>No matching plan found. Your worksheet is still here.</p>}
        >
          {(value) => (
            <Button
              className="w-full justify-start"
              variant="ghost"
              onPress={() => setId(value.id)}
            >
              {value.name}
            </Button>
          )}
        </InfiniteList>
        {query.isSuccess && !query.isFetching && !query.hasNextPage && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              If none of these plans belongs to this attempt, you can create a separate template from your draft.
            </p>
            <Button
              variant="outline"
              onPress={onNew}
            >
              Create a separate template
            </Button>
          </div>
        )}
        {detail.isFetching && <p role="status">Checking saved plan…</p>}
        {detail.isError && (
          <>
            <FormError message={errorMessage(detail.error, 'Could not check this plan.')} />
            <Button
              onPress={() => {
                detail.refetch();
              }}
            >
              Retry check
            </Button>
          </>
        )}
        {plan &&
          !detail.isFetching &&
          (plan.kind === 'template' && plan.lifecycle === 'active' && plan.menu.meals.length === 0 ? (
            <Button onPress={() => onUse(plan)}>Use this empty template</Button>
          ) : (
            <p>This plan already contains meals or is unavailable. Your draft is still here.</p>
          ))}
      </div>
    </Dialog>
  );
}
