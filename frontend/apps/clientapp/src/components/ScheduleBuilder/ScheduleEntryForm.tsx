import {CreateScheduleEntryProps} from '@/Api/ScheduleEntries';
import {Group, Select, Stack, Text, Alert, Radio} from '@mantine/core';
import {useForm} from '@mantine/form';
import {useEffect} from 'react';
import {TimePicker} from '@mantine/dates';
import PaddingContainer from '../Containers/PaddingContainer';
import {FixedBottom} from '../Containers/FixedBottom';
import {Schedule} from '@/Api/Schedules';

interface ScheduleEntryFormProps {
    schedule: Schedule;
    sessionDefId: string;
    day?: number;
    onSubmit: (values: CreateScheduleEntryProps) => Promise<void>;
}

const ScheduleEntryForm = ({sessionDefId, day = 0, schedule, onSubmit}: ScheduleEntryFormProps) => {
    const form = useForm<CreateScheduleEntryProps>({
        initialValues: {
            session_def_id: sessionDefId,
            day,
            is_required: true,
            is_active: true,
            time_slot: 'all-day',
        },
        validate: {
            session_def_id: (value) => (!value ? 'Session definition is required' : null),
            day: (value) => (value < 0 || value > 6 ? 'Day must be between 0 (Sunday) and 6 (Saturday)' : null),
            window_start: (value, values) => {
                if (values.time_slot === 'custom' && !value) {
                    return 'Start time is required for custom time slot';
                }
                return null;
            },
            window_end: (value, values) => {
                // if (values.time_slot === 'custom' && !value) {
                //     return 'End time is required for custom time slot';
                // }
                if (values.time_slot === 'custom' && value && values.window_start && value <= values.window_start) {
                    return 'End time must be after start time';
                }
                return null;
            },
        },
        validateInputOnBlur: true,
    });
    console.log('VALUES', form.errors);
    const timeSlotOptions = [
        {
            value: 'all-day',
            label: 'Any time',
            description: 'Client can complete this at any time of the day',
        },

        {
            value: 'morning',
            label: 'Morning',
            description: 'Morning 6:00 – 12:00',
        },
        {
            value: 'afternoon',
            label: 'Afternoon',
            description: 'Afternoon 12:00 – 18:00',
        },
        {
            value: 'evening',
            label: 'Evening',
            description: 'Evening 18:00 – 22:00',
        },
        {
            value: 'night',
            label: 'Night',
            description: 'Night 22:00 – 6:00',
        },
        {
            value: 'custom',
            label: 'Custom',
            description: 'Set a specific start and end window',
        },
    ];

    const handleTimeSlotChange = (value: string) => {
        form.setFieldValue('time_slot', value as 'morning' | 'afternoon' | 'evening' | 'night' | 'custom' | 'all-day');

        if (value === 'all-day') {
            form.setFieldValue('window_start', undefined);
            form.setFieldValue('window_end', undefined);
        } else if (value === 'morning') {
            form.setFieldValue('window_start', '06:00');
            form.setFieldValue('window_end', '12:00');
        } else if (value === 'afternoon') {
            form.setFieldValue('window_start', '12:00');
            form.setFieldValue('window_end', '18:00');
        } else if (value === 'evening') {
            form.setFieldValue('window_start', '18:00');
            form.setFieldValue('window_end', '22:00');
        } else if (value === 'night') {
            form.setFieldValue('window_start', '22:00');
            form.setFieldValue('window_end', '06:00');
        } else if (value === 'custom') {
            // Keep existing values or set defaults if none
            if (!form.values.window_start) {
                form.setFieldValue('window_start', '09:00');
            }
            if (!form.values.window_end) {
                form.setFieldValue('window_end', '17:00');
            }
        }
    };

    const dayOptions = [
        {value: '0', label: 'Sunday'},
        {value: '1', label: 'Monday'},
        {value: '2', label: 'Tuesday'},
        {value: '3', label: 'Wednesday'},
        {value: '4', label: 'Thursday'},
        {value: '5', label: 'Friday'},
        {value: '6', label: 'Saturday'},
    ];

    const handleSubmit = async (values: CreateScheduleEntryProps) => {
        // Prepare the data for submission
        const submitData: CreateScheduleEntryProps = {
            ...values,
            day: Number(values.day),
        };

        // Add custom time window if time_slot is custom
        if (values.time_slot === 'custom' && values.window_start && values.window_end) {
            submitData.window_start = values.window_start;
            submitData.window_end = values.window_end;
        }

        await onSubmit(submitData);
    };

    // Clear custom time fields when time slot changes away from custom
    useEffect(() => {
        if (form.values.time_slot !== 'custom') {
            form.setFieldValue('window_start', undefined);
            form.setFieldValue('window_end', undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.values.time_slot]);

    return (
        <PaddingContainer
            paddingX={'sm'}
            paddingY={'lg'}
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap={'lg'}>
                    {schedule.frequency === 'weekly' && (
                        <Select
                            label="Day"
                            placeholder="Choose a day of the week"
                            data={dayOptions}
                            value={form.values.day.toString()}
                            onChange={(value) => form.setFieldValue('day', Number(value))}
                            error={form.errors.day}
                            required
                            readOnly
                            disabled
                            styles={{
                                label: {
                                    fontWeight: 600,
                                    marginBottom: 8,
                                    color: 'var(--mantine-color-gray-8)',
                                },
                            }}
                        />
                    )}

                    <div>
                        <Text
                            size="sm"
                            fw={600}
                            mb="xs"
                            style={{color: 'var(--mantine-color-gray-8)'}}
                        >
                            Preferred Time
                        </Text>
                        <Text
                            size="sm"
                            c="dimmed"
                            mb="md"
                            style={{lineHeight: 1.4}}
                        >
                            When would you like the client to complete this session?
                        </Text>

                        <Radio.Group
                            value={form.values.time_slot}
                            onChange={handleTimeSlotChange}
                            required
                        >
                            <Stack gap={'sm'}>
                                {timeSlotOptions.map((option) => (
                                    <Radio
                                        key={option.value}
                                        value={option.value}
                                        label={
                                            <div>
                                                <Text
                                                    size="sm"
                                                    fw={500}
                                                    style={{color: 'var(--mantine-color-gray-9)'}}
                                                >
                                                    {option.label}
                                                </Text>
                                                <Text
                                                    size="xs"
                                                    c="dimmed"
                                                    mt={2}
                                                    style={{lineHeight: 1.4}}
                                                >
                                                    {option.description}
                                                </Text>
                                            </div>
                                        }
                                        styles={{
                                            root: {
                                                padding: '12px',
                                                borderRadius: 8,
                                                border: '1px solid var(--mantine-color-gray-3)',
                                                backgroundColor: 'var(--mantine-color-white)',
                                                transition: 'all 150ms ease',
                                                '&:hover': {
                                                    borderColor: 'var(--mantine-color-brand-4)',
                                                    backgroundColor: 'var(--mantine-color-brand-0)',
                                                },
                                                '&[data-checked]': {
                                                    borderColor: 'var(--mantine-color-brand-5)',
                                                    backgroundColor: 'var(--mantine-color-brand-1)',
                                                },
                                            },
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Radio.Group>
                    </div>

                    {form.values.time_slot === 'custom' && (
                        <Stack gap="md">
                            <Text
                                size="sm"
                                fw={600}
                                style={{color: 'var(--mantine-color-gray-8)'}}
                            >
                                Custom Time Window
                            </Text>

                            <Group
                                grow
                                gap={'md'}
                                align={'start'}
                            >
                                <TimePicker
                                    label="Start"
                                    withDropdown
                                    format="12h"
                                    popoverProps={{
                                        width: 'target',
                                    }}
                                    clearable
                                    minutesStep={15}
                                    required
                                    {...form.getInputProps('window_start')}
                                    styles={{
                                        label: {
                                            fontWeight: 600,
                                            marginBottom: 8,
                                            color: 'var(--mantine-color-gray-8)',
                                        },
                                    }}
                                />
                                <TimePicker
                                    label="End"
                                    withDropdown
                                    format="12h"
                                    popoverProps={{
                                        width: 'target',
                                    }}
                                    clearable
                                    minutesStep={15}
                                    {...form.getInputProps('window_end')}
                                    styles={{
                                        label: {
                                            fontWeight: 600,
                                            marginBottom: 8,
                                            color: 'var(--mantine-color-gray-8)',
                                        },
                                    }}
                                />
                            </Group>

                            <Alert
                                color="brand"
                                variant="light"
                                styles={{
                                    root: {
                                        backgroundColor: 'var(--mantine-color-brand-0)',
                                        borderColor: 'var(--mantine-color-brand-3)',
                                    },
                                }}
                            >
                                <Text
                                    size="sm"
                                    style={{color: 'var(--mantine-color-brand-7)'}}
                                >
                                    Set a start and end time for this session.
                                </Text>
                            </Alert>
                        </Stack>
                    )}
                </Stack>
                <FixedBottom
                    isSubmitting={form.submitting}
                    label={'Add session'}
                />
            </form>
        </PaddingContainer>
    );
};

export default ScheduleEntryForm;
