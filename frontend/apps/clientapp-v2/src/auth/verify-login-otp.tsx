import {Button, Link, Spinner, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, useWatch} from 'react-hook-form';
import {Navigate, useLocation, useNavigate} from 'react-router-dom';
import {z} from 'zod';
import {FormOtpField} from '@/@components/form-otp-field';

import {ROUTES} from '@/@config/routes';
import {useExchangeTokenMutation} from '@/api/auth';
import {setTokens} from '@/api/authStorage';
import {useSendOtpMutation} from '@/api/generated';
import {applyFormErrors, getApiErrorCode} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

const KNOWN_FIELDS = ['otp'] as const;

const EMAIL_MASK_REGEX = /(.{2})(.*)(@.*)/;

// Keys match backend `error_code` values verbatim — do NOT swap for
// `otp_invalid` etc. (the contract's canonical code is `invalid_otp`).
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  invalid_otp: 'Invalid code, please try again.',
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
      const target = state.redirectTo && state.redirectTo.length > 0 ? state.redirectTo : ROUTES.TODAY;
      navigate(target, {replace: true});
    } catch (err) {
      const code = getApiErrorCode(err);
      const fallback = LOGIN_ERROR_MESSAGES[code ?? ''] ?? 'Verification failed. Please try again.';
      applyFormErrors(err, fallback, setError, KNOWN_FIELDS);
      reset({otp: ''});
    }
  };

  const handleResend = async () => {
    try {
      await sendOtp({otpRequest: {email: state.email, type: 'authentication'}}).unwrap();
      toast.success('A new code is on its way.');
    } catch {
      // Resend failures go to toast, not the form root — otherwise they
      // leak into the verify form's error state and confuse the user about
      // whether their (still valid) OTP entry is the problem.
      toast.danger('Failed to resend code. Please try again.');
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
        <FormOtpField
          autoFocus
          control={control}
          label="Verification code"
          name="otp"
        />
        {errors.otp ? <p className="text-xs text-danger">{errors.otp.message}</p> : null}

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
        <p className="text-sm text-muted">Didn&apos;t receive a code?</p>
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
