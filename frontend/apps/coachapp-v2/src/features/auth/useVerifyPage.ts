import {toast} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useLocation, useNavigate} from '@tanstack/react-router';
import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import {
  type AuthTokenResponse,
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

export default function useVerifyPage() {
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
    control,
    formState: {errors},
    handleSubmit,
  } = useForm<VerifyFormValues>({
    defaultValues: {otp: ''},
    resolver: zodResolver(schema),
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
    if (resendCooldown <= 0) return;
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
          email,
          grant_type: 'otp',
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
    if (resendCooldown > 0) return;
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

  return {
    control,
    email,
    formError,
    isLoading,
    isLoginFlow,
    onResend,
    onSubmit,
    otpError,
    resendCooldown,
  };
}
