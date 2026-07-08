import {Alert, Button, Link, Spinner, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useEffect, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';
import {Navigate, useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {z} from 'zod';

import {FormOtpField} from '@/@components/form-fields';
import {ROUTES} from '@/@config/routes';
import {setTokens} from '@/api/authStorage';
import {useTrainerAcceptInviteMutation, useTrainerAcceptInviteVerifyMutation} from '@/api/generated';
import {applyFormErrors, getApiErrorCode} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

// ── Constants ────────────────────────────────────────────────

/**
 * Backend has no rate limit on POST /trainer-accept-invite. Throttle Resend
 * client-side so users don't spam the endpoint or their own inbox. Mirrors
 * the client accept-invite flow's cooldown.
 */
const RESEND_COOLDOWN_SECONDS = 30;

// Copy is kept verbatim per the UX spec; keyed by backend error_code.
const VERIFY_ERROR_MESSAGES: Record<string, string> = {
  invalid_otp: 'Invalid code. Please check and try again.',
  otp_expired: 'This code has expired. Request a new one.',
  already_a_coach: 'This email is already a coach on another business. Ask that owner to deactivate you first.',
};

// ── Types ────────────────────────────────────────────────────

interface VerifyInviteOtpLocationState {
  email: string;
}

const schema = z.object({
  otp: z.string().length(6, 'Enter all 6 digits'),
});

type VerifyInviteOtpFormValues = z.infer<typeof schema>;

const KNOWN_FIELDS = ['otp'] as const;

// ── Screen 2: OTP entry ──────────────────────────────────────

export default function VerifyInviteOtp() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as null | VerifyInviteOtpLocationState;

  const [verifyInvite, {isLoading: isVerifying}] = useTrainerAcceptInviteVerifyMutation();
  const [resendInvite, {isLoading: isResending}] = useTrainerAcceptInviteMutation();

  const [cooldownRemaining, setCooldownRemaining] = useState(RESEND_COOLDOWN_SECONDS);

  const {
    control,
    formState: {errors},
    handleSubmit,
    reset,
    setError,
  } = useForm<VerifyInviteOtpFormValues>({
    defaultValues: {otp: ''},
    resolver: zodResolver(schema),
  });

  const otpValue = useWatch({control, name: 'otp'});

  // Countdown effect: decrements once per second, clamps at 0.
  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldownRemaining((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownRemaining]);

  // Guard: Screen 2 is only reachable via Screen 1's submit, which places the
  // email in route state. If missing or token is missing, bounce to Screen 1.
  if (!token || !state?.email) {
    return (
      <Navigate
        replace
        to={token ? `${ROUTES.ACCEPT_INVITE}?token=${encodeURIComponent(token)}` : ROUTES.LOGIN}
      />
    );
  }

  const onSubmit = async (data: VerifyInviteOtpFormValues) => {
    try {
      const result = await verifyInvite({
        trainerAcceptInviteVerifyRequest: {
          email: state.email,
          invitation_token: token,
          otp: data.otp,
        },
      }).unwrap();
      setTokens(result);
      navigate(ROUTES.DASHBOARD, {replace: true});
    } catch (err) {
      const code = getApiErrorCode(err);

      // Invitation state changed under us (revoked / used / expired between
      // request and verify). Route back to Screen 1 — the lookup there will
      // surface the right state. Navigate replace so the OTP screen doesn't
      // linger in history.
      if (code === 'invitation_invalid' || code === 'invitation_used' || code === 'invitation_expired') {
        navigate(`${ROUTES.ACCEPT_INVITE}?token=${encodeURIComponent(token)}`, {replace: true});
        return;
      }

      const fallback = VERIFY_ERROR_MESSAGES[code ?? ''] ?? 'Verification failed. Please try again.';
      applyFormErrors(err, fallback, setError, KNOWN_FIELDS);
      reset({otp: ''});
    }
  };

  const handleResend = async () => {
    if (cooldownRemaining > 0 || isResending) {
      return;
    }
    try {
      await resendInvite({trainerAcceptInviteRequest: {email: state.email, invitation_token: token}}).unwrap();
      setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
      reset({otp: ''});
      toast.success('A new code is on its way.');
    } catch (err) {
      const code = getApiErrorCode(err);
      // Invitation dropped out of pending while entering a code.
      if (code === 'invitation_invalid' || code === 'invitation_used' || code === 'invitation_expired') {
        navigate(`${ROUTES.ACCEPT_INVITE}?token=${encodeURIComponent(token)}`, {replace: true});
        return;
      }
      // Resend failures go to toast, NOT the form root — otherwise they leak
      // into the verify form's error state and confuse the user about
      // whether their (still valid) OTP entry is the problem.
      toast.danger('Failed to resend code. Please try again.');
    }
  };

  const handleChangeEmail = () => {
    // "Wrong email? Change it" — back to Screen 1 with the email they just
    // typed still populated, focused for immediate correction. We use
    // replace so Back from Screen 1 doesn't loop us back here.
    navigate(`${ROUTES.ACCEPT_INVITE}?token=${encodeURIComponent(token)}`, {
      replace: true,
      state: {email: state.email, focusEmail: true},
    });
  };

  const resendDisabled = cooldownRemaining > 0 || isResending;
  const resendLabel = isResending
    ? 'Sending...'
    : cooldownRemaining > 0
      ? `Resend code in ${cooldownRemaining}s`
      : 'Resend code';

  return (
    <AuthLayout
      description={`Enter the code sent to ${state.email}`}
      title="Check your email"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <FormOtpField
          control={control}
          label="Login code"
          name="otp"
        />
        {errors.otp ? <p className="text-xs text-danger">{errors.otp.message}</p> : null}

        {errors.root ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{errors.root.message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <Button
          fullWidth
          isDisabled={otpValue.length !== 6}
          isPending={isVerifying}
          type="submit"
        >
          {isVerifying ? (
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

      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-muted">Didn&apos;t get it?</span>
          <Link
            className="text-foreground underline"
            isDisabled={resendDisabled}
            onPress={handleResend}
          >
            {resendLabel}
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted">Wrong email?</span>
          <Link
            className="text-foreground underline"
            onPress={handleChangeEmail}
          >
            Change it
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
