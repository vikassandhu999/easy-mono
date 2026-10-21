import {useCallback, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {generatePath, Link, useBeforeUnload, useBlocker, useLocation, useParams} from 'react-router-dom';
import {useProfile} from '../api/auth';
import {useTimezones} from '../api/business';
import {errorMessage} from '../api/client';
import {type Client, type ClientUpdate, useClient, useUpdateClient} from '../api/clients';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {Label} from '../ui/label';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader, StatusBadge, Surface} from '../ui/page';
import {ReviewFrequency} from '../ui/review-frequency';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {clientStateLabels} from './coaching';

type Values = Pick<
  Client,
  | 'full_name'
  | 'preferred_name'
  | 'phone'
  | 'email'
  | 'notes'
  | 'timezone'
  | 'unit_system'
  | 'focus'
  | 'review_frequency_days'
>;
const textFields = ['full_name', 'preferred_name', 'phone', 'email', 'notes', 'timezone', 'focus'] as const;
function defaults(person: Client): Values {
  return {
    full_name: person.full_name,
    preferred_name: person.preferred_name ?? '',
    phone: person.phone ?? '',
    email: person.email ?? '',
    notes: person.notes ?? '',
    timezone: person.timezone ?? '',
    unit_system: person.unit_system,
    focus: person.focus ?? '',
    review_frequency_days: person.review_frequency_days,
  };
}

export function ClientProfile() {
  const {id = ''} = useParams();
  const query = useClient(id);
  const list = useListLocation(routes.home);
  const overview = generatePath(routes.client, {id});
  return (
    <div className="has-mobile-actions mx-auto max-w-3xl">
      <Page className="client-page">
        <PageHeader
          title={
            query.data
              ? query.data.data.preferred_name || query.data.data.full_name || 'Client details'
              : 'Client details'
          }
          description="Contact details and coaching preferences."
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
  const timezones = useTimezones();
  const location = useLocation();
  const state: unknown = location.state;
  const coachAssigned = Boolean(
    state && typeof state === 'object' && 'coachAssigned' in state && state.coachAssigned === true,
  );
  const form = useForm<Values>({defaultValues: defaults(person)});
  const update = useUpdateClient(person.id);
  const [notice, setNotice] = useState('');
  const list = useListLocation(routes.home);
  const pending = form.formState.isSubmitting;
  const dirty = form.formState.isDirty;
  const blocker = useBlocker(dirty || pending);
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
      if (form.formState.dirtyFields[field]) {
        if (field === 'full_name' || field === 'email') {
          patch[field] = values[field]?.trim() || '';
        } else {
          patch[field] = values[field]?.trim() || null;
        }
      }
    }
    if (form.formState.dirtyFields.unit_system) {
      patch.unit_system = values.unit_system;
    }
    if (form.formState.dirtyFields.review_frequency_days) {
      patch.review_frequency_days = values.review_frequency_days;
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
        'unit_system',
      ]);
    }
  });
  return (
    <>
      <StatusBadge>{clientStateLabels[person.state]}</StatusBadge>
      <form
        noValidate
        onSubmit={submit}
        className="space-y-6"
        onChange={() => setNotice('')}
      >
        <Surface className="space-y-5">
          <h2 className="section-title">Contact details</h2>
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="full_name"
              label="Full name"
              autoComplete="name"
              maxLength={255}
              isRequired
              isDisabled={pending}
              rules={{validate: (value) => (typeof value === 'string' && Boolean(value.trim())) || 'Enter full name.'}}
            />
            <FormField
              control={form.control}
              name="preferred_name"
              label="Preferred name"
              autoComplete="nickname"
              maxLength={255}
              isDisabled={pending}
              description="What should we call you?"
            />
          </div>
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              label="Contact email"
              type="email"
              maxLength={255}
              isDisabled={pending}
              description={
                person.state === 'invited'
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
          <h2 className="section-title">Coaching preferences</h2>
          <FormField
            control={form.control}
            name="focus"
            label="Focus"
            maxLength={255}
            isDisabled={pending}
            description="One line pinned on the client Today screen."
          />
          <Controller
            control={form.control}
            name="review_frequency_days"
            render={({field}) => (
              <ReviewFrequency
                value={field.value}
                onChange={field.onChange}
                isDisabled={pending}
              />
            )}
          />
          <Controller
            control={form.control}
            name="timezone"
            render={({field, fieldState}) => (
              <div className="grid gap-2">
                <Label
                  id="client-timezone-label"
                  htmlFor="client-timezone"
                >
                  Time zone
                </Label>
                <SelectField
                  id="client-timezone"
                  value={field.value || 'business'}
                  onChange={(value) => field.onChange(value === 'business' ? '' : value)}
                  triggerRef={field.ref}
                  onBlur={field.onBlur}
                  isDisabled={pending}
                  isInvalid={Boolean(fieldState.error)}
                >
                  <SelectItem id="business">Use business time zone</SelectItem>
                  {(timezones.data?.data.timezones ?? (person.timezone ? [person.timezone] : [])).map((zone) => (
                    <SelectItem
                      key={zone}
                      id={zone}
                    >
                      {zone.replaceAll('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectField>
                <p className="text-sm text-muted-foreground">
                  Coaching dates use this time zone. Leave it unset to follow the business time zone.
                </p>
                <FormError message={fieldState.error?.message} />
                {timezones.isError && (
                  <Button
                    variant="outline"
                    onPress={() => {
                      timezones.refetch();
                    }}
                  >
                    Retry time zones
                  </Button>
                )}
              </div>
            )}
          />
          <Controller
            control={form.control}
            name="unit_system"
            render={({field, fieldState}) => (
              <div className="grid gap-2">
                <Label
                  id="client-units-label"
                  htmlFor="client-units"
                >
                  Unit system
                </Label>
                <SelectField
                  id="client-units"
                  value={field.value}
                  onChange={field.onChange}
                  triggerRef={field.ref}
                  onBlur={field.onBlur}
                  isDisabled={pending}
                  isInvalid={Boolean(fieldState.error)}
                >
                  <SelectItem id="metric">Metric (kg)</SelectItem>
                  <SelectItem id="imperial">Imperial (lb)</SelectItem>
                </SelectField>
                <FormError message={fieldState.error?.message} />
              </div>
            )}
          />
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
        <p>{person.coach_name || 'Coach'}</p>
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
