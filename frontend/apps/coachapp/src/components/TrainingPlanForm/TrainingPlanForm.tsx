import {humanizeError} from '@easy/error-parser';
import {FieldError, Input, Label, TextArea, TextField} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Stack, Textarea, TextInput} from '@mantine/core';
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
  const {data: plan} = useGetTrainingPlan(planId ?? '', {
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

  return (
    <form onSubmit={handleSubmit(onSubmitForm)}>
      <Stack
        gap="xl"
        mt={'md'}
      >
        <Controller
          control={control}
          name="name"
          render={({field, fieldState}) => (
            <TextField
              {...field}
              isInvalid={fieldState.invalid}
              isRequired
            >
              <Label>Plan Name</Label>
              <Input />
              {fieldState.error?.message && <FieldError>{fieldState.error?.message}</FieldError>}
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({field, fieldState}) => (
            <TextField
              {...field}
              isInvalid={fieldState.invalid}
            >
              <Label>Description</Label>
              <TextArea rows={6} />
              {fieldState.error?.message && <FieldError>{fieldState.error?.message}</FieldError>}
            </TextField>
          )}
        />
      </Stack>
    </form>
  );
};

export default TrainingPlanForm;
