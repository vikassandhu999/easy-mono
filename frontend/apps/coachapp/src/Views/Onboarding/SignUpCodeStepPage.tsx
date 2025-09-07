import React, {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate, useSearchParams} from 'react-router';
import {UsersAPI, VerifyProps, Verify_zod} from '@/Api/Users';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, PinInput, Text, Group, Anchor, Alert, Center, rem} from '@mantine/core';
import {IconArrowLeft, IconArrowRight, IconInfoCircle} from '@tabler/icons-react';
import {useAuth} from '../../Providers/AuthProvider';
import {notifications} from '@mantine/notifications';
import {AuthLayout} from '@/Components/layouts/AuthLayout';

const verifyResolver = zodResolver(Verify_zod);

const SignUpCodeStepPage: React.FC = () => {
    const {saveAuthToken} = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string>('');

    const {handleSubmit, setValue} = useForm<VerifyProps>({
        defaultValues: {
            token_id: params.get('token_id') ?? '',
            passcode: '',
        },
        resolver: verifyResolver,
    });

    const onSubmit = async (data: VerifyProps) => {
        if (code.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const res = await UsersAPI.verify({...data, passcode: code});
            if (res.isError) {
                const errorMessage = res.getError().message;
                setError(errorMessage);
                notifications.show({
                    title: 'Verification Failed',
                    message: errorMessage,
                    color: 'red',
                });
                return;
            }

            await saveAuthToken(res.getValue());
            notifications.show({
                title: 'Success!',
                message: 'Account verified successfully',
                color: 'green',
            });
            navigate('/onboarding/business');
        } catch (err) {
            const errorMessage = 'Failed to verify code. Please try again.';
            setError(errorMessage);
            notifications.show({
                title: 'Error',
                message: errorMessage,
                color: 'red',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCodeChange = (value: string) => {
        setCode(value);
        setValue('passcode', value);
        setError('');
    };

    const handleResendCode = async () => {
        // TODO: Implement resend code functionality
        notifications.show({
            title: 'Code Sent',
            message: 'A new verification code has been sent to your email',
            color: 'blue',
        });
    };

    return (
        <AuthLayout
            subtitle={`We've sent a 6-digit code to ${params.get('email') || 'your email'}`}
            title="Enter Verification Code"
        >
            <Stack
                gap="md"
                component="form"
                onSubmit={handleSubmit(onSubmit)}
            >
                <Center>
                    <PinInput
                        value={code}
                        onChange={handleCodeChange}
                        length={6}
                        size="lg"
                        radius="sm"
                        placeholder="●"
                        type="number"
                        error={!!error}
                        styles={{
                            input: {
                                fontSize: rem(18),
                                fontWeight: 600,
                                textAlign: 'center',
                                height: rem(56),
                                width: rem(48),
                                marginRight: rem(8),
                                border: error
                                    ? '2px solid var(--mantine-color-red-6)'
                                    : '2px solid var(--mantine-color-gray-3)',
                                '&:focus': {
                                    borderColor: 'var(--mantine-color-blue-6)',
                                },
                            },
                        }}
                    />
                </Center>

                {error && (
                    <Alert
                        icon={<IconInfoCircle size="1rem" />}
                        color="red"
                        variant="light"
                        radius="md"
                    >
                        {error}
                    </Alert>
                )}

                <Button
                    type="submit"
                    size="md"
                    radius="sm"
                    fullWidth
                    loading={isSubmitting}
                    disabled={code.length !== 6}
                    rightSection={<IconArrowRight size={16} />}
                    h={48}
                >
                    Continue
                </Button>

                <Stack gap="lg">
                    <Group
                        justify="left"
                        gap="xs"
                    >
                        <Text
                            size="xs"
                            c="dimmed"
                        >
                            Didn't receive the code?
                        </Text>
                        <Anchor
                            size="xs"
                            fw={500}
                            onClick={handleResendCode}
                            style={{cursor: 'pointer'}}
                        >
                            Resend code
                        </Anchor>
                    </Group>

                    <Group justify="start">
                        <Button
                            variant="subtle"
                            leftSection={<IconArrowLeft size={16} />}
                            onClick={() => navigate(-1)}
                            size="compact-sm"
                        >
                            Change Email
                        </Button>
                    </Group>
                </Stack>
            </Stack>
        </AuthLayout>
    );
};

export default SignUpCodeStepPage;
