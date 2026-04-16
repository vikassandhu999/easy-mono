import {Button, InputOTP, Label, Link, REGEXP_ONLY_DIGITS, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Controller, useForm, useWatch} from 'react-hook-form';
import {Navigate, useLocation, useNavigate} from 'react-router-dom';
import {z} from 'zod';

import {ROUTES} from '@/@config/routes';
import {useExchangeTokenMutation, useSendOtpMutation} from '@/api/auth';
import {setTokens} from '@/api/authStorage';
import {applyFormErrors, getApiErrorCode} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

const EMAIL_MASK_REGEX = /(.{2})(.*)(@.*)/;

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  otp_invalid: 'Invalid code, please try again.',
  otp_expired: 'Code expired. Tap Resend to get a new one.',
  unauthorized: 'No active client account found.',
};

interface VerifyLoginOtpLocationState {
  email: string;
  /** Path to navigate to after successful login (preserved from withAuth or session-expiry redirect) */
  redirectTo?: string;
}

const schema = z.object({
  otp: z.string().length(6, 'Enter all 6 digits'),
});

type VerifyLoginOtpFormValues = z.infer<typeof schema>;

export default function VerifyLoginOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as null | VerifyLoginOtpLocationState;

  const [exchangeToken, {isLoading}] = useExchangeTokenMutation();
  const [sendOtp, {isLoading: isResending}] = useSendOtpMutation();

  const {
    control,
    formState: {errors},
    handleSubmit,
    reset,
    setError,
  } = useForm<VerifyLoginOtpFormValues>({
    defaultValues: {otp: ''},
    resolver: zodResolver(schema),
  });

  const otpValue = useWatch({control, name: 'otp'});

  // Guard: must arrive via login with email in state
  if (!state?.email) {
    return (
      <Navigate
        replace
        to={ROUTES.LOGIN}
      />
    );
  }

  const maskedEmail = state.email.replace(EMAIL_MASK_REGEX, '$1***$3');

  const onSubmit = async (data: VerifyLoginOtpFormValues) => {
    try {
      const result = await exchangeToken({
        email: state.email,
        grant_type: 'otp',
        otp: data.otp,
        role: 'client',
      }).unwrap();
      setTokens(result);
      // Restore the path the user was trying to reach before login.
      // Falls back to Training (home) if not set or empty.
      const target = state.redirectTo && state.redirectTo.length > 0 ? state.redirectTo : ROUTES.TRAINING;
      navigate(target, {replace: true});
    } catch (err) {
      const code = getApiErrorCode(err);

      // Email not verified — redirect to verify-email flow
      if (code === 'email_not_confirmed') {
        navigate(ROUTES.VERIFY_EMAIL, {replace: true, state: {email: state.email}});
        return;
      }

      const fallback = LOGIN_ERROR_MESSAGES[code ?? ''] ?? 'Verification failed. Please try again.';
      applyFormErrors(err, fallback, setError);
      reset({otp: ''});
    }
  };

  const handleResend = async () => {
    try {
      await sendOtp({email: state.email, type: 'authentication'}).unwrap();
    } catch (err) {
      applyFormErrors(err, 'Failed to resend code. Please try again.', setError);
    }
  };

  return (
    <AuthLayout
      description={`We sent a 6-digit code to ${maskedEmail}`}
      title="Check your email"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-2">
          <Label>Verification code</Label>
          <Controller
            control={control}
            name="otp"
            render={({field}) => (
              <InputOTP
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                isInvalid={!!errors.otp || !!errors.root}
                maxLength={6}
                onChange={field.onChange}
                pattern={REGEXP_ONLY_DIGITS}
                value={field.value}
              >
                <InputOTP.Group>
                  <InputOTP.Slot index={0} />
                  <InputOTP.Slot index={1} />
                  <InputOTP.Slot index={2} />
                </InputOTP.Group>
                <InputOTP.Separator />
                <InputOTP.Group>
                  <InputOTP.Slot index={3} />
                  <InputOTP.Slot index={4} />
                  <InputOTP.Slot index={5} />
                </InputOTP.Group>
              </InputOTP>
            )}
          />
          {errors.otp ? <p className="text-xs text-danger">{errors.otp.message}</p> : null}
        </div>

        {errors.root ? <p className="text-sm text-danger">{errors.root.message}</p> : null}

        <Button
          fullWidth
          isDisabled={otpValue.length !== 6}
          isPending={isLoading}
          type="submit"
        >
          {isLoading ? (
            <>
              <Spinner
                color="current"
                size="sm"
              />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-1">
        <p className="text-sm text-foreground-500">Didn&apos;t receive a code?</p>
        <Link
          className="text-sm text-foreground underline"
          isDisabled={isResending}
          onPress={handleResend}
        >
          {isResending ? 'Sending...' : 'Resend'}
        </Link>
      </div>
    </AuthLayout>
  );
}
