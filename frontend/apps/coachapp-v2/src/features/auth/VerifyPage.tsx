import {Button, FieldError, InputOTP, Label, REGEXP_ONLY_DIGITS, TextField} from '@heroui/react';
import {Link} from '@tanstack/react-router';
import {Controller} from 'react-hook-form';

import useVerifyPage from '@/features/auth/useVerifyPage';

export default function VerifyPage() {
  const {control, email, formError, isLoading, isLoginFlow, onResend, onSubmit, otpError, resendCooldown} =
    useVerifyPage();

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
        <Link
          className="text-primary underline-offset-4 hover:underline"
          state={{email}}
          to={isLoginFlow ? '/login' : '/register'}
        >
          Change email
        </Link>
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
