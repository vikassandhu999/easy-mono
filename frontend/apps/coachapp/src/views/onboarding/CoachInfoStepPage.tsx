import {zodResolver} from '@hookform/resolvers/zod';
import {Alert, Button, Stack, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {ArrowRightIcon} from '@phosphor-icons/react';
import {IconBriefcase, IconInfoCircle, IconUser} from '@tabler/icons-react';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';

import {UpdateCoach_zod, UpdateCoachProps} from '@/api/coaches.ts';
import AuthLayout from '@/components/layouts/AuthLayout';
import {useUpdateCoachMutation} from '@/store/services/coachApi';

const updateCoachResolver = zodResolver(UpdateCoach_zod);

const CoachInfoStepPage: React.FC = () => {
    const navigate = useNavigate();
    const [updateCoach, {isLoading}] = useUpdateCoachMutation();

    const {
        control,
        formState: {errors, isValid},
        handleSubmit,
    } = useForm<UpdateCoachProps>({
        defaultValues: {name: '', title: ''},
        mode: 'onChange',
        resolver: updateCoachResolver,
    });

    const onSubmit = async (data: UpdateCoachProps) => {
        try {
            await updateCoach(data).unwrap();

            notifications.show({
                color: 'green',
                message: 'Your profile has been set up successfully',
                title: 'Welcome!',
            });
            navigate('/');
        } catch (err: any) {
            notifications.show({
                color: 'red',
                message: err?.data?.message || 'Failed to save your information. Please try again.',
                title: 'Error',
            });
        }
    };

    return (
        <AuthLayout
            subtitle="Tell us a little about yourself."
            title="Final Step"
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
                            label="Your Full Name"
                            leftSection={<IconUser size="1.2rem" />}
                            placeholder="e.g. John Smith"
                            radius="sm"
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
                    name="title"
                    render={({field}) => (
                        <TextInput
                            {...field}
                            description="This will be displayed on your profile and business cards"
                            error={errors?.title?.message}
                            label="Professional Title"
                            leftSection={<IconBriefcase size="1.2rem" />}
                            placeholder="e.g. Certified Fitness Coach"
                            radius="sm"
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

                {(errors.name || errors.title) && (
                    <Alert
                        color="red"
                        icon={<IconInfoCircle size="1rem" />}
                        radius="sm"
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
                    loading={isLoading}
                    radius="sm"
                    rightSection={<ArrowRightIcon />}
                    size="md"
                    styles={{
                        root: {
                            height: 48,
                        },
                    }}
                    type="submit"
                >
                    {isLoading ? 'Setting up your profile...' : 'Complete Setup'}
                </Button>
            </Stack>
        </AuthLayout>
    );
};

export default CoachInfoStepPage;
