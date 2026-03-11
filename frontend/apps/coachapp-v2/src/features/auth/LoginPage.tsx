import {Button, FieldError, Input, Label, TextField, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Link, useLocation, useNavigate} from '@tanstack/react-router';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import {OtpRequest, useSendOtpMutation} from '@/entities/auth/api/auth';
import {handleFormError} from '@/shared/api/shared';

type LoginFormValues = OtpRequest;

const schema = z.object({
  email: z.string().email(),
  type: z.literal('authentication'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledEmail = ((location.state as Record<string, unknown>)?.email as string) ?? '';
  const [sendOtp, {isLoading}] = useSendOtpMutation();
  const {
    handleSubmit,
    register,
    setValue,
    formState: {errors},
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {email: prefilledEmail, type: 'authentication'},
  });
  const [formError, setFormError] = useState<null | string>(null);
  const [fieldErrors, setFieldErrors] = useState<null | Record<string, string[]>>(null);
  const emailError = errors.email?.message || fieldErrors?.email?.[0];

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setFieldErrors(null);
    setValue('type', 'authentication');
    try {
      await sendOtp({email: values.email, type: 'authentication'}).unwrap();
      navigate({to: '/login/verify', state: {email: values.email}});
    } catch (err) {
      const result = handleFormError(err, 'Unable to send code. Please try again.');
      setFieldErrors(result.fieldErrors);
      setFormError(result.formError);
      if (!result.fieldErrors) {
        toast.danger(result.formError);
      }
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">Coachapp V2</p>
        <h1 className="text-2xl font-semibold">Sign in to your coach workspace</h1>
        <p className="text-sm text-foreground/70">We will email you a one-time code to sign in.</p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={onSubmit}
      >
        <TextField isInvalid={Boolean(emailError)}>
          <Label className="text-sm font-medium text-foreground">Email</Label>
          <Input
            placeholder="you@example.com"
            type="email"
            {...register('email')}
          />
          {emailError ? <FieldError>{emailError}</FieldError> : null}
        </TextField>
        {formError ? <p className="text-sm text-danger">{formError}</p> : null}
        <Button
          className="bg-primary text-primary-foreground"
          isDisabled={isLoading}
          type="submit"
        >
          Send sign-in code
        </Button>
      </form>
      <div className="text-sm text-foreground/70">
        New here?{' '}
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to="/register"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
