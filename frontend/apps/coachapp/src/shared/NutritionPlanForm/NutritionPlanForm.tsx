import {humanizeError} from '@easy/error-parser';
import {zodResolver} from '@hookform/resolvers/zod';
import {Loader, Stack, TagsInput, Text, Textarea, TextInput} from '@mantine/core';
import {useEffect, useImperativeHandle} from 'react';
import {Controller, useForm} from 'react-hook-form';

import {
  CreateNutritionPlan,
  CreateNutritionPlan_zod,
  UpdateNutritionPlan,
  useGetNutritionPlan,
} from '@/services/nutrition_plans';
import {notifyError} from '@/utils/notification';

import {getDefaultValues, populateNutritionPlan} from './helper';

// Discriminated union for form handle based on mode
export type NutritionPlanFormHandle<TMode extends 'create' | 'update' = 'create'> = TMode extends 'update'
  ? {
      getValues: () => CreateNutritionPlan;
      reset: () => void;
      submit: () => Promise<void>;
    }
  : {
      getValues: () => CreateNutritionPlan;
      reset: () => void;
      submit: () => Promise<void>;
    };

// Base props shared by both modes
interface NutritionPlanFormPropsBase {
  initialValues?: Partial<CreateNutritionPlan>;
}

// Discriminated union for props based on whether planId exists
export type NutritionPlanFormProps =
  | (NutritionPlanFormPropsBase & {
      planId: string;
      onSubmit?: (values: UpdateNutritionPlan) => Promise<void> | void;
      ref?: React.Ref<NutritionPlanFormHandle<'update'>>;
    })
  | (NutritionPlanFormPropsBase & {
      planId?: never;
      onSubmit?: (values: CreateNutritionPlan) => Promise<void> | void;
      ref?: React.Ref<NutritionPlanFormHandle<'create'>>;
    });

const NutritionPlanForm = ({initialValues, onSubmit, ref, planId}: NutritionPlanFormProps) => {
  // Fetch plan if planId is provided
  const {
    data: plan,
    isLoading: planLoading,
    error: planError,
  } = useGetNutritionPlan(planId ?? '', {
    skip: !planId,
  });

  const form = useForm<CreateNutritionPlan>({
    defaultValues: {
      ...getDefaultValues,
      ...initialValues,
    },
    resolver: zodResolver(CreateNutritionPlan_zod),
  });

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    formState: {errors},
  } = form;

  // Populate form when plan data is loaded
  useEffect(() => {
    if (plan && planId) {
      reset(populateNutritionPlan(plan));
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

  const onSubmitForm = async (values: CreateNutritionPlan) => {
    try {
      if (onSubmit) {
        // If planId exists, we're in update mode and need to include the id
        if (planId) {
          await (onSubmit as (values: UpdateNutritionPlan) => Promise<void> | void)({
            ...values,
            id: planId,
          });
        } else {
          await (onSubmit as (values: CreateNutritionPlan) => Promise<void> | void)(values);
        }
      }
    } catch (error) {
      const errMsg = humanizeError(error);
      notifyError(errMsg);
    }
  };

  // Loading state
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

  // Error state
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
              label={'Plan Name'}
              placeholder="e.g. Muscle Building - 4 Weeks"
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
              placeholder="Describe the goal and details of this nutrition plan"
              rows={3}
              value={field.value || ''}
            />
          )}
        />

        <Controller
          control={control}
          name="tags"
          render={({field}) => (
            <TagsInput
              {...field}
              clearable
              data={[]}
              error={errors.tags?.message}
              label={'Tags'}
              placeholder="Add tags (e.g. keto, weight-loss)"
              size={'md'}
              value={field.value}
            />
          )}
        />
      </Stack>
    </form>
  );
};

export default NutritionPlanForm;
