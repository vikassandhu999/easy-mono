import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, Text, Textarea, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconArrowRight, IconBriefcase} from '@tabler/icons-react';
import React from 'react';
import {useForm} from 'react-hook-form';
import {useNavigate} from 'react-router';

import AuthLayout from '@/domains/auth/layouts/AuthLayout';
import {CreateBusinessRequest, CreateBusinessRequest_zod, useCreateBusinessMutation} from '@/services/business';
import {handleApiError} from '@/utils/error';

const OnboardBusinessPage: React.FC = () => {
    const navigate = useNavigate();
    const [createBusiness, {isLoading}] = useCreateBusinessMutation();

    const form = useForm<CreateBusinessRequest>({
        defaultValues: {
            name: '',
            description: '',
        },
        resolver: zodResolver(CreateBusinessRequest_zod),
        mode: 'onBlur',
    });

    const onSubmit = async (values: CreateBusinessRequest) => {
        try {
            await createBusiness(values).unwrap();

            notifications.show({
                title: 'Success',
                message: 'Business created successfully',
                color: 'green',
            });

            navigate('/');
        } catch (err) {
            handleApiError(err);
        }
    };

    return (
        <AuthLayout
            subtitle="Set up your coaching business to get started"
            title="Create Your Business"
        >
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Stack gap="md">
                    <TextInput
                        label={
                            <Text
                                fw={500}
                                size="md"
                            >
                                Business Name
                            </Text>
                        }
                        leftSection={<IconBriefcase size={16} />}
                        placeholder="Awesome Coaching"
                        required
                        size="lg"
                        {...form.register('name')}
                        error={form.formState.errors.name?.message}
                    />

                    <Textarea
                        label={
                            <Text
                                fw={500}
                                size="md"
                            >
                                Description (Optional)
                            </Text>
                        }
                        minRows={3}
                        placeholder="Tell us about your coaching business..."
                        size="lg"
                        {...form.register('description')}
                        error={form.formState.errors.description?.message}
                    />

                    <Button
                        fullWidth
                        loading={isLoading}
                        rightSection={<IconArrowRight size={16} />}
                        size="lg"
                        type="submit"
                    >
                        Create Business
                    </Button>
                </Stack>
            </form>
        </AuthLayout>
    );
};

export default OnboardBusinessPage;
