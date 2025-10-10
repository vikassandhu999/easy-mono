import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, Textarea, TextInput} from '@mantine/core';
import {useEffect, useMemo} from 'react';
import {Controller, useForm} from 'react-hook-form';

import {Session, SessionType} from '@/api/sessions';

import {SessionFormSchema, SessionFormValues, sessionToFormValues} from './sessionForm';

interface SessionCreateFormProps {
    defaultSessionType: SessionType;
    initialSession?: Session;
    isSubmitting?: boolean;
    onSubmit: (values: SessionFormValues) => Promise<void>;
    submitLabel?: string;
}

export default function SessionCreateForm({defaultSessionType, initialSession, onSubmit}: SessionCreateFormProps) {
    const defaultValues = useMemo<SessionFormValues>(() => {
        return sessionToFormValues(initialSession, defaultSessionType);
    }, [defaultSessionType, initialSession]);

    const {control, handleSubmit, reset} = useForm<SessionFormValues>({
        defaultValues,
        resolver: zodResolver(SessionFormSchema),
    });

    useEffect(() => {
        reset(defaultValues);
    }, [defaultValues, reset]);

    return (
        <form
            onSubmit={handleSubmit(onSubmit, (e) => {
                console.log(e);
            })}
        >
            <Stack
                gap={0}
                w={'100%'}
            >
                <Controller
                    control={control}
                    name="session_type"
                    render={({field}) => (
                        <input
                            {...field}
                            type="hidden"
                            value={field.value}
                        />
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

                {/* <Stack gap="md">
                    <div style={{position: 'relative'}}>
                        <LoadingOverlay visible={isSessionPending && Boolean(currentSessionId)} />

                        {isWorkoutSession && (
                            <>
                                {currentSessionId && sessionError && !session && (
                                    <Alert
                                        color="red"
                                        title="Unable to load session"
                                    >
                                        We couldn't load the latest session information. Please try again.
                                    </Alert>
                                )}

                                <SessionItemsManager
                                    isEditable
                                    items={draftItems}
                                    onItemsChange={handleItemsChange}
                                    onItemsUpdate={() => {
                                        sessionQuery.refetch();
                                    }}
                                    session={session ?? null}
                                    sessionType={fallbackSessionType}
                                />
                            </>
                        )}
                    </div>
                </Stack> */}

                <Button type={'submit'}>{'Create session'}</Button>
            </Stack>
        </form>
    );
}
