import {useCallback, useRef, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {generatePath, Link, useBeforeUnload, useBlocker, useLocation, useParams} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {errorMessage} from '../api/client';
import {type Client, type ClientUpdate, useClient, useUpdateClient} from '../api/clients';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {Checkbox} from '../ui/checkbox';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {Label} from '../ui/label';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {ClientAccess} from './client-access';

type Values = Pick<
  Client,
  | 'first_name'
  | 'last_name'
  | 'phone'
  | 'email'
  | 'notes'
  | 'required_services'
  | 'stage'
  | 'subscription_started_on'
  | 'subscription_ends_on'
> & {goal_weight_value: string; goal_weight_unit: 'kg' | 'lbs'};
const textFields: Array<
  'first_name' | 'last_name' | 'phone' | 'email' | 'notes' | 'subscription_started_on' | 'subscription_ends_on'
> = ['first_name', 'last_name', 'phone', 'email', 'notes', 'subscription_started_on', 'subscription_ends_on'];
function defaults(person: Client): Values {
  return {
    first_name: person.first_name ?? '',
    last_name: person.last_name ?? '',
    phone: person.phone ?? '',
    email: person.email ?? '',
    notes: person.notes ?? '',
    required_services: person.required_services,
    stage: person.stage,
    subscription_started_on: person.subscription_started_on ?? '',
    subscription_ends_on: person.subscription_ends_on ?? '',
    goal_weight_value: String(person.goal_weight_value ?? ''),
    goal_weight_unit: person.goal_weight_unit ?? 'kg',
  };
}

export function ClientProfile() {
  const {id = ''} = useParams();
  const query = useClient(id);
  const list = useListLocation(routes.home);
  const overview = generatePath(routes.client, {id});
  return (
    <div className="has-mobile-actions mx-auto max-w-3xl">
      <Page>
        <PageHeader
          title={
            query.data
              ? `${query.data.data.first_name ?? ''} ${query.data.data.last_name ?? ''}`.trim() || 'Client details'
              : 'Client details'
          }
          description="Contact details, coaching and access."
          back={{to: overview, state: list.state, label: 'Back to client'}}
        />
        {!query.data ? (
          <Surface>
            {query.isPending ? (
              <p role="status">Loading client details…</p>
            ) : (
              <div className="space-y-4">
                <FormError message={errorMessage(query.error, 'Could not load client details.')} />
                <Button
                  onPress={() => {
                    query.refetch();
                  }}
                >
                  Try again
                </Button>
                <Link
                  to={list.to}
                  className="text-link"
                >
                  Return to clients
                </Link>
              </div>
            )}
          </Surface>
        ) : (
          <Profile
            key={id}
            person={query.data.data}
          />
        )}
      </Page>
    </div>
  );
}

function Profile({person}: {person: Client}) {
  const account = useProfile();
  const location = useLocation();
  const state: unknown = location.state;
  const coachAssigned = Boolean(
    state && typeof state === 'object' && 'coachAssigned' in state && state.coachAssigned === true,
  );
  const form = useForm<Values>({defaultValues: defaults(person)});
  const update = useUpdateClient(person.id);
  const [notice, setNotice] = useState('');
  const saved = useRef(false);
  const list = useListLocation(routes.home);
  const pending = form.formState.isSubmitting;
  const dirty = form.formState.isDirty;
  const blocker = useBlocker(() => !saved.current && (dirty || pending));
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
  const reset = (client: Client) => {
    form.reset(defaults(client));
  };
  const submit = form.handleSubmit(async (values) => {
    const patch: ClientUpdate = {};
    for (const field of textFields) {
      if (
        form.formState.dirtyFields[field] &&
        (person.status === 'pending' || (field !== 'first_name' && field !== 'last_name'))
      ) {
        patch[field] = values[field]?.trim() || null;
      }
    }
    if (form.formState.dirtyFields.required_services) {
      patch.required_services = values.required_services;
    }
    if (person.status === 'active' && form.formState.dirtyFields.stage) {
      patch.stage = values.stage;
    }
    if (form.formState.dirtyFields.goal_weight_value || form.formState.dirtyFields.goal_weight_unit) {
      patch.goal_weight_value = values.goal_weight_value.trim() ? Number(values.goal_weight_value) : null;
      patch.goal_weight_unit = patch.goal_weight_value === null ? null : values.goal_weight_unit;
    }
    form.clearErrors();
    setNotice('');
    try {
      const result = await update.mutateAsync(patch);
      reset(result.data);
      setNotice('Client details saved.');
    } catch (error) {
      setFormError(error, 'Could not save client details. Your changes are still here.', form.setError, [
        ...textFields,
        'required_services',
        'stage',
        'goal_weight_value',
        'goal_weight_unit',
      ]);
    }
  });
  return (
    <>
      <StatusBadge>
        {person.status === 'pending'
          ? 'Invitation pending'
          : person.status === 'active'
            ? 'Active client'
            : 'Inactive client'}
      </StatusBadge>
      <form
        noValidate
        onSubmit={submit}
        className="space-y-6"
        onChange={() => setNotice('')}
      >
        <Surface className="space-y-5">
          <h2 className="section-title">Contact details</h2>
          {person.status === 'pending' ? (
            <div className="grid items-start gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="first_name"
                label="First name"
                maxLength={255}
                isDisabled={pending}
              />
              <FormField
                control={form.control}
                name="last_name"
                label="Last name"
                maxLength={255}
                isDisabled={pending}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your client manages their account name. You can update their coaching contact details here.
            </p>
          )}
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              label="Contact email"
              type="email"
              maxLength={255}
              isDisabled={pending}
              description={
                person.status === 'pending'
                  ? 'Used when you resend their invitation.'
                  : 'This does not change their sign-in email.'
              }
            />
            <FormField
              control={form.control}
              name="phone"
              label="Phone"
              type="tel"
              maxLength={255}
              isDisabled={pending}
            />
          </div>
          <FormField
            control={form.control}
            name="notes"
            label="Coaching notes"
            multiline
            maxLength={255}
            isDisabled={pending}
            description="Brief context for your coaching team, up to 255 characters."
          />
        </Surface>
        <Surface className="space-y-5">
          <h2 className="section-title">Coaching engagement</h2>
          <Controller
            control={form.control}
            name="required_services"
            rules={{
              validate: (value) =>
                value.length > 0 || !form.formState.dirtyFields.required_services || 'Choose at least one service.',
            }}
            render={({field, fieldState}) => (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Services</legend>
                <p className="text-sm text-muted-foreground">Which plans does this client need?</p>
                <div className="flex flex-wrap gap-6">
                  {(['training', 'nutrition'] satisfies Client['required_services']).map((service) => (
                    <Checkbox
                      key={service}
                      isSelected={field.value.includes(service)}
                      isDisabled={pending}
                      onChange={(selected) =>
                        field.onChange(
                          selected ? [...field.value, service] : field.value.filter((item) => item !== service),
                        )
                      }
                    >
                      {service === 'training' ? 'Training' : 'Nutrition'}
                    </Checkbox>
                  ))}
                </div>
                {fieldState.error && <FormError message={fieldState.error.message} />}
              </fieldset>
            )}
          />
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="subscription_started_on"
              label="Engagement starts"
              type="date"
              isDisabled={pending}
            />
            <FormField
              control={form.control}
              name="subscription_ends_on"
              label="Engagement ends"
              type="date"
              isDisabled={pending}
              description="Leave empty for an open-ended engagement."
            />
          </div>
          <p className="text-sm text-muted-foreground">
            An end date controls when access expires. It does not change dates on assigned plans.
          </p>
          {person.status === 'active' && (
            <Controller
              control={form.control}
              name="stage"
              render={({field, fieldState}) => (
                <div className="grid gap-2">
                  <Label
                    id="client-stage-label"
                    htmlFor="client-stage"
                  >
                    Coaching stage
                  </Label>
                  <SelectField
                    id="client-stage"
                    value={field.value}
                    isDisabled={pending}
                    onChange={(value) => {
                      if (value === 'onboarding' || value === 'coaching') {
                        field.onChange(value);
                      }
                    }}
                  >
                    <SelectItem id="onboarding">Onboarding</SelectItem>
                    <SelectItem id="coaching">Coaching</SelectItem>
                  </SelectField>
                  <FormError message={fieldState.error?.message} />
                </div>
              )}
            />
          )}
        </Surface>
        <Surface className="space-y-5">
          <h2 className="section-title">Weight goal</h2>
          <p className="text-sm text-muted-foreground">
            Set a target in the chosen unit, or leave it empty to remove the goal.
          </p>
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-4">
            <FormField
              control={form.control}
              name="goal_weight_value"
              label="Goal weight"
              inputMode="decimal"
              isDisabled={pending}
              rules={{
                validate: (value) =>
                  (typeof value === 'string' &&
                    (!value.trim() || (Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) < 1000))) ||
                  'Enter a goal greater than 0 and less than 1,000.',
              }}
            />
            <Controller
              control={form.control}
              name="goal_weight_unit"
              render={({field, fieldState}) => (
                <div className="grid content-start gap-2">
                  <Label
                    id="goal-unit-label"
                    htmlFor="goal-unit"
                  >
                    Unit
                  </Label>
                  <SelectField
                    id="goal-unit"
                    value={field.value}
                    isDisabled={pending}
                    onChange={(value) => {
                      if (value === 'kg' || value === 'lbs') {
                        field.onChange(value);
                      }
                    }}
                  >
                    <SelectItem id="kg">kg</SelectItem>
                    <SelectItem id="lbs">lb</SelectItem>
                  </SelectField>
                  <FormError message={fieldState.error?.message} />
                </div>
              )}
            />
          </div>
        </Surface>
        <FormError message={form.formState.errors.root?.message} />
        {notice && <p role="status">{notice}</p>}
        <FormActions>
          <Button
            variant="ghost"
            isDisabled={pending || !dirty}
            onPress={() => {
              reset(person);
              setNotice('Changes discarded.');
            }}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            isPending={pending}
            isDisabled={!dirty}
          >
            Save changes
          </Button>
        </FormActions>
      </form>
      <Surface className="space-y-4">
        <h2 className="section-title">Assigned coach</h2>
        <p>{person.assigned_coach_name || 'Coach'}</p>
        {coachAssigned && (
          <p
            role="status"
            className="text-sm"
          >
            Coach assignment saved.
          </p>
        )}
        {account.data?.data.is_owner && (
          <Link
            to={generatePath(routes.changeClientCoach, {id: person.id})}
            state={list.state}
            className={buttonVariants({variant: 'outline'})}
          >
            Change coach
          </Link>
        )}
      </Surface>
      <ClientAccess
        person={person}
        isDisabled={dirty || pending}
        onSaved={reset}
        onRevoked={() => {
          saved.current = true;
        }}
      />
      <Link
        to={generatePath(routes.client, {id: person.id})}
        state={list.state}
        className={buttonVariants({variant: 'ghost'})}
      >
        Back to client
      </Link>
      <Dialog
        isOpen={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Discard your changes?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>Your client details have not been saved.</p>
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
            Discard and leave
          </Button>
        </div>
      </Dialog>
    </>
  );
}
