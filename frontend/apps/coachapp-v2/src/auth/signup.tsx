import {Button, ErrorMessage, Form, Link, Spinner, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';
import {FormTextField} from '@/@components/form-fields';

import {ROUTES} from '@/@config/routes';
import {useSignupMutation} from '@/api/auth';
import {applyFormErrors} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

const schema = z.object({
  email: z.string().min(1, 'Enter email').email('Enter a valid email'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

type SignupFormValues = z.infer<typeof schema>;

export default function Signup() {
  const navigate = useNavigate();
  const [signup, {isLoading}] = useSignupMutation();

  const form = useForm<SignupFormValues>({
    defaultValues: {email: '', first_name: '', last_name: ''},
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      await signup({
        email: data.email,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
      }).unwrap();
      navigate(ROUTES.VERIFY_SIGNUP_OTP, {
        state: {email: data.email},
      });
    } catch (err) {
      applyFormErrors(err, "Account wasn't created. Try again", form.setError);
    }
  };

  return (
    <AuthLayout
      description="Create your coaching account to get started."
      title="Create account"
    >
      <Form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormTextField
            control={form.control}
            fullWidth
            inputProps={{autoComplete: 'given-name'}}
            label="First name (optional)"
            name="first_name"
          />

          <FormTextField
            control={form.control}
            fullWidth
            inputProps={{autoComplete: 'family-name'}}
            label="Last name (optional)"
            name="last_name"
          />
        </div>

        <FormTextField
          control={form.control}
          fullWidth
          inputProps={{autoComplete: 'email'}}
          label="Email"
          name="email"
          type="email"
        />

        {form.formState.errors.root && <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage>}

        <Button
          fullWidth
          isPending={isLoading}
          type="submit"
        >
          {isLoading ? (
            <>
              <Spinner
                color="current"
                size="sm"
              />
              Creating account
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </Form>

      <Typography
        className="mt-6 text-center"
        color="muted"
        type="body-sm"
      >
        Already have an account?{' '}
        <Link
          className="text-sm text-foreground underline"
          href={ROUTES.LOGIN}
        >
          Log in
        </Link>
      </Typography>
    </AuthLayout>
  );
}
