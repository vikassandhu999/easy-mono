import {Button, ErrorMessage, Form, Link, Spinner, Typography, toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm, useWatch} from 'react-hook-form';
import {Navigate, useLocation, useNavigate} from 'react-router-dom';
import {z} from 'zod';
import {FormOtpField} from '@/@components/form-fields';

import {ROUTES} from '@/@config/routes';
import {useVerifyOtpMutation} from '@/api/auth';
import {setTokens} from '@/api/authStorage';
import {useSendOtpMutation} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import {AuthFooter} from '@/auth/components/auth-footer';
import AuthLayout from '@/auth/components/auth-layout';

interface VerifySignupOtpLocationState {
  email: string;
}

const schema = z.object({
  otp: z.string().length(6, 'Enter all 6 digits'),
});

type VerifySignupOtpFormValues = z.infer<typeof schema>;

export default function VerifySignupOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as null | VerifySignupOtpLocationState;

  const [verifyOtp, {isLoading}] = useVerifyOtpMutation();
  const [sendOtp, {isLoading: isResending}] = useSendOtpMutation();

  const form = useForm<VerifySignupOtpFormValues>({
    defaultValues: {otp: ''},
    resolver: zodResolver(schema),
  });

  const otpValue = useWatch({control: form.control, name: 'otp'});

  if (!state?.email) {
    return (
      <Navigate
        replace
        to={ROUTES.SIGNUP}
      />
    );
  }

  const maskedEmail = state.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  const onSubmit = async (data: VerifySignupOtpFormValues) => {
    try {
      const result = await verifyOtp({
        email: state.email,
        otp: data.otp,
      }).unwrap();
      setTokens(result);
      navigate(ROUTES.REGISTER_BUSINESS, {replace: true});
    } catch (err) {
      // clear the field first, then set the error — reset() wipes errors, so the
      // order matters or the invalid-code message never shows.
      form.reset({otp: ''});
      applyFormErrors(err, 'Invalid code. Try again', form.setError);
    }
  };

  const handleResend = async () => {
    try {
      await sendOtp({otpRequest: {email: state.email, type: 'email_confirmation'}}).unwrap();
      toast.success('A new code is on its way');
    } catch (err) {
      applyFormErrors(err, "Code wasn't resent. Try again", form.setError);
    }
  };

  return (
    <AuthLayout
      description={`We sent a 6-digit code to ${maskedEmail}`}
      title="Confirm your email"
    >
      <Form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormOtpField
          control={form.control}
          label="Verification code"
          name="otp"
        />

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

      <AuthFooter>
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
      </AuthFooter>
    </AuthLayout>
  );
}
