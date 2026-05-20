import {
  Button,
  ErrorMessage,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  Spinner,
  TextField,
  Typography,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';

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
          <Controller
            control={form.control}
            name="first_name"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!form.formState.errors.first_name}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>First name (optional)</Label>
                {form.formState.errors.first_name && (
                  <FieldError>{form.formState.errors.first_name.message}</FieldError>
                )}
                <Input autoComplete="given-name" />
              </TextField>
            )}
          />

          <Controller
            control={form.control}
            name="last_name"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!form.formState.errors.last_name}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Last name (optional)</Label>
                {form.formState.errors.last_name && <FieldError>{form.formState.errors.last_name.message}</FieldError>}
                <Input autoComplete="family-name" />
              </TextField>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="email"
          render={({field}) => (
            <TextField
              fullWidth
              isInvalid={!!form.formState.errors.email}
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              type="email"
              value={field.value}
            >
              <Label>Email</Label>
              {form.formState.errors.email && <FieldError>{form.formState.errors.email.message}</FieldError>}
              <Input autoComplete="email" />
            </TextField>
          )}
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
