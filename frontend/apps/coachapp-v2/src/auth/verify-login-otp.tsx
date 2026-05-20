import {
  Button,
  ErrorMessage,
  Form,
  InputOTP,
  Label,
  Link,
  REGEXP_ONLY_DIGITS,
  Spinner,
  Typography,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Controller, useForm, useWatch} from 'react-hook-form';
import {Navigate, useLocation, useNavigate} from 'react-router-dom';
import {z} from 'zod';

import {ROUTES} from '@/@config/routes';
import {useExchangeTokenMutation, useSendOtpMutation} from '@/api/auth';
import {setTokens} from '@/api/authStorage';
import {applyFormErrors} from '@/api/shared';
import AuthLayout from '@/auth/components/auth-layout';

interface VerifyLoginOtpLocationState {
  email: string;
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

  const form = useForm<VerifyLoginOtpFormValues>({
    defaultValues: {otp: ''},
    resolver: zodResolver(schema),
  });

  const otpValue = useWatch({control: form.control, name: 'otp'});

  if (!state?.email) {
    return (
      <Navigate
        replace
        to={ROUTES.LOGIN}
      />
    );
  }

  const maskedEmail = state.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  const onSubmit = async (data: VerifyLoginOtpFormValues) => {
    try {
      const result = await exchangeToken({
        email: state.email,
        grant_type: 'otp',
        otp: data.otp,
        role: 'coach',
      }).unwrap();
      setTokens(result);
      navigate(ROUTES.DASHBOARD, {replace: true});
    } catch (err) {
      applyFormErrors(err, 'Invalid code. Try again', form.setError);
      form.reset({otp: ''});
    }
  };

  const handleResend = async () => {
    try {
      await sendOtp({email: state.email, type: 'authentication'}).unwrap();
    } catch (err) {
      applyFormErrors(err, "Code wasn't resent. Try again", form.setError);
    }
  };

  return (
    <AuthLayout
      description={`We sent a 6-digit code to ${maskedEmail}`}
      title="Check your email"
    >
      <Form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-2">
          <Label>Verification code</Label>
          <Controller
            control={form.control}
            name="otp"
            render={({field}) => (
              <InputOTP
                isInvalid={!!form.formState.errors.otp || !!form.formState.errors.root}
                maxLength={6}
                onBlur={field.onBlur}
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
          {form.formState.errors.otp && <ErrorMessage>{form.formState.errors.otp.message}</ErrorMessage>}
        </div>

        {form.formState.errors.root && <ErrorMessage>{form.formState.errors.root.message}</ErrorMessage>}

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
              Verifying
            </>
          ) : (
            'Verify'
          )}
        </Button>
      </Form>

      <div className="mt-6 flex items-center justify-center gap-1">
        <Typography
          color="muted"
          type="body-sm"
        >
          Didn&apos;t receive a code?
        </Typography>
        <Link
          className="text-sm text-foreground underline"
          isDisabled={isResending}
          onPress={handleResend}
        >
          {isResending ? 'Sending' : 'Resend'}
        </Link>
      </div>
    </AuthLayout>
  );
}
