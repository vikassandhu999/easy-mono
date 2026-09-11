import {useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useLocation, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {useClient} from '../api/clients';
import {
  type NutritionPlan,
  useAssignNutritionPlan,
  useNutritionPlan,
  useNutritionTemplates,
} from '../api/nutrition-plans';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {ListSearch} from '../ui/list-search';
import {NutritionPlanPreview} from '../ui/nutrition-plan-preview';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';

export function AssignNutritionPlan() {
  const {id = '', templateId} = useParams();
  const client = useClient(id);
  const back = generatePath(routes.client, {id});
  const name = client.data
    ? `${client.data.data.first_name ?? ''} ${client.data.data.last_name ?? ''}`.trim() || 'Client'
    : 'Client';
  return (
    <Page>
      <PageHeader
        title={`Nutrition for ${name}`}
        description="Choose a plan and when it should begin."
        back={{to: back, label: 'Back to client'}}
      />
      {client.isError ? (
        <Surface>
          <FormError message={errorMessage(client.error, 'Could not load this client.')} />
          <Button
            onPress={() => {
              client.refetch();
            }}
          >
            Try again
          </Button>
        </Surface>
      ) : !client.data ? (
        <Surface>
          <p role="status">Loading client…</p>
        </Surface>
      ) : templateId ? (
        <Preview
          key={`${id}/${templateId}`}
          clientId={id}
          templateId={templateId}
          name={name}
        />
      ) : (
        <Choose clientId={id} />
      )}
    </Page>
  );
}
function Choose({clientId}: {clientId: string}) {
  const [params] = useSearchParams();
  const {search} = useLocation();
  const query = useNutritionTemplates(params.get('search') ?? '');
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">Choose a nutrition plan</h2>
        <Link
          to={routes.createNutritionPlan}
          className={buttonVariants({variant: 'outline'})}
        >
          Create nutrition plan
        </Link>
      </div>
      <ListSearch label="Search nutrition plans" />
      <InfiniteList
        query={query}
        label="nutrition templates"
        singular="nutrition template"
        empty={
          <Surface>
            <p>No matching nutrition plans. Try another name or create a plan.</p>
          </Surface>
        }
      >
        {(plan) => (
          <Link
            to={generatePath(routes.previewNutritionPlan, {id: clientId, templateId: plan.id})}
            state={{nutritionSearch: search}}
            className="block space-y-1 px-5 py-4 hover:bg-muted/50"
          >
            <p className="font-semibold">{plan.name}</p>
            <p className="text-sm text-muted-foreground">
              {plan.target_calories === null ? 'No calorie target' : `${plan.target_calories} kcal target`}
            </p>
            {plan.description && <p className="line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>}
          </Link>
        )}
      </InfiniteList>
    </>
  );
}
function Preview({clientId, templateId, name}: {clientId: string; templateId: string; name: string}) {
  const query = useNutritionPlan(templateId);
  const [plan, setPlan] = useState<NutritionPlan>();
  const [stale, setStale] = useState(false);
  const form = useForm({defaultValues: {start_date: '', end_date: ''}});
  const save = useAssignNutritionPlan(clientId, templateId);
  const navigate = useNavigate();
  const mounted = useRef(true);
  const errorRef = useRef<HTMLDivElement>(null);
  const state: unknown = useLocation().state;
  const search =
    state &&
    typeof state === 'object' &&
    'nutritionSearch' in state &&
    typeof state.nutritionSearch === 'string' &&
    state.nutritionSearch.startsWith('?')
      ? state.nutritionSearch
      : '';
  const choose = generatePath(routes.assignNutritionPlan, {id: clientId}) + search;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!plan && query.isSuccess && query.isFetchedAfterMount) {
      setPlan(query.data.data);
    }
  }, [plan, query.isSuccess, query.isFetchedAfterMount, query.data]);
  useEffect(() => {
    if (form.formState.errors.root) {
      errorRef.current?.focus();
      errorRef.current?.scrollIntoView({block: 'center'});
    }
  }, [form.formState.errors.root]);
  if (!plan) {
    return (
      <Surface>
        {query.isError ? (
          <>
            <FormError message={errorMessage(query.error, 'Could not load this plan.')} />
            <Button
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </>
        ) : (
          <p role="status">Loading plan…</p>
        )}
      </Surface>
    );
  }
  const available = plan.kind === 'template' && plan.lifecycle === 'active';
  return (
    <>
      <Link
        to={choose}
        className="page-back"
      >
        Choose another plan
      </Link>
      <Surface className="space-y-6">
        <h2 className="text-xl font-bold">{plan.name}</h2>
        <NutritionPlanPreview plan={plan} />
      </Surface>
      <form
        noValidate
        className="has-mobile-actions space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          form.clearErrors('root');
          try {
            await save.mutateAsync({
              start_date: values.start_date,
              end_date: values.end_date || null,
              expected_revision: plan.revision,
            });
            if (mounted.current) {
              navigate(generatePath(routes.client, {id: clientId}), {replace: true, state: {assigned: plan.name}});
            }
          } catch (error) {
            if (!mounted.current) {
              return;
            }
            const conflict = error instanceof ApiError && error.status === 409;
            setStale(conflict);
            if (error instanceof ApiError && error.status === 422) {
              setFormError(error, 'Check the dates and try again.', form.setError, ['start_date', 'end_date']);
            } else {
              form.setError('root', {
                message: conflict
                  ? 'This nutrition plan changed. Refresh the preview before assigning it.'
                  : error instanceof ApiError && error.status < 500
                    ? errorMessage(error, 'Check the dates and try again.')
                    : 'Assignment could not be confirmed. Check the client’s plans before retrying; it may already be assigned.',
              });
            }
          }
        })}
      >
        <fieldset
          disabled={!available || save.isPending}
          className="grid gap-4 sm:grid-cols-2"
        >
          <legend className="mb-4 text-lg font-semibold">Dates for {name}</legend>
          <FormField
            control={form.control}
            name="start_date"
            label="Start date"
            type="date"
            isRequired
          />
          <FormField
            control={form.control}
            name="end_date"
            label="End date"
            type="date"
            description="Leave blank for an ongoing plan."
            rules={{
              validate: (value) =>
                !value ||
                !form.getValues('start_date') ||
                value >= form.getValues('start_date') ||
                'End date must be on or after the start date.',
            }}
          />
        </fieldset>
        {!available && <FormError message="This plan is unavailable. Choose another active template." />}
        <div
          ref={errorRef}
          tabIndex={-1}
          className="space-y-3"
        >
          <FormError message={form.formState.errors.root?.message} />
          {form.formState.errors.root && (
            <Link
              to={generatePath(routes.client, {id: clientId})}
              className={buttonVariants({variant: 'outline'})}
            >
              Check client plans
            </Link>
          )}
          {stale && (
            <Button
              isPending={query.isFetching}
              onPress={async () => {
                const result = await query.refetch();
                if (!mounted.current) {
                  return;
                }
                if (result.error) {
                  form.setError('root', {message: errorMessage(result.error, 'Could not refresh the preview.')});
                } else if (result.data) {
                  setPlan(result.data.data);
                  setStale(false);
                  form.clearErrors('root');
                }
              }}
            >
              Refresh preview
            </Button>
          )}
        </div>
        <FormActions>
          <Button
            type="submit"
            isPending={save.isPending}
            isDisabled={!available || stale}
          >
            Assign nutrition plan
          </Button>
        </FormActions>
      </form>
    </>
  );
}
