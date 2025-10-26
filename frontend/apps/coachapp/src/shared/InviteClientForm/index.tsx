import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, Text, Textarea, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';

import {FixedBottomBar} from '@/shared/containers/FixedBottomBar';
import {CreateClient_zod, CreateClientProps} from '@/store/services/clients';

interface InviteClientFormProps {
    onSubmit: (data: CreateClientProps) => Promise<void>;
    submitText: string;
}

export const InviteClientForm: React.FC<InviteClientFormProps> = ({onSubmit, submitText}) => {
    const {
        control,
        handleSubmit,
        formState: {isSubmitting},
    } = useForm<CreateClientProps>({
        defaultValues: {
            invitation_email: '',
            invitation_phone: undefined,
            name: '',
            notes: undefined,
        },
        resolver: zodResolver(CreateClient_zod),
    });

    const handleFormSubmit = async (values: CreateClientProps) => {
        try {
            await onSubmit(values);
        } catch (error) {
            notifications.show({
                autoClose: 3000,
                color: 'red',
                message: 'Failed to send invitation. Please try again.',
                title: 'Error',
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
            {/* Info Message */}
            <Stack gap="md">
                <Text
                    c="dimmed"
                    size="sm"
                >
                    Your client will receive an email invitation to join your coaching program.
                </Text>

                <Controller
                    control={control}
                    name="name"
                    render={({field, fieldState}) => (
                        <TextInput
                            {...field}
                            description="Enter the client's full name as it should appear in your roster."
                            error={fieldState.error?.message}
                            label="Client's full name"
                            placeholder="e.g., John Smith"
                            withAsterisk
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="invitation_email"
                    render={({field, fieldState}) => (
                        <TextInput
                            {...field}
                            description="The email address where the invitation will be sent."
                            error={fieldState.error?.message}
                            label="Email address"
                            placeholder="e.g., john@example.com"
                            type="email"
                            withAsterisk
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="invitation_phone"
                    render={({field, fieldState}) => (
                        <TextInput
                            {...field}
                            description="Optional contact number for the client."
                            error={fieldState.error?.message}
                            label="Phone number (optional)"
                            onChange={(e) => field.onChange(e.target.value || undefined)}
                            placeholder="e.g., +1 (555) 123-4567"
                            type="tel"
                            value={field.value || ''}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="notes"
                    render={({field, fieldState}) => (
                        <Textarea
                            {...field}
                            description="Add any relevant information about goals, medical history, or dietary restrictions."
                            error={fieldState.error?.message}
                            label="Notes (optional)"
                            onChange={(e) => field.onChange(e.target.value || undefined)}
                            placeholder="e.g., Training for a marathon, vegetarian diet..."
                            rows={4}
                            value={field.value || ''}
                        />
                    )}
                />
            </Stack>

            <FixedBottomBar maxWidth={560}>
                <Button
                    fullWidth
                    loading={isSubmitting}
                    radius="xl"
                    rightSection={<IconArrowRight size={20} />}
                    size="lg"
                    type="submit"
                >
                    {submitText}
                </Button>
            </FixedBottomBar>
        </form>
    );
};
