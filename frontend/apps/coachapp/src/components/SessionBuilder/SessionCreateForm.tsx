import {zodResolver} from '@hookform/resolvers/zod';
import {Badge, Divider, NumberInput, Stack, Text, Textarea, TextInput} from '@mantine/core';
import {useEffect, useMemo} from 'react';
import {Controller, useForm} from 'react-hook-form';

import {Session, SessionType} from '@/api/sessions';
import PaddingContainer from '@/components/containers/PaddingContainer';

import {FixedBottom} from '../containers/FixedBottom';
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
        <PaddingContainer
            paddingX="sm"
            paddingY="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                <Stack gap="xs">
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
                                    Session type
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
                                label="Session Name"
                                placeholder="Enter session name"
                                required
                                size="md"
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
                                value={field.value ?? ''}
                            />
                        )}
                    />

                    <Controller
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
                                size="md"
                                value={field.value ?? undefined}
                            />
                        )}
                    />

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
                <FixedBottom
                    isSubmitting={control._formState.isSubmitting}
                    label={'Save'}
                    onSubmit={handleSubmit(onSubmit)}
                />
            </form>
        </PaddingContainer>
    );
}
