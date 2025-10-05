import {
    Alert,
    Badge,
    Button,
    Card,
    Divider,
    Group,
    LoadingOverlay,
    SimpleGrid,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconAlertCircle, IconArrowLeft, IconPencil} from '@tabler/icons-react';
import {useCallback, useMemo} from 'react';
import {Navigate, useNavigate, useParams} from 'react-router';

import {CreatePlanProps, Plan, UpdatePlanProps} from '@/api/plans';
import {PLAN_DISCIPLINES, PLAN_STATUS} from '@/components/Configs';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {PlanForm} from '@/components/PlanForm/PlanForm';
import {useGetPlanQuery, useUpdatePlan} from '@/store/services/plans';

type PlanDetailPageMode = 'edit' | 'view';

type PlanDetailPageProps = {
    mode?: PlanDetailPageMode;
};

const RECURRENCE_LABEL: Record<Plan['recurrence'], string> = {
    calendar: 'Calendar',
    daily: 'Daily',
    weekly: 'Weekly',
};

const KIND_LABEL: Record<Plan['kind'], string> = {
    client_copy: 'Client Copy',
    template: 'Template',
};

function getDurationText(plan: Plan): string {
    switch (plan.recurrence) {
        case 'weekly':
            return plan.duration_weeks ? `${plan.duration_weeks} weeks` : 'Weekly cadence';
        case 'daily':
            return plan.duration_days ? `${plan.duration_days} days` : 'Daily cadence';
        case 'calendar':
        default:
            return 'Calendar-based';
    }
}

