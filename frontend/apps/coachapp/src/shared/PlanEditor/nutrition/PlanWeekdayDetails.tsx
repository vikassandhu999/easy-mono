import {
    ActionIcon,
    Box,
    Button,
    Grid,
    GridCol,
    Group,
    Modal,
    Stack,
    Text,
    TextInput,
    useMantineTheme,
} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {modals} from '@mantine/modals';
import {notifications} from '@mantine/notifications';
import {IconPlus, IconTrash} from '@tabler/icons-react';
import {FC, useMemo, useState} from 'react';
import {useSearchParams} from 'react-router';

import {AddSlotButton} from '@/shared/PlanBuilder/NutritionWeekPlanner/AddSlotButton';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {useListPlanSessionsQuery} from '@/store/services/plan_sessions';
import {Plan} from '@/store/services/plans';
import {addUncommittedLabel, deleteUncommittedLabel} from '@/store/slices/planLabelsSlice';

import {PLAN_EDITOR_DRAWER_KEY, PLAN_EDITOR_DRAWER_VIEWS, PLAN_EDITOR_SEARCH_PARAMS} from '../constants';

const LABELS = [
    {
        label: 'Breakfast',
        value: 'breakfast',
    },
    {
        label: 'Lunch',
        value: 'lunch',
    },
    {
        label: 'Snack',
        value: 'snack',
    },
    {
        label: 'Dinner',
        value: 'dinner',
    },
    {
        label: 'Pre Workout',
        value: 'pre_workout',
    },
    {
        label: 'Post Workout',
        value: 'post_workout',
    },
];

const sanitizeLabelValue = (label: string): string => {
    return label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
};

type LabelCreateProps = {
    opened: boolean;
    open: () => void;
    close: () => void;
    onLabelCreate?: (label: string) => void;
};
const LabelCreate: FC<LabelCreateProps> = (props) => {
    const {opened, close, onLabelCreate} = props;
    const theme = useMantineTheme();
    const [selectedPreset, setSelectedPreset] = useState<null | string>(null);
    const [isCustom, setIsCustom] = useState(false);
    const [customLabel, setCustomLabel] = useState(''); // Display value
    const [customValue, setCustomValue] = useState(''); // Sanitized value

    const handleClose = () => {
        setSelectedPreset(null);
        setIsCustom(false);
        setCustomLabel('');
        setCustomValue('');
        close();
    };

    const handlePresetClick = (value: string) => {
        setSelectedPreset(value);
        setIsCustom(false);
        setCustomLabel('');
        setCustomValue('');
    };

    const handleCustomLabelChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const displayValue = e.currentTarget.value;
        const sanitizedValue = sanitizeLabelValue(displayValue);

        setCustomLabel(displayValue);
        setCustomValue(sanitizedValue);
        setSelectedPreset(null);
        setIsCustom(true);
    };

    const handleSubmit = () => {
        const finalValue = isCustom ? customValue : selectedPreset;
        const finalLabel = isCustom ? customLabel : LABELS.find((l) => l.value === selectedPreset)?.label;

        if (!finalValue?.trim()) return;

        onLabelCreate(finalLabel);
        handleClose();
    };

    const hasCustomInput = customLabel.trim().length > 0;
    const isValid = isCustom ? customValue.trim().length > 0 : !!selectedPreset;

    return (
        <Modal
            centered
            closeOnClickOutside={false}
            onClose={handleClose}
            opened={opened}
            radius="md"
            size="md"
            title={
                <Text
                    fw={600}
                    size="lg"
                >
                    Add Meal Label
                </Text>
            }
        >
            <Stack gap="lg">
                <Stack gap="xs">
                    <Text
                        c="dimmed"
                        fs="italic"
                        fw={500}
                        size="xs"
                    >
                        Choose a preset
                    </Text>
                    <Group gap="xs">
                        {LABELS.map((label) => {
                            const isSelected = !isCustom && selectedPreset === label.value;
                            return (
                                <Box
                                    key={label.value}
                                    onClick={() => handlePresetClick(label.value)}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.borderColor = theme.colors.gray[4];
                                            e.currentTarget.style.backgroundColor = theme.colors.gray[0];
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.borderColor = theme.colors.gray[3];
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                    style={{
                                        border: isSelected
                                            ? `2px solid ${theme.colors.blue[6]}`
                                            : `2px dashed ${theme.colors.gray[3]}`,
                                        backgroundColor: isSelected ? theme.colors.blue[0] : 'transparent',
                                        borderRadius: theme.radius.md,
                                        fontSize: theme.fontSizes.sm,
                                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                        cursor: 'pointer',
                                        transition: 'all 150ms ease',
                                        userSelect: 'none',
                                    }}
                                >
                                    {label.label}
                                </Box>
                            );
                        })}
                    </Group>
                </Stack>

                <Group
                    gap="xs"
                    justify="center"
                >
                    <div style={{flex: 1, height: '1px', backgroundColor: theme.colors.gray[3]}} />
                    <Text
                        c="dimmed"
                        fw={500}
                        size="xs"
                    >
                        OR
                    </Text>
                    <div style={{flex: 1, height: '1px', backgroundColor: theme.colors.gray[3]}} />
                </Group>

                <Stack gap="xs">
                    <Text
                        c="dimmed"
                        fs="italic"
                        fw={500}
                        size="xs"
                    >
                        Create custom label
                    </Text>
                    <TextInput
                        onChange={handleCustomLabelChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && isValid) {
                                handleSubmit();
                            }
                        }}
                        placeholder="e.g., Mid-Morning Snack, Bedtime Snack"
                        radius="md"
                        size="md"
                        styles={{
                            input: {
                                borderColor: hasCustomInput ? theme.colors.blue[6] : undefined,
                                borderWidth: hasCustomInput ? '2px' : '1px',
                            },
                        }}
                        value={customLabel}
                    />
                </Stack>

                <Group
                    gap="sm"
                    mt="md"
                >
                    <Button
                        flex={1}
                        onClick={handleClose}
                        radius="md"
                        size="md"
                        variant="default"
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={!isValid}
                        flex={2}
                        onClick={handleSubmit}
                        radius="md"
                        size="md"
                    >
                        Add Label
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
};

