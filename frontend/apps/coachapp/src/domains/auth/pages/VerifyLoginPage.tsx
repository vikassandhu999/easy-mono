import {humanizeError} from '@easy/error-parser';
import {Button, InputOTP} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate, useSearchParams} from 'react-router';

import {useAuthActions} from '@/hooks/useAuthActions';
import {useVerifyLoginMutation, VerifyLogin_zod, VerifyLoginRequest} from '@/services/auth';
import {notifyError, notifyWarning} from '@/utils/notification';

import AuthLayout from '../layouts/AuthLayout';

const VerifyLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const {saveAuthTokens} = useAuthActions();
  const [params] = useSearchParams();

  const [verifyPasscode, {isLoading: reqLoading}] = useVerifyLoginMutation();

  // Get email and token_id from search params
  const emailFromParams = params.get('email') || '';
  const tokenIdFromParams = params.get('token_id') || '';

  const form = useForm<VerifyLoginRequest>({
    defaultValues: {
      token_id: tokenIdFromParams,
      code: '',
    },
    resolver: zodResolver(VerifyLogin_zod),
    mode: 'onBlur',
  });

  const onSubmit = async (values: VerifyLoginRequest) => {
    if (!tokenIdFromParams) {
      notifyWarning('URL is for passcode verfication is currupted. Please request code from login page.');
      return;
    }
    try {
      const resp = await verifyPasscode(values).unwrap();

      saveAuthTokens(resp.access_token, resp.refresh_token);

      navigate('/clients');
    } catch (err) {
      const errMsg = humanizeError(err);

      notifyError(errMsg);
    }
  };

  const isLoading = reqLoading || form.formState.isSubmitting;

  return (
    <AuthLayout
      onBack={() => {
        navigate('/login');
      }}
      subtitle={`We've sent a code to ${emailFromParams}`}
      title="Verify email"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-2">
          <div className="flex justify-center">
            <Controller
              control={form.control}
              name="code"
              render={({field, fieldState}) => (
                <InputOTP
                  aria-label="6-digit verification code"
                  className="w-full max-w-md flex"
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

          {form.formState.errors.code && (
            <p className="text-center text-sm text-red-500">{form.formState.errors.code.message}</p>
          )}
        </div>

        <Button
          className="w-full"
          isDisabled={isLoading}
          type="submit"
        >
          Verify Passcode
          <IconArrowRight size={20} />
        </Button>

        <input
          type="hidden"
          {...form.register('token_id')}
        />
      </form>
    </AuthLayout>
  );
};

export default VerifyLoginPage;
