import React, {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';
import {BusinessAPI, CreateBusinessProps, CreateBusiness_zod} from '@/api/business.ts';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, TextInput, Textarea, Alert, rem} from '@mantine/core';
import {IconInfoCircle, IconBuilding} from '@tabler/icons-react';
import {useAuth} from '@/providers/AuthProvider';
import {notifications} from '@mantine/notifications';
import AuthLayout from '@/components/layouts/AuthLayout';
import {ArrowRightIcon} from '@phosphor-icons/react';

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
        defaultValues: {handle: '', name: '', about: ''},
        resolver: createBusinessResolver,
        mode: 'onChange',
    });

    const onSubmit = async (data: CreateBusinessProps) => {
        setIsSubmitting(true);

        try {
            const res = await BusinessAPI.createBusiness(data);
            if (res.isError) {
                const errorMessage = res.getError().message;
                notifications.show({
                    title: 'Error',
                    message: errorMessage,
                    color: 'red',
                });
                return;
            }

            await verifyAuth(false);
            notifications.show({
                title: 'Success!',
                message: 'Business information saved successfully',
                color: 'green',
            });
            navigate('/onboarding/profile');
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: 'Failed to save business information. Please try again.',
                color: 'red',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            title="Tell us about your business"
            subtitle="Help us set up your coaching business profile"
        >
            <Stack
                gap="md"
                component="form"
                onSubmit={handleSubmit(onSubmit)}
            >
                <Controller
                    control={control}
                    name="name"
                    render={({field}) => (
                        <TextInput
                            {...field}
                            label="Business Name"
                            placeholder="e.g. Acme Fitness Centre"
                            error={errors?.name?.message}
                            size="md"
                            radius="sm"
                            required
                            leftSection={<IconBuilding size="1.2rem" />}
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
                            label="Username"
                            placeholder="Choose a unique username"
                            error={errors?.handle?.message}
                            size="md"
                            radius="sm"
                            required
                            description="This will be your unique identifier on the platform"
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
                            label="About Your Business (Optional)"
                            placeholder="Tell us about your business, services, and what makes you unique..."
                            error={errors?.about?.message}
                            size="md"
                            radius="sm"
                            minRows={4}
                            maxRows={6}
                            autosize
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
                        icon={<IconInfoCircle size="1rem" />}
                        color="red"
                        variant="light"
                        radius="sm"
                    >
                        Please fix the errors above to continue
                    </Alert>
                )}

                <Button
                    type="submit"
                    size="md"
                    radius="sm"
                    fullWidth
                    loading={isSubmitting}
                    loaderProps={{
                        type: 'bars',
                    }}
                    rightSection={<ArrowRightIcon />}
                    disabled={!isValid}
                    styles={{
                        root: {
                            height: 48,
                        },
                    }}
                >
                    Continue
                </Button>
            </Stack>
        </AuthLayout>
    );
};

export default BusinessInfoStepPage;
