import {zodResolver} from '@hookform/resolvers/zod';
import {Anchor, Button, Stack, Text, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconArrowRight, IconMail} from '@tabler/icons-react';
import React, {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {createSearchParams, useNavigate} from 'react-router';

import AuthLayout from '@/shared/layouts/AuthLayout';
import {SignInRequest, SignInRequest_zod, useSignInMutation} from '@/services/auth';
import {getApiErrorMessage} from '@/utils/error';

const SignInPage: React.FC = () => {
    const navigate = useNavigate();

    const [respError, setRespError] = useState<null | string>(null);

    const [signIn, {isLoading}] = useSignInMutation();

    const {
        register,
        formState: {errors},
        handleSubmit,
    } = useForm<SignInRequest>({
        defaultValues: {
            role: 'coach',
        },
        resolver: zodResolver(SignInRequest_zod),
    });

    const onSubmit = async (data: SignInRequest) => {
        setRespError(null);

        try {
            const response = await signIn(data).unwrap();
            const params = createSearchParams([
                ['token_id', response.token_id],
                ['email', data.email],
            ]);
            navigate('/signin/code?' + params.toString());
        } catch (err) {
            setRespError(getApiErrorMessage(err));
        }
    };

    useEffect(() => {
        if (respError) {
            notifications.show({
                title: 'Something Went Wrong!',
                message: `${respError}. Also check you internet as well`,
                color: 'red',
                autoClose: 2000,
            });
        }
    }, [respError]);

    return (
        <AuthLayout
            subtitle="Sign in to access your coaching program"
            title="Welcome back"
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <Stack gap="lg">
                    {/* Form Fields */}
                    <TextInput
                        label="Email address"
                        leftSection={<IconMail size={16} />}
                        placeholder="your@email.com"
                        size="lg"
                        type="email"
                        {...register('email')}
                        error={!!errors?.email?.message}
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
