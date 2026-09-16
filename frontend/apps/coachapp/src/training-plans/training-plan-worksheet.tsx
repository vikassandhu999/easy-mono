import {ArrowLeft} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {FormProvider, useForm} from 'react-hook-form';
import {generatePath, Link, useBeforeUnload, useBlocker, useNavigate} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {type TrainingPlan, useSaveTrainingPlan, useTrainingPlan} from '../api/training-plans';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {DropdownMenu, DropdownMenuItem, DropdownMenuTrigger} from '../ui/dropdown-menu';
import {FormError} from '../ui/form-error';
import {Input} from '../ui/input';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page} from '../ui/page';
import {Textarea} from '../ui/textarea';
import {draftFromPlan, prescriptionBody} from './prescription';
import {TemplateRecovery} from './template-recovery';
import {WorkoutWorkspace} from './workout-workspace';

export type TrainingEditorContext = {kind: 'template'} | {kind: 'client'; clientId: string};

export function TrainingPlanWorksheet({
  initial,
  context,
}: {
  initial: TrainingPlan | undefined;
  context: TrainingEditorContext;
}) {
  const [plan, setPlan] = useState(initial);
  const query = useTrainingPlan(plan?.id ?? '');
  const form = useForm({defaultValues: draftFromPlan(initial), shouldFocusError: false});
  const [readOnly, setReadOnly] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const formElement = useRef<HTMLFormElement>(null);
  const save = useSaveTrainingPlan(context.kind === 'client' ? context.clientId : undefined);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [creationUncertain, setCreationUncertain] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState('');
  const noticeRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (notice) {
      noticeRef.current?.focus();
    }
  }, [notice]);
  const mounted = useRef(true);
  const leavingAfterSave = useRef(false);
  const errorSummary = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {to: libraryLocation, state: listState} = useListLocation(routes.trainingPlans);
  const clientPlan = context.kind === 'client';
  const listLocation =
    context.kind === 'client' ? generatePath(routes.client, {id: context.clientId}) : libraryLocation;
  const backLabel = clientPlan ? 'Back to client' : 'Back to training plans';
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const dirty = form.formState.isDirty;
  const pending = form.formState.isSubmitting || reloading;
  const unavailable = Boolean(plan && plan.status !== 'active');
  const blocker = useBlocker(
    useCallback(
      ({currentLocation, nextLocation}) =>
        !leavingAfterSave.current && (dirty || pending) && currentLocation.pathname !== nextLocation.pathname,
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
  useEffect(() => {
    if (form.formState.errors.root && !pending) {
      errorSummary.current?.scrollIntoView({block: 'center'});
      errorSummary.current?.focus();
    }
  }, [form.formState.errors.root, pending]);
  async function loadLatest() {
    setNotice('');
    setReloading(true);
    try {
      const result = await query.refetch();
      if (result.error) {
        throw result.error;
      }
      if (!result.data) {
        throw new Error('Plan unavailable');
      }
      if (!mounted.current) {
        return;
      }
      setPlan(result.data.data);
      form.reset(draftFromPlan(result.data.data));
      setConflict(false);
      setNotice('Latest saved version loaded.');
      setReloadOpen(false);
    } catch (error) {
      form.setError('root', {
        message: errorMessage(error, "We couldn't load the saved version. Your changes are still here."),
      });
      setReloadOpen(false);
    } finally {
      setReloading(false);
    }
  }
  return (
    <Page>
      {!readOnly && <h1 className="sr-only">Training plan worksheet</h1>}
      <Link
        to={listLocation}
        state={listState}
        className="page-back"
      >
        <ArrowLeft
          aria-hidden="true"
          size={18}
        />
        {backLabel}
      </Link>
      {plan && !clientPlan && (
        <Button
          variant="outline"
          isDisabled={pending}
          onPress={() => navigate(generatePath(routes.manageTrainingPlan, {id: plan.id}), {state: listState})}
        >
          Manage template
        </Button>
      )}
      {plan && context.kind === 'client' && (
        <Button
          variant="outline"
          isDisabled={pending}
          onPress={() =>
            navigate(generatePath(routes.manageClientTrainingPlan, {id: plan.id, clientId: context.clientId}), {
              state: listState,
            })
          }
        >
          Manage dates and access
        </Button>
      )}
      {clientPlan && plan && (
        <div className="space-y-1">
          <p className="font-semibold">
            Training for {`${plan.client?.first_name ?? ''} ${plan.client?.last_name ?? ''}`.trim() || 'this client'}
          </p>
          <p className="text-sm text-muted-foreground">
            Changes apply to this client only. Your reusable template stays unchanged.
          </p>
          <p className="text-xs text-muted-foreground">
            {plan.start_date ?? 'Start date not set'} → {plan.end_date ?? 'No end date'}
          </p>
        </div>
      )}
      <FormProvider {...form}>
        <form
          ref={formElement}
          noValidate
          className="has-mobile-actions min-w-0 space-y-6"
          onSubmit={form.handleSubmit(
            async (draft) => {
              if (creationUncertain) {
                return;
              }
              form.clearErrors();
              setNotice('');
              let saved = plan;
              try {
                const details = {name: draft.name.trim(), description: draft.description.trim() || null};
                if (!saved) {
                  const result = await save.mutateAsync({kind: 'create', body: details});
                  if (!mounted.current) {
                    return;
                  }
                  saved = result.data;
                  setPlan(saved);
                } else if (details.name !== saved.name || details.description !== (saved.description || null)) {
                  const result = await save.mutateAsync({
                    kind: 'details',
                    id: saved.id,
                    body: {...details, expected_revision: saved.revision},
                  });
                  if (!mounted.current) {
                    return;
                  }
                  saved = result.data;
                  setPlan(saved);
                }
                const result = await save.mutateAsync({
                  kind: 'prescription',
                  id: saved.id,
                  body: prescriptionBody(draft, saved.revision),
                });
                if (!mounted.current) {
                  return;
                }
                setPlan(result.data);
                form.reset(draftFromPlan(result.data));
                setConflict(false);
                setNotice(clientPlan ? 'Client training plan saved.' : 'Training plan saved.');
                if (clientPlan) {
                  leavingAfterSave.current = true;
                  navigate(listLocation, {state: {...listState, trainingPlanSaved: result.data.name}});
                } else if (!initial) {
                  leavingAfterSave.current = true;
                  navigate(generatePath(routes.editTrainingPlan, {id: result.data.id}), {
                    replace: true,
                    state: listState,
                  });
                }
              } catch (error) {
                if (!mounted.current) {
                  return;
                }
                const stale = error instanceof ApiError && error.status === 409;
                setConflict(stale);
                setCreationUncertain(!saved && (!(error instanceof ApiError) || error.status >= 500));
                form.setError('root', {
                  message: stale
                    ? 'This plan changed elsewhere. Your edits are still here. Load the saved version to review the latest changes before editing again.'
                    : !saved
                      ? "We couldn't confirm creation. Your draft is still here. Check your training plans before retrying; the template may have been created."
                      : error instanceof ApiError && error.status < 500
                        ? errorMessage(error, 'Check the prescription and try again.')
                        : "We couldn't confirm the full save. Your draft is still here. The name and description may already be saved. Load the saved version to check, or retry to save this draft.",
                });
              }
            },
            (errors) => {
              const index = form
                .getValues('workouts')
                .findIndex((_workout, index) => Boolean(errors.workouts?.[index]));
              if (index >= 0) {
                setActiveIndex(index);
              }
              setReadOnly(false);
              requestAnimationFrame(() => {
                for (const field of formElement.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []) {
                  if (field.getClientRects().length) {
                    field.focus();
                    field.scrollIntoView({block: 'center'});
                    break;
                  }
                }
              });
            },
          )}
        >
          <fieldset
            disabled={pending || unavailable || creationUncertain}
            className="min-w-0 space-y-6"
          >
            <legend className="sr-only">Training prescription</legend>
            <div className="space-y-3">
              <div hidden={readOnly}>
                <label
                  htmlFor="plan-name"
                  className="text-xs text-muted-foreground"
                >
                  Plan name · edit anytime
                </label>
                <Input
                  id="plan-name"
                  className="mt-1 h-auto min-h-12 border-transparent bg-transparent px-0 py-1 text-2xl font-bold tracking-tight shadow-none hover:border-border focus:border-border md:text-3xl"
                  maxLength={255}
                  aria-invalid={Boolean(form.formState.errors.name)}
                  aria-describedby={form.formState.errors.name ? 'plan-name-error' : undefined}
                  {...form.register('name', {validate: (value) => Boolean(value.trim()) || 'Enter a plan name.'})}
                />
                {form.formState.errors.name && (
                  <p
                    id="plan-name-error"
                    className="text-sm text-destructive"
                  >
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              {readOnly && <h1 className="page-title">{form.getValues('name')}</h1>}
              <div hidden={readOnly}>
                <details>
                  <summary className="w-fit cursor-pointer py-2 text-sm text-muted-foreground">
                    {form.getValues('description') ? 'Plan description' : 'Add a description'}
                  </summary>
                  <label
                    htmlFor="plan-description"
                    className="sr-only"
                  >
                    Description
                  </label>
                  <Textarea
                    id="plan-description"
                    maxLength={5000}
                    placeholder="Who is this plan for? Any guidance for the week?"
                    {...form.register('description')}
                  />
                </details>
              </div>
              {readOnly && form.getValues('description') && (
                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {form.getValues('description')}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  role="status"
                  className="text-xs text-muted-foreground"
                >
                  {pending
                    ? 'Saving…'
                    : dirty
                      ? 'Unsaved changes'
                      : plan
                        ? 'All changes saved'
                        : 'New plan · not saved yet'}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant={readOnly ? 'secondary' : 'ghost'}
                    size="sm"
                    aria-pressed={readOnly}
                    onPress={() => setReadOnly(!readOnly)}
                  >
                    {readOnly ? 'Back to editing' : 'Client view'}
                  </Button>
                  {plan && (
                    <DropdownMenuTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        Plan actions
                      </Button>
                      <DropdownMenu aria-label="Plan actions">
                        <DropdownMenuItem onAction={() => setReloadOpen(true)}>Load saved version</DropdownMenuItem>
                      </DropdownMenu>
                    </DropdownMenuTrigger>
                  )}
                </div>
              </div>
              {readOnly && (
                <p className="text-xs text-muted-foreground">
                  {clientPlan
                    ? 'Preview of your draft. Your client sees these changes after you save.'
                    : 'Preview of your current draft. Unsaved changes have not been assigned to anyone.'}
                </p>
              )}
            </div>
            <WorkoutWorkspace
              readOnly={readOnly}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
            />
          </fieldset>
          {unavailable && <FormError message="This plan is archived and cannot be edited here." />}
          {notice && !dirty && (
            <p
              ref={noticeRef}
              tabIndex={-1}
              role="status"
              className="text-sm"
            >
              {notice}
            </p>
          )}
          <div
            ref={errorSummary}
            tabIndex={-1}
            className="space-y-3"
          >
            <FormError message={form.formState.errors.root?.message} />
            {form.formState.errors.root &&
              (plan ? (
                <Button
                  variant="outline"
                  isDisabled={pending}
                  onPress={() => setReloadOpen(true)}
                >
                  Review saved version
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onPress={() => setRecoveryOpen(true)}
                >
                  Check training plans
                </Button>
              ))}
          </div>
          <div className="sticky bottom-0 z-10 bg-background md:pb-3">
            <FormActions>
              <Button
                variant="ghost"
                isDisabled={pending}
                onPress={() => navigate(listLocation, {state: listState})}
              >
                {clientPlan ? 'Back to client' : 'Back to library'}
              </Button>
              <Button
                type="submit"
                isPending={pending}
                isDisabled={conflict || unavailable || creationUncertain || !dirty}
              >
                {clientPlan ? 'Save client plan' : 'Save plan'}
              </Button>
            </FormActions>
          </div>
        </form>
      </FormProvider>
      {recoveryOpen && (
        <TemplateRecovery
          name={form.getValues('name')}
          onClose={() => setRecoveryOpen(false)}
          onUse={(saved) => {
            flushSync(() => {
              setPlan(saved);
              setCreationUncertain(false);
              form.clearErrors('root');
              setRecoveryOpen(false);
            });
            form.setFocus('name');
          }}
          onRetry={() => {
            flushSync(() => {
              setCreationUncertain(false);
              form.clearErrors('root');
              setRecoveryOpen(false);
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
        showCloseButton={!reloading}
        isDismissable={!reloading}
      >
        <DialogHeader>
          <DialogTitle>Load the saved version?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-5">
          <p className="text-sm text-muted-foreground">
            This replaces the worksheet with the latest saved plan. Any unsaved edits will be discarded.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              autoFocus
              variant="outline"
              isDisabled={reloading}
              onPress={() => setReloadOpen(false)}
            >
              Keep editing
            </Button>
            <Button
              isPending={reloading}
              onPress={loadLatest}
            >
              Load saved prescription
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
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Leave without saving?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-5">
          <p className="text-sm text-muted-foreground">Your unsaved changes will be lost.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              autoFocus
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
