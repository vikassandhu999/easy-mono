import {humanizeError} from '@easy/error-parser';
import {Badge, Button, Group, Loader, Stack, Text, Title} from '@mantine/core';
import {modals} from '@mantine/modals';
import {IconEdit, IconHammer, IconTrash} from '@tabler/icons-react';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {useDeleteTrainingPlan, useGetTrainingPlan} from '@/services/training_plans';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {notifyError} from '@/utils/notification';

const TrainingPlanViewDrawer = () => {
    const {closeDrawer, getDrawerParams, openDrawer} = useParamsDrawer({});
    const {training_plan_id} = getDrawerParams();

    const {data: plan, isLoading, error} = useGetTrainingPlan(training_plan_id ?? '', {skip: !training_plan_id});
    const [deletePlan, {isLoading: isDeleting}] = useDeleteTrainingPlan();

    const handleBuild = () => {
        if (plan) {
            openDrawer(DRAWER_KEYS.TRAINING_PLAN_BUILDER, {
                training_plan_id: plan.id,
            });
        }
    };

    const handleEdit = () => {
        if (plan) {
            openDrawer(DRAWER_KEYS.TRAINING_PLAN_EDIT, {training_plan_id: plan.id});
        }
    };

    const handleDelete = () => {
        modals.openConfirmModal({
            title: 'Delete Training Plan',
            children: (
                <Text size="sm">
                    Are you sure you want to delete <strong>{plan?.name}</strong>? This action cannot be undone.
                </Text>
            ),
            labels: {confirm: 'Delete', cancel: 'Cancel'},
            confirmProps: {color: 'red'},
            onConfirm: async () => {
                if (!plan) return;
                try {
                    await deletePlan(plan.id).unwrap();
                    closeDrawer();
                } catch (err) {
                    const errMsg = humanizeError(err);
                    notifyError(errMsg);
                }
            },
        });
    };

    if (isLoading) {
        return (
            <AutoDrawer
                content={
                    <Stack
                        align="center"
                        gap="md"
                        p="xl"
                    >
                        <Loader size="lg" />
                        <Text c="dimmed">Loading training plan...</Text>
                    </Stack>
                }
                onClose={closeDrawer}
                title="Training Plan"
            />
        );
    }

    if (error || !plan) {
        return (
            <AutoDrawer
                content={
                    <Stack
                        align="center"
                        gap="md"
                        p="xl"
                    >
                        <Text
                            c="red"
                            size="lg"
                        >
                            Failed to load training plan
                        </Text>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Please try again or contact support.
                        </Text>
                    </Stack>
                }
                onClose={closeDrawer}
                title="Training Plan"
            />
        );
    }

    // Count total workouts and exercises
    const totalWorkouts = plan.workouts?.length ?? 0;
    const totalExercises = plan.workouts?.reduce((sum, workout) => sum + (workout.elements?.length ?? 0), 0) ?? 0;

    return (
        <AutoDrawer
            actions={
                <Stack
                    gap="xs"
                    w="100%"
                >
                    {/* Primary action - Build */}
                    <Button
                        color="brand"
                        fullWidth
                        leftSection={<IconHammer size={16} />}
                        onClick={handleBuild}
                        radius="xl"
                        size="sm"
                    >
                        Build Plan
                    </Button>

                    {/* Secondary actions */}
                    <Group
                        grow
                        w="100%"
                    >
                        <Button
                            color="blue"
                            leftSection={<IconEdit size={16} />}
                            onClick={handleEdit}
                            radius="xl"
                            size="sm"
                            variant="light"
                        >
                            Edit
                        </Button>

                        <Button
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            loading={isDeleting}
                            onClick={handleDelete}
                            radius="xl"
                            size="sm"
                            variant="light"
                        >
                            Delete
                        </Button>
                    </Group>
                </Stack>
            }
            content={
                <Stack gap="lg">
                    {/* Name */}
                    <div>
                        <Title
                            fw="bold"
                            order={5}
                        >
                            Name
                        </Title>
                        <Text size="sm">{plan.name}</Text>
                    </div>

                    {/* Description */}
                    <div>
                        <Title
                            fw="bold"
                            order={5}
                        >
                            Description
                        </Title>
                        <Text
                            c={plan.description ? undefined : 'dimmed'}
                            size="sm"
                        >
                            {plan.description || 'Not available'}
                        </Text>
                    </div>

                    {/* Schedule Type */}
                    <div>
                        <Title
                            fw="bold"
                            order={5}
                        >
                            Schedule
                        </Title>
                        <Text size="sm">Weekly (7-day cycle)</Text>
                    </div>

                    {/* Date Range - only for assigned plans */}
                    {!plan.is_template && plan.start_date && plan.end_date && (
                        <div>
                            <Title
                                fw="bold"
                                order={5}
                            >
                                Duration
                            </Title>
                            <Text size="sm">
                                {plan.start_date} to {plan.end_date}
                            </Text>
                        </div>
                    )}

                    {/* Type */}
                    <div>
                        <Title
                            fw="bold"
                            order={5}
                        >
                            Type
                        </Title>
                        <Badge
                            color={plan.is_template ? 'blue' : 'green'}
                            size="sm"
                            variant="light"
                        >
                            {plan.is_template ? 'Template' : 'Assigned Plan'}
                        </Badge>
                    </div>

                    {/* Summary Stats */}
                    <div>
                        <Title
                            fw="bold"
                            order={5}
                        >
                            Summary
                        </Title>
                        <Group
                            gap="md"
                            mt="xs"
                        >
                            <Badge
                                color="teal"
                                size="lg"
                                variant="light"
                            >
                                {totalWorkouts} {totalWorkouts === 1 ? 'Workout' : 'Workouts'}
                            </Badge>
                            <Badge
                                color="orange"
                                size="lg"
                                variant="light"
                            >
                                {totalExercises} {totalExercises === 1 ? 'Exercise' : 'Exercises'}
                            </Badge>
                        </Group>
                    </div>

                    {/* Workouts */}
                    <div>
                        <Title
                            fw="bold"
                            order={5}
                        >
                            Workouts
                        </Title>
                        {plan.workouts && plan.workouts.length > 0 ? (
                            <Stack
                                gap="xs"
                                mt="xs"
                            >
                                {plan.workouts.map((workout) => (
                                    <Badge
                                        color="grape"
                                        key={workout.id}
                                        size="sm"
                                        variant="light"
                                    >
                                        {workout.day_name}: {workout.name}
                                        {workout.elements && workout.elements.length > 0 && (
                                            <Text
                                                c="dimmed"
                                                component="span"
                                                ml={4}
                                                size="xs"
                                            >
                                                ({workout.elements.length} exercises)
                                            </Text>
                                        )}
                                    </Badge>
                                ))}
                            </Stack>
                        ) : (
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                No workouts defined. Click &quot;Build Plan&quot; to add workouts.
                            </Text>
                        )}
                    </div>
                </Stack>
            }
            onClose={closeDrawer}
            title={plan.name}
        />
    );
};

export default TrainingPlanViewDrawer;
