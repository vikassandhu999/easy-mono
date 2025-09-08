import {ActionIcon, Box, Group, Radio, rem, Stack, TextInput, Title} from '@mantine/core';
import {useForm} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import {ArrowLeftIcon} from '@phosphor-icons/react';
import React from 'react';

import {CreateScheduleProps, Schedule, UpdateScheduleProps} from '@/api/schedules.ts';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {FormSection} from '@/components/containers/FormSection';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';

interface ScheduleEntryFormProps {
    onCancel: () => void;
    onSubmit: (data: CreateScheduleProps | UpdateScheduleProps) => Promise<void>;
    schedule: Partial<Schedule>;
    submitText: string;
    title: string;
}

const frequencyOptions = [
    {description: 'Design 1 day; repeats every day', label: 'Daily', value: 'daily'},
    {description: 'Design 1 week; repeats every week', label: 'Weekly', value: 'weekly'},
];

export const ScheduleEntryForm: React.FC<ScheduleEntryFormProps> = ({
    onCancel,
    onSubmit,
    schedule,
    submitText,
    title,
}) => {
    const form = useForm<CreateScheduleProps>({
        initialValues: {
            duration_weeks: schedule?.duration_weeks || 12,
            frequency: schedule?.frequency || 'weekly',
            name: schedule?.name || '',
        },
        validate: {
            duration_weeks: (value) => {
                if (!value || value < 1 || value > 104) {
                    return 'Duration must be between 1 and 104 weeks';
                }
                return null;
            },
            name: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Schedule name is required';
                }
                if (value.length > 255) {
                    return 'Schedule name must be less than 255 characters';
                }
                return null;
            },
        },
    });

    const handleFormSubmit = async (values: CreateScheduleProps) => {
        if (form.validate().hasErrors) {
            notifications.show({
                autoClose: 1000,
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
        <PagePaper>
            <HeadingContainer paddingY={'xs'}>
                <Group
                    align={'center'}
                    justify={'start'}
                    wrap={'nowrap'}
                >
                    <ActionIcon
                        color={'dark'}
                        onClick={onCancel}
                        p={0}
                        size={'lg'}
                        variant={'subtle'}
                    >
                        <ArrowLeftIcon size={32} />
                    </ActionIcon>
                    <Title
                        lineClamp={1}
                        order={4}
                    >
                        {title}
                    </Title>
                </Group>
            </HeadingContainer>
            <PaddingContainer paddingX={'sm'}>
                <form onSubmit={form.onSubmit(handleFormSubmit)}>
                    <FormSection>
                        <TextInput
                            description="Choose a clear, descriptive name for your schedule"
                            label="Name"
                            placeholder="Push-Pull-Leg Split Workouts"
                            required
                            withAsterisk
                            {...form.getInputProps('name')}
                        />

                        <Radio.Group
                            description="How many days you design before the plan repeats"
                            label="Schedule Cycle"
                            required
                            withAsterisk
                            {...form.getInputProps('frequency')}
                        >
                            <Stack
                                gap={'xs'}
                                mt="xs"
                            >
                                {frequencyOptions.map((option) => (
                                    <Radio
                                        description={option.description}
                                        key={option.value}
                                        label={option.label}
                                        value={option.value}
                                    />
                                ))}
                            </Stack>
                        </Radio.Group>
                    </FormSection>
                </form>
            </PaddingContainer>

            <Box mb={rem(80)} />

            <FixedBottom
                isSubmitting={form.submitting}
                label={submitText}
                onSubmit={() => handleFormSubmit(form.values)}
            />
        </PagePaper>
    );
};
