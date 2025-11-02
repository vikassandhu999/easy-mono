import {zodResolver} from '@hookform/resolvers/zod';
import {Alert, Button, Stack, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconAlertCircle, IconArrowLeft, IconBriefcase, IconUser} from '@tabler/icons-react';
import React, {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';
import {z} from 'zod';

import AuthLayout from '@/shared/layouts/AuthLayout';
import {useUpdateCoachMutation} from '@/services/coach';
import {getApiErrorMessage} from '@/utils/error';

const coachInfoSchema = z.object({
    name: z.string().min(2, 'Full name is required'),
    title: z.string().min(2, 'Professional title is required'),
});

type CoachInfoFormValues = z.infer<typeof coachInfoSchema>;

const CoachInfoStepPage: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string>('');
    const [updateCoach, {isLoading}] = useUpdateCoachMutation();

    const form = useForm<CoachInfoFormValues>({
        defaultValues: {
            name: '',
            title: '',
        },
        resolver: zodResolver(coachInfoSchema),
    });

    const onSubmit = async (data: CoachInfoFormValues) => {
        setError('');

        try {
            await updateCoach(data).unwrap();

            notifications.show({
                color: 'green',
                message: 'Your profile has been set up successfully',
                title: 'Welcome',
            });
            navigate('/');
        } catch (err) {
            const errorMessage = getApiErrorMessage(err);
            setError(errorMessage);
            notifications.show({
                color: 'red',
                message: errorMessage,
                title: 'Unable to save',
            });
        }
    };

    return (
        <AuthLayout
            subtitle="Tell us a little about yourself"
            title="Final step"
        >
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Stack gap="lg">
                    {/* Error Alert */}
                    {error && (
                        <Alert
                            color="red"
                            icon={<IconAlertCircle size={16} />}
                            title="Unable to save"
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Form Fields */}
                    <TextInput
                        label="Full name"
                        leftSection={<IconUser size={16} />}
                        placeholder="e.g. John Smith"
                        required
                        size="lg"
                        {...form.register('name')}
                    />

                    <TextInput
                        description="This will be displayed on your profile and business cards"
                        label="Professional title"
                        leftSection={<IconBriefcase size={16} />}
                        placeholder="e.g. Certified Fitness Coach"
                        required
                        size="lg"
                        {...form.register('title')}
                    />

                    <Button
                        fullWidth
                        loading={isLoading}
                        rightSection={<IconArrowLeft size={16} />}
                        size="lg"
                        type="submit"
                    >
                        Complete setup
                    </Button>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default CoachInfoStepPage;
