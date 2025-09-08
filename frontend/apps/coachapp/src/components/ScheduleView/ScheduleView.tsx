import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Center,
    Grid,
    Group,
    Modal,
    Select,
    Stack,
    Text,
    Textarea,
    TextInput,
    Title,
} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {IconChevronLeft, IconChevronRight, IconEdit, IconPlus, IconTrash} from '@tabler/icons-react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {CreateScheduleEntryProps, ScheduleEntriesAPI} from '@/api/schedule_entries.ts';
import {listSessionDefs} from '@/api/session_defs.ts';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';

import {useScheduleData} from './useScheduleData';
import {dayNames, dayShort, getSlotIcon, getTimeDisplay} from './utils';

type ScheduleViewProps = {
    onDateChange?: (date: Date) => void;
    scheduleId: string;
    selectedDate?: Date;
};

export function ScheduleView({onDateChange, scheduleId, selectedDate = new Date()}: ScheduleViewProps) {
    const {entriesByDay, error, isLoading, isWeeklySchedule, schedule} = useScheduleData(scheduleId);
    const [selectedDay, setSelectedDay] = useState<null | number>(null);
    const [editingEntry, setEditingEntry] = useState<any>(null);
    const [addModalOpened, setAddModalOpened] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        endTime: '',
        sessionDefId: '',
        startTime: '',
        title: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const queryClient = useQueryClient();

    // Fetch session definitions for the form
    const {data: sessionDefsData} = useQuery({
        queryFn: async () => {
            const result = await listSessionDefs({page: 1, page_size: 100});
            if (!result.isError) {
                return result.getValue();
            }
            throw new Error(result.getError().message || 'Failed to fetch session definitions');
        },
        queryKey: ['sessionDefs'],
    });

    const sessionDefs = sessionDefsData?.records || [];

    const validateForm = (data: typeof formData) => {
        const errors: Record<string, string> = {};
        if (!data.title.trim()) errors.title = 'Title is required';
        if (!data.sessionDefId) errors.sessionDefId = 'Session definition is required';
        return errors;
    };

    const handleFormSubmit = () => {
        const errors = validateForm(formData);
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        if (editingEntry) {
            // TODO: Implement edit functionality when backend API is ready
            notifications.show({
                color: 'blue',
                message: 'Edit functionality will be available soon',
                title: 'Coming Soon',
            });
        } else {
            const createData = {
                day: selectedDay || 0,
                session_def_id: formData.sessionDefId,
                window_end: formData.endTime || undefined,
                window_start: formData.startTime || undefined,
            };
            createEntryMutation.mutate(createData);
        }
    };

    // Create entry mutation
    const createEntryMutation = useMutation({
        mutationFn: async (data: CreateScheduleEntryProps) => {
            const result = await ScheduleEntriesAPI.createEntry(scheduleId, data);
            if (result.isError) {
                throw new Error(result.getError().message || 'Failed to create entry');
            }
            return result.getValue();
        },
        onError: (error: Error) => {
            notifications.show({
                color: 'red',
                message: error.message,
                title: 'Error',
            });
        },
        onSuccess: () => {
            notifications.show({
                color: 'green',
                message: 'Schedule entry created successfully',
                title: 'Success',
            });
            queryClient.invalidateQueries({queryKey: ['schedule-entries', scheduleId]});
            setAddModalOpened(false);
            setEditingEntry(null);
            setFormData({
                description: '',
                endTime: '',
                sessionDefId: '',
                startTime: '',
                title: '',
            });
            setFormErrors({});
        },
    });

    // Delete entry mutation
    const deleteEntryMutation = useMutation({
        mutationFn: async (entryId: string) => {
            const result = await ScheduleEntriesAPI.deleteEntry(scheduleId, entryId);
            if (result.isError) {
                throw new Error(result.getError().message || 'Failed to delete entry');
            }
            return result.getValue();
        },
        onError: (error: Error) => {
            notifications.show({
                color: 'red',
                message: error.message,
                title: 'Error',
            });
        },
        onSuccess: () => {
            notifications.show({
                color: 'green',
                message: 'Schedule entry deleted successfully',
                title: 'Success',
            });
            queryClient.invalidateQueries({queryKey: ['schedule-entries', scheduleId]});
        },
    });

    const openAddEntryModal = (day: number) => {
        setSelectedDay(day);
        setEditingEntry(null);
        setFormData({
            description: '',
            endTime: '',
            sessionDefId: '',
            startTime: '',
            title: '',
        });
        setFormErrors({});
        setAddModalOpened(true);
    };

    const openEditEntryModal = (entry: any) => {
        setEditingEntry(entry);
        setFormData({
            description: entry.description || '',
            endTime: entry.end_time || '',
            sessionDefId: entry.session_def_id,
            startTime: entry.start_time || '',
            title: entry.title,
        });
        setAddModalOpened(true);
    };

    const handleDeleteEntry = (entryId: string) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            deleteEntryMutation.mutate(entryId);
        }
    };

    // Loading state with minimal text
    if (isLoading) {
        return (
            <PagePaper>
                <PaddingContainer>
                    <Center h={200}>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Loading...
                        </Text>
                    </Center>
                </PaddingContainer>
            </PagePaper>
        );
    }

    // Error state with clear messaging
    if (error) {
        return (
            <PagePaper>
                <PaddingContainer>
                    <Center h={200}>
                        <Stack
                            gap="xs"
                            ta="center"
                        >
                            <Text
                                fw={500}
                                size="sm"
                            >
                                Unable to load schedule
                            </Text>
                            <Text
                                c="dimmed"
                                size="xs"
                            >
                                {error.message}
                            </Text>
                        </Stack>
                    </Center>
                </PaddingContainer>
            </PagePaper>
        );
    }

    // Not found state
    if (!schedule) {
        return (
            <PagePaper>
                <PaddingContainer>
                    <Center h={200}>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Schedule not found
                        </Text>
                    </Center>
                </PaddingContainer>
            </PagePaper>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'green';
            case 'draft':
                return 'yellow';
            case 'inactive':
                return 'gray';
            default:
                return 'blue';
        }
    };

    const navigateDate = (direction: 'next' | 'prev') => {
        if (!onDateChange) return;

        const newDate = new Date(selectedDate);
        if (schedule.frequency === 'daily') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        } else {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        }
        onDateChange(newDate);
    };

    const renderEntryCard = (entry: any) => {
        const SlotIcon = getSlotIcon(entry.slot_name);

        return (
            <Card
                key={entry.id}
                padding="md"
                radius="md"
                style={{
                    transition: 'all 0.2s ease',
                }}
                styles={{
                    root: {
                        '&:hover': {
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                            transform: 'translateY(-1px)',
                        },
                    },
                }}
                withBorder
            >
                <Stack gap="xs">
                    <Group
                        align="flex-start"
                        justify="space-between"
                    >
                        <Text
                            fw={600}
                            lineClamp={2}
                            size="sm"
                        >
                            {entry.title}
                        </Text>
                        <Group
                            gap={4}
                            style={{flexShrink: 0}}
                        >
                            <ActionIcon
                                aria-label="Edit entry"
                                onClick={() => openEditEntryModal(entry)}
                                size="sm"
                                variant="subtle"
                            >
                                <IconEdit size={14} />
                            </ActionIcon>
                            <ActionIcon
                                aria-label="Delete entry"
                                color="red"
                                onClick={() => handleDeleteEntry(entry.id)}
                                size="sm"
                                variant="subtle"
                            >
                                <IconTrash size={14} />
                            </ActionIcon>
                        </Group>
                    </Group>

                    <Group
                        align="center"
                        gap={4}
                    >
                        <SlotIcon
                            color="var(--mantine-color-dimmed)"
                            size={14}
                        />
                        <Text
                            c="dimmed"
                            size="xs"
                            style={{whiteSpace: 'nowrap'}}
                        >
                            {getTimeDisplay(entry)}
                        </Text>
                    </Group>

                    {entry.description && (
                        <Text
                            c="dimmed"
                            lineClamp={2}
                            size="xs"
                            style={{lineHeight: 1.5}}
                        >
                            {entry.description}
                        </Text>
                    )}
                </Stack>
            </Card>
        );
    };

    const renderDailyView = () => {
        const dayOfWeek = selectedDate.getDay();
        const dayEntries = entriesByDay[dayOfWeek] || [];

        return (
            <Stack gap="xl">
                <Group
                    align="center"
                    justify="space-between"
                >
                    <Stack gap={4}>
                        <Title
                            fw={600}
                            order={3}
                        >
                            {dayNames[dayOfWeek]}
                        </Title>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            {selectedDate.toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'long',
                                weekday: 'long',
                                year: 'numeric',
                            })}
                        </Text>
                    </Stack>
                    {onDateChange && (
                        <Group gap="xs">
                            <ActionIcon
                                aria-label="Add entry"
                                color="blue"
                                onClick={() => openAddEntryModal(dayOfWeek)}
                                size="lg"
                                style={{
                                    transition: 'all 0.2s ease',
                                }}
                                variant="light"
                            >
                                <IconPlus size={18} />
                            </ActionIcon>
                            <ActionIcon
                                aria-label="Previous day"
                                onClick={() => navigateDate('prev')}
                                size="lg"
                                style={{
                                    transition: 'all 0.2s ease',
                                }}
                                variant="subtle"
                            >
                                <IconChevronLeft size={18} />
                            </ActionIcon>
                            <ActionIcon
                                aria-label="Next day"
                                onClick={() => navigateDate('next')}
                                size="lg"
                                style={{
                                    transition: 'all 0.2s ease',
                                }}
                                variant="subtle"
                            >
                                <IconChevronRight size={18} />
                            </ActionIcon>
                        </Group>
                    )}
                </Group>

                {dayEntries.length > 0 ? (
                    <Stack gap="md">
                        {dayEntries.map(renderEntryCard)}
                        <Button
                            fullWidth
                            leftSection={<IconPlus size={16} />}
                            onClick={() => openAddEntryModal(dayOfWeek)}
                            variant="light"
                        >
                            Add Another Entry
                        </Button>
                    </Stack>
                ) : (
                    <Center py="xl">
                        <Stack
                            gap="md"
                            ta="center"
                        >
                            <Stack
                                gap="xs"
                                ta="center"
                            >
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    No entries for this day
                                </Text>
                                <Text
                                    c="dimmed"
                                    size="xs"
                                >
                                    Get started by adding your first entry
                                </Text>
                            </Stack>
                            <Button
                                leftSection={<IconPlus size={16} />}
                                onClick={() => openAddEntryModal(dayOfWeek)}
                                size="sm"
                                variant="filled"
                            >
                                Add Entry
                            </Button>
                        </Stack>
                    </Center>
                )}
            </Stack>
        );
    };

    const renderWeeklyView = () => {
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

        return (
            <Stack gap="xl">
                <Group
                    align="center"
                    justify="space-between"
                >
                    <Stack gap={4}>
                        <Title
                            fw={600}
                            order={3}
                        >
                            Week view
                        </Title>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            {startOfWeek.toLocaleDateString('en-US', {day: 'numeric', month: 'long'})} -{' '}
                            {new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </Text>
                    </Stack>
                    {onDateChange && (
                        <Group gap="xs">
                            <ActionIcon
                                aria-label="Previous week"
                                onClick={() => navigateDate('prev')}
                                size="lg"
                                style={{
                                    transition: 'all 0.2s ease',
                                }}
                                variant="subtle"
                            >
                                <IconChevronLeft size={18} />
                            </ActionIcon>
                            <ActionIcon
                                aria-label="Next week"
                                onClick={() => navigateDate('next')}
                                size="lg"
                                style={{
                                    transition: 'all 0.2s ease',
                                }}
                                variant="subtle"
                            >
                                <IconChevronRight size={18} />
                            </ActionIcon>
                        </Group>
                    )}
                </Group>

                <Grid>
                    {Array.from({length: 7}, (_, dayIndex) => {
                        const dayEntries = entriesByDay[dayIndex] || [];
                        const currentDate = new Date(startOfWeek);
                        currentDate.setDate(startOfWeek.getDate() + dayIndex);
                        const isToday = currentDate.toDateString() === new Date().toDateString();

                        return (
                            <Grid.Col
                                key={dayIndex}
                                span={{base: 12, lg: 12 / 7, md: 4, sm: 6}}
                            >
                                <Card
                                    h="100%"
                                    padding="md"
                                    radius="md"
                                    style={{
                                        borderColor: isToday ? 'var(--mantine-primary-color-filled)' : undefined,
                                        borderWidth: isToday ? 2 : 1,
                                    }}
                                    withBorder
                                >
                                    <Stack
                                        gap="sm"
                                        h="100%"
                                    >
                                        <Group
                                            align="center"
                                            justify="space-between"
                                        >
                                            <Stack gap={2}>
                                                <Text
                                                    c={isToday ? 'var(--mantine-primary-color-filled)' : undefined}
                                                    fw={600}
                                                    size="sm"
                                                >
                                                    {dayShort[dayIndex]}
                                                </Text>
                                                <Text
                                                    c={isToday ? 'var(--mantine-primary-color-filled)' : 'dimmed'}
                                                    fw={isToday ? 600 : 400}
                                                    size="xs"
                                                >
                                                    {currentDate.getDate()}
                                                </Text>
                                            </Stack>
                                            <ActionIcon
                                                aria-label={`Add entry for ${dayShort[dayIndex]}`}
                                                color="blue"
                                                onClick={() => openAddEntryModal(dayIndex)}
                                                size="sm"
                                                variant="subtle"
                                            >
                                                <IconPlus size={14} />
                                            </ActionIcon>
                                        </Group>

                                        <Stack
                                            gap="xs"
                                            style={{flex: 1}}
                                        >
                                            {dayEntries.length > 0 ? (
                                                <>
                                                    {dayEntries.slice(0, 3).map((entry) => (
                                                        <Box key={entry.id}>
                                                            <Text
                                                                fw={500}
                                                                lineClamp={1}
                                                                size="xs"
                                                            >
                                                                {entry.title}
                                                            </Text>
                                                            <Text
                                                                c="dimmed"
                                                                size="xs"
                                                            >
                                                                {getTimeDisplay(entry)}
                                                            </Text>
                                                        </Box>
                                                    ))}
                                                    {dayEntries.length > 3 && (
                                                        <Text
                                                            c="dimmed"
                                                            size="xs"
                                                            ta="center"
                                                        >
                                                            +{dayEntries.length - 3} more
                                                        </Text>
                                                    )}
                                                </>
                                            ) : (
                                                <Center style={{flex: 1}}>
                                                    <Stack
                                                        gap={4}
                                                        ta="center"
                                                    >
                                                        <Text
                                                            c="dimmed"
                                                            size="xs"
                                                        >
                                                            No entries
                                                        </Text>
                                                        <Button
                                                            leftSection={<IconPlus size={12} />}
                                                            onClick={() => openAddEntryModal(dayIndex)}
                                                            size="xs"
                                                            variant="subtle"
                                                        >
                                                            Add
                                                        </Button>
                                                    </Stack>
                                                </Center>
                                            )}
                                        </Stack>
                                    </Stack>
                                </Card>
                            </Grid.Col>
                        );
                    })}
                </Grid>
            </Stack>
        );
    };

    return (
        <PagePaper>
            <PaddingContainer>
                <Stack gap="xl">
                    {/* Header with improved hierarchy */}
                    <Stack gap="md">
                        <Group
                            align="flex-start"
                            justify="space-between"
                        >
                            <Stack gap={4}>
                                <Title
                                    fw={700}
                                    order={2}
                                >
                                    {schedule.name}
                                </Title>
                                {(schedule.goal || schedule.duration_weeks) && (
                                    <Group gap="md">
                                        {schedule.duration_weeks && (
                                            <Text
                                                c="dimmed"
                                                size="sm"
                                            >
                                                {schedule.duration_weeks} week{schedule.duration_weeks > 1 ? 's' : ''}
                                            </Text>
                                        )}
                                        {schedule.goal && (
                                            <Text
                                                c="dimmed"
                                                size="sm"
                                            >
                                                Goal: {schedule.goal}
                                            </Text>
                                        )}
                                    </Group>
                                )}
                            </Stack>
                            <Group gap="xs">
                                <Badge
                                    color={getStatusColor(schedule.status)}
                                    size="sm"
                                    style={{textTransform: 'capitalize'}}
                                    variant="light"
                                >
                                    {schedule.status}
                                </Badge>
                                <Badge
                                    c="dimmed"
                                    size="sm"
                                    variant="outline"
                                >
                                    {schedule.frequency}
                                </Badge>
                            </Group>
                        </Group>
                    </Stack>

                    {/* Content */}
                    {Object.keys(entriesByDay).length > 0 ? (
                        schedule.frequency === 'daily' || !isWeeklySchedule ? (
                            renderDailyView()
                        ) : (
                            renderWeeklyView()
                        )
                    ) : (
                        <Center py="xl">
                            <Stack
                                gap="lg"
                                ta="center"
                            >
                                <Stack
                                    gap="xs"
                                    ta="center"
                                >
                                    <Text
                                        c="dimmed"
                                        fw={600}
                                        size="lg"
                                    >
                                        No schedule entries yet
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                    >
                                        Create your first entry to start building your schedule
                                    </Text>
                                </Stack>
                                <Button
                                    leftSection={<IconPlus size={20} />}
                                    onClick={() => openAddEntryModal(new Date().getDay())}
                                    size="md"
                                    variant="filled"
                                >
                                    Create First Entry
                                </Button>
                            </Stack>
                        </Center>
                    )}
                </Stack>
            </PaddingContainer>

            {/* Add/Edit Entry Modal */}
            <Modal
                onClose={() => {
                    setAddModalOpened(false);
                    setEditingEntry(null);
                    setFormData({
                        description: '',
                        endTime: '',
                        sessionDefId: '',
                        startTime: '',
                        title: '',
                    });
                    setFormErrors({});
                }}
                opened={addModalOpened}
                size="md"
                title={editingEntry ? 'Edit Schedule Entry' : 'Add Schedule Entry'}
            >
                <Stack gap="md">
                    <TextInput
                        error={formErrors.title}
                        label="Title"
                        onChange={(e) => setFormData((prev) => ({...prev, title: e.target.value}))}
                        placeholder="Enter entry title"
                        required
                        value={formData.title}
                    />

                    <Select
                        data={
                            sessionDefs?.map((def) => ({
                                label: def.name,
                                value: def.id,
                            })) || []
                        }
                        error={formErrors.sessionDefId}
                        label="Session Definition"
                        onChange={(value) => setFormData((prev) => ({...prev, sessionDefId: value || ''}))}
                        placeholder="Select session type"
                        required
                        value={formData.sessionDefId}
                    />

                    <Group grow>
                        <TextInput
                            error={formErrors.startTime}
                            label="Start Time"
                            onChange={(e) => setFormData((prev) => ({...prev, startTime: e.target.value}))}
                            placeholder="HH:MM"
                            value={formData.startTime}
                        />
                        <TextInput
                            error={formErrors.endTime}
                            label="End Time"
                            onChange={(e) => setFormData((prev) => ({...prev, endTime: e.target.value}))}
                            placeholder="HH:MM"
                            value={formData.endTime}
                        />
                    </Group>

                    <Textarea
                        label="Description"
                        onChange={(e) => setFormData((prev) => ({...prev, description: e.target.value}))}
                        placeholder="Enter description (optional)"
                        rows={3}
                        value={formData.description}
                    />

                    <Group
                        gap="sm"
                        justify="flex-end"
                    >
                        <Button
                            onClick={() => {
                                setAddModalOpened(false);
                                setEditingEntry(null);
                                setFormData({
                                    description: '',
                                    endTime: '',
                                    sessionDefId: '',
                                    startTime: '',
                                    title: '',
                                });
                                setFormErrors({});
                            }}
                            variant="subtle"
                        >
                            Cancel
                        </Button>
                        <Button
                            loading={createEntryMutation.isPending}
                            onClick={handleFormSubmit}
                        >
                            {editingEntry ? 'Update' : 'Add'} Entry
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </PagePaper>
    );
}
