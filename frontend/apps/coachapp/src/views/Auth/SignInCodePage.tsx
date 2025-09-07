import {AuthAPI, SignInCodeRequest} from '@/api/auth';
import AuthLayout from '@/components/layouts/AuthLayout';
import {useAuth} from '@/providers/AuthProvider';
import {Alert, Anchor, Button, Group, PinInput, Stack, Text} from '@mantine/core';
import {useForm} from '@mantine/form';
import {ArrowRightIcon} from '@phosphor-icons/react';
import {IconAlertCircle, IconArrowLeft} from '@tabler/icons-react';
import React, {useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router';

const SignInCodePage: React.FC = () => {
    const {saveAuthToken} = useAuth();
    const [params] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const form = useForm<SignInCodeRequest>({
        initialValues: {
            token_id: params.get('token_id') || '',
            email: params.get('email') || '',
            passcode: '',
        },
        validate: {
            passcode: (value) => {
                if (!value) return 'Please enter the verification code';
                if (value.length !== 6) return 'Code must be 6 digits';
                return null;
            },
        },
    });

    const onSubmit = async (data: SignInCodeRequest) => {
        setLoading(true);
        setError(null);

        try {
            const res = await AuthAPI.signInCode(data);
            if (res.isError) {
                throw new Error(res.getError().message || 'Verification failed');
            }
            await saveAuthToken(res.getValue());
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        // Implement resend logic here
        console.log('Resending code to:', params.get('email'));
    };

    return (
        <AuthLayout
            title="Email verification"
            subtitle={`We sent a 6-digit verification code to ${params.get('email')}`}
        >
            {/* Error Alert */}
            {error && (
                <Alert
                    icon={<IconAlertCircle size={16} />}
                    title="Verification failed"
                    color="red"
                    radius="md"
                >
                    {error}
                </Alert>
            )}

            {/* Form */}
            <form
                onSubmit={form.onSubmit(onSubmit)}
                style={{width: '100%'}}
            >
                <Stack
                    gap="sm"
                    align="start"
                >
                    <Stack
                        gap="xs"
                        justify={'center'}
                        align={'center'}
                    >
                        <PinInput
                            length={6}
                            type="number"
                            radius="md"
                            placeholder="○"
                            {...form.getInputProps('passcode')}
                            size={'lg'}
                            w={'max-content'}
                        />
                        {form.errors.passcode && (
                            <Text
                                size="sm"
                                c="red"
                                ta="center"
                                w={'100%'}
                            >
                                {form.errors.passcode}
                            </Text>
                        )}
                    </Stack>

                    <Button
                        type="submit"
                        variant="filled"
                        fullWidth
                        size="md"
                        radius="md"
                        loading={loading}
                        rightSection={<ArrowRightIcon size={16} />}
                    >
                        Continue
                    </Button>
                </Stack>
            </form>

            {/* Footer Actions */}
            <Stack
                gap="md"
                align={'center'}
            >
                <Group
                    justify="start"
                    gap="xs"
                >
                    <Text
                        size="sm"
                        c="dimmed"
                    >
                        Didn't receive the code?
                    </Text>
                    <Anchor
                        size="sm"
                        fw={500}
                        onClick={handleResendCode}
                        style={{cursor: 'pointer'}}
                        td={'underline'}
                    >
                        Resend code
                    </Anchor>
                </Group>

                <Group justify="start">
                    <Button
                        variant="subtle"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={() => navigate('/signin')}
                        size="compact-sm"
                    >
                        Back to sign in
                    </Button>
                </Group>
            </Stack>
        </AuthLayout>
    );
};

export default SignInCodePage;