type LabelEditorProps = {
    plan: Plan;
    weekday: number;
    onWeekdayChange: (weekday: number) => void;
};

// LabelEditor helps managing group labels for meals
const LabelEditor: FC<LabelEditorProps> = (props) => {
    const {weekday, plan} = props;
    const [opened, {open, close}] = useDisclosure(false);
    const dispatch = useAppDispatch();

    const handleCreateLabel = (labelText: string) => {
        const sanitizedValue = sanitizeLabelValue(labelText);
        dispatch(
            addUncommittedLabel({
                planId: plan.id,
                dayOfWeek: weekday,
                label: labelText,
                value: sanitizedValue,
            }),
        );
        notifications.show({
            color: 'green',
            message: `New label ${labelText} is added.`,
        });
    };
    return (
        <>
            <Stack gap="xs">
                <Button
                    leftSection={<IconPlus size={18} />}
                    onClick={open}
                    radius="md"
                    size="sm"
                    variant="subtle"
                    w="max-content"
                >
                    Create a label
                </Button>
                <Text
                    c="dimmed"
                    fs="italic"
                    size="xs"
                >
                    Labels organize meals in a day (e.g., Breakfast, Lunch, Dinner)
                </Text>
            </Stack>
            <LabelCreate
                close={close}
                onLabelCreate={handleCreateLabel}
                open={open}
                opened={opened}
            />
        </>
    );
};

