import React, {useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';
import {CoachesAPI, UpdateCoachProps, UpdateCoach_zod} from '@/Api/Coaches';
import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, TextInput, Alert} from '@mantine/core';
import {IconInfoCircle, IconUser, IconBriefcase} from '@tabler/icons-react';
import {notifications} from '@mantine/notifications';
import {AuthLayout} from '@/Components/layouts/AuthLayout';
import {ArrowRightIcon} from '@phosphor-icons/react';

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
        resolver: updateCoachResolver,
        mode: 'onChange',
    });

    const onSubmit = async (data: UpdateCoachProps) => {
        setIsSubmitting(true);

        try {
            const res = await CoachesAPI.updateCoach(data);
            if (res.isError) {
                const errorMessage = res.getError().message;
                notifications.show({
                    title: 'Error',
                    message: errorMessage,
                    color: 'red',
                });
                return;
            }

            notifications.show({
                title: 'Welcome!',
                message: 'Your profile has been set up successfully',
                color: 'green',
            });
            navigate('/');
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: 'Failed to save your information. Please try again.',
                color: 'red',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            title="Final Step"
            subtitle="Tell us a little about yourself."
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
                            label="Your Full Name"
                            placeholder="e.g. John Smith"
                            error={errors?.name?.message}
                            size="md"
                            radius="sm"
                            required
                            leftSection={<IconUser size="1.2rem" />}
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
                            label="Professional Title"
                            placeholder="e.g. Certified Fitness Coach"
                            error={errors?.title?.message}
                            size="md"
                            radius="sm"
                            required
                            leftSection={<IconBriefcase size="1.2rem" />}
                            description="This will be displayed on your profile and business cards"
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
                    disabled={!isValid}
                    rightSection={<ArrowRightIcon />}
                    styles={{
                        root: {
                            height: 48,
                        },
                    }}
                >
                    {isSubmitting ? 'Setting up your profile...' : 'Complete Setup'}
                </Button>
            </Stack>
        </AuthLayout>
    );
};

export default CoachInfoStepPage;
