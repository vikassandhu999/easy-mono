import {flushSync} from 'react-dom';
import {useForm} from 'react-hook-form';
import {Navigate, useLocation, useNavigate} from 'react-router-dom';
import {type BusinessInput, useCreateBusiness, useSetup} from '../api/auth';
import {clearSession} from '../api/session';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {SubmitButton} from '../ui/submit-button';
import {AuthLayout, FormError} from './auth-layout';
import {getReturnTo} from './return-to';

export function Setup() {
  const setup = useSetup();
  const mutation = useCreateBusiness();
  const navigate = useNavigate();
  const returnTo = getReturnTo(useLocation().search);
  const form = useForm<BusinessInput>({defaultValues: {name: '', handle: ''}});
  const submit = form.handleSubmit(async (data) => {
    try {
      await mutation.mutateAsync(data);
      navigate(returnTo, {replace: true});
    } catch (error) {
      setFormError(error, 'We could not finish setup. Please try again.', form.setError, ['name', 'handle']);
    }
  });
  if (setup.data === true) {
    return (
      <Navigate
        to={returnTo}
        replace
      />
    );
  }
  return (
    <AuthLayout
      title="Your coaching business"
      description="Give your business a name and a unique address."
    >
      {setup.isPending ? (
        <p
          role="status"
          className="animate-pulse text-muted-foreground"
        >
          Checking your account…
        </p>
      ) : setup.isError ? (
        <div className="space-y-4">
          <FormError message="We could not check your account. Please try again." />
          <Button
            onPress={() => {
              setup.refetch();
            }}
            isPending={setup.isFetching}
          >
            Try again
          </Button>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={submit}
          className="space-y-5"
        >
          <FormField
            control={form.control}
            name="name"
            label="Business name"
            autoComplete="organization"
            isRequired
          />
          <FormField
            control={form.control}
            name="handle"
            label="Business handle"
            description="Your unique address. Use lowercase letters, numbers, hyphens, or underscores."
            isRequired
          />
          <FormError message={form.formState.errors.root?.message} />
          <SubmitButton pending={form.formState.isSubmitting}>Create business</SubmitButton>
        </form>
      )}
      <Button
        variant="link"
        className="mt-6"
        onPress={() => {
          flushSync(clearSession);
          navigate(routes.login, {replace: true, flushSync: true});
        }}
        isDisabled={form.formState.isSubmitting}
      >
        Sign out
      </Button>
    </AuthLayout>
  );
}
