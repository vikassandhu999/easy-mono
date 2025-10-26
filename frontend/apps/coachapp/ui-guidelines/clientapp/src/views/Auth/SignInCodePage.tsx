import {Button, PinInput, Stack, Text} from '@mantine/core';
import {useForm} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import {ArrowRightIcon} from '@phosphor-icons/react';
import {IconCheck, IconX} from '@tabler/icons-react';
import {useMutation} from '@tanstack/react-query';
import React, {useState} from 'react';
import {Navigate, useSearchParams} from 'react-router';

import {AuthAPI, SignInCodeRequest} from '@/api/auth';
import {AuthLayout} from '@/shared/layouts/AuthLayout';
import {useAuth} from '@/providers/AuthProvider';

const SignInCodePage: React.FC = () => {
    const {isAuthenticated} = useAuth();
    const [params] = useSearchParams();
    const [loading, setLoading] = useState(false);

    const form = useForm<SignInCodeRequest>({
        initialValues: {
            invitation_token: params.get('invitation_token') || undefined,
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

    const singInMutation = useMutation({
        mutationFn: async (data: SignInCodeRequest) => {
            return AuthAPI.signInCode(data);
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
        onSuccess: async (res) => {
            console.log(res);

            if (res.isError) {
                notifications.show({
                    color: 'red',
                    icon: <IconX size={16} />,
                    message: res.getError().message || 'Invalid verification code',
                    title: 'Verification failed',
                });
                return;
            }

            notifications.show({
                color: 'green',
                icon: <IconCheck size={16} />,
                message: 'You have been signed in successfully',
                title: 'Success!',
            });

            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        },
    });

    const onSubmit = (values: SignInCodeRequest) => {
        singInMutation.mutate(values);
    };

    if (isAuthenticated) {
        return <Navigate to="/" />;
    }

    return (
        <AuthLayout
            subtitle={`We sent a 6-digit verification code to ${params.get('email')}`}
            title="Email verification"
        >
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
                            radius="md"
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
                        loading={loading}
                        radius="md"
                        rightSection={<ArrowRightIcon size={16} />}
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

export default SignInCodePage;
