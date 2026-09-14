import {ChevronRight} from 'lucide-react';
import {useEffect, useRef} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useLocation, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {type Client, useClient} from '../api/clients';
import {useAssignTrainingPlan, useTrainingPlan, useTrainingTemplates} from '../api/training-plans';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {ListSearch} from '../ui/list-search';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';
import {TrainingPlanPreview} from '../ui/training-plan-preview';

export function AssignTrainingPlan() {
  const {id = '', templateId} = useParams();
  const client = useClient(id);
  const {state} = useListLocation(routes.home);
  if (!client.data) {
    return (
      <Page>
        <PageHeader
          title="Assign training plan"
          back={{to: generatePath(routes.client, {id}), label: 'Back to client', state}}
        />
        <Surface>
          {client.isPending ? (
            <p role="status">Loading client…</p>
          ) : (
            <div className="space-y-4">
              <FormError message={errorMessage(client.error, "We couldn't load this client.")} />
              <Button
                variant="outline"
                onPress={() => {
                  client.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          )}
        </Surface>
      </Page>
    );
  }
  return templateId ? (
    <Preview
      key={`${id}/${templateId}`}
      person={client.data.data}
      templateId={templateId}
    />
  ) : (
    <ChoosePlan
      key={id}
      person={client.data.data}
    />
  );
}

function ChoosePlan({person}: {person: Client}) {
  const [params] = useSearchParams();
  const search = params.get('search')?.trim() ?? '';
  const plans = useTrainingTemplates({search, archived: false});
  const location = useLocation();
  const {state} = useListLocation(routes.home);
  const name = `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || 'this client';
  return (
    <Page>
      <PageHeader
        title="Assign training plan"
        description={`Choose a plan for ${name}. Preview the workouts before assigning.`}
        back={{to: generatePath(routes.client, {id: person.id}), label: 'Back to client', state}}
      />
      <ListSearch label="Search training plans" />
      <InfiniteList
        query={plans}
        label="training plans"
        singular="training plan"
        empty={
          <Surface className="space-y-2 py-10 text-center">
            <h2 className="section-title">{search ? 'No matching training plans' : 'No training templates yet'}</h2>
            <p className="text-sm text-muted-foreground">
              {search ? 'Try another plan name.' : 'A saved training template is needed before you can assign a plan.'}
            </p>
          </Surface>
        }
      >
        {(plan) => (
          <Link
            to={generatePath(routes.previewTrainingPlan, {id: person.id, templateId: plan.id}) + location.search}
            state={state}
            className="flex min-h-24 items-center gap-4 px-5 py-5 transition-colors hover:bg-muted/50 focus-visible:-outline-offset-4"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold">{plan.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.workout_count} {plan.workout_count === 1 ? 'workout' : 'workouts'}
              </p>
              {plan.description && (
                <p className="mt-2 line-clamp-2 break-words text-sm text-muted-foreground">{plan.description}</p>
              )}
            </div>
            <ChevronRight
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground"
            />
          </Link>
        )}
      </InfiniteList>
    </Page>
  );
}

function Preview({person, templateId}: {person: Client; templateId: string}) {
  const query = useTrainingPlan(templateId);
  const assignment = useAssignTrainingPlan(person.id, templateId);
  const navigate = useNavigate();
  const location = useLocation();
  const {state} = useListLocation(routes.home);
  const listPath = generatePath(routes.assignTrainingPlan, {id: person.id}) + location.search;
  const clientPath = generatePath(routes.client, {id: person.id});
  const mounted = useRef(true);
  const errorSummary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const form = useForm<{start_date: string; end_date: string}>({defaultValues: {start_date: '', end_date: ''}});
  const {errors} = form.formState;
  const plan = query.data?.data;
  const pending = form.formState.isSubmitting;
  useEffect(() => {
    if (pending || !assignment.isError) {
      return;
    }
    if (errors.start_date) {
      form.setFocus('start_date');
    } else if (errors.end_date) {
      form.setFocus('end_date');
    } else {
      errorSummary.current?.scrollIntoView({block: 'center'});
      errorSummary.current?.focus({preventScroll: true});
    }
  }, [pending, assignment.isError, errors.start_date, errors.end_date, form.setFocus]);
  const stale = assignment.error instanceof ApiError && assignment.error.code === 'stale_revision';
  const uncertain = assignment.isError && (!(assignment.error instanceof ApiError) || assignment.error.status >= 500);
  const available = plan?.kind === 'template' && plan.status === 'active';
  const name = `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || 'this client';
  const submit = form.handleSubmit(async (values) => {
    if (!plan || !available || stale) {
      return;
    }
    try {
      const result = await assignment.mutateAsync({
        start_date: values.start_date,
        end_date: values.end_date || null,
        expected_revision: plan.revision,
      });
      if (mounted.current) {
        navigate(clientPath, {replace: true, state: {...state, assigned: result.data.name}});
      }
    } catch (error) {
      setFormError(
        error,
        "We couldn't confirm the assignment. Check the client's plans before trying again.",
        form.setError,
        ['start_date', 'end_date'],
      );
    }
  });
  return (
    <Page>
      <PageHeader
        title={plan?.name ?? 'Preview training plan'}
        description={`Training plan for ${name}`}
        back={{to: listPath, label: 'Back to training plans', state}}
      />
      {!plan ? (
        <Surface className="space-y-4">
          {query.isPending ? (
            <p role="status">Loading training plan…</p>
          ) : (
            <>
              <FormError message={errorMessage(query.error, "We couldn't load the training plan.")} />
              <Button
                variant="outline"
                onPress={() => {
                  query.refetch();
                }}
              >
                Try again
              </Button>
            </>
          )}
        </Surface>
      ) : (
        <form
          onSubmit={submit}
          noValidate
          className="has-mobile-actions grid items-start gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-8"
        >
          <Surface className="min-w-0 space-y-4">
            <h2 className="section-title">Plan preview</h2>
            <TrainingPlanPreview plan={plan} />
          </Surface>
          <Surface className="min-w-0 space-y-5">
            <div>
              <h2 className="section-title">Assignment dates</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {name} receives a separate copy of this plan. These dates must fit outside their other training plans.
              </p>
            </div>
            {!available && <FormError message="This training template is no longer available. Choose another plan." />}
            {person.status === 'inactive' && (
              <p className="text-sm text-muted-foreground">
                This client is inactive. Assigning a plan does not reactivate their access.
              </p>
            )}
            {!person.joined_at && (
              <p className="text-sm text-muted-foreground">
                They can access the plan after accepting their invitation.
              </p>
            )}
            <FormField
              control={form.control}
              name="start_date"
              type="date"
              label="Start date"
              isRequired
              isDisabled={pending || !available}
            />
            <FormField
              control={form.control}
              name="end_date"
              type="date"
              label="End date"
              description="Optional. The plan includes this day. Leave blank for no end date."
              isDisabled={pending || !available}
              rules={{
                validate: (value) =>
                  !value || value >= form.getValues('start_date') || 'End date must be on or after the start date.',
              }}
            />
            <div
              ref={errorSummary}
              tabIndex={-1}
              className="space-y-3 rounded-lg focus:outline-none"
            >
              {stale ? (
                <div className="space-y-3">
                  <FormError message="This template changed while you were reviewing it. Refresh the preview and review the changes before assigning." />
                  <Button
                    variant="outline"
                    isPending={query.isFetching}
                    onPress={async () => {
                      const result = await query.refetch();
                      if (result.isSuccess) {
                        assignment.reset();
                        form.clearErrors();
                      }
                    }}
                  >
                    Refresh preview
                  </Button>
                  {query.isError && <FormError message="The preview could not be refreshed. Try again." />}
                </div>
              ) : (
                <FormError message={form.formState.errors.root?.message} />
              )}
              {uncertain && (
                <p className="text-sm leading-relaxed">
                  The assignment may have been saved.{' '}
                  <Link
                    to={clientPath}
                    state={state}
                    className="text-link"
                  >
                    Check client plans
                  </Link>{' '}
                  before retrying.
                </p>
              )}
            </div>
          </Surface>
          <div className="md:col-span-2">
            <FormActions>
              <Button
                variant="ghost"
                isDisabled={pending}
                onPress={() => navigate(listPath, {state})}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isPending={pending}
                isDisabled={!available || stale}
              >
                Assign plan
              </Button>
            </FormActions>
          </div>
        </form>
      )}
    </Page>
  );
}
