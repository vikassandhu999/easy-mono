import {Button, FieldError, InputOTP, Label, REGEXP_ONLY_DIGITS, TextField, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useLocation, useNavigate} from '@tanstack/react-router';
import {useEffect, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

import {
  AuthTokenResponse,
  setTokens,
  useExchangeTokenMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
} from '@/entities/auth/api/auth';
import {useLazyGetMyBusinessQuery} from '@/entities/business/api/business';
import {handleFormError} from '@/shared/api/shared';

type VerifyFormValues = {
  otp: string;
};

const schema = z.object({
  otp: z.string().min(6),
});

const COACH_ROLE = 'coach';
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = ((location.state as Record<string, unknown>)?.email as string) ?? '';
  const [verifyOtp, {isLoading: isVerifying}] = useVerifyOtpMutation();
  const [exchangeToken, {isLoading: isExchanging}] = useExchangeTokenMutation();
  const [sendOtp, {isLoading: isSending}] = useSendOtpMutation();
  const [getMyBusiness] = useLazyGetMyBusinessQuery();
  const [formError, setFormError] = useState<null | string>(null);
  const [fieldErrors, setFieldErrors] = useState<null | Record<string, string[]>>(null);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const isLoginFlow = location.pathname.includes('/login/verify');
  const isLoading = isVerifying || isExchanging || isSending;

  const {
    handleSubmit,
    control,
    formState: {errors},
  } = useForm<VerifyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {otp: ''},
  });
  const otpError = errors.otp?.message || fieldErrors?.otp?.[0];

  const checkBusinessAndRedirect = async () => {
    try {
      const result = await getMyBusiness().unwrap();
      if (result?.data?.id) {
        navigate({to: '/clients', replace: true});
        return;
      }
    } catch (error) {
      const status =
        error && typeof error === 'object' && 'status' in error ? (error as {status?: number}).status : null;
      if (status === 404) {
        navigate({to: '/onboarding', replace: true});
        return;
      }
    }
    navigate({to: '/onboarding', replace: true});
  };

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setResendCooldown((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setFieldErrors(null);
    if (!email) {
      setFormError('Missing email address. Please go back and try again.');
      return;
    }
    try {
      let tokens: AuthTokenResponse;
      if (isLoginFlow) {
        tokens = await exchangeToken({
          grant_type: 'otp',
          email,
          otp: values.otp,
          role: COACH_ROLE,
        }).unwrap();
        setTokens(tokens);
        await checkBusinessAndRedirect();
      } else {
        tokens = await verifyOtp({email, otp: values.otp}).unwrap();
        setTokens(tokens);
        navigate({to: '/onboarding', replace: true});
      }
    } catch (err) {
      const result = handleFormError(err, 'Unable to verify code. Please try again.');
      setFieldErrors(result.fieldErrors);
      setFormError(result.formError);
      if (!result.fieldErrors) {
        toast.danger(result.formError);
      }
    }
  });

  const onResend = async () => {
    setFormError(null);
    if (!email) {
      setFormError('Missing email address. Please go back and try again.');
      return;
    }
    if (resendCooldown > 0) {
      return;
    }
    try {
      await sendOtp({
        email,
        type: isLoginFlow ? 'authentication' : 'email_confirmation',
      }).unwrap();
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success('A new code is on the way.');
    } catch {
      toast.danger('Unable to resend code. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">Coachapp V2</p>
        <h1 className="text-2xl font-semibold">Enter your verification code</h1>
        <p className="text-sm text-foreground/70">We sent a 6-digit code to {email || 'your email'}.</p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={onSubmit}
      >
        <TextField isInvalid={Boolean(otpError)}>
          <Label className="text-sm font-medium text-foreground">Verification code</Label>
          <Controller
            control={control}
            name="otp"
            render={({field}) => (
              <InputOTP
                autoComplete="one-time-code"
                className="flex justify-start"
                isDisabled={isLoading}
                isInvalid={Boolean(otpError)}
                maxLength={6}
                onChange={(value) => {
                  field.onChange(value);
                  if (value.length === 6) {
                    onSubmit();
                  }
                }}
                pattern={REGEXP_ONLY_DIGITS}
                value={field.value}
              >
                <InputOTP.Group className="gap-2">
                  <InputOTP.Slot index={0} />
                  <InputOTP.Slot index={1} />
                  <InputOTP.Slot index={2} />
                  <InputOTP.Slot index={3} />
                  <InputOTP.Slot index={4} />
                  <InputOTP.Slot index={5} />
                </InputOTP.Group>
              </InputOTP>
            )}
          />
          {otpError ? <FieldError>{otpError}</FieldError> : null}
        </TextField>
        {formError ? <p className="text-sm text-danger">{formError}</p> : null}
        <Button
          className="bg-primary text-primary-foreground"
          isDisabled={isLoading}
          type="submit"
        >
          Verify code
        </Button>
      </form>
      <div className="text-sm text-foreground/70">
        Didn&apos;t get a code?{' '}
        <button
          className="text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          disabled={resendCooldown > 0}
          onClick={onResend}
          type="button"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
        </button>
      </div>
      <div className="text-sm text-foreground/70">
        Entered the wrong email?{' '}
        <button
          className="text-primary underline-offset-4 hover:underline"
          onClick={() =>
            navigate({
              to: isLoginFlow ? '/login' : '/register',
              state: {email},
            })
          }
          type="button"
        >
          Change email
        </button>
      </div>
      <p className="text-xs text-foreground/60">Having trouble? Check spam or wait a minute before resending.</p>
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
