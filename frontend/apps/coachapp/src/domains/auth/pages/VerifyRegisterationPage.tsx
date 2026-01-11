import {humanizeError} from '@easy/error-parser';
import {Button, InputOTP} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {IconArrowLeft, IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate, useSearchParams} from 'react-router';

import {useAuthActions} from '@/hooks/useAuthActions';
import {useVerifyRegirationMutation, VerifyRegisteration_zod, VerifyRegisterationRequest} from '@/services/auth';
import {notifyError, notifyWarning} from '@/utils/notification';

import AuthLayout from '../layouts/AuthLayout';

const VerifyRegisterationPage: React.FC = () => {
  const navigate = useNavigate();
  const {saveAuthTokens} = useAuthActions();
  const [params] = useSearchParams();

  const [verifyPasscode, {isLoading: reqLoading}] = useVerifyRegirationMutation();

  // Get email and token_id from search params
  const emailFromParams = params.get('email') || '';
  const tokenIdFromParams = params.get('token_id') || '';

  const form = useForm<VerifyRegisterationRequest>({
    defaultValues: {
      token_id: tokenIdFromParams,
      code: '',
    },
    resolver: zodResolver(VerifyRegisteration_zod),
    mode: 'onBlur',
  });

  const onSubmit = async (values: VerifyRegisterationRequest) => {
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
              name="code"
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
            {form.formState.errors.code && (
              <p className="text-center text-sm text-red-500">{form.formState.errors.code.message}</p>
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

        {/* Hidden token_id field */}
        <input
          type="hidden"
          {...form.register('token_id')}
        />
      </form>
    </AuthLayout>
  );
};

export default VerifyRegisterationPage;
