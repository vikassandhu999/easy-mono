import {zodResolver} from '@hookform/resolvers/zod';
import {Badge, Divider, Stack, Text, Textarea, TextInput} from '@mantine/core';
import {useEffect, useMemo} from 'react';
import {Controller, useForm} from 'react-hook-form';

import {Session, SessionType} from '@/api/sessions';

import {createDefaultFormValues, SessionFormSchema, SessionFormValues, sessionToFormValues} from './sessionForm';
import InstructionSettingsFields from './sessionTypes/InstructionSettingsFields';
import MealSettingsFields from './sessionTypes/MealSettingsFields';
import MeasurementSettingsFields from './sessionTypes/MeasurementSettingsFields';

const formatSessionTypeLabel = (value: SessionType): string =>
    value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

interface SessionCreateFormProps {
    defaultSessionType: SessionType;
    initialSession?: Session;
    isSubmitting?: boolean;
    onSubmit: (values: SessionFormValues) => Promise<void>;
    submitLabel?: string;
}

export default function SessionCreateForm({defaultSessionType, initialSession, onSubmit}: SessionCreateFormProps) {
    const defaultValues = useMemo<SessionFormValues>(() => {
        if (initialSession) {
            return sessionToFormValues(initialSession);
        }
        return createDefaultFormValues(defaultSessionType);
    }, [defaultSessionType, initialSession]);

    const {control, handleSubmit, reset, watch} = useForm<SessionFormValues>({
        defaultValues,
        resolver: zodResolver(SessionFormSchema),
    });

    const sessionType = watch('session_type');
    const sessionTypeLabel = useMemo(() => formatSessionTypeLabel(sessionType), [sessionType]);

    useEffect(() => {
        reset(defaultValues);
    }, [defaultValues, reset]);

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Stack
                gap={0}
                w={'100%'}
            >
                <Controller
                    control={control}
                    name="session_type"
                    render={({field}) => (
                        <Stack
                            gap={4}
                            mb={'md'}
                        >
                            <input
                                {...field}
                                type="hidden"
                                value={field.value}
                            />
                            <Text
                                c="dimmed"
                                fw={600}
                                size="sm"
                            >
                                Type
                            </Text>
                            <Badge
                                color="blue"
                                variant="light"
                                w="fit-content"
                            >
                                {sessionTypeLabel}
                            </Badge>
                        </Stack>
                    )}
                />

                <Controller
                    control={control}
                    name="name"
                    render={({field, fieldState}) => (
                        <TextInput
                            {...field}
                            error={fieldState.error?.message}
                            label="Name"
                            placeholder="Enter name"
                            required
                            size="sm"
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="description"
                    render={({field, fieldState}) => (
                        <Textarea
                            {...field}
                            autosize
                            error={fieldState.error?.message}
                            label="Description"
                            maxRows={4}
                            minRows={2}
                            placeholder="Enter session description"
                            size="sm"
                            value={field.value ?? ''}
                        />
                    )}
                />

                {/* <Controller
                    control={control}
                    name="duration_minutes"
                    render={({field, fieldState}) => (
                        <NumberInput
                            {...field}
                            error={fieldState.error?.message}
                            label="Duration (minutes)"
                            max={480}
                            min={1}
                            onChange={(value) => field.onChange(typeof value === 'number' ? value : undefined)}
                            placeholder="30"
                            size="sm"
                            value={field.value ?? undefined}
                        />
                    )}
                /> */}

                {/* {sessionType === 'workout' && (
                        <>
                            <Divider
                                label="Workout Settings"
                                labelPosition="left"
                            />
                            <WorkoutSettingsFields control={control} />
                        </>
                    )} */}

                {sessionType === 'meal' && (
                    <>
                        <Divider
                            label="Meal Settings"
                            labelPosition="left"
                        />
                        <MealSettingsFields control={control} />
                    </>
                )}

                {sessionType === 'instruction' && (
                    <>
                        <Divider
                            label="Instruction Settings"
                            labelPosition="left"
                        />
                        <InstructionSettingsFields control={control} />
                    </>
                )}

                {sessionType === 'measurement' && (
                    <>
                        <Divider
                            label="Measurement Settings"
                            labelPosition="left"
                        />
                        <MeasurementSettingsFields control={control} />
                    </>
                )}
            </Stack>
            {/* <FixedBottom
                    isSubmitting={control._formState.isSubmitting}
                    label={'Save'}
                    onSubmit={handleSubmit(onSubmit)}
                /> */}
        </form>
    );
}
