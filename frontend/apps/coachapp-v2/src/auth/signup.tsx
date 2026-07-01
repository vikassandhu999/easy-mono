import {Button, ErrorMessage, Form, Link, Spinner, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';
import {FieldRow, FormTextField} from '@/@components/form-fields';

import {ROUTES} from '@/@config/routes';
import {useSignupMutation} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import {AuthFooter} from '@/auth/components/auth-footer';
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
        signupRequest: {
          email: data.email,
          first_name: data.first_name || undefined,
          last_name: data.last_name || undefined,
        },
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
        <FieldRow>
          <FormTextField
            control={form.control}
            fullWidth
            inputProps={{autoComplete: 'given-name'}}
            label="First name"
            name="first_name"
          />

          <FormTextField
            control={form.control}
            fullWidth
            inputProps={{autoComplete: 'family-name'}}
            label="Last name"
            name="last_name"
          />
        </FieldRow>

        <FormTextField
          control={form.control}
          fullWidth
          inputProps={{autoComplete: 'email'}}
          isRequired
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

      <AuthFooter>
        <Typography
          color="muted"
          type="body-sm"
        >
          Already have an account?
        </Typography>
        <Link
          className="text-sm text-foreground underline"
          href={ROUTES.LOGIN}
        >
          Log in
        </Link>
      </AuthFooter>
    </AuthLayout>
  );
}