function formatDate(value?: null | string) {
    if (!value) {
        return '—';
    }

    try {
        return new Intl.DateTimeFormat(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(new Date(value));
    } catch (error) {
        console.warn('Failed to format date', error);
        return value;
    }
}

const InfoItem = ({label, value}: {label: string; value: string}) => (
    <Stack gap={4}>
        <Text
            c="gray.6"
            size="sm"
            tt="uppercase"
        >
            {label}
        </Text>
        <Text
            c="dark.6"
            fw={600}
        >
            {value}
        </Text>
    </Stack>
);

export default function PlanDetailPage({mode = 'view'}: PlanDetailPageProps) {
    const {id} = useParams<{id: string}>();
    const navigate = useNavigate();
    const isEditMode = mode === 'edit';

    const {
        data: plan,
        error,
        isError,
        isFetching,
        isLoading,
        refetch,
    } = useGetPlanQuery(id!, {
        skip: !id,
    });

    const [updatePlan, {isLoading: isUpdating}] = useUpdatePlan();

    const disciplineConfig = plan ? PLAN_DISCIPLINES[plan.discipline] : undefined;
    const statusConfig = plan ? PLAN_STATUS[plan.status] : undefined;

    const headerTitle = useMemo(() => {
        if (isEditMode) {
            return plan ? `Edit "${plan.name}"` : 'Edit Plan';
        }

        return plan ? plan.name : 'Plan Details';
    }, [isEditMode, plan]);

    const handleBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    const handleEditNavigate = useCallback(() => {
        if (!plan) {
            return;
        }

        navigate(`/plans/${plan.id}/edit`);
    }, [navigate, plan]);

    const handleSaveChanges = useCallback(
        async (values: CreatePlanProps | UpdatePlanProps) => {
            if (!plan) {
                return;
            }

            try {
                const payload: UpdatePlanProps = {
                    ...values,
                    id: plan.id,
                    discipline: plan.discipline,
                };

                await updatePlan(payload).unwrap();
                await refetch();

                notifications.show({
                    autoClose: 1500,
                    color: 'green',
                    message: 'Plan updated successfully',
                    title: 'Saved',
                });
            } catch (updateError) {
                console.error('Failed to update plan', updateError);
                notifications.show({
                    autoClose: 2500,
                    color: 'red',
                    message: updateError instanceof Error ? updateError.message : 'Failed to update plan',
                    title: 'Update failed',
                });
            }
        },
        [plan, refetch, updatePlan],
    );

    if (!id) {
        return (
            <Navigate
                replace
                to="/plans"
            />
        );
    }

    if (isLoading) {
        return (
            <PaddingContainer>
                <LoadingOverlay visible />
            </PaddingContainer>
        );
    }

    if (isError || !plan) {
        return (
            <PaddingContainer>
                <Alert
                    color="red"
                    icon={<IconAlertCircle size={16} />}
                    title="Error"
                >
                    {error?.message || 'Failed to load plan'}
                </Alert>
            </PaddingContainer>
        );
    }

    return (
        <PagePaper>
            <HeadingContainer
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingBlock: 'var(--ce-size-sm)',
                    paddingInline: 'var(--ce-size-lg)',
                }}
                withBorder={false}
            >
                <Group gap="sm">
                    <Button
                        color="dark"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={handleBack}
                        variant="subtle"
                    >
                        Back
                    </Button>
                    <Title order={3}>{headerTitle}</Title>
                </Group>

                {!isEditMode ? (
                    <Button
                        leftSection={<IconPencil size={16} />}
                        onClick={handleEditNavigate}
                        variant="light"
                    >
                        Edit plan
                    </Button>
                ) : null}
            </HeadingContainer>

            <PaddingContainer style={{padding: 'var(--ce-size-lg)'}}>
                <div style={{position: 'relative'}}>
                    {isFetching ? <LoadingOverlay visible /> : null}

                    {isEditMode ? (
                        <Card
                            padding="xl"
                            radius="lg"
                            shadow="xs"
                            withBorder
                        >
                            <PlanForm
                                discipline={plan.discipline}
                                onSubmit={handleSaveChanges}
                                plan={plan}
                                submitText={isUpdating ? 'Saving…' : 'Save changes'}
                            />
                        </Card>
                    ) : (
                        <Stack gap="lg">
                            <Card
                                padding="xl"
                                radius="lg"
                                shadow="xs"
                                withBorder
                            >
                                <Stack gap="md">
                                    <Group gap="xs">
                                        <Title order={2}>{plan.name}</Title>
                                        {statusConfig ? (
                                            <Badge
                                                color={statusConfig.color}
                                                size="md"
                                                tt="capitalize"
                                                variant="light"
                                            >
                                                {statusConfig.label}
                                            </Badge>
                                        ) : null}
                                        <Badge
                                            color="gray"
                                            size="md"
                                            variant="light"
                                        >
                                            {KIND_LABEL[plan.kind]}
                                        </Badge>
                                    </Group>

                                    {disciplineConfig ? (
                                        <Badge
                                            color={disciplineConfig.color}
                                            size="lg"
                                            tt="capitalize"
                                            variant="light"
                                        >
                                            {disciplineConfig.label}
                                        </Badge>
                                    ) : null}

                                    <Text c="gray.7">{plan.description?.trim() || 'No description yet.'}</Text>

                                    <Divider my="sm" />

                                    <SimpleGrid
                                        cols={{base: 1, sm: 2}}
                                        spacing="xl"
                                    >
                                        <InfoItem
                                            label="Recurrence"
                                            value={RECURRENCE_LABEL[plan.recurrence]}
                                        />
                                        <InfoItem
                                            label="Duration"
                                            value={getDurationText(plan)}
                                        />
                                        <InfoItem
                                            label="Client edits"
                                            value={plan.allow_client_edits ? 'Allowed' : 'Not allowed'}
                                        />
                                        <InfoItem
                                            label="Timezone"
                                            value={plan.timezone ?? 'Not set'}
                                        />
                                        <InfoItem
                                            label="Start date"
                                            value={formatDate(plan.start_date)}
                                        />
                                        <InfoItem
                                            label="End date"
                                            value={formatDate(plan.end_date)}
                                        />
                                    </SimpleGrid>

                                    <Divider my="sm" />

                                    <SimpleGrid
                                        cols={{base: 1, sm: 2}}
                                        spacing="xl"
                                    >
                                        <InfoItem
                                            label="Created"
                                            value={formatDate(plan.created_at)}
                                        />
                                        <InfoItem
                                            label="Last updated"
                                            value={formatDate(plan.updated_at)}
                                        />
                                    </SimpleGrid>
                                </Stack>
                            </Card>
                        </Stack>
                    )}
                </div>
            </PaddingContainer>
        </PagePaper>
    );
}
