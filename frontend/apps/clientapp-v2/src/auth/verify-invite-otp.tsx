import {Alert, Button, InputOTP, Label, Link, REGEXP_ONLY_DIGITS, Spinner, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useEffect, useState} from 'react';
import {Controller, useForm, useWatch} from 'react-hook-form';
import {Navigate, useLocation, useNavigate, useParams} from 'react-router-dom';
import {z} from 'zod';

import {ROUTES} from '@/@config/routes';
import {useAcceptInviteMutation, useAcceptInviteVerifyMutation} from '@/api/auth';
import {setTokens} from '@/api/authStorage';
import {applyFormErrors, getApiErrorCode} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

// ── Constants ────────────────────────────────────────────────

/**
 * Backend has no rate limit on POST /accept-invite (known TODO per handoff
 * doc). We throttle Resend client-side so users don't spam the endpoint or
 * their own inbox. 30s was chosen per the handoff doc's example.
 *
 * Known limitation: the cooldown is held in component state, so it resets
 * on page refresh. Users who refresh Screen 2 can therefore resend
 * immediately. Acceptable for MVP — real rate limiting belongs on the
 * server anyway (backlog: backend to add /accept-invite throttle).
 */
const RESEND_COOLDOWN_SECONDS = 30;

// Copy is kept verbatim per the UX spec; keyed by backend error_code.
const VERIFY_ERROR_MESSAGES: Record<string, string> = {
  invalid_otp: 'Invalid code. Please check and try again.',
  otp_expired: 'This code has expired. Request a new one.',
  already_active_client:
    'This email is already an active client of another business. Ask that coach to archive you first, then try again.',
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
  const {token} = useParams<{token: string}>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as null | VerifyInviteOtpLocationState;

  const [verifyInvite, {isLoading: isVerifying}] = useAcceptInviteVerifyMutation();
  const [resendInvite, {isLoading: isResending}] = useAcceptInviteMutation();

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
    if (cooldownRemaining <= 0) return;
    const timer = setTimeout(() => setCooldownRemaining((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownRemaining]);

  // Guard: Screen 2 is only reachable via Screen 1's submit, which places the
  // email in route state. If missing or token is missing, bounce to Screen 1.
  if (!token || !state?.email) {
    return (
      <Navigate
        replace
        to={token ? `/invite/${token}` : ROUTES.LOGIN}
      />
    );
  }

  const onSubmit = async (data: VerifyInviteOtpFormValues) => {
    try {
      const result = await verifyInvite({
        email: state.email,
        invitation_token: token,
        otp: data.otp,
      }).unwrap();
      setTokens(result);
      // Post-verify, land on Training home per product decision.
      navigate(ROUTES.TRAINING, {replace: true});
    } catch (err) {
      const code = getApiErrorCode(err);

      // Invitation state changed under us (revoked / used / expired between
      // request and verify). Route back to Screen 1 — the lookup there will
      // surface the right state. Navigate replace so the OTP screen doesn't
      // linger in history.
      if (code === 'invitation_invalid' || code === 'invitation_used' || code === 'invitation_expired') {
        navigate(`/invite/${token}`, {replace: true});
        return;
      }

      const fallback = VERIFY_ERROR_MESSAGES[code ?? ''] ?? 'Verification failed. Please try again.';
      applyFormErrors(err, fallback, setError, KNOWN_FIELDS);
      reset({otp: ''});
    }
  };

  const handleResend = async () => {
    if (cooldownRemaining > 0 || isResending) return;
    try {
      await resendInvite({email: state.email, invitation_token: token}).unwrap();
      setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
      reset({otp: ''});
      toast.success('A new code is on its way.');
    } catch (err) {
      const code = getApiErrorCode(err);
      // Invitation dropped out of pending while we were entering a code.
      if (code === 'invitation_invalid' || code === 'invitation_used' || code === 'invitation_expired') {
        navigate(`/invite/${token}`, {replace: true});
        return;
      }
      // Resend failures go to toast, NOT the form root — otherwise they
      // leak into the verify form's error state and confuse the user about
      // whether their (still valid) OTP entry is the problem.
      toast.danger('Failed to resend code. Please try again.');
    }
  };

  const handleChangeEmail = () => {
    // "Wrong email? Change it" — back to Screen 1 with the email they just
    // typed still populated, focused for immediate correction. We use
    // replace so Back from Screen 1 doesn't loop us back here.
    navigate(`/invite/${token}`, {
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
        <div className="flex flex-col gap-2">
          <Label>Login code</Label>
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
          <span className="text-foreground-500">Didn&apos;t get it?</span>
          <Link
            className="text-foreground underline"
            isDisabled={resendDisabled}
            onPress={handleResend}
          >
            {resendLabel}
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-foreground-500">Wrong email?</span>
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
