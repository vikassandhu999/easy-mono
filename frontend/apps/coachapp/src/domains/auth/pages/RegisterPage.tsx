import {humanizeError} from '@easy/error-parser';
import {zodResolver} from '@hookform/resolvers/zod';
import {Alert, Avatar, Button, Card, Group, Loader, Stack, Text, TextInput} from '@mantine/core';
import {useDebouncedValue} from '@mantine/hooks';
import { IconArrowRight, IconCheck,  IconX} from '@tabler/icons-react';
import React, {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate, useSearchParams} from 'react-router';

import {
    BusinessInfo_zod,
    BusinessInfoRequest,
    PersonalInfo_zod,
    PersonalInfoRequest,
    useCheckEmailMutation,
    useCheckHandleMutation,
    useRegisterMutation,
} from '@/services/auth';
import {notifyError} from '@/utils/notification';

import AuthLayout from '../layouts/AuthLayout';

type RegistrationStep = 'personal' | 'business';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();


    const stepFromParams = searchParams.get('step') as RegistrationStep | null;
    const currentStep: RegistrationStep = stepFromParams === 'business' ? 'business' : 'personal';


    const storedEmail = searchParams.get('email') || '';
    const storedFirstName = searchParams.get('first_name') || '';
    const storedLastName = searchParams.get('last_name') || '';


    const [registerMutation, {isLoading: isRegistering}] = useRegisterMutation();
    const [checkEmail] = useCheckEmailMutation();
    const [checkHandle] = useCheckHandleMutation();


    const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
    const [emailChecking, setEmailChecking] = useState(false);


    const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
    const [handleChecking, setHandleChecking] = useState(false);

    // Personal Info Form (Step 1)
    const personalForm = useForm<PersonalInfoRequest>({
        defaultValues: {
            email: storedEmail,
            first_name: storedFirstName,
            last_name: storedLastName,
        },
        resolver: zodResolver(PersonalInfo_zod),
    });

    // Business Info Form (Step 2)
    const businessForm = useForm<BusinessInfoRequest>({
        defaultValues: {
            business_name: '',
            business_handle: '',
        },
        resolver: zodResolver(BusinessInfo_zod),
    });

    // Watch email for debounced availability check
    const watchedEmail = personalForm.watch('email');
    const [debouncedEmail] = useDebouncedValue(watchedEmail, 500);

    // Watch handle for debounced availability check
    const watchedHandle = businessForm.watch('business_handle');
    const [debouncedHandle] = useDebouncedValue(watchedHandle, 500);

    // Check email availability
    useEffect(() => {
        const checkEmailAvailability = async () => {
            if (!debouncedEmail || debouncedEmail.length < 5 || !debouncedEmail.includes('@')) {
                setEmailAvailable(null);
                return;
            }

            // Validate email format first
            const emailRegex = /^[\w.!#$%&'*+=?^`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
            if (!emailRegex.test(debouncedEmail)) {
                setEmailAvailable(null);
                return;
            }

            setEmailChecking(true);
            try {
                const result = await checkEmail({email: debouncedEmail}).unwrap();
                setEmailAvailable(result.available);
            } catch {
                setEmailAvailable(null);
            } finally {
                setEmailChecking(false);
            }
        };

        checkEmailAvailability();
    }, [debouncedEmail, checkEmail]);

    // Check handle availability
    useEffect(() => {
        const checkHandleAvailability = async () => {
            if (!debouncedHandle || debouncedHandle.length < 2) {
                setHandleAvailable(null);
                return;
            }

            // Validate handle format first
            const handleRegex = /^[a-zA-Z0-9_-]{2,32}$/;
            if (!handleRegex.test(debouncedHandle)) {
                setHandleAvailable(null);
                return;
            }

            setHandleChecking(true);
            try {
                const result = await checkHandle({handle: debouncedHandle}).unwrap();
                setHandleAvailable(result.available);
            } catch {
                setHandleAvailable(null);
            } finally {
                setHandleChecking(false);
            }
        };

        checkHandleAvailability();
    }, [debouncedHandle, checkHandle]);

    // Handle Step 1 submission
    const onPersonalSubmit = async (values: PersonalInfoRequest) => {
        // Ensure email is available before proceeding
        if (emailAvailable === false) {
            personalForm.setError('email', {message: 'This email is already associated with an account'});
            return;
        }

        // Store values in URL and move to step 2
        const params = new URLSearchParams();
        params.set('step', 'business');
        params.set('email', values.email);
        params.set('first_name', values.first_name);
        params.set('last_name', values.last_name);
        setSearchParams(params);
    };

    // Handle Step 2 submission (final registration)
    const onBusinessSubmit = async (values: BusinessInfoRequest) => {
        // Ensure handle is available before proceeding
        if (handleAvailable === false) {
            businessForm.setError('business_handle', {message: 'This handle is already taken'});
            return;
        }

        try {
            const registerData = {
                email: storedEmail,
                first_name: storedFirstName,
                last_name: storedLastName,
                business_name: values.business_name,
                business_handle: values.business_handle,
            };

            const resp = await registerMutation(registerData).unwrap();

            const params = new URLSearchParams([
                ['token_id', resp.token.token_id],
                ['email', storedEmail],
            ]);
            navigate('/register/verify?' + params.toString());
        } catch (err) {
            const errMsg = humanizeError(err);
            notifyError(errMsg);
        }
    };

    // Go back to step 1
    const handleBack = () => {
        const params = new URLSearchParams();
        params.set('step', 'personal');
        params.set('email', storedEmail);
        params.set('first_name', storedFirstName);
        params.set('last_name', storedLastName);
        setSearchParams(params);
    };

    // Render availability indicator
    const renderAvailabilityIndicator = (checking: boolean, available: boolean | null) => {
        if (checking) {
            return <Loader size={16} />;
        }
        if (available === true) {
            return <IconCheck size={16} color="green" />;
        }
        if (available === false) {
            return <IconX size={16} color="red" />;
        }
        return null;
    };

    const isPersonalFormLoading = personalForm.formState.isSubmitting;
    const isBusinessFormLoading = isRegistering || businessForm.formState.isSubmitting;

    // Step 1: Personal Information
    if (currentStep === 'personal') {
        return (
            <AuthLayout
                subtitle="Let's get started."
                title="Create Account"
            >
                <form onSubmit={personalForm.handleSubmit(onPersonalSubmit)}>
                    <Stack gap="md">
                        <TextInput
                            label={
                                <Text fw={500} size="md">
                                    First Name
                                </Text>
                            }
                            placeholder="James"
                            size="lg"
                            {...personalForm.register('first_name')}
                            error={personalForm.formState?.errors?.first_name?.message}
                        />

                        <TextInput
                            label={
                                <Text fw={500} size="md">
                                    Last Name
                                </Text>
                            }
                            placeholder="Smith"
                            size="lg"
                            {...personalForm.register('last_name')}
                            error={personalForm.formState?.errors?.last_name?.message}
                        />

                        <TextInput
                            label={
                                <Text fw={500} size="md">
                                    Email Address
                                </Text>
                            }
                            placeholder="james@example.com"
                            size="lg"
                            {...personalForm.register('email')}
                            error={
                                personalForm.formState?.errors?.email?.message ||
                                (emailAvailable === false ? 'This email is already associated with an account' : undefined)
                            }
                            rightSection={renderAvailabilityIndicator(emailChecking, emailAvailable)}
                        />

                        {emailAvailable === false && (
                            <Alert color="orange" variant="light">
                                <Text size="sm">
                                    An account already exists with this email.{' '}
                                    <Text
                                        c="blue"
                                        component="span"
                                        style={{cursor: 'pointer'}}
                                        onClick={() => navigate('/login')}
                                    >
                                        Login instead?
                                    </Text>
                                </Text>
                            </Alert>
                        )}

                        <Button
                            disabled={isPersonalFormLoading || emailAvailable !== true || emailChecking}
                            fullWidth
                            loaderProps={{type: 'bars'}}
                            loading={isPersonalFormLoading}
                            rightSection={<IconArrowRight />}
                            size="lg"
                            type="submit"
                        >
                            Continue
                        </Button>

                        <Text c="dimmed" size="md" ta="center">
                            Already have an account?{' '}
                            <Text
                                c="blue"
                                onClick={() => navigate('/login')}
                                span={true}
                                style={{cursor: 'pointer'}}
                            >
                                Login
                            </Text>
                        </Text>
                    </Stack>
                </form>
            </AuthLayout>
        );
    }

    // Step 2: Business Information
    return (
        <AuthLayout
            subtitle="Now let's set up your business"
            title="Business Details"
        >
            <form onSubmit={businessForm.handleSubmit(onBusinessSubmit)}>
                <Stack gap="md">
                    <Card withBorder radius="md" padding="md" bg="gray.0">
                        <Group justify="space-between" wrap="nowrap">
                            <Group gap="sm" wrap="nowrap">
                                <Avatar
                                    color="initials"
                                    name={`${storedFirstName} ${storedLastName}`}
                                    radius="xl"
                                    size={42}
                                />
                                <Stack gap={2}>
                                    <Text fw={600} size="sm">
                                        {storedFirstName} {storedLastName}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {storedEmail}
                                    </Text>
                                </Stack>
                            </Group>
                            <Text
                                size="xs"
                                c="blue"
                                style={{cursor: 'pointer'}}
                                onClick={handleBack}
                            >
                                Edit
                            </Text>
                        </Group>
                    </Card>
                    <TextInput
                        label={
                            <Text fw={500} size="md">
                                Business Name
                            </Text>
                        }
                        placeholder="Elite Fitness Coaching"
                        size="lg"
                        {...businessForm.register('business_name')}
                        error={businessForm.formState?.errors?.business_name?.message}
                    />

                    <TextInput
                        description={
                            <Text c="dimmed" size="sm">
                                Your unique URL: coacheasy.com/<strong>{watchedHandle || 'your-handle'}</strong>
                            </Text>
                        }
                        label={
                            <Text fw={500} size="md">
                                Business Handle
                            </Text>
                        }
                        placeholder="elite_fitness"
                        size="lg"
                        {...businessForm.register('business_handle')}
                        error={
                            businessForm.formState?.errors?.business_handle?.message ||
                            (handleAvailable === false ? 'This handle is already taken' : undefined)
                        }
                        rightSection={renderAvailabilityIndicator(handleChecking, handleAvailable)}
                    />

                    <Stack gap="xs">
                        <Button
                            disabled={isBusinessFormLoading || handleAvailable === false}
                            fullWidth
                            loaderProps={{type: 'bars'}}
                            loading={isBusinessFormLoading}
                            rightSection={<IconArrowRight />}
                            size="lg"
                            type="submit"
                        >
                            Create Account
                        </Button>


                    </Stack>

                    <Text c="dimmed" fs="italic" size="xs" ta="center">
                        By continuing, you agree to our{' '}
                        <Text
                            c="blue"
                            component="a"
                            href="/terms"
                            span={true}
                            style={{textDecoration: 'underline'}}
                        >
                            Terms of Service
                        </Text>{' '}
                        and{' '}
                        <Text
                            c="blue"
                            component="a"
                            href="/privacy"
                            span={true}
                            style={{textDecoration: 'underline'}}
                        >
                            Privacy Policy
                        </Text>
                    </Text>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default RegisterPage;
