import React from 'react';
import {TextInput, Radio, Stack} from '@mantine/core';
import {useForm} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import {CreateScheduleProps, UpdateScheduleProps, Schedule, ScheduleCategory} from '@/Api/Schedules';
import {FixedBottom} from '@/Components/Containers/FixedBottom';
import {FormSection} from '@/Components/Containers/FormSection';
import {SCHEDULE_CATEGORIES} from '../Configs';

interface ScheduleFormProps {
    category: ScheduleCategory;
    submitText: string;
    schedule?: Partial<Schedule>;
    onSubmit: (data: CreateScheduleProps | UpdateScheduleProps) => Promise<void>;
}

const frequencyOptions = [
    {value: 'daily', label: 'Daily', description: 'Design 1 day; repeats every day'},
    {value: 'weekly', label: 'Weekly', description: 'Design 1 week; repeats every week'},
];

export const ScheduleForm: React.FC<ScheduleFormProps> = ({submitText, schedule, onSubmit, category}) => {
    const form = useForm<CreateScheduleProps>({
        initialValues: {
            name: schedule?.name || '',
            frequency: schedule?.frequency || 'weekly',
            duration_weeks: schedule?.duration_weeks || 12,
            category: schedule?.category || category,
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

    const typeConfig = SCHEDULE_CATEGORIES[form.values.category]!;

    console.log('Rendering ScheduleForm with category:', category, 'and typeConfig:', typeConfig);

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
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
            <FormSection>
                <TextInput
                    label="Name"
                    placeholder={typeConfig.form.namePlaceholder}
                    description={typeConfig.form.nameDescription}
                    required
                    withAsterisk
                    size={'md'}
                    {...form.getInputProps('name')}
                />

                <Radio.Group
                    label="Schedule Cycle"
                    required
                    withAsterisk
                    size={'md'}
                    {...form.getInputProps('frequency')}
                >
                    <Stack
                        mt="sm"
                        gap={'xs'}
                    >
                        {frequencyOptions.map((option) => (
                            <Radio
                                size={'md'}
                                key={option.value}
                                value={option.value}
                                label={option.label}
                                description={option.description}
                            />
                        ))}
                    </Stack>
                </Radio.Group>
            </FormSection>
            <FixedBottom
                onSubmit={() => handleFormSubmit(form.values)}
                isSubmitting={form.submitting}
                label={submitText}
            />
        </form>
    );
};
