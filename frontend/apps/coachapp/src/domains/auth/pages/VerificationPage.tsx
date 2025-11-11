import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Center, PinInput, Stack, Text} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {ArrowLeftIcon, ArrowRightIcon} from '@phosphor-icons/react';
import React from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate, useSearchParams} from 'react-router';

import {useAuth} from '@/providers/AuthProvider';
import {useVerifyOTPMutation, VerifyOTPRequest, VerifyOTPRequest_zod} from '@/services/auth';
import {handleApiError} from '@/utils/error';

import AuthLayout from '../layouts/AuthLayout';

const VerificationPage: React.FC = () => {
    const navigate = useNavigate();
    const {saveAuthToken} = useAuth();
    const [verifyOTP, {isLoading}] = useVerifyOTPMutation();
    const [params] = useSearchParams();

    // Get email and token_id from search params
    const emailFromParams = params.get('email') || '';
    const tokenIdFromParams = params.get('token_id') || '';

    const form = useForm<VerifyOTPRequest>({
        defaultValues: {
            token_id: tokenIdFromParams,
            code: '',
        },
        resolver: zodResolver(VerifyOTPRequest_zod),
        mode: 'onBlur',
    });

    const onSubmit = async (values: VerifyOTPRequest) => {
        try {
            const response = await verifyOTP(values).unwrap();

            notifications.show({
                title: 'Success',
                message: 'Email verified successfully',
                color: 'green',
            });

            // Save auth tokens - pass full VerifyOTPResponse
            await saveAuthToken(response);

            navigate('/');
        } catch (err) {
            handleApiError(err);
        }
    };

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
                        fullWidth
                        loading={isLoading}
                        rightSection={<ArrowRightIcon size={16} />}
                        size="lg"
                        type="submit"
                    >
                        Verify and sign in
                    </Button>

                    <Stack
                        align="center"
                        gap="md"
                    >
                        <Button
                            leftSection={<ArrowLeftIcon size={16} />}
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

export default VerificationPage;
