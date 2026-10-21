import {useForm} from 'react-hook-form';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {useStartLogin, type VerifyRequest} from '../api/auth';
import {ApiError, errorMessage} from '../api/client';
import {routes} from '../routes';
import {FormField} from '../ui/form-field';
import {SubmitButton} from '../ui/submit-button';
import {AuthLayout, FormError} from './auth-layout';
import {getChallenge, saveChallenge} from './challenge';
import {authPath, getReturnTo} from './return-to';

export function Login() {
  const navigate = useNavigate();
  const returnTo = getReturnTo(useLocation().search);
  const mutation = useStartLogin();
  const form = useForm<Pick<VerifyRequest, 'email'>>({defaultValues: {email: getChallenge()?.email ?? ''}});
  const submit = form.handleSubmit(async ({email}) => {
    try {
      const kind = await mutation.mutateAsync(email);
      saveChallenge({kind, email, sentAt: Date.now()});
      navigate(authPath(routes.verify, returnTo));
    } catch (error) {
      form.setError('root', {
        message:
          error instanceof ApiError && error.status === 404
            ? 'There is no account for this email. Check the address or create an account.'
            : errorMessage(error, 'We could not send your code. Check your connection and try again.'),
      });
    }
  });
  return (
    <AuthLayout
      title="Welcome back"
      description="Enter your email to receive a sign-in code."
    >
      <form
        noValidate
        onSubmit={submit}
        className="space-y-5"
      >
        <FormField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          isRequired
        />
        <FormError message={form.formState.errors.root?.message} />
        <SubmitButton pending={form.formState.isSubmitting}>Continue with email</SubmitButton>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Getting started?{' '}
        <Link
          className="text-link"
          to={authPath(routes.signup, returnTo)}
        >
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
