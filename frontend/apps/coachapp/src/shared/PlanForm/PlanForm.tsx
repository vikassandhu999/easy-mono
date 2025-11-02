import {zodResolver} from '@hookform/resolvers/zod';
import {Button, Group, Stack, Text, Textarea, TextInput, ThemeIcon, useMantineTheme} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconArrowRight, IconInfoCircle} from '@tabler/icons-react';
import React from 'react';
import {useForm} from 'react-hook-form';

import {CreatePlan_zod, CreatePlanProps, Plan, PlanDiscipline, UpdatePlanProps} from '@/services/plans';

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
    const theme = useMantineTheme();

    const {handleSubmit, setValue, formState, register, getValues} = useForm<CreatePlanProps>({
        defaultValues: {
            name: plan?.name ?? '',
            description: plan?.description ?? undefined,
            discipline,
            kind: plan?.kind ?? 'template',
            recurrence: plan?.recurrence ?? 'weekly',
            duration_weeks: plan?.duration_weeks ?? 1,
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

    React.useEffect(() => {
        console.log(getValues('duration_weeks'));
        console.log(formState.errors);
    }, [formState, getValues]);

    const typeConfig = PLAN_DISCIPLINES[discipline]!;

    const getCopy = () => {
        if (discipline === 'workout') {
            return {
                infoMessage: 'Add and customize workout sessions after creating the plan.',
            };
        }
        return {
            infoMessage: 'Add and customize meal sessions after creating the plan.',
        };
    };

    const copy = getCopy();

    const baseNameDescription = typeConfig.form.nameDescription ?? 'Give the plan a clear, outcome-focused name.';
    const exampleNameDescription = typeConfig.form.namePlaceholder
        ? ` Example: ${typeConfig.form.namePlaceholder.replace('e.g., ', '')}.`
        : '';
    const planNameDescription = `${baseNameDescription}${exampleNameDescription}`;

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
                payload.duration_weeks = payload.duration_weeks ?? 1;
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
                message: 'Unable to create plan. Please check your connection and try again.',
                title: 'Plan creation failed',
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
            <Stack
                gap="lg"
                px="md"
                py="md"
            >
                {/* Decorative Badge  */}
                <Group
                    align="center"
                    bg="gray.0"
                    gap="md"
                >
                    <ThemeIcon
                        color={typeConfig.color}
                        size="xl"
                    >
                        <typeConfig.icon
                            color={typeConfig.iconColor}
                            size={24}
                            stroke={1.5}
                        />
                    </ThemeIcon>

                    <Stack gap="xs">
                        <Text
                            fw={600}
                            size="md"
                        >
                            {typeConfig.label} plan
                        </Text>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            {typeConfig.description}
                        </Text>
                    </Stack>
                </Group>

                <Group
                    justify="flex-start"
                    wrap="nowrap"
                >
                    <IconInfoCircle
                        color={theme.colors.gray[6]}
                        size={18}
                    />
                    <Text
                        c="dimmed"
                        size="sm"
                    >
                        {copy.infoMessage}
                    </Text>
                </Group>

                {/* Basic Form */}
                <Stack gap="md">
                    <TextInput
                        {...register('name')}
                        description={planNameDescription}
                        error={formState.errors?.name?.message}
                        label="Plan name"
                        withAsterisk
                    />

                    <Textarea
                        {...register('description')}
                        description="Provide context on goals, progression, or special considerations for the plan."
                        error={formState.errors?.description?.message}
                        label="Plan description (optional)"
                        rows={4}
                    />
                </Stack>
            </Stack>

            <FixedBottomBar>
                <Button
                    fullWidth
                    loading={formState.isSubmitting}
                    radius="xl"
                    rightSection={<IconArrowRight size={20} />}
                    size="lg"
                    type="submit"
                >
                    {submitText}
                </Button>
            </FixedBottomBar>
        </form>
    );
};
