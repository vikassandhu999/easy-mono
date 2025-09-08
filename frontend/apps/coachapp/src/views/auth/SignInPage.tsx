import {Alert, Anchor, Button, Group, Stack, Text, TextInput} from '@mantine/core';
import {useForm} from '@mantine/form';
import {ArrowRightIcon} from '@phosphor-icons/react';
import {IconAlertCircle, IconMail} from '@tabler/icons-react';
import React, {useCallback, useState} from 'react';
import {createSearchParams, useNavigate} from 'react-router';

import {AuthAPI, SignInRequest} from '@/api/auth';
import AuthLayout from '@/components/layouts/AuthLayout';

const SignInPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<null | string>(null);
    const navigate = useNavigate();

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

    const onSubmit = useCallback(
        async (data: SignInRequest) => {
            setLoading(true);
            setError(null);

            try {
                const res = await AuthAPI.signIn(data);
                if (res.isError) {
                    throw new Error(res.getError().message || 'Sign in failed');
                }
                const params = createSearchParams([
                    ['token_id', res.getValue().token_id],
                    ['email', data.email],
                ]);
                navigate('/signin/code?' + params.toString());
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong');
            } finally {
                setLoading(false);
            }
        },
        [navigate],
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
                    radius="md"
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
                        loading={loading}
                        radius="md"
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
