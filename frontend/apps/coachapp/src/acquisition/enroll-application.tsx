import {useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, Link, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {useDefaultIntake} from '../api/forms';
import {type Prospect, type ProspectEnroll, useEnrollProspect, useProspect} from '../api/prospects';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {IntakePreview} from '../ui/intake-preview';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';
import {ApplicationDraftGuard} from './application-draft-guard';

export function EnrollApplication() {
  const {id = ''} = useParams();
  const query = useProspect(id);
  const list = useListLocation(routes.applications);
  const back = {to: generatePath(routes.application, {id}), label: 'Application', state: list.state};
  return (
    <Page>
      <PageHeader
        title={query.data ? `Enroll ${query.data.data.name}` : 'Enroll applicant'}
        description="Create their client profile and invite them to start coaching."
        back={back}
      />
      {query.data && query.isError && (
        <FormError message="Could not refresh this application. The last loaded details are shown." />
      )}
      {query.data ? (
        <Enrollment
          key={id}
          application={query.data.data}
        />
      ) : query.isPending ? (
        <p role="status">Loading application…</p>
      ) : (
        <div className="space-y-3">
          <FormError message={errorMessage(query.error, 'Could not load this application.')} />
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
    </Page>
  );
}
function Enrollment({application}: {application: Prospect}) {
  const list = useListLocation(routes.applications);
  const query = useProspect(application.id);
  const intake = useDefaultIntake();
  const enroll = useEnrollProspect();
  const [revision, setRevision] = useState(application.revision);
  const [uncertain, setUncertain] = useState<ProspectEnroll | null>(null);
  const [stale, setStale] = useState(false);
  const form = useForm({
    defaultValues: {
      first_name: application.enrollment_defaults.first_name ?? '',
      last_name: application.enrollment_defaults.last_name ?? '',
      email: application.enrollment_defaults.email ?? '',
      phone: application.enrollment_defaults.phone ?? '',
    },
  });
  const pending = form.formState.isSubmitting || enroll.isPending;
  const errorRef = useRef<HTMLParagraphElement>(null);
  const enrolledRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (pending) {
      return;
    }
    const errors = form.formState.errors;
    if (errors.root) {
      errorRef.current?.focus();
    } else if (!uncertain) {
      if (errors.first_name) {
        form.setFocus('first_name');
      } else if (errors.last_name) {
        form.setFocus('last_name');
      } else if (errors.email) {
        form.setFocus('email');
      } else if (errors.phone) {
        form.setFocus('phone');
      }
    }
  }, [pending, uncertain, form.formState.errors, form.setFocus]);
  const enrolledId = application.client?.id;
  useEffect(() => {
    if (enrolledId) {
      enrolledRef.current?.focus();
    }
  }, [enrolledId]);
  const send = async (body: ProspectEnroll) => {
    form.clearErrors();
    setStale(false);
    try {
      await enroll.mutateAsync({id: application.id, body});
      setUncertain(null);
      form.reset(form.getValues());
    } catch (error) {
      if (!(error instanceof ApiError) || error.status >= 500 || error.status === 429) {
        setUncertain(body);
      } else {
        setUncertain(null);
      }
      setStale(error instanceof ApiError && error.code === 'stale_revision');
      setFormError(error, 'Could not confirm enrollment. Your details are still here.', form.setError, [
        'first_name',
        'last_name',
        'email',
        'phone',
      ]);
    }
  };
  const submit = form.handleSubmit(async (values) => {
    if (!intake.isSuccess) {
      return;
    }
    await send({
      ...values,
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim() || null,
      email: values.email.trim(),
      phone: values.phone.trim() || null,
      expected_revision: revision,
    });
  });
  if (application.client) {
    return (
      <Surface className="max-w-2xl space-y-5">
        <h2
          ref={enrolledRef}
          tabIndex={-1}
          className="text-xl font-semibold"
        >
          Enrolled as a client
        </h2>
        <p>Their client profile is ready. Open it to manage the invitation, intake and coaching plans.</p>
        <div className="flex flex-wrap gap-3">
          <Link
            className={buttonVariants()}
            to={generatePath(routes.client, {id: application.client.id})}
            state={{returnTo: list.to, returnLabel: 'Back to applications'}}
          >
            View client
          </Link>
          <Link
            className={buttonVariants({variant: 'outline'})}
            to={generatePath(routes.application, {id: application.id})}
            state={list.state}
          >
            Back to application
          </Link>
        </div>
      </Surface>
    );
  }
  return (
    <>
      <form
        noValidate
        onSubmit={submit}
        className="has-mobile-actions grid items-start gap-6 md:grid-cols-2"
      >
        <Surface className="space-y-5">
          <h2 className="section-title">Client details</h2>
          <p className="text-sm text-muted-foreground">
            Check these details before sending. An email is needed for their invitation.
          </p>
          <FormField
            control={form.control}
            name="first_name"
            label="First name"
            autoComplete="given-name"
            isRequired
            maxLength={255}
            isDisabled={pending || Boolean(uncertain)}
            rules={{validate: (value) => Boolean(value.trim()) || 'Enter their first name.'}}
          />
          <FormField
            control={form.control}
            name="last_name"
            label="Last name"
            autoComplete="family-name"
            maxLength={255}
            isDisabled={pending || Boolean(uncertain)}
          />
          <FormField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            isRequired
            maxLength={255}
            isDisabled={pending || Boolean(uncertain)}
          />
          <FormField
            control={form.control}
            name="phone"
            label="Phone"
            type="tel"
            autoComplete="tel"
            maxLength={255}
            isDisabled={pending || Boolean(uncertain)}
          />
          <FormError
            ref={errorRef}
            tabIndex={-1}
            message={form.formState.errors.root?.message}
          />
          {uncertain && (
            <div className="space-y-3">
              <p className="text-sm">
                Enrollment has not been confirmed. Retry the same request before changing these details; this won’t
                create another client.
              </p>
              <Button
                isPending={enroll.isPending}
                onPress={() => send(uncertain)}
              >
                Check enrollment
              </Button>
            </div>
          )}
          {stale && (
            <div className="space-y-3">
              <p className="text-sm">
                This application was updated. Refresh its status before enrolling. Your contact edits will stay here.
              </p>
              <Button
                variant="outline"
                isPending={query.isFetching}
                onPress={async () => {
                  const result = await query.refetch();
                  if (result.data && !result.isError) {
                    setRevision(result.data.data.revision);
                    setStale(false);
                    form.clearErrors('root');
                    form.setFocus('first_name');
                  }
                }}
              >
                Refresh application
              </Button>
            </div>
          )}
          {enroll.error instanceof ApiError && enroll.error.code === 'seat_limit_reached' && (
            <p className="text-sm">
              <Link
                className="text-link"
                to={routes.billing}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open billing in a new tab
              </Link>{' '}
              to check capacity. These details will stay here.
            </p>
          )}
        </Surface>
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="section-title">Their intake form</h2>
            <p className="text-sm text-muted-foreground">Included automatically when they accept their invitation.</p>
          </div>
          {intake.data && <IntakePreview template={intake.data.data} />}
          {intake.isPending && <p role="status">Loading intake…</p>}
          {intake.isError && (
            <Surface className="space-y-3">
              <FormError
                message={
                  intake.data
                    ? 'Could not refresh the intake. Retry before sending the invitation; your client details are still here.'
                    : 'Could not load the intake. Your client details are still here.'
                }
              />
              <Button
                variant="outline"
                isPending={intake.isFetching}
                onPress={() => {
                  intake.refetch();
                }}
              >
                Retry intake
              </Button>
            </Surface>
          )}
        </section>
        <div className="md:col-span-2">
          <FormActions>
            <Link
              className={buttonVariants({variant: 'ghost'})}
              to={generatePath(routes.application, {id: application.id})}
              state={list.state}
            >
              Cancel
            </Link>
            <Button
              type="submit"
              isPending={pending}
              isDisabled={!intake.isSuccess || Boolean(uncertain) || stale}
            >
              Send invitation
            </Button>
          </FormActions>
        </div>
      </form>
      <ApplicationDraftGuard
        dirty={form.formState.isDirty || Boolean(uncertain)}
        pending={pending}
      />
    </>
  );
}
