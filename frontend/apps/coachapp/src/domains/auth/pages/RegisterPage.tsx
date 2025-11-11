import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Divider, Stack, Text, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconArrowRight, IconMail} from '@tabler/icons-react';
import React from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';

import {RegisterRequest, RegisterRequest_zod, useRegisterMutation} from '@/services/auth';
import {useSignUpMutation} from '@/services/users';
import {handleApiError} from '@/utils/error';

import AuthLayout from '../layouts/AuthLayout';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [, {isLoading}] = useSignUpMutation();

    const form = useForm<RegisterRequest>({
        defaultValues: {
            email: '',
            full_name: '',
        },
        resolver: zodResolver(RegisterRequest_zod),
    });

    const [registerMutation] = useRegisterMutation();

    const onSubmit = async (values: RegisterRequest) => {
        try {
            const resp = await registerMutation({
                email: values.email,
                full_name: values.full_name,
            }).unwrap();

            notifications.show({
                title: 'Success',
                message: 'Please check your email for verification code',
                color: 'green',
            });

            // Navigate to verify OTP page
            const params = new URLSearchParams([
                ['token_id', resp.token_id],
                ['email', values.email],
            ]);
            navigate('/verify?' + params.toString());
        } catch (err) {
            handleApiError(err);
        }
    };

    return (
        <AuthLayout
            subtitle="Manage your clients effortlessly with smart tools built for coaches"
            title="Let's Get Started"
        >
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Stack gap="md">
                    <TextInput
                        label={
                            <Text
                                fw={500}
                                size="md"
                            >
                                Full Name
                            </Text>
                        }
                        placeholder="Awesome Coach"
                        size="lg"
                        {...form.register('full_name')}
                        error={form.formState?.errors?.full_name?.message}
                    />
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
                        Continue
                    </Button>

                    <Stack
                        align="left"
                        gap="md"
                    >
                        <Text
                            c="dimmed"
                            size="xs"
                            ta="left"
                        >
                            By signing up, you agree to our Terms of Service and Privacy Policy
                        </Text>
                        <Divider />

                        <Text
                            c="dimmed"
                            size="md"
                            ta="center"
                        >
                            Already have an account?{' '}
                            <Text
                                c="blue"
                                onClick={() => navigate('/login')}
                                span={true}
                                style={{cursor: 'pointer'}}
                            >
                                Sign in
                            </Text>
                        </Text>
                    </Stack>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default RegisterPage;
