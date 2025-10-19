import {zodResolver} from '@hookform/resolvers/zod';
import {Alert, Button, rem, Stack, Textarea, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {ArrowRightIcon} from '@phosphor-icons/react';
import {IconBuilding, IconInfoCircle} from '@tabler/icons-react';
import React, {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';

import AuthLayout from '@/components/layouts/AuthLayout';
import {useAuth} from '@/providers/AuthProvider';
import {BusinessAPI, CreateBusiness_zod, CreateBusinessProps} from '@/store/services/business';

const createBusinessResolver = zodResolver(CreateBusiness_zod);

const BusinessInfoStepPage: React.FC = () => {
    const {verifyAuth} = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        control,
        formState: {errors, isValid},
        handleSubmit,
    } = useForm<CreateBusinessProps>({
        defaultValues: {about: '', handle: '', name: ''},
        mode: 'onChange',
        resolver: createBusinessResolver,
    });

    const onSubmit = async (data: CreateBusinessProps) => {
        setIsSubmitting(true);

        try {
            const res = await BusinessAPI.createBusiness(data);
            if (res.isError) {
                const errorMessage = res.getError().message;
                notifications.show({
                    color: 'red',
                    message: errorMessage,
                    title: 'Error',
                });
                return;
            }

            await verifyAuth(false);
            notifications.show({
                color: 'green',
                message: 'Business information saved successfully',
                title: 'Success!',
            });
            navigate('/onboarding/profile');
        } catch (err) {
            notifications.show({
                color: 'red',
                message: 'Failed to save business information. Please try again.',
                title: 'Error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            subtitle="Help us set up your coaching business profile"
            title="Tell us about your business"
        >
            <Stack
                component="form"
                gap="md"
                onSubmit={handleSubmit(onSubmit)}
            >
                <Controller
                    control={control}
                    name="name"
                    render={({field}) => (
                        <TextInput
                            {...field}
                            error={errors?.name?.message}
                            label="Business Name"
                            leftSection={<IconBuilding size="1.2rem" />}
                            placeholder="e.g. Acme Fitness Centre"
                            radius="xl"
                            required
                            size="md"
                            styles={{
                                input: {
                                    height: 48,
                                },
                            }}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="handle"
                    render={({field}) => (
                        <TextInput
                            {...field}
                            description="This will be your unique identifier on the platform"
                            error={errors?.handle?.message}
                            label="Username"
                            placeholder="Choose a unique username"
                            radius="xl"
                            required
                            size="md"
                            styles={{
                                input: {
                                    height: 48,
                                },
                            }}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="about"
                    render={({field}) => (
                        <Textarea
                            {...field}
                            autosize
                            error={errors?.about?.message}
                            label="About Your Business (Optional)"
                            maxRows={6}
                            minRows={4}
                            placeholder="Tell us about your business, services, and what makes you unique..."
                            radius="xl"
                            size="md"
                            styles={{
                                input: {
                                    fontSize: rem(16),
                                },
                            }}
                        />
                    )}
                />

                {(errors.name || errors.handle || errors.about) && (
                    <Alert
                        color="red"
                        icon={<IconInfoCircle size="1rem" />}
                        radius="xl"
                        variant="light"
                    >
                        Please fix the errors above to continue
                    </Alert>
                )}

                <Button
                    disabled={!isValid}
                    fullWidth
                    loaderProps={{
                        type: 'bars',
                    }}
                    loading={isSubmitting}
                    radius="xl"
                    rightSection={<ArrowRightIcon />}
                    size="md"
                    styles={{
                        root: {
                            height: 48,
                        },
                    }}
                    type="submit"
                >
                    Continue
                </Button>
            </Stack>
        </AuthLayout>
    );
};

export default BusinessInfoStepPage;
