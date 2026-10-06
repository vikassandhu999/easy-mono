import {useCallback, useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useBeforeUnload, useBlocker, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import type {ClientPlan} from '../api/client-plans';
import {useClient} from '../api/clients';
import {type PlanResource, useManagedPlan, useManagePlan, useUpdatePlanDates} from '../api/plan-management';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {useListLocation} from '../ui/list-location';
import {Page, PageHeader, StatusBadge, Surface} from '../ui/page';

export function ClientPlanManagement({resource}: {resource: PlanResource}) {
  const {clientId = '', id = ''} = useParams();
  return (
    <LoadClientPlan
      key={`${resource}:${clientId}:${id}`}
      resource={resource}
      clientId={clientId}
      id={id}
    />
  );
}

function LoadClientPlan({resource, clientId, id}: {resource: PlanResource; clientId: string; id: string}) {
  const query = useManagedPlan(resource, id);
  const listRoute = resource === 'training' ? routes.clientTrainingPlans : routes.clientNutritionPlans;
  const {to, state} = useListLocation(generatePath(listRoute, {clientId}));
  const [plan, setPlan] = useState<ClientPlan>();
  useEffect(() => {
    if (!plan && query.isSuccess && query.isFetchedAfterMount) {
      setPlan(query.data.data);
    }
  }, [plan, query.isSuccess, query.isFetchedAfterMount, query.data]);
  if (plan && plan.kind === 'client_plan' && plan.client_id === clientId) {
    return (
      <ClientPlanDetails
        key={`${resource}:${clientId}:${id}`}
        initial={plan}
        resource={resource}
        clientId={clientId}
      />
    );
  }
  return (
    <Page>
      <PageHeader
        title="Client plan"
        back={{to, state, label: 'Back to assigned plans'}}
      />
      <Surface>
        {plan ? (
          <FormError message="This plan does not belong to this client." />
        ) : query.isError ? (
          <>
            <FormError message={errorMessage(query.error, 'We could not load this plan.')} />
            <Button
              isPending={query.isFetching}
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </>
        ) : (
          <p role="status">Loading client plan…</p>
        )}
      </Surface>
    </Page>
  );
}
function dates(plan: ClientPlan) {
  return {start_date: plan.start_date ?? '', end_date: plan.end_date ?? ''};
}
const labels = {archive: 'Archive plan', restore: 'Restore plan', reload: 'Load saved dates'};
const explanations = {
  archive:
    'This plan will stop providing workouts or nutrition guidance to this client. Their recorded activity stays available. You can restore the plan later.',
  restore:
    'Restore this plan for its saved dates. If those dates overlap another plan, update or archive that plan first. The reusable template stays unchanged.',
  reload: 'Replace your date edits with the latest saved version. This also refreshes the plan status.',
};
function ClientPlanDetails({
  initial,
  resource,
  clientId,
}: {
  initial: ClientPlan;
  resource: PlanResource;
  clientId: string;
}) {
  const [plan, setPlan] = useState(initial);
  const person = useClient(clientId);
  const today = person.data?.data.local_date;
  const startLocked = Boolean(plan.start_date && today && plan.start_date <= today);
  const query = useManagedPlan(resource, plan.id);
  const save = useUpdatePlanDates(resource);
  const manage = useManagePlan(resource);
  const form = useForm({defaultValues: dates(initial)});
  const [dialog, setDialog] = useState<keyof typeof labels | null>(null);
  const [actionError, setActionError] = useState('');
  const [review, setReview] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [notice, setNotice] = useState('');
  const mounted = useRef(true);
  const noticeElement = useRef<HTMLParagraphElement>(null);
  const errorElement = useRef<HTMLParagraphElement>(null);
  const actionErrorElement = useRef<HTMLParagraphElement>(null);
  const leaving = useRef(false);
  const listRoute = resource === 'training' ? routes.clientTrainingPlans : routes.clientNutritionPlans;
  const editor = resource === 'training' ? routes.editClientTrainingPlan : routes.editClientNutritionPlan;
  const {to, state} = useListLocation(generatePath(listRoute, {clientId}));
  const dirty = form.formState.isDirty;
  const pending = form.formState.isSubmitting || manage.isPending || reloading;
  const archived = plan.lifecycle === 'archived';
  const name = plan.client?.preferred_name || plan.client?.full_name || 'Client';
  useEffect(() => {
    if (pending || dialog) {
      return;
    }
    if (form.formState.errors.root) {
      errorElement.current?.focus();
    } else if (form.formState.errors.start_date) {
      form.setFocus('start_date');
    } else if (form.formState.errors.end_date) {
      form.setFocus('end_date');
    }
  }, [pending, dialog, form.formState.errors, form.setFocus]);
  useEffect(() => {
    if (actionError && dialog && !pending) {
      actionErrorElement.current?.focus();
    }
  }, [actionError, dialog, pending]);
  useEffect(() => {
    if (notice && !pending && !dirty) {
      noticeElement.current?.focus({preventScroll: true});
    }
  }, [notice, pending, dirty]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const blocker = useBlocker(
    ({currentLocation, nextLocation}) =>
      !leaving.current && (dirty || pending) && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (pending && blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker, pending]);
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
  async function reload() {
    setReloading(true);
    try {
      const latest = await query.refetch();
      if (latest.error) {
        throw latest.error;
      }
      if (!latest.data) {
        throw new Error('Plan unavailable');
      }
      if (!mounted.current) {
        return;
      }
      setPlan(latest.data.data);
      form.reset(dates(latest.data.data));
      setConflict(false);
      setDialog(null);
      setReview(false);
      setNotice('Latest saved dates loaded.');
    } catch (error) {
      if (mounted.current) {
        setActionError(errorMessage(error, 'We could not load the saved plan. Your date edits are still here.'));
      }
    } finally {
      if (mounted.current) {
        setReloading(false);
      }
    }
  }
  function confirm(action: keyof typeof labels) {
    setActionError('');
    setReview(false);
    setDialog(action);
  }
  async function perform() {
    if (!dialog || pending || review) {
      return;
    }
    if (dialog === 'reload') {
      await reload();
      return;
    }
    try {
      await manage.mutateAsync({action: dialog, plan});
      if (!mounted.current) {
        return;
      }
      await reload();
    } catch (error) {
      if (!mounted.current) {
        return;
      }
      setReview(true);
      setActionError(
        error instanceof ApiError && error.code === 'stale_revision'
          ? 'This plan changed. Close this dialog and load the latest saved dates before trying again.'
          : errorMessage(
              error,
              'We could not confirm this change. Close this dialog and load the saved dates to review the current plan.',
            ),
      );
      setConflict(true);
    }
  }
  return (
    <Page>
      <PageHeader
        title={`${resource === 'training' ? 'Training' : 'Nutrition'} for ${name}`}
        description="Manage this client's assigned plan. The reusable template stays independent."
        back={{to, state, label: 'Back to assigned plans'}}
      />
      <Surface className="space-y-3">
        <StatusBadge tone={plan.lifecycle === 'current' ? 'positive' : 'neutral'}>
          {archived
            ? 'Archived'
            : plan.lifecycle === 'ended'
              ? 'Ended'
              : plan.lifecycle === 'upcoming'
                ? 'Upcoming'
                : plan.lifecycle === 'current'
                  ? 'Current'
                  : 'Dates not set'}
        </StatusBadge>
        <h2 className="section-title break-words">{plan.name}</h2>
        <Link
          to={generatePath(editor, {clientId, id: plan.id})}
          state={state}
          className={buttonVariants({variant: 'outline'})}
        >
          {archived ? 'View plan' : 'Personalize plan'}
        </Link>
      </Surface>
      {notice && !dirty && (
        <p
          role="status"
          tabIndex={-1}
          ref={noticeElement}
          className="text-sm outline-none"
        >
          {notice}
        </p>
      )}
      <form
        noValidate
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          if (pending || archived || conflict) {
            return;
          }
          form.clearErrors();
          setNotice('');
          try {
            const saved = await save.mutateAsync({
              plan,
              dates: {start_date: values.start_date, end_date: values.end_date || null},
            });
            if (!mounted.current) {
              return;
            }
            setPlan(saved);
            form.reset(dates(saved));
            setNotice('Plan dates saved.');
          } catch (error) {
            if (!mounted.current) {
              return;
            }
            if (error instanceof ApiError && error.code === 'stale_revision') {
              setConflict(true);
              form.setError('root', {message: 'This plan changed. Load the saved dates before making another change.'});
            } else {
              setFormError(
                error,
                'We could not confirm the date change. Your edits are still here. Load saved dates to check before retrying.',
                form.setError,
                ['start_date', 'end_date'],
              );
            }
          }
        })}
      >
        <div className="space-y-2">
          <h2 className="section-title">Plan dates</h2>
          <p className="text-sm text-muted-foreground">
            Dates follow the client's calendar. The end date is included; leave it blank to continue without an end
            date.
          </p>
        </div>
        <fieldset
          disabled={pending || archived || conflict}
          className="grid gap-5 sm:grid-cols-2"
        >
          <legend className="sr-only">Plan dates</legend>
          <FormField
            control={form.control}
            name="start_date"
            label="Start date"
            isDisabled={startLocked}
            {...(startLocked ? {description: 'A started plan keeps its start date.'} : {})}
            type="date"
            isRequired
          />
          <FormField
            control={form.control}
            name="end_date"
            label="End date"
            type="date"
            rules={{
              validate: (value) =>
                !value ||
                !form.getValues('start_date') ||
                value >= form.getValues('start_date') ||
                'Choose an end date on or after the start date.',
            }}
          />
        </fieldset>
        {archived && <p className="text-sm text-muted-foreground">Restore this plan to change its dates.</p>}
        <FormError
          ref={errorElement}
          tabIndex={-1}
          message={form.formState.errors.root?.message}
        />
        <div className="flex flex-wrap gap-2">
          {!archived && (
            <Button
              type="submit"
              isPending={form.formState.isSubmitting}
              isDisabled={pending || conflict || !dirty}
            >
              Save dates
            </Button>
          )}
          <Button
            variant="outline"
            isDisabled={pending}
            onPress={() => confirm('reload')}
          >
            Load saved dates
          </Button>
        </div>
        {dirty && (
          <p
            role="status"
            className="text-sm text-muted-foreground"
          >
            Unsaved date changes
          </p>
        )}
      </form>
      <section
        className="space-y-3 pt-4"
        aria-label="Plan availability"
      >
        <h2 className="section-title">{archived ? 'Use this plan again' : 'Stop using this plan'}</h2>
        <p className="text-sm text-muted-foreground">
          {archived
            ? 'Show this plan again with its saved dates. Its past stays unchanged.'
            : 'Archive hides this plan and ends its guidance after today. Its past stays unchanged.'}
        </p>
        <Button
          variant="outline"
          isDisabled={pending || dirty || conflict}
          onPress={() => confirm(archived ? 'restore' : 'archive')}
        >
          {archived ? 'Restore plan' : 'Archive plan'}
        </Button>
      </section>

      <Dialog
        isOpen={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setDialog(null);
          }
        }}
        isDismissable={!pending}
        isKeyboardDismissDisabled={pending}
        showCloseButton={!pending}
      >
        {dialog && (
          <>
            <DialogHeader>
              <DialogTitle>{labels[dialog]}?</DialogTitle>
              <DialogDescription>
                <p className="mb-2 font-medium text-foreground">
                  {name} · {plan.name}
                </p>
                {dialog === 'archive'
                  ? 'Hide this plan and end its guidance after today. Its past dates and recorded workouts remain available.'
                  : dialog === 'restore'
                    ? 'Show this plan again. Its saved dates remain unchanged.'
                    : explanations[dialog]}
              </DialogDescription>
            </DialogHeader>
            <FormError
              ref={actionErrorElement}
              tabIndex={-1}
              message={actionError}
            />
            <DialogFooter>
              <Button
                variant="outline"
                isDisabled={pending}
                onPress={() => setDialog(null)}
              >
                {review ? 'Close and review' : 'Cancel'}
              </Button>
              <Button
                variant="default"
                isPending={pending}
                isDisabled={review}
                onPress={perform}
              >
                {labels[dialog]}
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
      <Dialog
        isOpen={blocker.state === 'blocked' && !pending}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Leave without saving?</DialogTitle>
          <DialogDescription>Your date changes have not been saved.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onPress={() => {
              if (blocker.state === 'blocked') {
                blocker.reset();
              }
            }}
          >
            Keep editing
          </Button>
          <Button
            onPress={() => {
              if (blocker.state === 'blocked') {
                blocker.proceed();
              }
            }}
          >
            Discard changes
          </Button>
        </DialogFooter>
      </Dialog>
    </Page>
  );
}
