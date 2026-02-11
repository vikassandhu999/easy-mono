import {Button, FieldError, Input, Label, TextField, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useLocation, useNavigate} from 'react-router';
import {z} from 'zod';

import {SignupRequest, useSignupMutation} from '@/api/auth';
import {handleFormError} from '@/api/shared';

type RegisterFormValues = SignupRequest;

const schema = z.object({
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledEmail = (location.state as null | {email?: string})?.email ?? '';
  const [signup, {isLoading}] = useSignupMutation();
  const {
    handleSubmit,
    register,
    formState: {errors},
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {email: prefilledEmail},
  });
  const [formError, setFormError] = useState<null | string>(null);
  const [fieldErrors, setFieldErrors] = useState<null | Record<string, string[]>>(null);
  const emailError = errors.email?.message || fieldErrors?.email?.[0];
  const firstNameError = errors.first_name?.message || fieldErrors?.first_name?.[0];
  const lastNameError = errors.last_name?.message || fieldErrors?.last_name?.[0];

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setFieldErrors(null);
    try {
      await signup(values).unwrap();
      navigate('/register/verify', {state: {email: values.email}});
    } catch (err) {
      const result = handleFormError(err, 'Unable to register. Please try again.');
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
        <h1 className="text-2xl font-semibold">Create your coach account</h1>
        <p className="text-sm text-foreground/70">We will email you a one-time code to verify your address.</p>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField isInvalid={Boolean(firstNameError)}>
            <Label className="text-sm font-medium text-foreground">First name</Label>
            <Input
              placeholder="First name"
              {...register('first_name')}
            />
            {firstNameError ? <FieldError>{firstNameError}</FieldError> : null}
          </TextField>
          <TextField isInvalid={Boolean(lastNameError)}>
            <Label className="text-sm font-medium text-foreground">Last name</Label>
            <Input
              placeholder="Last name"
              {...register('last_name')}
            />
            {lastNameError ? <FieldError>{lastNameError}</FieldError> : null}
          </TextField>
        </div>
        {formError ? <p className="text-sm text-danger">{formError}</p> : null}
        <Button
          className="bg-primary text-primary-foreground"
          isDisabled={isLoading}
          type="submit"
        >
          Send verification code
        </Button>
      </form>
      <div className="text-sm text-foreground/70">
        Already have an account?{' '}
        <button
          className="text-primary underline-offset-4 hover:underline"
          onClick={() => navigate('/login')}
          type="button"
        >
          Sign in
        </button>
      </div>
      <p className="text-xs text-foreground/60">
        By continuing, you agree to our{' '}
        <a
          className="text-primary underline-offset-4 hover:underline"
          href="/terms"
        >
          Terms
        </a>{' '}
        and{' '}
        <a
          className="text-primary underline-offset-4 hover:underline"
          href="/privacy"
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
