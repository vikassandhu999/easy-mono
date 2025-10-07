import {Radio, Stack, TextInput} from '@mantine/core';
import {useForm} from '@mantine/form';
import {notifications} from '@mantine/notifications';
import React from 'react';

import {CreatePlanProps, Plan, PlanDiscipline, UpdatePlanProps} from '@/api/plans';
import {FixedBottom} from '@/components/containers/FixedBottom';
import {FormSection} from '@/components/containers/FormSection';

import {PLAN_DISCIPLINES} from '../Configs';

interface PlanFormProps {
    discipline: PlanDiscipline;
    onSubmit: (data: CreatePlanProps | UpdatePlanProps) => Promise<void>;
    plan?: Partial<Plan>;
    submitText: string;
}

const recurrenceOptions = [
    {description: 'Design 1 day; repeats every day', label: 'Daily', value: 'daily'},
    {description: 'Design 1 week; repeats every week', label: 'Weekly', value: 'weekly'},
];

const resolveTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const PlanForm: React.FC<PlanFormProps> = ({discipline, onSubmit, plan, submitText}) => {
    const form = useForm<CreatePlanProps>({
        initialValues: {
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
            start_date: plan?.start_date ?? undefined,
            end_date: plan?.end_date ?? undefined,
        },
        validate: {
            name: (value) => {
                const trimmed = value?.trim() ?? '';
                if (trimmed.length < 2) {
                    return 'Plan name must be at least 2 characters';
                }
                if (trimmed.length > 255) {
                    return 'Plan name must be less than 255 characters';
                }
                return null;
            },
            recurrence: (value) => {
                if (!value) {
                    return 'Please select a recurrence';
                }
                return null;
            },
            duration_weeks: (value, values) => {
                if (values.recurrence !== 'weekly') {
                    return null;
                }
                if (!value || value < 1 || value > 104) {
                    return 'Weekly plans must be between 1 and 104 weeks';
                }
                return null;
            },
            duration_days: (value, values) => {
                if (values.recurrence !== 'daily') {
                    return null;
                }
                if (!value || value < 1 || value > 730) {
                    return 'Daily plans must be between 1 and 730 days';
                }
                return null;
            },
        },
    });

    React.useEffect(() => {
        form.setFieldValue('discipline', discipline);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [discipline]);

    const typeConfig = PLAN_DISCIPLINES[discipline]!;

    const handleFormSubmit = async (values: CreatePlanProps) => {
        if (form.validate().hasErrors) {
            notifications.show({
                autoClose: 1000,
                color: 'red',
                message: 'Please fix the errors in the form',
                position: 'top-center',
                title: 'Validation Error',
            });
            return;
        }

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
    };

    return (
        <form onSubmit={form.onSubmit(handleFormSubmit)}>
            <FormSection>
                <TextInput
                    description={typeConfig.form.nameDescription}
                    label="Name"
                    placeholder={typeConfig.form.namePlaceholder}
                    required
                    size={'md'}
                    withAsterisk
                    {...form.getInputProps('name')}
                />

                <Radio.Group
                    label="Recurrence"
                    required
                    size={'md'}
                    withAsterisk
                    {...form.getInputProps('recurrence')}
                >
                    <Stack
                        gap={'xs'}
                        mt="sm"
                    >
                        {recurrenceOptions.map((option) => (
                            <Radio
                                description={option.description}
                                key={option.value}
                                label={option.label}
                                size={'md'}
                                value={option.value}
                            />
                        ))}
                    </Stack>
                </Radio.Group>
            </FormSection>
            <FixedBottom
                isSubmitting={form.submitting}
                label={submitText}
                onSubmit={() => handleFormSubmit(form.values)}
            />
        </form>
    );
};
