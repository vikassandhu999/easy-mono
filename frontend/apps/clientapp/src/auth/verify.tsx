import {useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, Navigate, useNavigate, useSearchParams} from 'react-router-dom';
import {useResend, useVerify, type VerifyRequest} from '../api/auth';
import {type Challenge, getChallenge, saveChallenge} from '../api/challenge';
import {errorMessage} from '../api/client';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormField} from '../ui/form-field';
import {SubmitButton} from '../ui/submit-button';
import {AuthLayout, FormError} from './auth-layout';
import {authPath, getReturnTo} from './return-to';

export function Verify() {
  const [params] = useSearchParams();
  const returnTo = getReturnTo(params.toString());

  const challenge = getChallenge();
  if (!challenge) {
    return (
      <Navigate
        to={authPath(routes.login, returnTo)}
        replace
      />
    );
  }
  return (
    <VerifyCode
      initial={challenge}
      returnTo={returnTo}
    />
  );
}

function VerifyCode({initial, returnTo}: {initial: Challenge; returnTo: string}) {
  const [challenge, setChallenge] = useState(initial);
  const [clock, setClock] = useState(Date.now());
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const verify = useVerify();
  const resend = useResend();
  const form = useForm<Pick<VerifyRequest, 'otp'>>({defaultValues: {otp: ''}});
  const remaining = Math.max(0, Math.ceil((challenge.sentAt + 30_000 - clock) / 1000));
  const busy = form.formState.isSubmitting || resend.isPending;
  const errorRef = useRef<HTMLParagraphElement>(null);
  const rootError = form.formState.errors.root;

  useEffect(() => {
    if (rootError && !busy) {
      errorRef.current?.focus();
    }
  }, [rootError, busy]);

  useEffect(() => {
    if (notice && !resend.isPending) {
      form.setFocus('otp');
    }
  }, [notice, resend.isPending, form]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const submit = form.handleSubmit(async ({otp}) => {
    setNotice('');
    try {
      const body = {email: challenge.email, otp};
      if (challenge.kind === 'invite') {
        await verify.mutateAsync({kind: 'invite', body: {...body, invitation_token: challenge.token}});
      } else {
        await verify.mutateAsync({kind: challenge.kind, body});
      }
      navigate(returnTo, {replace: true});
    } catch (error) {
      form.setError(
        'otp',
        {message: errorMessage(error, 'We could not verify the code. Check your connection and try again.')},
        {shouldFocus: true},
      );
    }
  });

  const sendAgain = async () => {
    form.clearErrors();
    setNotice('');
    try {
      await resend.mutateAsync(
        challenge.kind === 'invite'
          ? {email: challenge.email, invitation_token: challenge.token}
          : {email: challenge.email, type: 'authentication'},
      );
      const next = {...challenge, sentAt: Date.now()};
      await saveChallenge(next);
      setChallenge(next);
      setClock(Date.now());
      form.reset({otp: ''});
      setNotice('A fresh code is on its way.');
    } catch (error) {
      form.setError('root', {message: errorMessage(error, 'We could not resend the code. Please try again.')});
    }
  };

  const changeEmail =
    challenge.kind === 'invite'
      ? generatePath(routes.invitation, {token: challenge.token})
      : authPath(routes.login, returnTo);

  return (
    <AuthLayout
      title="Check your email"
      description={`Enter the 6-digit code sent to ${challenge.email}.`}
      artwork="code"
      back={busy ? undefined : {to: changeEmail, label: 'Change email'}}
    >
      <form
        noValidate
        onSubmit={submit}
        className="auth-code space-y-5"
      >
        <FormField
          control={form.control}
          name="otp"
          label="Verification code"
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
          isRequired
          isDisabled={resend.isPending}
          rules={{pattern: {value: /^\d{6}$/, message: 'Enter the 6-digit code from your email.'}}}
        />
        <FormError
          ref={errorRef}
          tabIndex={-1}
          message={rootError?.message}
        />
        <SubmitButton
          pending={busy}
          preventFocusOnPress
        >
          Verify and continue
        </SubmitButton>
      </form>
      <div className="mt-4">
        <Button
          variant="ghost"
          className="w-full"
          isDisabled={busy || remaining > 0}
          onPress={sendAgain}
        >
          {remaining > 0 ? `Resend in ${remaining}s` : 'Resend code'}
        </Button>
      </div>
      <p
        role="status"
        className="mt-3 text-sm text-muted-foreground"
      >
        {notice}
      </p>
    </AuthLayout>
  );
}
