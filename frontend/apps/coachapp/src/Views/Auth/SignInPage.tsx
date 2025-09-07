import React, {useCallback, useState} from 'react';
import {SignInRequest, AuthAPI} from '@/Api/auth';
import {createSearchParams, useNavigate} from 'react-router';
import {useAuth} from '@/Providers/AuthProvider';
import {useForm} from '@mantine/form';
import {TextInput, Button, Stack, Text, Group, Alert, Anchor} from '@mantine/core';
import {IconMail, IconAlertCircle} from '@tabler/icons-react';
import {AuthLayout} from '@/Components/layouts/AuthLayout';
import {ArrowRightIcon} from '@phosphor-icons/react';

const SignInPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
            title="Welcome back!"
            subtitle="Sign in to access your coaching program."
        >
            {/* Error Alert */}
            {error && (
                <Alert
                    icon={<IconAlertCircle size={16} />}
                    title="Sign in failed"
                    color="red"
                    radius="md"
                >
                    {error}
                </Alert>
            )}

            {/* Form */}
            <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack
                    gap="sm"
                    align="start"
                >
                    <TextInput
                        label="Email address"
                        placeholder="awesomeclient@coacheasy.com"
                        type="email"
                        size="md"
                        leftSection={<IconMail size={16} />}
                        w={'100%'}
                        {...form.getInputProps('email')}
                    />

                    <Button
                        type="submit"
                        variant="filled"
                        fullWidth
                        size="md"
                        radius="md"
                        rightSection={<ArrowRightIcon />}
                        loading={loading}
                    >
                        Send verification code
                    </Button>
                </Stack>
            </form>

            <Stack
                gap="md"
                align={'center'}
            >
                <Group
                    justify="start"
                    gap="xs"
                >
                    <Text
                        size={'sm'}
                        c="dimmed"
                    >
                        New to CoachEasy?
                    </Text>
                    <Anchor
                        size="sm"
                        fw={500}
                        onClick={() => navigate('/signup')}
                        style={{cursor: 'pointer'}}
                        td={'underline'}
                    >
                        Create an account
                    </Anchor>
                </Group>

                <Text 
                    ta="left"
                    size={'sm'}
                    c="dimmed"
                >
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </Text>
            </Stack>
        </AuthLayout>
    );
};

export default SignInPage;
