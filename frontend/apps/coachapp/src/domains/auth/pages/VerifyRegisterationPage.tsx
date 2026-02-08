import {humanizeError} from '@easy/error-parser';
import {Button, InputOTP} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {IconArrowLeft, IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate, useSearchParams} from 'react-router';

import {useAuthActions} from '@/hooks/useAuthActions';
import {type TokenOtpRequest, useExchangeTokenMutation, VerifyOtp_zod} from '@/services/auth';
import {notifyError} from '@/utils/notification';

import AuthLayout from '../layouts/AuthLayout';

const VerifyRegisterationPage: React.FC = () => {
  const navigate = useNavigate();
  const {saveAuthTokens} = useAuthActions();
  const [params] = useSearchParams();

  const [exchangeToken, {isLoading: reqLoading}] = useExchangeTokenMutation();

  // Get email and token_id from search params
  const emailFromParams = params.get('email') || '';
  const form = useForm<TokenOtpRequest>({
    defaultValues: {
      email: emailFromParams,
      grant_type: 'otp',
      otp: '',
      role: 'coach',
    },
    resolver: zodResolver(VerifyOtp_zod),
    mode: 'onBlur',
  });

  const onSubmit = async (values: TokenOtpRequest) => {
    try {
      const resp = await exchangeToken({
        ...values,
        email: emailFromParams,
      }).unwrap();
      saveAuthTokens(resp.access_token, resp.refresh_token);

      navigate('/onboarding');
    } catch (err) {
      const errMsg = humanizeError(err);
      notifyError(errMsg);
    }
  };

  const isLoading = reqLoading || form.formState.isSubmitting;

  return (
    <AuthLayout
      subtitle={`Enter the 6-digit code sent to ${emailFromParams}`}
      title="Verify your email"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-2">
          <div className="flex justify-center">
            <Controller
              control={form.control}
              name="otp"
              render={({field, fieldState}) => (
                <InputOTP
                  aria-label="6-digit verification code"
                  className="w-full max-w-md"
                  isInvalid={fieldState.invalid}
                  maxLength={6}
                  onChange={field.onChange}
                  value={field.value}
                >
                  <InputOTP.Group className="gap-2">
                    {Array.from({length: 6}).map((_, index) => (
                      <InputOTP.Slot
                        index={index}
                        key={index}
                      />
                    ))}
                  </InputOTP.Group>
                </InputOTP>
              )}
            />
          </div>
          <div className="min-h-6">
            {form.formState.errors.otp && (
              <p className="text-center text-sm text-red-500">{form.formState.errors.otp.message}</p>
            )}
          </div>
        </div>

        <Button
          className="w-full"
          isDisabled={isLoading}
          type="submit"
        >
          Verify Passcode
          <IconArrowRight size={20} />
        </Button>

        <div className="flex items-center justify-center gap-4">
          <Button
            onPress={() => navigate('/login')}
            size="sm"
            variant="secondary"
          >
            <IconArrowLeft size={16} />
            Back to sign in
          </Button>
        </div>

        <input
          type="hidden"
          {...form.register('email')}
        />
        <input
          type="hidden"
          {...form.register('grant_type')}
        />
        <input
          type="hidden"
          {...form.register('role')}
        />
      </form>
    </AuthLayout>
  );
};

export default VerifyRegisterationPage;
