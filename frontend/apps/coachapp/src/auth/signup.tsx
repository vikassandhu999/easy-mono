import {useForm} from 'react-hook-form';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {type SignupRequest, useSignup} from '../api/auth';
import {routes} from '../routes';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {SubmitButton} from '../ui/submit-button';
import {AuthLayout, FormError} from './auth-layout';
import {getChallenge, saveChallenge} from './challenge';
import {authPath, getReturnTo} from './return-to';

export function Signup() {
  const navigate = useNavigate();
  const returnTo = getReturnTo(useLocation().search);
  const mutation = useSignup();
  const form = useForm<SignupRequest>({
    defaultValues: {email: getChallenge()?.email ?? '', full_name: ''},
  });
  const submit = form.handleSubmit(async (data) => {
    try {
      await mutation.mutateAsync(data);
      saveChallenge({kind: 'signup', email: data.email, sentAt: Date.now()});
      navigate(authPath(routes.verify, returnTo));
    } catch (error) {
      setFormError(error, 'We could not create your account. Please try again.', form.setError, ['email', 'full_name']);
    }
  });
  return (
    <AuthLayout
      title="Create your account"
      description="Start with your details. We'll verify your email next."
    >
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
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          isRequired
        />
        <FormError message={form.formState.errors.root?.message} />
        <SubmitButton pending={form.formState.isSubmitting}>Create account</SubmitButton>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          className="text-link"
          to={authPath(routes.login, returnTo)}
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
