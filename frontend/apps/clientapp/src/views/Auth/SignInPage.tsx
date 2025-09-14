import {Button, Stack, TextInput} from '@mantine/core';
import {useForm} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import {ArrowRightIcon} from '@phosphor-icons/react';
import {IconCheck, IconMail, IconX} from '@tabler/icons-react';
import {useMutation} from '@tanstack/react-query';
import React, {useCallback, useState} from 'react';
import {createSearchParams, Navigate, useNavigate} from 'react-router';

import {AuthAPI, SignInRequest} from '@/api/auth';
import {AuthLayout} from '@/components/layouts/AuthLayout';
import {useAuth} from '@/providers/AuthProvider';

const SignInPage: React.FC = () => {
    const {isAuthenticated} = useAuth();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const form = useForm<SignInRequest>({
        initialValues: {
            email: '',
        },
        validate: {
            email: (value) => {
                if (!value) return 'Email is required';
                if (!/^\S+@\S+\.\S+$/.test(value) && !/^\d{10}$/.test(value)) {
                    return 'Please enter a valid email address';
                }
                return null;
            },
        },
    });

    const singInMutation = useMutation({
        mutationFn: async (data: SignInRequest) => {
            return AuthAPI.signIn(data);
        },
        onError: (err) => {
            notifications.show({
                color: 'red',
                icon: <IconX size={16} />,
                message: err instanceof Error ? err.message : 'Something went wrong',
                title: 'Sign in failed',
            });
        },
        onMutate: () => {
            setLoading(true);
        },
        onSettled: () => {
            setLoading(false);
        },
        onSuccess: (res, data) => {
            console.log(res);

            // Check if the result has an error
            if (res.isError) {
                notifications.show({
                    color: 'red',
                    icon: <IconX size={16} />,
                    message: res.getError().message || 'Sign in failed',
                    title: 'Sign in failed',
                });
                return;
            }

            // Show success notification
            const result = res.getValue();
            notifications.show({
                color: 'green',
                icon: <IconCheck size={16} />,
                message: result.message || "We've sent a verification code to your email",
                title: 'Success!',
            });

            // From result add token_id to query params
            const params = createSearchParams([
                ['token_id', result.token_id],
                ['email', data.email],
            ]);
            navigate('/signin/code?' + params.toString());
        },
    });

    const onSubmit = useCallback(
        (values: SignInRequest) => {
            singInMutation.mutate(values);
        },
        [singInMutation],
    );

    if (isAuthenticated) {
        return <Navigate to={'/'} />;
    }

    return (
        <AuthLayout
            subtitle="Sign in to access your coaching schedules."
            title="Welcome back!"
        >
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
                        Continue
                    </Button>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default SignInPage;
