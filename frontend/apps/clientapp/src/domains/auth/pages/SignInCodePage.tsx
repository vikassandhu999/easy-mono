import {zodResolver} from '@hookform/resolvers/zod';
import {Button, PinInput, Stack, Text} from '@mantine/core';
import {IconArrowLeft, IconArrowRight} from '@tabler/icons-react';
import {useCallback, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate, useSearchParams} from 'react-router';
import {z} from 'zod';

import {useAuthActions} from '@/hooks/useAuthActions';
import {useVerifyLoginMutation} from '@/services/auth';
import {notifyError, notifySuccess} from '@/utils/notification';

import AuthLayout from '../layouts/AuthLayout';

const SignInCodeForm_zod = z.object({
    code: z.string().length(6, 'Code must be 6 digits'),
});

type SignInCodeFormValues = z.infer<typeof SignInCodeForm_zod>;

const SignInCodePage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tokenId = searchParams.get('token_id');
    const email = searchParams.get('email');

    const {saveAuthTokens} = useAuthActions();
    const [verifyLogin, {isLoading}] = useVerifyLoginMutation();
    const [resendLoading, setResendLoading] = useState(false);

    const {
        control,
        handleSubmit,
        formState: {errors},
    } = useForm<SignInCodeFormValues>({
        resolver: zodResolver(SignInCodeForm_zod),
        defaultValues: {
            code: '',
        },
    });

    const onSubmit = useCallback(
        async (values: SignInCodeFormValues) => {
            if (!tokenId) {
                notifyError('Invalid verification link. Please request a new code.');
                navigate('/signin');
                return;
            }

            try {
                const result = await verifyLogin({
                    token_id: tokenId,
                    code: values.code,
                }).unwrap();

                // Save tokens and user data
                saveAuthTokens(result.access_token, result.refresh_token, result.user, result.client || undefined);

                notifySuccess('Successfully signed in!');
                navigate('/');
            } catch (error: unknown) {
                const err = error as {data?: {message?: string}};
                notifyError(err?.data?.message || 'Invalid verification code. Please try again.');
            }
        },
        [tokenId, verifyLogin, saveAuthTokens, navigate],
    );

    const handleResendCode = useCallback(async () => {
        if (!email) {
            notifyError('Email not found. Please start over.');
            navigate('/signin');
            return;
        }

        setResendLoading(true);
        try {
            // Navigate back to sign in page with email pre-filled
            // The user can request a new code from there
            navigate(`/signin?email=${encodeURIComponent(email)}`);
            notifySuccess('Please request a new verification code.');
        } finally {
            setResendLoading(false);
        }
    }, [email, navigate]);

    const handleBack = useCallback(() => {
        navigate('/signin');
    }, [navigate]);

    // If no token_id, redirect back to sign in
    if (!tokenId) {
        return (
            <AuthLayout
                subtitle="Invalid verification link"
                title="Error"
            >
                <Stack gap="md">
                    <Text
                        c="red"
                        size="md"
                        ta="center"
                    >
                        This verification link is invalid or has expired.
                    </Text>
                    <Button
                        fullWidth
                        leftSection={<IconArrowLeft size={18} />}
                        onClick={handleBack}
                        size="lg"
                        variant="light"
                    >
                        Back to Sign In
                    </Button>
                </Stack>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            subtitle={email ? `Enter the 6-digit code sent to ${email}` : 'Enter the 6-digit verification code'}
            title="Verify Your Email"
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <Stack gap="md">
                    <Stack
                        align="center"
                        gap="xs"
                    >
                        <Text
                            fw={500}
                            size="md"
                        >
                            Verification Code
                        </Text>
                        <Controller
                            control={control}
                            name="code"
                            render={({field: {onChange, value}}) => (
                                <PinInput
                                    length={6}
                                    onChange={onChange}
                                    oneTimeCode
                                    placeholder=""
                                    size="lg"
                                    type="number"
                                    value={value}
                                />
                            )}
                        />
                        {errors.code && (
                            <Text
                                c="red"
                                size="sm"
                            >
                                {errors.code.message}
                            </Text>
                        )}
                    </Stack>

                    <Button
                        fullWidth
                        loaderProps={{type: 'bars'}}
                        loading={isLoading}
                        rightSection={<IconArrowRight size={18} />}
                        size="lg"
                        type="submit"
                    >
                        Verify & Sign In
                    </Button>

                    <Stack
                        align="center"
                        gap="sm"
                    >
                        <Text
                            c="dimmed"
                            size="sm"
                            ta="center"
                        >
                            Didn't receive the code?{' '}
                            <Text
                                c="blue"
                                component="span"
                                onClick={handleResendCode}
                                style={{cursor: resendLoading ? 'wait' : 'pointer'}}
                            >
                                {resendLoading ? 'Sending...' : 'Resend'}
                            </Text>
                        </Text>

                        <Text
                            c="dimmed"
                            size="sm"
                            ta="center"
                        >
                            <Text
                                c="blue"
                                component="span"
                                onClick={handleBack}
                                style={{cursor: 'pointer'}}
                            >
                                ← Back to Sign In
                            </Text>
                        </Text>
                    </Stack>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default SignInCodePage;
