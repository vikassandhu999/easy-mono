import {Stack, Textarea, TextInput} from '@mantine/core';
import {useForm} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import React from 'react';

import {CreateClientProps} from '@/api/clients.ts';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {FormSection} from '@/components/containers/FormSection';

interface InviteClientFormProps {
    onSubmit: (data: CreateClientProps) => Promise<void>;
    submitText: string;
}

export const InviteClientForm: React.FC<InviteClientFormProps> = ({onSubmit, submitText}) => {
    const form = useForm<CreateClientProps>({
        initialValues: {
            invitation_email: '',
            invitation_phone: '',
            name: '',
            notes: '',
        },
        validate: {
            invitation_email: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Email is required';
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return 'Invalid email format';
                }
                return null;
            },
            invitation_phone: (value) => {
                if (value && (value.length < 10 || value.length > 15)) {
                    return 'Phone number must be between 10-15 characters';
                }
                return null;
            },
            name: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Name is required';
                }
                if (value.length > 200) {
                    return 'Name must be less than 200 characters';
                }
                return null;
            },
            notes: (value) => {
                if (value && value.length > 1000) {
                    return 'Notes must be less than 1000 characters';
                }
                return null;
            },
        },
    });

    const handleFormSubmit = async (values: CreateClientProps) => {
        if (form.validate().hasErrors) {
            notifications.show({
                autoClose: 3000,
                color: 'red',
                message: 'Please fix the errors in the form',
                position: 'top-center',
                title: 'Validation Error',
            });
            return;
        }

        await onSubmit(values);
    };

    return (
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
            <Stack gap="md">
                <FormSection>
                    <TextInput
                        description="The full name of the client"
                        label="Name"
                        placeholder="Enter client's full name"
                        required
                        size="md"
                        withAsterisk
                        {...form.getInputProps('name')}
                    />
                </FormSection>

                <FormSection>
                    <TextInput
                        description="The email address for sending the invitation"
                        label="Email"
                        placeholder="Enter email address"
                        required
                        size="md"
                        type="email"
                        withAsterisk
                        {...form.getInputProps('invitation_email')}
                    />
                </FormSection>

                <FormSection>
                    <TextInput
                        description="The client's phone number"
                        label="Phone Number"
                        placeholder="Enter phone number (optional)"
                        size="md"
                        type="tel"
                        {...form.getInputProps('invitation_phone')}
                    />
                </FormSection>

                <FormSection>
                    <Textarea
                        description="Any additional information about the client"
                        label="Notes"
                        placeholder="Add any notes about this client (optional)"
                        rows={3}
                        size="md"
                        {...form.getInputProps('notes')}
                    />
                </FormSection>
            </Stack>

            <FixedBottom
                isSubmitting={form.submitting}
                label={submitText}
                onSubmit={() => handleFormSubmit(form.values)}
            />
        </form>
    );
};