type LabelViewProps = {
    isCommitted: boolean;
    label: string;
    value: string;
    onDelete: (value, isCommitted) => void;
    weekday: number;
    plan: Plan;
};
const LabelView: FC<LabelViewProps> = (props) => {
    const {isCommitted, label, value, onDelete, plan, weekday} = props;
    const setSearchParams = useSearchParams()[1];

    const theme = useMantineTheme();

    const handleAddSession = () => {
        setSearchParams((prev) => {
            prev.set(PLAN_EDITOR_DRAWER_KEY, PLAN_EDITOR_DRAWER_VIEWS.ADD_SESSION);
            prev.set(PLAN_EDITOR_SEARCH_PARAMS.DISCIPLINE, plan.discipline);
            prev.set(PLAN_EDITOR_SEARCH_PARAMS.WEEKDAY, weekday.toString());
            prev.set(PLAN_EDITOR_SEARCH_PARAMS.GROUP_LABEL, value);
            return prev;
        });
    };

    return (
        <Box
            pb="lg"
            style={{
                borderBottom: `1px solid light-dark(${theme.colors.gray[3]}, ${theme.colors.dark[4]})`,
            }}
        >
            <Grid>
                <GridCol span={{base: 12, md: 4, lg: 3}}>
                    <Group
                        gap="xs"
                        style={{
                            minHeight: '48px',
                            alignItems: 'center',
                        }}
                        wrap="nowrap"
                    >
                        <Text
                            c="dark.7"
                            fw={700}
                            size="md"
                            style={{
                                lineHeight: 1.5,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                            title={label}
                        >
                            {label}
                        </Text>
                        <ActionIcon
                            color="red"
                            onClick={() => {
                                onDelete(value, isCommitted);
                            }}
                            radius="lg"
                            variant="subtle"
                        >
                            <IconTrash size={12} />
                        </ActionIcon>
                    </Group>
                </GridCol>
                <GridCol span={{base: 12, md: 8, lg: 9}}>
                    <Stack
                        gap="xs"
                        py="xs"
                    >
                        <AddSlotButton onClick={handleAddSession} />
                    </Stack>
                </GridCol>
            </Grid>
        </Box>
    );
};

type PlanWeekdayDetailsProps = {
    plan: Plan;
    weekday: number;
    onWeekdayChange: (weekday: number) => void;
};

const PlanWeekdayDetails: FC<PlanWeekdayDetailsProps> = (props) => {
    const {plan, weekday} = props;

    const dispatch = useAppDispatch();

    // Get uncommitted labels
    const uncommittedLabels = useAppSelector((state) => state.planLabels.uncommittedLabels[plan.id]?.[weekday] || []);

    // Get committed labels (API)
    const {data} = useListPlanSessionsQuery(
        {
            planId: plan.id,
        },
        {
            skip: !plan.id,
        },
    );

    // Get plan sessions according to weekday
    const planSessions = useMemo(() => data?.records.filter((r) => r.day_of_week === weekday) || [], [data, weekday]);

    const committedLabels = useMemo(() => {
        const labels = planSessions
            .map((s) => s.label)
            .filter(Boolean)
            .filter((label, index, arr) => arr.indexOf(label) === index);
        return labels;
    }, [planSessions]);

    const allLabels = useMemo(() => {
        const uncommitted = uncommittedLabels.map((l) => ({
            ...l,
            isCommitted: false,
        }));

        const committed = committedLabels.map((label) => ({
            label,
            value: sanitizeLabelValue(label),
            isCommitted: true,
            createdAt: '',
        }));

        return [...uncommitted, ...committed];
    }, [uncommittedLabels, committedLabels]);

    const handleDeleteLabel = (labelValue: string, committed: boolean) => {
        const deleteLabel = () => {
            // TODO : Implement API call

            if (committed) {
                return;
            }

            dispatch(
                deleteUncommittedLabel({
                    planId: plan.id,
                    dayOfWeek: weekday,
                    value: labelValue,
                }),
            );

            notifications.show({
                color: 'green',
                message: `Label: ${labelValue} is deleted`,
            });
        };

        modals.openConfirmModal({
            title: 'Delete Label',
            children: (
                <Text size="sm">Are you sure you want to delete "{labelValue}"? This action cannot be undone.</Text>
            ),
            centered: true,
            labels: {confirm: 'Delete', cancel: 'Cancel'},
            confirmProps: {
                variant: 'filled',
                color: 'red',
            },
            onConfirm: () => deleteLabel(),
        });
    };

    return (
        <>
            {allLabels.map((label) => (
                <LabelView
                    key={label.value}
                    {...label}
                    onDelete={handleDeleteLabel}
                    plan={plan}
                    weekday={weekday}
                />
            ))}
            <LabelEditor {...props} />
        </>
    );
};

export default PlanWeekdayDetails;
