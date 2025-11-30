import {zodResolver} from '@hookform/resolvers/zod';
import {Alert, Button, Card, Center, Loader, PinInput, Stack, Text, Title} from '@mantine/core';
import {IconAlertCircle, IconArrowRight, IconCheck, IconMail, IconUser} from '@tabler/icons-react';
import React, {useCallback, useEffect, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate, useParams} from 'react-router';
import {z} from 'zod';

import AuthLayout from '@/domains/auth/layouts/AuthLayout';
import {useAuthActions} from '@/hooks/useAuthActions';
import {useRegisterMutation, useSendInvitationCodeMutation} from '@/services/auth';
import {useGetInvitationQuery} from '@/services/invitations';
import {logger} from '@/utils/logger';
import {notifyError, notifySuccess} from '@/utils/notification';

type FlowStep = 'error' | 'invitation_details' | 'loading' | 'verify_code';

const VerifyCodeForm_zod = z.object({
    code: z.string().length(6, 'Code must be 6 digits'),
});

type VerifyCodeFormValues = z.infer<typeof VerifyCodeForm_zod>;

const AcceptInvitationPage: React.FC = () => {
    const navigate = useNavigate();
    const {token} = useParams<{token: string}>();
    const {saveAuthTokens} = useAuthActions();

    const [step, setStep] = useState<FlowStep>('loading');
    const [tokenId, setTokenId] = useState<null | string>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Fetch invitation details
    const {
        data: invitation,
        isLoading: isLoadingInvitation,
        isError: isInvitationError,
        error: invitationError,
        isSuccess: isInvitationSuccess,
    } = useGetInvitationQuery(token || '', {
        skip: !token,
    });

    const [sendInvitationCode, {isLoading: isSendingCode}] = useSendInvitationCodeMutation();
    const [register, {isLoading: isSigningUp}] = useRegisterMutation();

    const {
        control,
        handleSubmit,
        reset,
        formState: {errors},
    } = useForm<VerifyCodeFormValues>({
        resolver: zodResolver(VerifyCodeForm_zod),
        defaultValues: {
            code: '',
        },
    });

    // Debug logging
    useEffect(() => {
        logger.debug('Invitation query state:', {
            isLoadingInvitation,
            isInvitationError,
            isInvitationSuccess,
            invitation,
            invitationError,
            token,
        });
    }, [isLoadingInvitation, isInvitationError, isInvitationSuccess, invitation, invitationError, token]);

    // Handle invitation loading state
    useEffect(() => {
        if (isLoadingInvitation) {
            setStep('loading');
            return;
        }

        // Check for success FIRST, then error
        if (isInvitationSuccess && invitation) {
            logger.info('Invitation loaded successfully:', invitation);
            setStep('invitation_details');
            return;
        }

        if (isInvitationError) {
            logger.error('Invitation error:', invitationError);
            const err = invitationError as {status?: number; data?: {error?: string; message?: string}};
            if (err?.status === 404) {
                setErrorMessage('This invitation link is invalid or has already been used.');
            } else if (err?.status === 410) {
                setErrorMessage('This invitation has expired. Please ask your coach to send a new invitation.');
            } else {
                setErrorMessage(
                    err?.data?.error ||
                        err?.data?.message ||
                        'This invitation link is invalid/expired or already been used. Please ask your coach to resend it.',
                );
            }
            setStep('error');
        }
    }, [isLoadingInvitation, isInvitationError, isInvitationSuccess, invitation, invitationError]);

    // Handle accepting invitation (send verification code)
    const handleAcceptInvitation = useCallback(async () => {
        if (!invitation?.client?.email) {
            notifyError('Invalid invitation data');
            return;
        }

        try {
            const result = await sendInvitationCode({
                email: invitation.client.email,
                invitation_token: token!,
            }).unwrap();

            setTokenId(result.token.token_id);
            setStep('verify_code');
            notifySuccess('Verification code sent to your email');
        } catch (error: unknown) {
            const err = error as {data?: {error?: string; message?: string}};
            notifyError(err?.data?.error || err?.data?.message || 'Failed to send verification code');
        }
    }, [invitation, token, sendInvitationCode]);

    // Handle verifying code and completing signup
    const onVerifyCode = useCallback(
        async (values: VerifyCodeFormValues) => {
            if (!tokenId || !token) {
                notifyError('Invalid verification state. Please try again.');
                setStep('invitation_details');
                return;
            }

            try {
                const result = await register({
                    token_id: tokenId,
                    code: values.code,
                    invitation_token: token,
                }).unwrap();

                // Save tokens and user data
                saveAuthTokens(
                    result.session.access_token,
                    result.session.refresh_token,
                    result.user,
                    result.user.client,
                );

                notifySuccess('Welcome! Your account has been set up successfully.');
                navigate('/');
            } catch (error: unknown) {
                const err = error as {data?: {error?: string; message?: string}};
                notifyError(err?.data?.error || err?.data?.message || 'Invalid verification code. Please try again.');
            }
        },
        [tokenId, token, clientSignup, saveAuthTokens, navigate],
    );

    const handleResendCode = useCallback(async () => {
        if (!invitation?.client?.email) {
            notifyError('Invalid invitation data');
            return;
        }

        try {
            const result = await sendInvitationCode({
                email: invitation.client.email,
                invitation_token: token!,
            }).unwrap();

            setTokenId(result.token.token_id);
            reset();
            notifySuccess('New verification code sent to your email');
        } catch (error: unknown) {
            const err = error as {data?: {error?: string; message?: string}};
            notifyError(err?.data?.error || err?.data?.message || 'Failed to resend verification code');
        }
    }, [invitation, token, sendInvitationCode, reset]);

    // Loading state
    if (step === 'loading') {
        return (
            <AuthLayout
                subtitle="Please wait while we load your invitation..."
                title="Loading Invitation"
            >
                <Center py="xl">
                    <Loader size="lg" />
                </Center>
            </AuthLayout>
        );
    }

    // Error state
    if (step === 'error') {
        return (
            <AuthLayout
                subtitle="We couldn't load this invitation"
                title="Invitation Error"
            >
                <Stack gap="md">
                    <Alert
                        color="red"
                        icon={<IconAlertCircle size={18} />}
                        title="Error"
                    >
                        {errorMessage}
                    </Alert>
                    <Button
                        fullWidth
                        onClick={() => navigate('/signin')}
                        size="lg"
                        variant="light"
                    >
                        Go to Sign In
                    </Button>
                </Stack>
            </AuthLayout>
        );
    }

    // Verify code step
    if (step === 'verify_code') {
        return (
            <AuthLayout
                subtitle={`Enter the 6-digit code sent to ${invitation?.client?.email}`}
                title="Verify Your Email"
            >
                <form onSubmit={handleSubmit(onVerifyCode)}>
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
                            loading={isSigningUp}
                            rightSection={<IconCheck size={18} />}
                            size="lg"
                            type="submit"
                        >
                            Complete Setup
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
                                    style={{cursor: isSendingCode ? 'wait' : 'pointer'}}
                                >
                                    {isSendingCode ? 'Sending...' : 'Resend'}
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
                                    onClick={() => setStep('invitation_details')}
                                    style={{cursor: 'pointer'}}
                                >
                                    ← Back to invitation
                                </Text>
                            </Text>
                        </Stack>
                    </Stack>
                </form>
            </AuthLayout>
        );
    }

    // Invitation details step (default)
    return (
        <AuthLayout
            subtitle="You've been invited to join a coaching program"
            title="Invitation"
        >
            <Stack gap="lg">
                <Card
                    padding="lg"
                    radius="md"
                    withBorder
                >
                    <Stack gap="md">
                        {/* Coach info */}
                        <Stack gap="xs">
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Invited by
                            </Text>
                            <Stack gap={4}>
                                <Title order={4}>{invitation?.inviting_coach?.full_name || 'Your Coach'}</Title>
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    {invitation?.business?.name}
                                </Text>
                            </Stack>
                        </Stack>

                        {/* Client info */}
                        <Stack gap="xs">
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Your details
                            </Text>
                            <Stack gap={4}>
                                <Stack
                                    align="center"
                                    gap="xs"
                                    style={{flexDirection: 'row'}}
                                >
                                    <IconUser size={16} />
                                    <Text size="md">{invitation?.client?.full_name}</Text>
                                </Stack>
                                <Stack
                                    align="center"
                                    gap="xs"
                                    style={{flexDirection: 'row'}}
                                >
                                    <IconMail size={16} />
                                    <Text size="md">{invitation?.client?.email}</Text>
                                </Stack>
                            </Stack>
                        </Stack>
                    </Stack>
                </Card>

                <Button
                    fullWidth
                    loaderProps={{type: 'bars'}}
                    loading={isSendingCode}
                    onClick={handleAcceptInvitation}
                    rightSection={<IconArrowRight size={18} />}
                    size="lg"
                >
                    Accept Invitation
                </Button>

                <Stack
                    align="center"
                    gap="md"
                >
                    <Text
                        c="dimmed"
                        size="sm"
                        ta="center"
                    >
                        Already have an account?{' '}
                        <Text
                            c="blue"
                            component="span"
                            onClick={() => navigate('/signin')}
                            style={{cursor: 'pointer'}}
                        >
                            Sign in
                        </Text>
                    </Text>
                </Stack>
            </Stack>
        </AuthLayout>
    );
};

export default AcceptInvitationPage;
