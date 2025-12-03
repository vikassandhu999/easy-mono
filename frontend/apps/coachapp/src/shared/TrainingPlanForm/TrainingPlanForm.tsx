import {humanizeError} from '@easy/error-parser';
import {zodResolver} from '@hookform/resolvers/zod';
import {Loader, Stack, Text, Textarea, TextInput, Title} from '@mantine/core';
import {useEffect, useImperativeHandle} from 'react';
import {Controller, useForm} from 'react-hook-form';

import {
    CreateTrainingPlan,
    CreateTrainingPlan_zod,
    UpdateTrainingPlan,
    useGetTrainingPlan,
} from '@/services/training_plans';
import {notifyError} from '@/utils/notification';

import {getDefaultValues, populateTrainingPlan} from './helper';

export type TrainingPlanFormHandle<TMode extends 'create' | 'update' = 'create'> = TMode extends 'update'
    ? {
          getValues: () => CreateTrainingPlan;
          reset: () => void;
          submit: () => Promise<void>;
      }
    : {
          getValues: () => CreateTrainingPlan;
          reset: () => void;
          submit: () => Promise<void>;
      };

interface TrainingPlanFormPropsBase {
    initialValues?: Partial<CreateTrainingPlan>;
}

export type TrainingPlanFormProps =
    | (TrainingPlanFormPropsBase & {
          planId: string;
          onSubmit?: (values: UpdateTrainingPlan) => Promise<void> | void;
          ref?: React.Ref<TrainingPlanFormHandle<'update'>>;
      })
    | (TrainingPlanFormPropsBase & {
          planId?: never;
          onSubmit?: (values: CreateTrainingPlan) => Promise<void> | void;
          ref?: React.Ref<TrainingPlanFormHandle<'create'>>;
      });

const TrainingPlanForm = ({initialValues, onSubmit, ref, planId}: TrainingPlanFormProps) => {
    const {
        data: plan,
        isLoading: planLoading,
        error: planError,
    } = useGetTrainingPlan(planId ?? '', {
        skip: !planId,
    });

    const form = useForm<CreateTrainingPlan>({
        defaultValues: {
            ...getDefaultValues,
            ...initialValues,
        },
        resolver: zodResolver(CreateTrainingPlan_zod),
    });

    const {
        control,
        handleSubmit,
        reset,
        getValues,
        formState: {errors},
    } = form;

    useEffect(() => {
        if (plan && planId) {
            reset(populateTrainingPlan(plan));
        }
    }, [plan, planId, reset]);

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

    const onSubmitForm = async (values: CreateTrainingPlan) => {
        try {
            if (onSubmit) {
                if (planId) {
                    await (onSubmit as (values: UpdateTrainingPlan) => Promise<void> | void)({
                        ...values,
                        id: planId,
                    });
                } else {
                    await (onSubmit as (values: CreateTrainingPlan) => Promise<void> | void)(values);
                }
            }
        } catch (error) {
            const errMsg = humanizeError(error);
            notifyError(errMsg);
        }
    };

    if (planLoading && planId) {
        return (
            <Stack
                align="center"
                gap="md"
                p="xl"
            >
                <Loader size="lg" />
                <Text c="dimmed">Loading plan...</Text>
            </Stack>
        );
    }

    if (planError && planId) {
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
                    Failed to load plan
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
                            label={
                                <Title
                                    fw="bold"
                                    order={5}
                                >
                                    Plan Name
                                </Title>
                            }
                            placeholder="e.g. Push Pull Legs"
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
                            label={
                                <Title
                                    fw="bold"
                                    order={5}
                                >
                                    Description
                                </Title>
                            }
                            minRows={3}
                            placeholder="Describe the goal and details of this training plan"
                            rows={3}
                            value={field.value || ''}
                        />
                    )}
                />
            </Stack>
        </form>
    );
};

export default TrainingPlanForm;
