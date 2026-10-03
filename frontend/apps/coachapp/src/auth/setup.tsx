import {useEffect} from 'react';
import {flushSync} from 'react-dom';
import {Controller, useForm} from 'react-hook-form';
import {Navigate, useLocation, useNavigate} from 'react-router-dom';
import {type BusinessInput, useCreateBusiness, useSetup} from '../api/auth';
import {clearSession, getSession} from '../api/session';
import {routes} from '../routes';
import {BusinessHandle, suggestBusinessHandle, validateBusinessHandle} from '../ui/business-handle';
import {Button} from '../ui/button';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {SubmitButton} from '../ui/submit-button';
import {AuthLayout, FormError} from './auth-layout';
import {authPath, getReturnTo} from './return-to';

export function Setup() {
  const setup = useSetup();
  const mutation = useCreateBusiness();
  const navigate = useNavigate();
  const returnTo = getReturnTo(useLocation().search);
  const form = useForm<BusinessInput>({
    defaultValues: {name: '', handle: '', full_name: getSession()?.tokens.full_name ?? '', preferred_name: ''},
  });
  const name = form.watch('name');
  const handleEdited = form.formState.dirtyFields.handle;
  useEffect(() => {
    if (!handleEdited) {
      form.setValue('handle', suggestBusinessHandle(name));
    }
  }, [name, handleEdited, form.setValue]);
  const submit = form.handleSubmit(async (data) => {
    try {
      await mutation.mutateAsync(data);
      navigate(authPath(routes.welcome, returnTo), {replace: true});
    } catch (error) {
      setFormError(error, 'We could not finish setup. Please try again.', form.setError, [
        'name',
        'handle',
        'full_name',
        'preferred_name',
      ]);
    }
  });
  if (setup.data === true) {
    return (
      <Navigate
        to={authPath(routes.welcome, returnTo)}
        replace
      />
    );
  }
  return (
    <AuthLayout
      title="Your coaching business"
      description="Add your coaching details, then give your business a name and a unique address."
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
            name="full_name"
            label="Full name"
            autoComplete="name"
            isRequired
            rules={{validate: (value) => Boolean(value?.trim()) || 'Enter your full name.'}}
          />
          <FormField
            control={form.control}
            name="preferred_name"
            label="Preferred name"
            description="What should we call you?"
            autoComplete="nickname"
          />
          <FormField
            control={form.control}
            name="name"
            label="Business name"
            autoComplete="organization"
            isRequired
          />
          <Controller
            control={form.control}
            name="handle"
            rules={{validate: validateBusinessHandle}}
            render={({field, fieldState}) => (
              <BusinessHandle
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                isDisabled={form.formState.isSubmitting}
                error={fieldState.error?.message}
              />
            )}
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
