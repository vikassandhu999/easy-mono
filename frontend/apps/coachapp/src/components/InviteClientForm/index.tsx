import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, Text} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconSend} from '@tabler/icons-react';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';

import {CreateClient_zod, CreateClientProps} from '@/api/clients.ts';
import {FormSection} from '@/components/containers/FormSection';

import CETextArea from '../CETextArea';
import CETextInput from '../CETextInput';
import {FixedBottomBar} from '../containers/FixedBottomBar';

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
            <FormSection>
                <Text
                    c="dimmed"
                    fs="italic"
                    size="xs"
                >
                    Your client will receive an email invitation to join your coaching program
                </Text>

                <Stack gap="md">
                    <Controller
                        control={control}
                        name="name"
                        render={({field, fieldState}) => (
                            <CETextInput
                                {...field}
                                error={fieldState.error?.message}
                                label="Client's Full Name"
                                placeholder="e.g. John Smith"
                                radius="xl"
                                size="md"
                                variant="filled"
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="invitation_email"
                        render={({field, fieldState}) => (
                            <CETextInput
                                {...field}
                                error={fieldState.error?.message}
                                label="Email Address"
                                placeholder="e.g. john@example.com"
                                radius="xl"
                                size="md"
                                type="email"
                                variant="filled"
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="invitation_phone"
                        render={({field, fieldState}) => (
                            <CETextInput
                                {...field}
                                error={fieldState.error?.message}
                                label="Phone Number (Optional)"
                                onChange={(e) => field.onChange(e.target.value || undefined)}
                                placeholder="e.g. +1 (555) 123-4567"
                                radius="xl"
                                size="md"
                                type="tel"
                                value={field.value || ''}
                                variant="filled"
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="notes"
                        render={({field, fieldState}) => (
                            <CETextArea
                                {...field}
                                error={fieldState.error?.message}
                                label="Notes (Optional)"
                                onChange={(e) => field.onChange(e.target.value || undefined)}
                                placeholder="e.g. Goals, medical history, dietary restrictions..."
                                radius="xl"
                                rows={3}
                                size="md"
                                value={field.value || ''}
                                variant="filled"
                            />
                        )}
                    />
                </Stack>
            </FormSection>
            <FixedBottomBar>
                <Button
                    fullWidth
                    loading={isSubmitting}
                    radius="xl"
                    rightSection={<IconSend />}
                    size="lg"
                    type="submit"
                >
                    {submitText}
                </Button>
            </FixedBottomBar>
        </form>
    );
};
