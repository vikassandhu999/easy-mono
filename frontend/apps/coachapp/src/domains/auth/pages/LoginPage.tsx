import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, Text, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconArrowRight, IconMail} from '@tabler/icons-react';
import React from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';

import {SendOTPRequest, SendOTPRequest_zod, useSendOTPMutation} from '@/services/auth';
import {handleApiError} from '@/utils/error';

import AuthLayout from '../layouts/AuthLayout';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [sendOTP, {isLoading}] = useSendOTPMutation();

    const form = useForm<SendOTPRequest>({
        defaultValues: {
            email: '',
            type: 'login',
        },
        resolver: zodResolver(SendOTPRequest_zod),
    });

    const onSubmit = async (values: SendOTPRequest) => {
        try {
            const response = await sendOTP(values).unwrap();

            notifications.show({
                title: 'Success',
                message: 'Please check your email for verification code',
                color: 'green',
            });

            const params = new URLSearchParams([
                ['token_id', response.token_id],
                ['email', values.email],
            ]);
            navigate('/verify?' + params.toString());
        } catch (err) {
            handleApiError(err);
        }
    };

    return (
        <AuthLayout
            subtitle="Login to access your coaching program"
            title="Welcome back"
        >
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Stack gap="md">
                    <TextInput
                        label={
                            <Text
                                fw={500}
                                size="md"
                            >
                                Email Address
                            </Text>
                        }
                        leftSection={<IconMail size={16} />}
                        placeholder="you@example.com"
                        size="lg"
                        type="email"
                        {...form.register('email')}
                        error={form.formState?.errors?.email?.message}
                    />

                    <Button
                        fullWidth
                        loading={isLoading}
                        rightSection={<IconArrowRight size={16} />}
                        size="lg"
                        type="submit"
                    >
                        Send verification code
                    </Button>

                    <Stack
                        align="center"
                        gap="md"
                    >
                        <Text
                            c="dimmed"
                            size="md"
                            ta="center"
                        >
                            Don't have an account?{' '}
                            <Text
                                c="blue"
                                onClick={() => navigate('/register')}
                                span={true}
                                style={{cursor: 'pointer'}}
                            >
                                Sign up
                            </Text>
                        </Text>
                    </Stack>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default LoginPage;
