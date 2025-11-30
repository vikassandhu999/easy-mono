import {zodResolver} from '@hookform/resolvers/zod';
import {Alert, Button, Loader, Stack, Text, TextInput} from '@mantine/core';
import {IconAlertCircle, IconArrowRight, IconMail, IconUser} from '@tabler/icons-react';
import React, {useCallback} from 'react';
import {useForm} from 'react-hook-form';
import {Navigate, useNavigate, useParams} from 'react-router';
import {z} from 'zod';

import AuthLayout from '@/domains/auth/layouts/AuthLayout';
import {useAuth} from '@/hooks/useAuthActions';
import {useSendPublicJoinCodeMutation} from '@/services/auth';
import {useGetPublicJoinDetailsQuery} from '@/services/publicJoin';
import {notifyError, notifySuccess} from '@/utils/notification';

const PublicJoinForm_zod = z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(1, 'Name is required'),
});

type PublicJoinFormValues = z.infer<typeof PublicJoinForm_zod>;

const PublicJoinPage: React.FC = () => {
    const navigate = useNavigate();
    const {code} = useParams<{code: string}>();
    const {isAuthenticated} = useAuth();
    const [sendPublicJoinCode, {isLoading: isSending}] = useSendPublicJoinCodeMutation();

    // Fetch public join details
    const {
        data: joinDetails,
        isLoading: isLoadingDetails,
        error: detailsError,
    } = useGetPublicJoinDetailsQuery(code || '', {
        skip: !code,
    });

    const {
        register,
        handleSubmit,
        formState: {errors},
    } = useForm<PublicJoinFormValues>({
        resolver: zodResolver(PublicJoinForm_zod),
        defaultValues: {
            email: '',
            name: '',
        },
    });

    const onSubmit = useCallback(
        async (values: PublicJoinFormValues) => {
            if (!code) {
                notifyError('Invalid join link');
                return;
            }

            try {
                const result = await sendPublicJoinCode({
                    email: values.email,
                    public_join_code: code,
                }).unwrap();

                notifySuccess('Verification code sent to your email');

                // Navigate to code verification page with public join context
                const params = new URLSearchParams({
                    token_id: result.token.token_id,
                    email: values.email,
                    public_join_code: code,
                    name: values.name,
                });
                navigate(`/signin/code?${params.toString()}`);
            } catch (error: unknown) {
                const errorMessage =
                    error && typeof error === 'object' && 'data' in error
                        ? (error.data as {error?: string})?.error || 'Failed to send verification code'
                        : 'Failed to send verification code';
                notifyError(errorMessage);
            }
        },
        [code, sendPublicJoinCode, navigate],
    );

    // Redirect if already authenticated
    if (isAuthenticated) {
        return <Navigate to="/" />;
    }

    // Loading state
    if (isLoadingDetails) {
        return (
            <AuthLayout
                loading
                title="Loading..."
            >
                <Stack
                    align="center"
                    gap="md"
                >
                    <Loader size="lg" />
                    <Text c="dimmed">Loading coach details...</Text>
                </Stack>
            </AuthLayout>
        );
    }

    // Error state
    if (detailsError || !joinDetails) {
        const errorMessage =
            detailsError && 'data' in detailsError
                ? (detailsError.data as {error?: string})?.error || 'Invalid join link'
                : 'Invalid or expired join link';

        return (
            <AuthLayout
                subtitle="We couldn't find what you're looking for"
                title="Link Not Found"
            >
                <Stack gap="md">
                    <Alert
                        color="red"
                        icon={<IconAlertCircle size={18} />}
                        title="Invalid Link"
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

    const businessName = joinDetails.business?.name || 'Your Coach';
    const tagline = joinDetails.tagline;

    return (
        <AuthLayout
            subtitle={tagline || `Join ${businessName} and start your fitness journey`}
            title={`Join ${businessName}`}
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <Stack gap="md">
                    <TextInput
                        error={errors.name?.message}
                        label={
                            <Text
                                fw={500}
                                size="md"
                            >
                                Your name
                            </Text>
                        }
                        leftSection={<IconUser size={18} />}
                        placeholder="Enter your full name"
                        size="lg"
                        {...register('name')}
                    />

                    <TextInput
                        error={errors.email?.message}
                        label={
                            <Text
                                fw={500}
                                size="md"
                            >
                                Email address
                            </Text>
                        }
                        leftSection={<IconMail size={18} />}
                        placeholder="Enter your email"
                        size="lg"
                        type="email"
                        {...register('email')}
                    />

                    {joinDetails.public_join_approval_required && (
                        <Alert
                            color="blue"
                            icon={<IconAlertCircle size={16} />}
                            variant="light"
                        >
                            <Text size="sm">
                                Your request will be reviewed by {businessName} before you can access the platform.
                            </Text>
                        </Alert>
                    )}

                    <Button
                        fullWidth
                        loaderProps={{type: 'bars'}}
                        loading={isSending}
                        rightSection={<IconArrowRight size={18} />}
                        size="lg"
                        type="submit"
                    >
                        Continue
                    </Button>

                    <Stack
                        align="center"
                        gap="md"
                    >
                        <Text
                            c="dimmed"
                            size="md"
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
            </form>
        </AuthLayout>
    );
};

export default PublicJoinPage;
