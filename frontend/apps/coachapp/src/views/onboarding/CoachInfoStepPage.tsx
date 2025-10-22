import {Alert, Button, Stack, TextInput} from '@mantine/core';
import {useForm, zodResolver} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import {ArrowRight} from '@phosphor-icons/react';
import {IconAlertCircle, IconBriefcase, IconUser} from '@tabler/icons-react';
import React, {useState} from 'react';
import {useNavigate} from 'react-router';
import {z} from 'zod';

import type {AxiosBaseQueryError} from '@/store/services/baseAPISlice';

import AuthLayout from '@/components/layouts/AuthLayout';
import {useUpdateCoachMutation} from '@/store/services/coach';

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
        initialValues: {
            name: '',
            title: '',
        },
        validate: zodResolver(coachInfoSchema),
    });

    const getErrorMessage = (err: unknown) => {
        const apiError = err as AxiosBaseQueryError | undefined;
        if (apiError?.data && typeof apiError.data === 'object' && 'message' in apiError.data) {
            const message = (apiError.data as {message?: string}).message;
            if (message) return message;
        }
        if (apiError?.data && typeof apiError.data === 'string') {
            return apiError.data;
        }
        return 'Failed to save your information. Please try again.';
    };

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
            const errorMessage = getErrorMessage(err);
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
            <form onSubmit={form.onSubmit(onSubmit)}>
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
                        {...form.getInputProps('name')}
                    />

                    <TextInput
                        description="This will be displayed on your profile and business cards"
                        label="Professional title"
                        leftSection={<IconBriefcase size={16} />}
                        placeholder="e.g. Certified Fitness Coach"
                        required
                        size="lg"
                        {...form.getInputProps('title')}
                    />

                    <Button
                        fullWidth
                        loading={isLoading}
                        rightSection={<ArrowRight size={16} />}
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
