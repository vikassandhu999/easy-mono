import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, Text, TextInput} from '@mantine/core';
import {IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';

import {Register_zod, RegisterRequest, useRegisterMutation} from '@/services/auth';
import APIErrorParser from '@/utils/error_parser';
import {notifyError, notifySuccess} from '@/utils/notification';

import AuthLayout from '../layouts/AuthLayout';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [, {isLoading: reqLoading}] = useRegisterMutation();

    const form = useForm<RegisterRequest>({
        defaultValues: {
            email: '',
            first_name: '',
            business_handle: '',
            last_name: '',
        },
        resolver: zodResolver(Register_zod),
    });

    const [registerMutation] = useRegisterMutation();

    const onSubmit = async (values: RegisterRequest) => {
        try {
            const resp = await registerMutation(values).unwrap();

            notifySuccess('A verification code has been sent to your email.');

            const params = new URLSearchParams([
                ['token_id', resp.token.token_id],
                ['email', values.email],
            ]);
            navigate('/register/verify?' + params.toString());
        } catch (err) {
            const errMessage = new APIErrorParser(err).humanize();
            notifyError(errMessage);
        }
    };

    const isLoading = reqLoading || form.formState.isSubmitting;

    return (
        <AuthLayout
            subtitle="Manage your clients effortlessly with smart tools built for coaches"
            title="New Account"
        >
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Stack gap="md">
                    <TextInput
                        label={
                            <Text
                                fw={500}
                                size="md"
                            >
                                First Name
                            </Text>
                        }
                        placeholder="Jame"
                        size="lg"
                        {...form.register('first_name')}
                        error={form.formState?.errors?.first_name?.message}
                    />
                    <TextInput
                        label={
                            <Text
                                fw={500}
                                size="md"
                            >
                                Last Name
                            </Text>
                        }
                        placeholder="Smith"
                        size="lg"
                        {...form.register('last_name')}
                        error={form.formState?.errors?.last_name?.message}
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
                        placeholder="jame@ce.com"
                        size="lg"
                        {...form.register('email')}
                        error={form.formState?.errors?.email?.message}
                    />

                    <TextInput
                        label={
                            <Text
                                fw={500}
                                size="md"
                            >
                                Business Name
                            </Text>
                        }
                        placeholder="Elite Fitness Coaching"
                        size="lg"
                        {...form.register('business_name')}
                        error={form.formState?.errors?.business_name?.message}
                    />

                    <TextInput
                        description={
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Your unique username for your business profile URL (e.g., coacheasy.com/your-handle)
                            </Text>
                        }
                        label={
                            <Text
                                fw={500}
                                size="md"
                            >
                                Business Handle
                            </Text>
                        }
                        placeholder="elite_fitness"
                        size="lg"
                        {...form.register('business_handle')}
                        error={form.formState?.errors?.business_handle?.message}
                    />

                    <Button
                        disabled={isLoading}
                        fullWidth
                        loaderProps={{
                            type: 'bars',
                        }}
                        loading={isLoading}
                        rightSection={<IconArrowRight />}
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
                            fs="italic"
                            size="xs"
                            ta="center"
                        >
                            By continuing, you agree to our{' '}
                            <Text
                                c="blue"
                                component="a"
                                href="/terms"
                                span={true}
                                style={{textDecoration: 'underline'}}
                            >
                                Terms of Service
                            </Text>{' '}
                            and{' '}
                            <Text
                                c="blue"
                                component="a"
                                href="/privacy"
                                span={true}
                                style={{textDecoration: 'underline'}}
                            >
                                Privacy Policy
                            </Text>
                        </Text>

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
                                Login
                            </Text>
                        </Text>
                    </Stack>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default RegisterPage;
