import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Button,
    Card,
    Center,
    Group,
    Loader,
    Paper,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import {useDebouncedCallback} from '@mantine/hooks';
import {CheckIcon, MagnifyingGlassIcon, XIcon} from '@phosphor-icons/react';
import {IconApple, IconBarbell, IconCalendar, IconX} from '@tabler/icons-react';
import {useMemo, useState} from 'react';

import RecordsList from '@/shared/layouts/RecordsList';
import {Plan, PlanDiscipline, useListPlans} from '@/services/plans';

import {FixedBottomBar} from '../containers/FixedBottomBar';

const DISCIPLINE_CONFIG: Record<PlanDiscipline, {icon: typeof IconBarbell; color: string; label: string}> = {
    workout: {icon: IconBarbell, color: 'blue', label: 'Workout'},
    nutrition: {icon: IconApple, color: 'green', label: 'Nutrition'},
};

interface PlanCardProps {
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    plan: Plan;
}

const PlanCard = ({plan, isSelected, onToggleSelect}: PlanCardProps) => {
    const disciplineConfig = DISCIPLINE_CONFIG[plan.discipline];
    const IconComponent = disciplineConfig.icon;

    const getDurationText = () => {
        if (plan.duration_weeks) {
            return `${plan.duration_weeks} week${plan.duration_weeks > 1 ? 's' : ''}`;
        }
        if (plan.duration_days) {
            return `${plan.duration_days} day${plan.duration_days > 1 ? 's' : ''}`;
        }
        return null;
    };

    return (
        <Card
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${plan.name}`}
            onClick={() => onToggleSelect(plan.id)}
            p="sm"
            role="button"
            style={{
                backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : 'white',
                borderColor: isSelected ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-3)',
                borderWidth: isSelected ? 2 : 1,
                borderRadius: 8,
                boxShadow: isSelected ? '0 2px 12px rgba(59, 130, 246, 0.2)' : 'none',
                cursor: 'pointer',
                transform: 'scale(1)',
                transition: 'all 200ms ease',
            }}
            styles={{
                root: {
                    '&:hover': {
                        backgroundColor: isSelected ? 'var(--mantine-color-blue-1)' : 'var(--mantine-color-gray-0)',
                        borderColor: 'var(--mantine-color-blue-5)',
                        boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
                        transform: 'scale(1.01)',
                    },
                    '&:active': {
                        transform: 'scale(0.99)',
                    },
                },
            }}
            tabIndex={0}
            withBorder
        >
            <Group
                align="flex-start"
                gap="sm"
                wrap="nowrap"
            >
                {/* Plan Icon */}
                <Avatar
                    color={disciplineConfig.color}
                    radius="xl"
                    size="lg"
                    styles={{
                        root: {
                            flexShrink: 0,
                        },
                    }}
                >
                    <IconComponent
                        size={24}
                        stroke={1.5}
                    />
                </Avatar>

                {/* Plan Details */}
                <Stack
                    gap="xs"
                    style={{flex: 1, minWidth: 0}}
                >
                    <Text
                        fw={600}
                        lineClamp={1}
                        size="sm"
                    >
                        {plan.name}
                    </Text>

                    {/* Metadata */}
                    <Group gap="xs">
                        <Badge
                            color={disciplineConfig.color}
                            size="xs"
                            variant="light"
                        >
                            {disciplineConfig.label}
                        </Badge>
                        {getDurationText() && (
                            <Badge
                                color="gray"
                                size="xs"
                                variant="light"
                            >
                                <Group gap={4}>
                                    <IconCalendar size={12} />
                                    {getDurationText()}
                                </Group>
                            </Badge>
                        )}
                        {plan.recurrence && (
                            <Badge
                                color="gray"
                                size="xs"
                                variant="outline"
                            >
                                {plan.recurrence}
                            </Badge>
                        )}
                    </Group>

                    {/* Description */}
                    {plan.description && (
                        <Text
                            c="dimmed"
                            lineClamp={2}
                            size="xs"
                        >
                            {plan.description}
                        </Text>
                    )}
                </Stack>

                {/* Selection Indicator */}
                {isSelected && (
                    <ActionIcon
                        color="blue"
                        radius="xl"
                        size="lg"
                        variant="filled"
                    >
                        <CheckIcon
                            size={18}
                            weight="bold"
                        />
                    </ActionIcon>
                )}
            </Group>
        </Card>
    );
};

interface PlanSelectProps {
    clientID: string; // Used for future API call to copy plan to client
    onClose?: () => void;
    onComplete?: (selectedPlanId: string, selectedPlan?: Plan) => void;
}

export default function PlanSelect(props: PlanSelectProps) {
    const {onComplete, onClose} = props;

    // const {clientID} = props;

    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<null | string>(null);

    const onSearchChangeDebounced = useDebouncedCallback(setSearch, 300);

    // Fetch only template plans
    const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useListPlans({
        kind: 'template',
        status: 'active',
        search: search || undefined,
    });

    const plans = useMemo(() => {
        if (!data?.pages) return [];
        return data.pages.flatMap((page) => page.records);
    }, [data?.pages]);

    const handleToggleSelect = (id: string) => {
        setSelectedId(id);
    };

    const handleAssign = () => {
        if (!selectedId) return;
        const selectedPlan = plans.find((p) => p.id === selectedId);
        onComplete?.(selectedId, selectedPlan);
    };

    return (
        <Box
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                position: 'relative',
            }}
        >
            {/* Search Header */}
            <Box
                p="md"
                style={{
                    borderBottom: '1px dashed var(--mantine-color-gray-2)',
                    flexShrink: 0,
                    backgroundColor: 'white',
                }}
            >
                <Stack gap="md">
                    <Group
                        align="center"
                        justify="space-between"
                    >
                        <Title order={5}>Select Plan</Title>
                        <ActionIcon
                            color="gray"
                            onClick={onClose}
                            radius="xl"
                            variant="subtle"
                        >
                            <IconX />
                        </ActionIcon>
                    </Group>
                    {selectedId && (
                        <Badge
                            color="blue"
                            size="md"
                            variant="light"
                        >
                            1 selected
                        </Badge>
                    )}
                    <TextInput
                        leftSection={<MagnifyingGlassIcon size={18} />}
                        onChange={(e) => onSearchChangeDebounced(e.currentTarget.value)}
                        placeholder="Search plans..."
                        rightSection={
                            search ? (
                                <ActionIcon
                                    onClick={() => {
                                        setSearch('');
                                        onSearchChangeDebounced('');
                                    }}
                                    size="sm"
                                    variant="subtle"
                                >
                                    <XIcon size={16} />
                                </ActionIcon>
                            ) : null
                        }
                        size="md"
                    />
                </Stack>

                {/* Scrollable Plan List */}
                <Box
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        minHeight: 0,
                    }}
                >
                    <Box
                        p="md"
                        pb={80}
                    >
                        {isLoading ? (
                            <Center py="xl">
                                <Loader size="lg" />
                            </Center>
                        ) : plans.length === 0 ? (
                            <Paper
                                p="xl"
                                style={{textAlign: 'center'}}
                            >
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    {search ? 'No plans found matching your search' : 'No template plans available'}
                                </Text>
                                <Text
                                    c="dimmed"
                                    mt="xs"
                                    size="xs"
                                >
                                    Create a template plan first to assign it to clients
                                </Text>
                            </Paper>
                        ) : (
                            <RecordsList
                                emptyState={
                                    <Paper
                                        p="xl"
                                        style={{textAlign: 'center'}}
                                    >
                                        <Text
                                            c="dimmed"
                                            size="sm"
                                        >
                                            No plans found
                                        </Text>
                                    </Paper>
                                }
                                fetchNextPage={fetchNextPage}
                                hasNextPage={hasNextPage}
                                isFetchingNextPage={isFetchingNextPage}
                                isLoading={isLoading}
                                records={plans}
                                renderItem={(plan: Plan) => (
                                    <PlanCard
                                        isSelected={selectedId === plan.id}
                                        key={plan.id}
                                        onToggleSelect={handleToggleSelect}
                                        plan={plan}
                                    />
                                )}
                            />
                        )}
                    </Box>
                </Box>

                <FixedBottomBar>
                    <Button
                        disabled={!selectedId}
                        fullWidth
                        onClick={handleAssign}
                        radius="xl"
                        size="lg"
                    >
                        {selectedId ? 'Assign Plan' : 'Select a plan'}
                    </Button>
                </FixedBottomBar>
            </Box>
        </Box>
    );
}
