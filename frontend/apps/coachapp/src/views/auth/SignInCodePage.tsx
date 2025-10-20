import {Alert, Anchor, Button, Group, PinInput, Stack, Text} from '@mantine/core';
import {useForm} from '@mantine/form';
import {ArrowRightIcon} from '@phosphor-icons/react';
import {IconAlertCircle, IconArrowLeft} from '@tabler/icons-react';
import React, {useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router';

import type {AxiosBaseQueryError} from '@/store/services/baseAPISlice';

import AuthLayout from '@/components/layouts/AuthLayout';
import {useAuth} from '@/providers/AuthProvider';
import {SignInCodeRequest, useSignInCodeMutation} from '@/store/services/auth';

const SignInCodePage: React.FC = () => {
    const {saveAuthToken} = useAuth();
    const [params] = useSearchParams();
    const [error, setError] = useState<null | string>(null);
    const navigate = useNavigate();
    const [signInCode, {isLoading}] = useSignInCodeMutation();

    const form = useForm<SignInCodeRequest>({
        initialValues: {
            email: params.get('email') || '',
            passcode: '',
            token_id: params.get('token_id') || '',
        },
        validate: {
            passcode: (value) => {
                if (!value) return 'Please enter the verification code';
                if (value.length !== 6) return 'Code must be 6 digits';
                return null;
            },
        },
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
        return apiError?.message ?? 'Something went wrong';
    };

    const onSubmit = async (data: SignInCodeRequest) => {
        setError(null);

        try {
            const response = await signInCode(data).unwrap();
            await saveAuthToken(response);
            navigate('/');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleResendCode = async () => {
        // Implement resend logic here
        console.log('Resending code to:', params.get('email'));
    };

    return (
        <AuthLayout
            subtitle={`We sent a 6-digit verification code to ${params.get('email')}`}
            title="Email verification"
        >
            {/* Error Alert */}
            {error && (
                <Alert
                    color="red"
                    icon={<IconAlertCircle size={16} />}
                    radius="xl"
                    title="Verification failed"
                >
                    {error}
                </Alert>
            )}

            {/* Form */}
            <form
                onSubmit={form.onSubmit(onSubmit)}
                style={{width: '100%'}}
            >
                <Stack
                    align="start"
                    gap="sm"
                >
                    <Stack
                        align={'center'}
                        gap="xs"
                        justify={'center'}
                    >
                        <PinInput
                            length={6}
                            placeholder="○"
                            radius="xl"
                            type="number"
                            {...form.getInputProps('passcode')}
                            size={'lg'}
                            w={'max-content'}
                        />
                        {form.errors.passcode && (
                            <Text
                                c="red"
                                size="sm"
                                ta="center"
                                w={'100%'}
                            >
                                {form.errors.passcode}
                            </Text>
                        )}
                    </Stack>

                    <Button
                        fullWidth
                        loading={isLoading}
                        radius="xl"
                        rightSection={<ArrowRightIcon size={16} />}
                        size="md"
                        type="submit"
                        variant="filled"
                    >
                        Continue
                    </Button>
                </Stack>
            </form>

            {/* Footer Actions */}
            <Stack
                align={'center'}
                gap="md"
            >
                <Group
                    gap="xs"
                    justify="start"
                >
                    <Text
                        c="dimmed"
                        size="sm"
                    >
                        Didn't receive the code?
                    </Text>
                    <Anchor
                        fw={500}
                        onClick={handleResendCode}
                        size="sm"
                        style={{cursor: 'pointer'}}
                        td={'underline'}
                    >
                        Resend code
                    </Anchor>
                </Group>

                <Group justify="start">
                    <Button
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={() => navigate('/signin')}
                        size="compact-sm"
                        variant="subtle"
                    >
                        Back to sign in
                    </Button>
                </Group>
            </Stack>
        </AuthLayout>
    );
};

export default SignInCodePage;
