import {Alert, Anchor, Button, Group, Stack, Text, TextInput} from '@mantine/core';
import {useForm} from '@mantine/form';
import {ArrowRightIcon} from '@phosphor-icons/react';
import {IconAlertCircle, IconMail} from '@tabler/icons-react';
import React, {useCallback, useState} from 'react';
import {createSearchParams, useNavigate} from 'react-router';

import type {AxiosBaseQueryError} from '@/store/services/baseAPISlice';

import AuthLayout from '@/components/layouts/AuthLayout';
import {SignInRequest, useSignInMutation} from '@/store/services/auth';

const SignInPage: React.FC = () => {
    const [error, setError] = useState<null | string>(null);
    const navigate = useNavigate();
    const [signIn, {isLoading}] = useSignInMutation();

    const form = useForm<SignInRequest>({
        initialValues: {
            email: '',
        },
        validate: {
            email: (value) => {
                if (!value) return 'Email is required';
                if (!/^\S+@\S+\.\S+$/.test(value) && !/^\d{10}$/.test(value)) {
                    return 'Please enter a valid email address or 10-digit phone number';
                }
                return null;
            },
        },
    });

    const getErrorMessage = useCallback((err: unknown) => {
        const apiError = err as AxiosBaseQueryError | undefined;
        if (apiError?.data && typeof apiError.data === 'object' && 'message' in apiError.data) {
            const message = (apiError.data as {message?: string}).message;
            if (message) return message;
        }
        if (apiError?.data && typeof apiError.data === 'string') {
            return apiError.data;
        }
        return apiError?.message ?? 'Something went wrong';
    }, []);

    const onSubmit = useCallback(
        async (data: SignInRequest) => {
            setError(null);

            try {
                const response = await signIn(data).unwrap();
                const params = createSearchParams([
                    ['token_id', response.token_id],
                    ['email', data.email],
                ]);
                navigate('/signin/code?' + params.toString());
            } catch (err) {
                setError(getErrorMessage(err));
            }
        },
        [getErrorMessage, navigate, signIn],
    );

    return (
        <AuthLayout
            subtitle="Sign in to access your coaching program."
            title="Welcome back!"
        >
            {/* Error Alert */}
            {error && (
                <Alert
                    color="red"
                    icon={<IconAlertCircle size={16} />}
                    radius="xl"
                    title="Sign in failed"
                >
                    {error}
                </Alert>
            )}

            {/* Form */}
            <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack
                    align="start"
                    gap="sm"
                >
                    <TextInput
                        label="Email address"
                        leftSection={<IconMail size={16} />}
                        placeholder="awesomeclient@coacheasy.com"
                        size="md"
                        type="email"
                        w={'100%'}
                        {...form.getInputProps('email')}
                    />

                    <Button
                        fullWidth
                        loading={isLoading}
                        radius="xl"
                        rightSection={<ArrowRightIcon />}
                        size="md"
                        type="submit"
                        variant="filled"
                    >
                        Send verification code
                    </Button>
                </Stack>
            </form>

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
                        size={'sm'}
                    >
                        New to CoachEasy?
                    </Text>
                    <Anchor
                        fw={500}
                        onClick={() => navigate('/signup')}
                        size="sm"
                        style={{cursor: 'pointer'}}
                        td={'underline'}
                    >
                        Create an account
                    </Anchor>
                </Group>

                <Text
                    c="dimmed"
                    size={'sm'}
                    ta="left"
                >
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </Text>
            </Stack>
        </AuthLayout>
    );
};

export default SignInPage;
