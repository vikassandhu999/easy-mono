import {useForm} from 'react-hook-form';
import {Link, useNavigate} from 'react-router-dom';
import {type SignupRequest, useSignup} from '../api/auth';
import {routes} from '../routes';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {SubmitButton} from '../ui/submit-button';
import {AuthLayout, FormError} from './auth-layout';
import {getChallenge, saveChallenge} from './challenge';

export function Signup() {
  const navigate = useNavigate();
  const mutation = useSignup();
  const form = useForm<SignupRequest>({
    defaultValues: {email: getChallenge()?.email ?? '', first_name: '', last_name: ''},
  });
  const submit = form.handleSubmit(async (data) => {
    try {
      await mutation.mutateAsync(data);
      saveChallenge({kind: 'signup', email: data.email, sentAt: Date.now()});
      navigate(routes.verify);
    } catch (error) {
      setFormError(error, 'We could not create your account. Please try again.', form.setError, [
        'email',
        'first_name',
        'last_name',
      ]);
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
          name="first_name"
          label="First name"
          autoComplete="given-name"
        />
        <FormField
          control={form.control}
          name="last_name"
          label="Last name"
          autoComplete="family-name"
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
          to={routes.login}
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
