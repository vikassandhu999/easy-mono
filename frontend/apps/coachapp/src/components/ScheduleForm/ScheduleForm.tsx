import {Radio, Stack, TextInput} from '@mantine/core';
import {useForm} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import React from 'react';

import {CreateScheduleProps, Schedule, ScheduleCategory, UpdateScheduleProps} from '@/api/schedules.ts';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {FormSection} from '@/components/containers/FormSection';

import {SCHEDULE_CATEGORIES} from '../Configs';

interface ScheduleFormProps {
    category: ScheduleCategory;
    onSubmit: (data: CreateScheduleProps | UpdateScheduleProps) => Promise<void>;
    schedule?: Partial<Schedule>;
    submitText: string;
}

const frequencyOptions = [
    {description: 'Design 1 day; repeats every day', label: 'Daily', value: 'daily'},
    {description: 'Design 1 week; repeats every week', label: 'Weekly', value: 'weekly'},
];

export const ScheduleForm: React.FC<ScheduleFormProps> = ({category, onSubmit, schedule, submitText}) => {
    const form = useForm<CreateScheduleProps>({
        initialValues: {
            category: schedule?.category || category,
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

    const typeConfig = SCHEDULE_CATEGORIES[form.values.category]!;

    console.log('Rendering ScheduleForm with category:', category, 'and typeConfig:', typeConfig);

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
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
            <FormSection>
                <TextInput
                    description={typeConfig.form.nameDescription}
                    label="Name"
                    placeholder={typeConfig.form.namePlaceholder}
                    required
                    size={'md'}
                    withAsterisk
                    {...form.getInputProps('name')}
                />

                <Radio.Group
                    label="Schedule Cycle"
                    required
                    size={'md'}
                    withAsterisk
                    {...form.getInputProps('frequency')}
                >
                    <Stack
                        gap={'xs'}
                        mt="sm"
                    >
                        {frequencyOptions.map((option) => (
                            <Radio
                                description={option.description}
                                key={option.value}
                                label={option.label}
                                size={'md'}
                                value={option.value}
                            />
                        ))}
                    </Stack>
                </Radio.Group>
            </FormSection>
            <FixedBottom
                isSubmitting={form.submitting}
                label={submitText}
                onSubmit={() => handleFormSubmit(form.values)}
            />
        </form>
    );
};
