import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {Link, Navigate, useNavigate, useSearchParams} from 'react-router-dom';
import {useResend, useVerify, type VerifyRequest} from '../api/auth';
import {errorMessage} from '../api/client';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {FormField} from '../ui/form-field';
import {SubmitButton} from '../ui/submit-button';
import {AuthLayout, FormError} from './auth-layout';
import {type Challenge, getChallenge, saveChallenge} from './challenge';

export function Verify() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const challenge = getChallenge();
  if (token) {
    return <VerifyLink token={token} />;
  }
  if (!challenge) {
    return (
      <Navigate
        to={routes.login}
        replace
      />
    );
  }
  return <VerifyCode initial={challenge} />;
}

function VerifyCode({initial}: {initial: Challenge}) {
  const [challenge, setChallenge] = useState(initial);
  const [clock, setClock] = useState(Date.now());
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const verify = useVerify();
  const resend = useResend();
  const form = useForm<Pick<VerifyRequest, 'otp'>>({defaultValues: {otp: ''}});
  const remaining = Math.max(0, Math.ceil((challenge.sentAt + 30_000 - clock) / 1000));
  const busy = form.formState.isSubmitting || resend.isPending;

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
      navigate(routes.home, {replace: true});
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
          : {email: challenge.email, type: challenge.kind === 'login' ? 'authentication' : 'email_confirmation'},
      );
      const next = {...challenge, sentAt: Date.now()};
      saveChallenge(next);
      setChallenge(next);
      setClock(Date.now());
      form.reset({otp: ''});
      setNotice('A fresh code is on its way.');
      form.setFocus('otp');
    } catch (error) {
      form.setError('root', {message: errorMessage(error, 'We could not resend the code. Please try again.')});
    }
  };

  const changeEmail =
    challenge.kind === 'invite' ? `${routes.invitation}?token=${encodeURIComponent(challenge.token)}` : routes.login;

  return (
    <AuthLayout
      title="Check your email"
      description={`Enter the 6-digit code sent to ${challenge.email}.`}
    >
      <form
        noValidate
        onSubmit={submit}
        className="space-y-5"
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
        <FormError message={form.formState.errors.root?.message} />
        <SubmitButton pending={busy}>Verify and continue</SubmitButton>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="link"
          isDisabled={busy || remaining > 0}
          onPress={sendAgain}
        >
          {remaining > 0 ? `Resend in ${remaining}s` : 'Resend code'}
        </Button>
        {!busy && (
          <Link
            className="text-link text-sm"
            to={changeEmail}
          >
            Change email
          </Link>
        )}
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

function VerifyLink({token}: {token: string}) {
  const mutation = useVerify();
  const navigate = useNavigate();
  const verify = async () => {
    try {
      await mutation.mutateAsync({kind: 'link', token});
      navigate(routes.home, {replace: true});
    } catch {
      // The mutation state keeps verification failures visible for recovery.
    }
  };
  return (
    <AuthLayout
      title="Confirm your email"
      description="Confirm this email address to continue to your coaching account."
    >
      <div className="space-y-5">
        <FormError
          message={
            mutation.isError
              ? errorMessage(mutation.error, 'This link could not be verified. Request a code to continue.')
              : undefined
          }
        />
        <Button
          className="w-full"
          isPending={mutation.isPending}
          onPress={verify}
        >
          Confirm email
        </Button>
        <Link
          className="text-link block text-center text-sm"
          to={routes.login}
        >
          Sign in with a code
        </Link>
      </div>
    </AuthLayout>
  );
}
