import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Stack, Text} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconArrowRight, IconCalendar} from '@tabler/icons-react';
import React from 'react';
import {Controller, useForm} from 'react-hook-form';

import {CreatePlan_zod, CreatePlanProps, Plan, PlanDiscipline, UpdatePlanProps} from '@/api/plans';
import {FormSection} from '@/components/containers/FormSection';

import CEDatePickerInput from '../CEDatePickerInput';
import CETextArea from '../CETextArea';
import CETextInput from '../CETextInput';
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
            <FormSection>
                <Text
                    c="dimmed"
                    fs="italic"
                    size="sm"
                >
                    {typeConfig.description}
                </Text>

                <Stack gap="sm">
                    <Controller
                        control={control}
                        name="name"
                        render={({field, fieldState}) => (
                            <CETextInput
                                {...field}
                                error={fieldState.error?.message}
                                label="Plan Name"
                                placeholder={
                                    typeConfig.form.namePlaceholder || 'e.g. 12-Week Strength Building Program'
                                }
                                radius="xl"
                                variant="filled"
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="description"
                        render={({field, fieldState}) => (
                            <CETextArea
                                {...field}
                                error={fieldState.error?.message}
                                label="Description (Optional)"
                                onChange={(e) => field.onChange(e.target.value || undefined)}
                                placeholder="Add details about this plan, goals, or any important notes..."
                                radius="xl"
                                rows={4}
                                size="md"
                                value={field.value || ''}
                                variant="filled"
                            />
                        )}
                    />

                    <Controller
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
                                placeholder="When does this plan begin?"
                                radius="xl"
                                size="md"
                                value={field.value ? new Date(field.value) : null}
                                valueFormat="MMM DD, YYYY"
                                variant="filled"
                                withAsterisk
                            />
                        )}
                    />

                    <Text
                        c="dimmed"
                        size="xs"
                    >
                        💡 Tip: You can add sessions and customize this plan after creation
                    </Text>
                </Stack>
            </FormSection>
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
