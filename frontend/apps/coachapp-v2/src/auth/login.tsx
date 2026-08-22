import {Button, ErrorMessage, Form, Link, Spinner, Typography} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router-dom';
import {z} from 'zod';
import {useSendOtpMutation} from '@/api/auth';
import {ApiError} from '@/api/client';
import {applyFormErrors} from '@/api/shared';
import AuthLayout, {AuthFooter} from '@/auth/auth-layout';
import {ROUTES} from '@/routes';
import {FormTextField} from '@/ui/form-text-field';

const schema = z.object({
  email: z.string().min(1, 'Enter email').email('Enter a valid email'),
});

type LoginFormValues = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const sendOtpMutation = useSendOtpMutation();

  const form = useForm<LoginFormValues>({
    defaultValues: {email: ''},
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await sendOtpMutation.mutateAsync({email: data.email, type: 'authentication'});
      navigate(ROUTES.VERIFY_LOGIN_OTP, {
        state: {email: data.email},
      });
    } catch (err) {
      // A 404 means no coach account for that email — show friendly copy instead of
      // the raw backend code ("user_not_found"). (Whether to avoid account
      // enumeration entirely is a separate product decision.)
      if (err instanceof ApiError && err.status === 404) {
        form.setError('root', {message: "We couldn't find a coach account for that email."});
      } else {
        applyFormErrors(err, "Verification code wasn't sent. Try again", form.setError);
      }
    }
  };

  return (
    <AuthLayout
      description="Enter your email and we'll send you a verification code."
      title="Welcome back"
    >
      <Form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
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
          isPending={sendOtpMutation.isPending}
          type="submit"
        >
          {sendOtpMutation.isPending ? (
            <>
              <Spinner
                color="current"
                size="sm"
              />
              Sending code
            </>
          ) : (
            'Continue with email'
          )}
        </Button>
      </Form>

      <AuthFooter>
        <Typography
          color="muted"
          type="body-sm"
        >
          Don&apos;t have an account?
        </Typography>
        <Link
          className="type-body text-foreground underline"
          href={ROUTES.SIGNUP}
        >
          Sign up
        </Link>
      </AuthFooter>
    </AuthLayout>
  );
}
