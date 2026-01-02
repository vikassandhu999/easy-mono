import {humanizeError} from '@easy/error-parser';
import {zodResolver} from '@hookform/resolvers/zod';
import {Loader, Stack, Text, Textarea, TextInput, Title} from '@mantine/core';
import {useEffect, useImperativeHandle} from 'react';
import {Controller, useForm} from 'react-hook-form';

import {CreateExercise, CreateExercise_zod, UpdateExercise, useGetExercise} from '@/services/exercises';
import {notifyError} from '@/utils/notification';

import EquipmentField from './EquipmentField';
import ForceField from './ForceField';
import {getDefaultValues, populateExercise} from './helper';
import MechanicsField from './MechanicsField';
import MuscleField from './MuscleField';

// Discriminated union for form handle based on mode
export type ExerciseFormHandle<TMode extends 'create' | 'update' = 'create'> = TMode extends 'update'
    ? {
          getValues: () => CreateExercise;
          reset: () => void;
          submit: () => Promise<void>;
      }
    : {
          getValues: () => CreateExercise;
          reset: () => void;
          submit: () => Promise<void>;
      };

// Base props shared by both modes
interface ExerciseFormPropsBase {
    initialValues?: Partial<CreateExercise>;
}

// Discriminated union for props based on whether exerciseId exists
export type ExerciseFormProps =
    | (ExerciseFormPropsBase & {
          exerciseId: string;
          onSubmit?: (values: UpdateExercise) => Promise<void> | void;
          ref?: React.Ref<ExerciseFormHandle<'update'>>;
      })
    | (ExerciseFormPropsBase & {
          exerciseId?: never;
          onSubmit?: (values: CreateExercise) => Promise<void> | void;
          ref?: React.Ref<ExerciseFormHandle<'create'>>;
      });

const ExerciseForm = ({initialValues, onSubmit, ref, exerciseId}: ExerciseFormProps) => {
    // Fetch exercise if exerciseId is provided
    const {
        data: exercise,
        isLoading: exerciseLoading,
        error: exerciseError,
    } = useGetExercise(exerciseId ?? '', {
        skip: !exerciseId,
    });

    const form = useForm<CreateExercise>({
        defaultValues: {
            ...getDefaultValues,
            ...initialValues,
        },
        resolver: zodResolver(CreateExercise_zod),
    });

    const {
        control,
        handleSubmit,
        reset,
        getValues,
        formState: {errors},
    } = form;

    // Populate form when exercise data is loaded
    useEffect(() => {
        if (exercise && exerciseId) {
            reset(populateExercise(exercise));
        }
    }, [exercise, exerciseId, reset]);

    useImperativeHandle(ref, () => ({
        submit: async () => {
            await handleSubmit(onSubmitForm)();
        },
        reset: () => {
            reset();
        },
        getValues: () => {
            return getValues();
        },
    }));

    const onSubmitForm = async (values: CreateExercise) => {
        try {
            if (onSubmit) {
                // If exerciseId exists, we're in update mode and need to include the id
                if (exerciseId) {
                    await (onSubmit as (values: UpdateExercise) => Promise<void> | void)({
                        ...values,
                        id: exerciseId,
                    });
                } else {
                    await (onSubmit as (values: CreateExercise) => Promise<void> | void)(values);
                }
            }
        } catch (error) {
            const errMsg = humanizeError(error);
            notifyError(errMsg);
        }
    };

    // Loading state
    if (exerciseLoading && exerciseId) {
        return (
            <Stack
                align="center"
                gap="md"
                p="xl"
            >
                <Loader size="lg" />
                <Text c="dimmed">Loading exercise...</Text>
            </Stack>
        );
    }

    // Error state
    if (exerciseError && exerciseId) {
        return (
            <Stack
                align="center"
                gap="md"
                p="xl"
            >
                <Text
                    c="red"
                    size="lg"
                >
                    Failed to load exercise
                </Text>
                <Text
                    c="dimmed"
                    size="sm"
                >
                    Please try again or contact support.
                </Text>
            </Stack>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmitForm)}>
            <Stack gap="xl">
                <Controller
                    control={control}
                    name="name"
                    render={({field}) => (
                        <TextInput
                            {...field}
                            error={errors.name?.message}
                            label={'Name'}
                            placeholder="Bench Press"
                            size={'md'}
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="description"
                    render={({field}) => (
                        <Textarea
                            {...field}
                            error={errors.description?.message}
                            label={'Description'}
                            minRows={3}
                            placeholder="Brief description of the exercise"
                            size={'md'}
                            value={field.value || ''}
                        />
                    )}
                />

                <MechanicsField form={form} />

                <ForceField form={form} />

                <MuscleField form={form} />

                <EquipmentField form={form} />

                <Controller
                    control={control}
                    name="instructions"
                    render={({field}) => (
                        <Textarea
                            {...field}
                            error={errors.instructions?.message}
                            label={
                                <Title
                                    fw="bold"
                                    order={5}
                                >
                                    Instructions
                                </Title>
                            }
                            minRows={5}
                            placeholder="Step-by-step instructions"
                            value={field.value || ''}
                        />
                    )}
                />
            </Stack>
        </form>
    );
};

export default ExerciseForm;
