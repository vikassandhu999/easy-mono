import {zodResolver} from '@hookform/resolvers/zod';
import {Alert, Button, Stack, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {ArrowRightIcon} from '@phosphor-icons/react';
import {IconBriefcase, IconInfoCircle, IconUser} from '@tabler/icons-react';
import React, {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';

import {CoachesAPI, UpdateCoach_zod, UpdateCoachProps} from '@/api/coaches.ts';
import AuthLayout from '@/components/layouts/AuthLayout';

const updateCoachResolver = zodResolver(UpdateCoach_zod);

const CoachInfoStepPage: React.FC = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        setIsSubmitting(true);

        try {
            const res = await CoachesAPI.updateCoach(data);
            if (res.isError) {
                const errorMessage = res.getError().message;
                notifications.show({
                    color: 'red',
                    message: errorMessage,
                    title: 'Error',
                });
                return;
            }

            notifications.show({
                color: 'green',
                message: 'Your profile has been set up successfully',
                title: 'Welcome!',
            });
            navigate('/');
        } catch (err) {
            notifications.show({
                color: 'red',
                message: 'Failed to save your information. Please try again.',
                title: 'Error',
            });
        } finally {
            setIsSubmitting(false);
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
                    loading={isSubmitting}
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
                    {isSubmitting ? 'Setting up your profile...' : 'Complete Setup'}
                </Button>
            </Stack>
        </AuthLayout>
    );
};

export default CoachInfoStepPage;
