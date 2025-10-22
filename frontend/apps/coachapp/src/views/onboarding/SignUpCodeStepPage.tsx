import {Alert, Anchor, Button, Center, PinInput, Stack, Text} from '@mantine/core';
import {useForm, zodResolver} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import {ArrowLeft, ArrowRight} from '@phosphor-icons/react';
import {IconAlertCircle} from '@tabler/icons-react';
import React, {useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router';
import {z} from 'zod';

import type {AxiosBaseQueryError} from '@/store/services/baseAPISlice';

import AuthLayout from '@/components/layouts/AuthLayout';
import {useAuth} from '@/providers/AuthProvider';
import {useVerifySignupMutation} from '@/store/services/users';

const verifySchema = z.object({
    passcode: z.string().length(6, 'Code must be 6 digits'),
    token_id: z.string().min(1),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

const SignUpCodeStepPage: React.FC = () => {
    const {saveAuthToken} = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [error, setError] = useState<string>('');
    const [verifySignup, {isLoading}] = useVerifySignupMutation();

    const form = useForm<VerifyFormValues>({
        initialValues: {
            passcode: '',
            token_id: params.get('token_id') ?? '',
        },
        validate: zodResolver(verifySchema),
    });

    const getErrorMessage = (err: unknown) => {
        const apiError = err as AxiosBaseQueryError | undefined;
        if (apiError?.data && typeof apiError.data === 'object' && 'message' in apiError.data) {
            const message = (apiError.data as {message?: string}).message;
            if (message) return message;
        }
        if (apiError?.data && typeof apiError.data === 'string') {
            return apiError.data;
        }
        return 'Failed to verify code. Please try again.';
    };

    const onSubmit = async (data: VerifyFormValues) => {
        setError('');

        try {
            const response = await verifySignup(data).unwrap();

            await saveAuthToken(response);
            notifications.show({
                color: 'green',
                message: 'Account verified successfully',
                title: 'Success',
            });
            navigate('/onboarding/business');
        } catch (err) {
            const errorMessage = getErrorMessage(err);
            setError(errorMessage);
            notifications.show({
                color: 'red',
                message: errorMessage,
                title: 'Verification failed',
            });
        }
    };

    const handleResendCode = async () => {
        // TODO: Implement resend code functionality
        notifications.show({
            color: 'blue',
            message: 'A new verification code has been sent to your email',
            title: 'Code sent',
        });
    };

    return (
        <AuthLayout
            subtitle={`Enter the 6-digit code sent to ${params.get('email') || 'your email'}`}
            title="Verify your email"
        >
            <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack gap="lg">
                    {/* Error Alert */}
                    {error && (
                        <Alert
                            color="red"
                            icon={<IconAlertCircle size={16} />}
                            title="Verification failed"
                        >
                            {error}
                        </Alert>
                    )}

                    {/* PIN Input */}
                    <Stack gap="xs">
                        <Center>
                            <PinInput
                                length={6}
                                placeholder="○"
                                size="lg"
                                type="number"
                                {...form.getInputProps('passcode')}
                            />
                        </Center>
                        {form.errors.passcode && (
                            <Text
                                c="red"
                                size="sm"
                                ta="center"
                            >
                                {form.errors.passcode}
                            </Text>
                        )}
                    </Stack>

                    <Button
                        disabled={form.values.passcode.length !== 6}
                        fullWidth
                        loading={isLoading}
                        rightSection={<ArrowRight size={16} />}
                        size="lg"
                        type="submit"
                    >
                        Verify and continue
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
                            Didn't receive the code?{' '}
                            <Anchor
                                fw={600}
                                onClick={handleResendCode}
                                style={{cursor: 'pointer'}}
                            >
                                Resend
                            </Anchor>
                        </Text>

                        <Button
                            leftSection={<ArrowLeft size={16} />}
                            onClick={() => navigate(-1)}
                            size="sm"
                            variant="subtle"
                        >
                            Change email
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default SignUpCodeStepPage;
