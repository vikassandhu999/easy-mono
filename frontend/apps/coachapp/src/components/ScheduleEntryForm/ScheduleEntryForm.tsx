import React from 'react';
import {TextInput, Group, Title, ActionIcon, Box, rem, Radio, Stack} from '@mantine/core';
import {useForm} from '@mantine/form';
import {ArrowLeftIcon} from '@phosphor-icons/react';
import {notifications} from '@mantine/notifications';
import {CreateScheduleProps, UpdateScheduleProps, Schedule} from '@/api/schedules.ts';
import PagePaper from '@/components/containers/PagePaper';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {FormSection} from '@/components/containers/FormSection';

interface ScheduleEntryFormProps {
    title: string;
    submitText: string;
    schedule: Partial<Schedule>;
    onSubmit: (data: CreateScheduleProps | UpdateScheduleProps) => Promise<void>;
    onCancel: () => void;
}

const frequencyOptions = [
    {value: 'daily', label: 'Daily', description: 'Design 1 day; repeats every day'},
    {value: 'weekly', label: 'Weekly', description: 'Design 1 week; repeats every week'},
];

export const ScheduleEntryForm: React.FC<ScheduleEntryFormProps> = ({
    title,
    submitText,
    schedule,
    onSubmit,
    onCancel,
}) => {
    const form = useForm<CreateScheduleProps>({
        initialValues: {
            name: schedule?.name || '',
            frequency: schedule?.frequency || 'weekly',
            duration_weeks: schedule?.duration_weeks || 12,
        },
        validate: {
            name: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Schedule name is required';
                }
                if (value.length > 255) {
                    return 'Schedule name must be less than 255 characters';
                }
                return null;
            },
            duration_weeks: (value) => {
                if (!value || value < 1 || value > 104) {
                    return 'Duration must be between 1 and 104 weeks';
                }
                return null;
            },
        },
    });

    const handleFormSubmit = async (values: CreateScheduleProps) => {
        if (form.validate().hasErrors) {
            notifications.show({
                title: 'Validation Error',
                message: 'Please fix the errors in the form',
                color: 'red',
                position: 'top-center',
                autoClose: 1000,
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
                        variant={'subtle'}
                        color={'dark'}
                        size={'lg'}
                        p={0}
                        onClick={onCancel}
                    >
                        <ArrowLeftIcon size={32} />
                    </ActionIcon>
                    <Title
                        order={4}
                        lineClamp={1}
                    >
                        {title}
                    </Title>
                </Group>
            </HeadingContainer>
            <PaddingContainer paddingX={'sm'}>
                <form onSubmit={form.onSubmit(handleFormSubmit)}>
                    <FormSection>
                        <TextInput
                            label="Name"
                            placeholder="Push-Pull-Leg Split Workouts"
                            description="Choose a clear, descriptive name for your schedule"
                            required
                            withAsterisk
                            {...form.getInputProps('name')}
                        />

                        <Radio.Group
                            label="Schedule Cycle"
                            description="How many days you design before the plan repeats"
                            required
                            withAsterisk
                            {...form.getInputProps('frequency')}
                        >
                            <Stack
                                mt="xs"
                                gap={'xs'}
                            >
                                {frequencyOptions.map((option) => (
                                    <Radio
                                        key={option.value}
                                        value={option.value}
                                        label={option.label}
                                        description={option.description}
                                    />
                                ))}
                            </Stack>
                        </Radio.Group>
                    </FormSection>
                </form>
            </PaddingContainer>

            <Box mb={rem(80)} />

            <FixedBottom
                onSubmit={() => handleFormSubmit(form.values)}
                isSubmitting={form.submitting}
                label={submitText}
            />
        </PagePaper>
    );
};
