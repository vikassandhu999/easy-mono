import {Alert, Anchor, Button, Stack, Text, TextInput} from '@mantine/core';
import {useForm, zodResolver} from '@mantine/form';
import {ArrowRight} from '@phosphor-icons/react';
import {IconAlertCircle, IconMail} from '@tabler/icons-react';
import React, {useCallback, useState} from 'react';
import {createSearchParams, useNavigate} from 'react-router';
import {z} from 'zod';

import type {AxiosBaseQueryError} from '@/store/services/baseAPISlice';

import AuthLayout from '@/components/layouts/AuthLayout';
import {SignInRequest, useSignInMutation} from '@/store/services/auth';

const signInSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

const SignInPage: React.FC = () => {
    const [error, setError] = useState<null | string>(null);
    const navigate = useNavigate();
    const [signIn, {isLoading}] = useSignInMutation();

    const form = useForm<SignInRequest>({
        initialValues: {
            email: '',
        },
        validate: zodResolver(signInSchema),
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
        return 'Something went wrong. Please try again.';
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
            subtitle="Sign in to access your coaching program"
            title="Welcome back"
        >
            <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack gap="lg">
                    {/* Error Alert */}
                    {error && (
                        <Alert
                            color="red"
                            icon={<IconAlertCircle size={16} />}
                            title="Sign in failed"
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Form Fields */}
                    <TextInput
                        label="Email address"
                        leftSection={<IconMail size={16} />}
                        placeholder="your@email.com"
                        size="lg"
                        type="email"
                        {...form.getInputProps('email')}
                    />

                    <Button
                        fullWidth
                        loading={isLoading}
                        rightSection={<ArrowRight size={16} />}
                        size="lg"
                        type="submit"
                    >
                        Send verification code
                    </Button>

                    {/* Footer */}
                    <Stack
                        align="center"
                        gap="md"
                    >
                        <Text
                            c="dimmed"
                            size="sm"
                            ta="center"
                        >
                            New to CoachEasy?{' '}
                            <Anchor
                                fw={600}
                                onClick={() => navigate('/signup')}
                                style={{cursor: 'pointer'}}
                            >
                                Sign up
                            </Anchor>
                        </Text>

                        <Text
                            c="dimmed"
                            size="xs"
                            ta="center"
                        >
                            By continuing, you agree to our Terms of Service and Privacy Policy
                        </Text>
                    </Stack>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default SignInPage;
