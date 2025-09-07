import React from 'react';
import {TextInput, Textarea, Stack} from '@mantine/core';
import {useForm} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import {FixedBottom} from '@/Components/Containers/FixedBottom';
import {FormSection} from '@/Components/Containers/FormSection';
import {CreateClientProps} from '@/Api/Clients';

interface InviteClientFormProps {
    submitText: string;
    onSubmit: (data: CreateClientProps) => Promise<void>;
}

export const InviteClientForm: React.FC<InviteClientFormProps> = ({submitText, onSubmit}) => {
    const form = useForm<CreateClientProps>({
        initialValues: {
            name: '',
            invitation_email: '',
            invitation_phone: '',
            notes: '',
        },
        validate: {
            name: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Name is required';
                }
                if (value.length > 200) {
                    return 'Name must be less than 200 characters';
                }
                return null;
            },
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
                title: 'Validation Error',
                message: 'Please fix the errors in the form',
                color: 'red',
                position: 'top-center',
                autoClose: 3000,
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
                        label="Name"
                        placeholder="Enter client's full name"
                        description="The full name of the client"
                        required
                        withAsterisk
                        size="md"
                        {...form.getInputProps('name')}
                    />
                </FormSection>

                <FormSection>
                    <TextInput
                        label="Email"
                        placeholder="Enter email address"
                        description="The email address for sending the invitation"
                        required
                        withAsterisk
                        size="md"
                        type="email"
                        {...form.getInputProps('invitation_email')}
                    />
                </FormSection>

                <FormSection>
                    <TextInput
                        label="Phone Number"
                        placeholder="Enter phone number (optional)"
                        description="The client's phone number"
                        size="md"
                        type="tel"
                        {...form.getInputProps('invitation_phone')}
                    />
                </FormSection>

                <FormSection>
                    <Textarea
                        label="Notes"
                        placeholder="Add any notes about this client (optional)"
                        description="Any additional information about the client"
                        size="md"
                        rows={3}
                        {...form.getInputProps('notes')}
                    />
                </FormSection>
            </Stack>

            <FixedBottom
                onSubmit={() => handleFormSubmit(form.values)}
                isSubmitting={form.submitting}
                label={submitText}
            />
        </form>
    );
};
