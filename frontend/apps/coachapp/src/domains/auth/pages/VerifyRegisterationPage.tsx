import {humanizeError} from '@easy/error-parser';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Center, PinInput, Stack, Text} from '@mantine/core';
import {IconArrowLeft, IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate, useSearchParams} from 'react-router';

import {useAuthActions} from '@/hooks/useAuthActions';
import {useVerifyRegirationMutation, VerifyRegisteration_zod, VerifyRegisterationRequest} from '@/services/auth';
import {notifyError,  notifyWarning} from '@/utils/notification';

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


            navigate('/');
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
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Stack gap="md">
                    <Stack gap="xs">
                        <Center>
                            <PinInput
                                aria-label="6-digit verification code"
                                error={!!form.formState.errors.code}
                                length={6}
                                {...form.register('code')}
                                onChange={(value) => form.setValue('code', value)}
                                oneTimeCode
                                placeholder="○"
                                size="lg"
                                type="number"
                            />
                        </Center>
                        <div style={{minHeight: '24px'}}>
                            {form.formState.errors.code && (
                                <Text
                                    c="red"
                                    size="sm"
                                    ta="center"
                                >
                                    {form.formState.errors.code.message}
                                </Text>
                            )}
                        </div>
                    </Stack>

                    <Button
                        disabled={isLoading}
                        fullWidth
                        loaderProps={{
                            type: 'bars',
                        }}
                        loading={isLoading}
                        rightSection={<IconArrowRight />}
                        size="lg"
                        type="submit"
                    >
                        Verify Passcode
                    </Button>

                    <Stack
                        align="center"
                        gap="md"
                    >
                        <Button
                            leftSection={<IconArrowLeft size={16} />}
                            onClick={() => navigate('/login')}
                            size="sm"
                            variant="subtle"
                        >
                            Back to sign in
                        </Button>
                    </Stack>

                    {/* Hidden token_id field */}
                    <input
                        type="hidden"
                        {...form.register('token_id')}
                    />
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default VerifyRegisterationPage;
