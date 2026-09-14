import {useForm} from 'react-hook-form';
import {generatePath, Link, useNavigate} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {type ClientInvite, useInviteClient} from '../api/clients';
import {useDefaultIntake} from '../api/forms';
import {routes} from '../routes';
import {Button, buttonVariants} from '../ui/button';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {IntakePreview} from '../ui/intake-preview';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';

export function InviteClient() {
  const navigate = useNavigate();
  const listLocation = useListLocation(routes.home);
  const intake = useDefaultIntake();
  const invitation = useInviteClient();
  const form = useForm<Pick<ClientInvite, 'first_name' | 'last_name' | 'email'>>({
    defaultValues: {first_name: '', last_name: '', email: ''},
  });
  const pending = form.formState.isSubmitting;
  const submit = form.handleSubmit(async (values) => {
    if (!intake.isSuccess) {
      return;
    }
    try {
      const result = await invitation.mutateAsync({
        first_name: values.first_name?.trim() || null,
        last_name: values.last_name?.trim() || null,
        email: values.email?.trim() || null,
      });
      navigate(generatePath(routes.client, {id: result.data.id}), {replace: true, state: listLocation.state});
    } catch (error) {
      setFormError(error, "We couldn't send the invitation. Please try again.", form.setError, [
        'first_name',
        'last_name',
        'email',
      ]);
    }
  });

  return (
    <Page>
      <PageHeader
        title="Invite client"
        description="Invite them to join you and complete their intake."
        back={{to: listLocation.to, label: 'Back to clients'}}
      />
      <form
        noValidate
        onSubmit={submit}
        className="has-mobile-actions grid items-start gap-6 md:grid-cols-2 md:gap-8"
      >
        <Surface className="space-y-5">
          <div>
            <h2 className="section-title">Client details</h2>
            <p className="mt-1 text-sm text-muted-foreground">First name and email are required.</p>
          </div>
          <FormField
            control={form.control}
            name="first_name"
            label="First name"
            autoComplete="given-name"
            isRequired
            isDisabled={pending}
            rules={{validate: (value) => Boolean(value?.trim()) || 'Enter first name.'}}
          />
          <FormField
            control={form.control}
            name="last_name"
            label="Last name"
            autoComplete="family-name"
            isDisabled={pending}
          />
          <FormField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            isRequired
            isDisabled={pending}
            description="Their invitation will be sent here."
          />
          <FormError message={form.formState.errors.root?.message} />
          {invitation.error instanceof ApiError && invitation.error.code === 'seat_limit_reached' && (
            <p className="text-sm">
              <Link
                className="text-link"
                to={routes.billing}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open billing in a new tab
              </Link>{' '}
              to check capacity. Your invitation stays here.
            </p>
          )}
        </Surface>
        <section className="space-y-4">
          <div>
            <h2 className="section-title">Their intake form</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Ready for them as soon as they accept. You can preview the questions before sending.
            </p>
          </div>
          {intake.isPending ? (
            <Surface>
              <p
                role="status"
                className="py-5 text-sm text-muted-foreground"
              >
                Loading intake…
              </p>
            </Surface>
          ) : intake.isError ? (
            <Surface className="space-y-4">
              <FormError message={errorMessage(intake.error, "We couldn't load the intake. Please try again.")} />
              <Button
                variant="outline"
                onPress={() => {
                  intake.refetch();
                }}
              >
                Try again
              </Button>
            </Surface>
          ) : (
            <IntakePreview template={intake.data.data} />
          )}
        </section>
        <div className="md:col-span-2">
          <FormActions>
            <Link
              className={buttonVariants({variant: 'ghost'})}
              to={listLocation.to}
            >
              Cancel
            </Link>
            <Button
              type="submit"
              isPending={pending}
              isDisabled={!intake.isSuccess}
            >
              Send invitation
            </Button>
          </FormActions>
        </div>
      </form>
    </Page>
  );
}
