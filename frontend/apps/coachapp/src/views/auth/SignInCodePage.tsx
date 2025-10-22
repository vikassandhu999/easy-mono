import {Alert, Anchor, Button, Center, PinInput, Stack, Text} from '@mantine/core';
import {useForm, zodResolver} from '@mantine/form';
import {ArrowLeft, ArrowRight} from '@phosphor-icons/react';
import {IconAlertCircle} from '@tabler/icons-react';
import React, {useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router';
import {z} from 'zod';

import type {AxiosBaseQueryError} from '@/store/services/baseAPISlice';

import AuthLayout from '@/components/layouts/AuthLayout';
import {useAuth} from '@/providers/AuthProvider';
import {SignInCodeRequest, useSignInCodeMutation} from '@/store/services/auth';

const signInCodeSchema = z.object({
    email: z.string().email(),
    passcode: z.string().length(6, 'Code must be 6 digits'),
    token_id: z.string().min(1),
});

const SignInCodePage: React.FC = () => {
    const {saveAuthToken} = useAuth();
    const [params] = useSearchParams();
    const [error, setError] = useState<null | string>(null);
    const navigate = useNavigate();
    const [signInCode, {isLoading}] = useSignInCodeMutation();

    const form = useForm<SignInCodeRequest>({
        initialValues: {
            email: params.get('email') || '',
            passcode: '',
            token_id: params.get('token_id') || '',
        },
        validate: zodResolver(signInCodeSchema),
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
        return 'Something went wrong. Please try again.';
    };

    const onSubmit = async (data: SignInCodeRequest) => {
        setError(null);

        try {
            const response = await signInCode(data).unwrap();
            await saveAuthToken(response);
            navigate('/');
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const handleResendCode = async () => {
        // TODO: Implement resend logic
        console.log('Resending code to:', params.get('email'));
    };

    return (
        <AuthLayout
            subtitle={`Enter the 6-digit code sent to ${params.get('email')}`}
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
                        fullWidth
                        loading={isLoading}
                        rightSection={<ArrowRight size={16} />}
                        size="lg"
                        type="submit"
                    >
                        Verify and sign in
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
                            onClick={() => navigate('/signin')}
                            size="sm"
                            variant="subtle"
                        >
                            Back to sign in
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default SignInCodePage;
