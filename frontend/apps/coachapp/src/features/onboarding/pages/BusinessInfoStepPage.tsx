import {Alert, Button, Stack, Textarea, TextInput} from '@mantine/core';
import {useForm, zodResolver} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import {ArrowRight} from '@phosphor-icons/react';
import {IconAlertCircle, IconBuilding} from '@tabler/icons-react';
import React, {useState} from 'react';
import {useNavigate} from 'react-router';
import {z} from 'zod';

import {useAuth} from '@/providers/AuthProvider';
import AuthLayout from '@/shared/layouts/AuthLayout';
import {BusinessAPI} from '@/services/business';
import {getApiErrorMessage} from '@/utils/error';

const businessInfoSchema = z.object({
    about: z.string().optional(),
    handle: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be less than 30 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
    name: z.string().min(2, 'Business name is required'),
});

type BusinessInfoFormValues = z.infer<typeof businessInfoSchema>;

const BusinessInfoStepPage: React.FC = () => {
    const {verifyAuth} = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string>('');

    const form = useForm<BusinessInfoFormValues>({
        initialValues: {
            about: '',
            handle: '',
            name: '',
        },
        validate: zodResolver(businessInfoSchema),
    });

    const onSubmit = async (data: BusinessInfoFormValues) => {
        setError('');

        try {
            const res = await BusinessAPI.createBusiness(data);
            if (res.isError) {
                const errorMessage = res.getError().message;
                setError(errorMessage);
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
                title: 'Success',
            });
            navigate('/onboarding/profile');
        } catch (err) {
            const errorMessage = getApiErrorMessage(err);
            setError(errorMessage);
            notifications.show({
                color: 'red',
                message: errorMessage,
                title: 'Error',
            });
        }
    };

    return (
        <AuthLayout
            subtitle="Help us set up your coaching business profile"
            title="Tell us about your business"
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
                        label="Business name"
                        leftSection={<IconBuilding size={16} />}
                        placeholder="e.g. Acme Fitness"
                        required
                        size="lg"
                        {...form.getInputProps('name')}
                    />

                    <TextInput
                        description="This will be your unique identifier on the platform"
                        label="Username"
                        placeholder="Choose a unique username"
                        required
                        size="lg"
                        {...form.getInputProps('handle')}
                    />

                    <Textarea
                        autosize
                        label="About your business (optional)"
                        maxRows={6}
                        minRows={4}
                        placeholder="Tell us about your business, services, and what makes you unique..."
                        size="lg"
                        {...form.getInputProps('about')}
                    />

                    <Button
                        fullWidth
                        loading={form.submitting}
                        rightSection={<ArrowRight size={16} />}
                        size="lg"
                        type="submit"
                    >
                        Continue
                    </Button>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default BusinessInfoStepPage;
