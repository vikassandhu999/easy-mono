import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Center, PinInput, Stack, Text} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {ArrowLeftIcon, ArrowRightIcon} from '@phosphor-icons/react';
import React, {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate, useSearchParams} from 'react-router';

import {useAuth} from '@/providers/AuthProvider';
import AuthLayout from '@/shared/layouts/AuthLayout';
import {SignInCodeRequest, SignInCodeRequest_zod, useSignInCodeMutation} from '@/store/services/auth';
import {getApiErrorMessage} from '@/utils/error';

const SignInCodePage: React.FC = () => {
    const navigate = useNavigate();

    const {saveAuthToken} = useAuth();

    const [respError, setRespError] = useState<null | string>(null);

    const [signInCode, {isLoading}] = useSignInCodeMutation();

    const [params] = useSearchParams();

    // fetches email and token_id from search params
    const emailFromParams = params.get('email') || '';
    const tokenIdFromParams = params.get('token_id') || '';

    const {
        handleSubmit,
        formState: {errors},
        setValue,
        register,
    } = useForm<SignInCodeRequest>({
        resolver: zodResolver(SignInCodeRequest_zod),
        defaultValues: {
            email: emailFromParams,
            passcode: '',
            token_id: tokenIdFromParams,
        },
        mode: 'onBlur',
    });

    const onSubmit = async (data: SignInCodeRequest) => {
        setRespError(null);
        try {
            const response = await signInCode(data).unwrap();
            await saveAuthToken(response);
            navigate('/');
        } catch (err) {
            setRespError(getApiErrorMessage(err));
        }
    };

    useEffect(() => {
        if (respError) {
            notifications.show({
                title: 'Verification  failed',
                message: respError,
                autoClose: 2000,
                color: 'red',
            });
        }
    }, [respError]);

    return (
        <AuthLayout
            subtitle={`Enter the 6-digit code sent to ${params.get('email')}`}
            title="Verify your email"
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <Stack gap="lg">
                    <Stack gap="xs">
                        <Center>
                            <PinInput
                                aria-label="6-digit verification code"
                                error={!!errors.passcode}
                                length={6}
                                {...register('passcode')}
                                onChange={(value) => setValue('passcode', value)}
                                oneTimeCode
                                placeholder="○"
                                size="lg"
                                type="number"
                            />
                        </Center>
                        <div style={{minHeight: '24px'}}>
                            {errors.passcode && (
                                <Text
                                    c="red"
                                    size="sm"
                                    ta="center"
                                >
                                    {errors.passcode.message}
                                </Text>
                            )}
                        </div>
                    </Stack>

                    <Button
                        fullWidth
                        loading={isLoading}
                        rightSection={<ArrowRightIcon size={16} />}
                        size="lg"
                        type="submit"
                    >
                        Verify and sign in
                    </Button>

                    <Stack
                        align="center"
                        gap="md"
                    >
                        <Button
                            leftSection={<ArrowLeftIcon size={16} />}
                            onClick={() => navigate('/signin')}
                            size="sm"
                            variant="subtle"
                        >
                            Back to sign in
                        </Button>
                    </Stack>

                    {/* Hidden Email and Token_ID  */}

                    <input
                        type="hidden"
                        {...register('email')}
                    />
                    <input
                        type="hidden"
                        {...register('token_id')}
                    />
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default SignInCodePage;
