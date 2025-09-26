import {zodResolver} from '@hookform/resolvers/zod';
import {Alert, Anchor, Button, Center, Group, PinInput, rem, Stack, Text} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconArrowLeft, IconArrowRight, IconInfoCircle} from '@tabler/icons-react';
import React, {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate, useSearchParams} from 'react-router';

import {Verify_zod, VerifyProps} from '@/api/users.ts';
import AuthLayout from '@/components/layouts/AuthLayout';
import {useAuth} from '@/providers/AuthProvider';
import type {AxiosBaseQueryError} from '@/store/services/apiSlice';
import {useVerifySignupMutation} from '@/store/services/usersApi';

const verifyResolver = zodResolver(Verify_zod);

const SignUpCodeStepPage: React.FC = () => {
    const {saveAuthToken} = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [code, setCode] = useState('');
    const [error, setError] = useState<string>('');
    const [verifySignup, {isLoading}] = useVerifySignupMutation();

    const {
        handleSubmit,
        setValue,
        formState: {isSubmitting},
    } = useForm<VerifyProps>({
        defaultValues: {
            passcode: '',
            token_id: params.get('token_id') ?? '',
        },
        resolver: verifyResolver,
    });

    const getErrorMessage = (err: unknown) => {
        const apiError = err as AxiosBaseQueryError | undefined;
        if (apiError?.data && typeof apiError.data === 'object' && 'message' in apiError.data) {
            const message = (apiError.data as {message?: string}).message;
            if (message) return message;
        }
        if (apiError?.data && typeof apiError.data === 'string') {
            return apiError.data;
        }
        return apiError?.message ?? 'Failed to verify code. Please try again.';
    };

    const onSubmit = async (data: VerifyProps) => {
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setError('');

        try {
            const response = await verifySignup({...data, passcode: code}).unwrap();

            await saveAuthToken(response);
            notifications.show({
                color: 'green',
                message: 'Account verified successfully',
                title: 'Success!',
            });
            navigate('/onboarding/business');
        } catch (err) {
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
            notifications.show({
                color: 'red',
                message: errorMessage,
                title: 'Error',
            });
        }
    };

    const handleCodeChange = (value: string) => {
        setCode(value);
        setValue('passcode', value);
        setError('');
    };

    const handleResendCode = async () => {
        // TODO: Implement resend code functionality
        notifications.show({
            color: 'blue',
            message: 'A new verification code has been sent to your email',
            title: 'Code Sent',
        });
    };

    return (
        <AuthLayout
            subtitle={`We've sent a 6-digit code to ${params.get('email') || 'your email'}`}
            title="Enter Verification Code"
        >
            <Stack
                component="form"
                gap="md"
                onSubmit={handleSubmit(onSubmit)}
            >
                <Center>
                    <PinInput
                        error={!!error}
                        length={6}
                        onChange={handleCodeChange}
                        placeholder="●"
                        radius="sm"
                        size="lg"
                        styles={{
                            input: {
                                '&:focus': {
                                    borderColor: 'var(--mantine-color-blue-6)',
                                },
                                border: error
                                    ? '2px solid var(--mantine-color-red-6)'
                                    : '2px solid var(--mantine-color-gray-3)',
                                fontSize: rem(18),
                                fontWeight: 600,
                                height: rem(56),
                                marginRight: rem(8),
                                textAlign: 'center',
                                width: rem(48),
                            },
                        }}
                        type="number"
                        value={code}
                    />
                </Center>

                {error && (
                    <Alert
                        color="red"
                        icon={<IconInfoCircle size="1rem" />}
                        radius="md"
                        variant="light"
                    >
                        {error}
                    </Alert>
                )}

                <Button
                    disabled={code.length !== 6}
                    fullWidth
                    h={48}
                    loading={isSubmitting || isLoading}
                    radius="sm"
                    rightSection={<IconArrowRight size={16} />}
                    size="md"
                    type="submit"
                >
                    Continue
                </Button>

                <Stack gap="lg">
                    <Group
                        gap="xs"
                        justify="left"
                    >
                        <Text
                            c="dimmed"
                            size="xs"
                        >
                            Didn't receive the code?
                        </Text>
                        <Anchor
                            fw={500}
                            onClick={handleResendCode}
                            size="xs"
                            style={{cursor: 'pointer'}}
                        >
                            Resend code
                        </Anchor>
                    </Group>

                    <Group justify="start">
                        <Button
                            leftSection={<IconArrowLeft size={16} />}
                            onClick={() => navigate(-1)}
                            size="compact-sm"
                            variant="subtle"
                        >
                            Change Email
                        </Button>
                    </Group>
                </Stack>
            </Stack>
        </AuthLayout>
    );
};

export default SignUpCodeStepPage;
