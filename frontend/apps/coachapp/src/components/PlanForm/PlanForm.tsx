import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Group, Stack, Text, Textarea, TextInput} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconArrowRight} from '@tabler/icons-react';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';

import {CreatePlan_zod, CreatePlanProps, Plan, PlanDiscipline, UpdatePlanProps} from '@/store/services/plans';

import {PLAN_DISCIPLINES} from '../Configs';
import {FixedBottomBar} from '../containers/FixedBottomBar';

interface PlanFormProps {
    discipline: PlanDiscipline;
    onSubmit: (data: CreatePlanProps | UpdatePlanProps) => Promise<void>;
    plan?: Partial<Plan>;
    submitText: string;
}

const resolveTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const PlanForm: React.FC<PlanFormProps> = ({discipline, onSubmit, plan, submitText}) => {
    const {
        control,
        handleSubmit,
        setValue,
        formState: {isSubmitting},
    } = useForm<CreatePlanProps>({
        defaultValues: {
            name: plan?.name ?? '',
            description: plan?.description ?? undefined,
            discipline,
            kind: plan?.kind ?? 'template',
            recurrence: plan?.recurrence ?? 'weekly',
            duration_weeks: plan?.duration_weeks ?? 12,
            duration_days: plan?.duration_days ?? 30,
            timezone: plan?.timezone ?? resolveTimezone(),
            status: plan?.status ?? 'draft',
            allow_client_edits: plan?.allow_client_edits ?? false,
            template_id: plan?.template_id ?? undefined,
            client_id: plan?.client_id ?? undefined,
            start_date:
                plan?.start_date ??
                (() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return today.toISOString();
                })(),
            end_date: plan?.end_date ?? undefined,
        },
        resolver: zodResolver(CreatePlan_zod),
    });

    React.useEffect(() => {
        setValue('discipline', discipline);
    }, [discipline, setValue]);

    const typeConfig = PLAN_DISCIPLINES[discipline]!;

    // Get discipline-specific copy
    const getCopy = () => {
        if (discipline === 'workout') {
            return {
                descriptionPlaceholder:
                    'Describe the training goals, target muscle groups, progression approach, or any special considerations...',
                infoMessage: 'You can add workout sessions and customize exercises after creation',
            };
        }
        return {
            descriptionPlaceholder:
                'Describe the nutrition goals, meal approach, dietary preferences, or any special considerations...',
            infoMessage: 'You can add meal sessions and customize recipes after creation',
        };
    };

    const copy = getCopy();

    const handleFormSubmit = async (values: CreatePlanProps) => {
        try {
            const payload: CreatePlanProps = {
                ...values,
                discipline,
                kind: values.kind ?? 'template',
                status: values.status ?? 'draft',
                timezone: values.timezone ?? resolveTimezone(),
                description: values.description?.trim() ? values.description.trim() : undefined,
            };

            if (payload.recurrence === 'weekly') {
                payload.duration_weeks = payload.duration_weeks ?? 12;
                payload.duration_days = undefined;
            } else if (payload.recurrence === 'daily') {
                payload.duration_days = payload.duration_days ?? 30;
                payload.duration_weeks = undefined;
            } else {
                payload.duration_days = undefined;
                payload.duration_weeks = undefined;
            }

            await onSubmit(payload);
        } catch (error) {
            notifications.show({
                autoClose: 3000,
                color: 'red',
                message: 'Failed to create plan. Please try again.',
                title: 'Error',
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
            <Stack
                content="flex-start"
                gap="lg"
            >
                {/* Plan Type Badge */}
                <Group
                    align="center"
                    gap="md"
                    p="md"
                    style={{
                        backgroundColor: 'var(--mantine-color-gray-0)',
                        borderRadius: 'var(--mantine-radius-md)',
                    }}
                >
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            backgroundColor: typeConfig.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <typeConfig.icon
                            color={typeConfig.iconColor}
                            size={24}
                            stroke={1.5}
                        />
                    </div>
                    <Stack gap={4}>
                        <Text
                            fw={600}
                            size="sm"
                        >
                            {typeConfig.label} Plan
                        </Text>
                        <Text
                            c="dimmed"
                            size="xs"
                        >
                            {typeConfig.description}
                        </Text>
                    </Stack>
                </Group>

                {/* Basic Information Section */}
                <Stack gap="md">
                    <Controller
                        control={control}
                        name="name"
                        render={({field, fieldState}) => (
                            <TextInput
                                {...field}
                                error={fieldState.error?.message}
                                label="Name"
                                placeholder={typeConfig.form.namePlaceholder || 'e.g., Weight Loss Nutrition Plan'}
                                radius="md"
                                size="md"
                                variant="filled"
                                withAsterisk
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="description"
                        render={({field, fieldState}) => (
                            <Textarea
                                {...field}
                                error={fieldState.error?.message}
                                label="Description (Optional)"
                                onChange={(e) => field.onChange(e.target.value || undefined)}
                                placeholder={copy.descriptionPlaceholder}
                                radius="md"
                                rows={4}
                                size="md"
                                value={field.value || ''}
                                variant="filled"
                            />
                        )}
                    />
                </Stack>

                {/* Schedule Section */}
                <Stack gap="md">
                    {/* <Controller
                        control={control}
                        name="start_date"
                        render={({field, fieldState}) => (
                            <CEDatePickerInput
                                error={fieldState.error?.message}
                                label="Start Date"
                                leftSection={<IconCalendar size={18} />}
                                minDate={new Date()}
                                onChange={(date) => {
                                    if (date) {
                                        // Convert to RFC3339 format with timezone
                                        const dateObj = new Date(date);
                                        dateObj.setHours(0, 0, 0, 0);
                                        field.onChange(dateObj.toISOString());
                                    }
                                }}
                                placeholder="Select start date"
                                radius="md"
                                size="md"
                                value={field.value ? new Date(field.value) : null}
                                valueFormat="MMM DD, YYYY"
                                variant="filled"
                                withAsterisk
                            />
                        )}
                    /> */}
                </Stack>
            </Stack>

            <FixedBottomBar>
                <Button
                    fullWidth
                    loading={isSubmitting}
                    radius="xl"
                    rightSection={<IconArrowRight size={18} />}
                    size="lg"
                    type="submit"
                >
                    {submitText}
                </Button>
            </FixedBottomBar>
        </form>
    );
};
