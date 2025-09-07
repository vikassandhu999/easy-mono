import {
    Badge,
    Stack,
    Title,
    Text,
    Grid,
    Card,
    ActionIcon,
    Center,
    Group,
    Box,
    Button,
    Modal,
    TextInput,
    Select,
    Textarea,
} from '@mantine/core';
import {IconChevronLeft, IconChevronRight, IconEdit, IconTrash, IconPlus} from '@tabler/icons-react';
import {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import PaddingContainer from '../Containers/PaddingContainer';
import {useScheduleData} from './useScheduleData';
import PagePaper from '../Containers/PagePaper';
import {dayNames, dayShort, getSlotIcon, getTimeDisplay} from './utils';
import {ScheduleEntriesAPI, CreateScheduleEntryProps} from '@/Api/ScheduleEntries';
import {listSessionDefs} from '@/Api/SessionDefs';

type ScheduleViewProps = {
    scheduleId: string;
    selectedDate?: Date;
    onDateChange?: (date: Date) => void;
};

export function ScheduleView({scheduleId, selectedDate = new Date(), onDateChange}: ScheduleViewProps) {
    const {schedule, entriesByDay, isWeeklySchedule, isLoading, error} = useScheduleData(scheduleId);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [editingEntry, setEditingEntry] = useState<any>(null);
    const [addModalOpened, setAddModalOpened] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        sessionDefId: '',
        startTime: '',
        endTime: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const queryClient = useQueryClient();

    // Fetch session definitions for the form
    const {data: sessionDefsData} = useQuery({
        queryKey: ['sessionDefs'],
        queryFn: async () => {
            const result = await listSessionDefs({page: 1, page_size: 100});
            if (!result.isError) {
                return result.getValue();
            }
            throw new Error(result.getError().message || 'Failed to fetch session definitions');
        },
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
                title: 'Coming Soon',
                message: 'Edit functionality will be available soon',
                color: 'blue',
            });
        } else {
            const createData = {
                session_def_id: formData.sessionDefId,
                day: selectedDay || 0,
                window_start: formData.startTime || undefined,
                window_end: formData.endTime || undefined,
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
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: 'Schedule entry created successfully',
                color: 'green',
            });
            queryClient.invalidateQueries({queryKey: ['schedule-entries', scheduleId]});
            setAddModalOpened(false);
            setEditingEntry(null);
            setFormData({
                title: '',
                description: '',
                sessionDefId: '',
                startTime: '',
                endTime: '',
            });
            setFormErrors({});
        },
        onError: (error: Error) => {
            notifications.show({
                title: 'Error',
                message: error.message,
                color: 'red',
            });
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
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: 'Schedule entry deleted successfully',
                color: 'green',
            });
            queryClient.invalidateQueries({queryKey: ['schedule-entries', scheduleId]});
        },
        onError: (error: Error) => {
            notifications.show({
                title: 'Error',
                message: error.message,
                color: 'red',
            });
        },
    });

    const openAddEntryModal = (day: number) => {
        setSelectedDay(day);
        setEditingEntry(null);
        setFormData({
            title: '',
            description: '',
            sessionDefId: '',
            startTime: '',
            endTime: '',
        });
        setFormErrors({});
        setAddModalOpened(true);
    };

    const openEditEntryModal = (entry: any) => {
        setEditingEntry(entry);
        setFormData({
            title: entry.title,
            description: entry.description || '',
            sessionDefId: entry.session_def_id,
            startTime: entry.start_time || '',
            endTime: entry.end_time || '',
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
                            size="sm"
                            c="dimmed"
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
                                size="sm"
                                fw={500}
                            >
                                Unable to load schedule
                            </Text>
                            <Text
                                size="xs"
                                c="dimmed"
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
                            size="sm"
                            c="dimmed"
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

    const navigateDate = (direction: 'prev' | 'next') => {
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
                withBorder
                style={{
                    transition: 'all 0.2s ease',
                }}
                styles={{
                    root: {
                        '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                        },
                    },
                }}
            >
                <Stack gap="xs">
                    <Group
                        justify="space-between"
                        align="flex-start"
                    >
                        <Text
                            fw={600}
                            size="sm"
                            lineClamp={2}
                        >
                            {entry.title}
                        </Text>
                        <Group
                            gap={4}
                            style={{flexShrink: 0}}
                        >
                            <ActionIcon
                                variant="subtle"
                                size="sm"
                                onClick={() => openEditEntryModal(entry)}
                                aria-label="Edit entry"
                            >
                                <IconEdit size={14} />
                            </ActionIcon>
                            <ActionIcon
                                variant="subtle"
                                size="sm"
                                color="red"
                                onClick={() => handleDeleteEntry(entry.id)}
                                aria-label="Delete entry"
                            >
                                <IconTrash size={14} />
                            </ActionIcon>
                        </Group>
                    </Group>

                    <Group
                        gap={4}
                        align="center"
                    >
                        <SlotIcon
                            size={14}
                            color="var(--mantine-color-dimmed)"
                        />
                        <Text
                            size="xs"
                            c="dimmed"
                            style={{whiteSpace: 'nowrap'}}
                        >
                            {getTimeDisplay(entry)}
                        </Text>
                    </Group>

                    {entry.description && (
                        <Text
                            size="xs"
                            c="dimmed"
                            lineClamp={2}
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
                    justify="space-between"
                    align="center"
                >
                    <Stack gap={4}>
                        <Title
                            order={3}
                            fw={600}
                        >
                            {dayNames[dayOfWeek]}
                        </Title>
                        <Text
                            size="sm"
                            c="dimmed"
                        >
                            {selectedDate.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </Text>
                    </Stack>
                    {onDateChange && (
                        <Group gap="xs">
                            <ActionIcon
                                variant="light"
                                size="lg"
                                onClick={() => openAddEntryModal(dayOfWeek)}
                                aria-label="Add entry"
                                color="blue"
                                style={{
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <IconPlus size={18} />
                            </ActionIcon>
                            <ActionIcon
                                variant="subtle"
                                size="lg"
                                onClick={() => navigateDate('prev')}
                                aria-label="Previous day"
                                style={{
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <IconChevronLeft size={18} />
                            </ActionIcon>
                            <ActionIcon
                                variant="subtle"
                                size="lg"
                                onClick={() => navigateDate('next')}
                                aria-label="Next day"
                                style={{
                                    transition: 'all 0.2s ease',
                                }}
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
                            variant="light"
                            leftSection={<IconPlus size={16} />}
                            onClick={() => openAddEntryModal(dayOfWeek)}
                            fullWidth
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
                                    size="sm"
                                    c="dimmed"
                                >
                                    No entries for this day
                                </Text>
                                <Text
                                    size="xs"
                                    c="dimmed"
                                >
                                    Get started by adding your first entry
                                </Text>
                            </Stack>
                            <Button
                                variant="filled"
                                leftSection={<IconPlus size={16} />}
                                onClick={() => openAddEntryModal(dayOfWeek)}
                                size="sm"
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
                    justify="space-between"
                    align="center"
                >
                    <Stack gap={4}>
                        <Title
                            order={3}
                            fw={600}
                        >
                            Week view
                        </Title>
                        <Text
                            size="sm"
                            c="dimmed"
                        >
                            {startOfWeek.toLocaleDateString('en-US', {month: 'long', day: 'numeric'})} -{' '}
                            {new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </Text>
                    </Stack>
                    {onDateChange && (
                        <Group gap="xs">
                            <ActionIcon
                                variant="subtle"
                                size="lg"
                                onClick={() => navigateDate('prev')}
                                aria-label="Previous week"
                                style={{
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <IconChevronLeft size={18} />
                            </ActionIcon>
                            <ActionIcon
                                variant="subtle"
                                size="lg"
                                onClick={() => navigateDate('next')}
                                aria-label="Next week"
                                style={{
                                    transition: 'all 0.2s ease',
                                }}
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
                                span={{base: 12, sm: 6, md: 4, lg: 12 / 7}}
                            >
                                <Card
                                    padding="md"
                                    radius="md"
                                    withBorder
                                    h="100%"
                                    style={{
                                        borderColor: isToday ? 'var(--mantine-primary-color-filled)' : undefined,
                                        borderWidth: isToday ? 2 : 1,
                                    }}
                                >
                                    <Stack
                                        gap="sm"
                                        h="100%"
                                    >
                                        <Group
                                            justify="space-between"
                                            align="center"
                                        >
                                            <Stack gap={2}>
                                                <Text
                                                    fw={600}
                                                    size="sm"
                                                    c={isToday ? 'var(--mantine-primary-color-filled)' : undefined}
                                                >
                                                    {dayShort[dayIndex]}
                                                </Text>
                                                <Text
                                                    size="xs"
                                                    c={isToday ? 'var(--mantine-primary-color-filled)' : 'dimmed'}
                                                    fw={isToday ? 600 : 400}
                                                >
                                                    {currentDate.getDate()}
                                                </Text>
                                            </Stack>
                                            <ActionIcon
                                                variant="subtle"
                                                size="sm"
                                                onClick={() => openAddEntryModal(dayIndex)}
                                                aria-label={`Add entry for ${dayShort[dayIndex]}`}
                                                color="blue"
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
                                                                size="xs"
                                                                fw={500}
                                                                lineClamp={1}
                                                            >
                                                                {entry.title}
                                                            </Text>
                                                            <Text
                                                                size="xs"
                                                                c="dimmed"
                                                            >
                                                                {getTimeDisplay(entry)}
                                                            </Text>
                                                        </Box>
                                                    ))}
                                                    {dayEntries.length > 3 && (
                                                        <Text
                                                            size="xs"
                                                            c="dimmed"
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
                                                            size="xs"
                                                            c="dimmed"
                                                        >
                                                            No entries
                                                        </Text>
                                                        <Button
                                                            variant="subtle"
                                                            size="xs"
                                                            leftSection={<IconPlus size={12} />}
                                                            onClick={() => openAddEntryModal(dayIndex)}
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
                            justify="space-between"
                            align="flex-start"
                        >
                            <Stack gap={4}>
                                <Title
                                    order={2}
                                    fw={700}
                                >
                                    {schedule.name}
                                </Title>
                                {(schedule.goal || schedule.duration_weeks) && (
                                    <Group gap="md">
                                        {schedule.duration_weeks && (
                                            <Text
                                                size="sm"
                                                c="dimmed"
                                            >
                                                {schedule.duration_weeks} week{schedule.duration_weeks > 1 ? 's' : ''}
                                            </Text>
                                        )}
                                        {schedule.goal && (
                                            <Text
                                                size="sm"
                                                c="dimmed"
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
                                    variant="light"
                                    size="sm"
                                    style={{textTransform: 'capitalize'}}
                                >
                                    {schedule.status}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    size="sm"
                                    c="dimmed"
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
                                        size="lg"
                                        fw={600}
                                        c="dimmed"
                                    >
                                        No schedule entries yet
                                    </Text>
                                    <Text
                                        size="sm"
                                        c="dimmed"
                                    >
                                        Create your first entry to start building your schedule
                                    </Text>
                                </Stack>
                                <Button
                                    variant="filled"
                                    size="md"
                                    leftSection={<IconPlus size={20} />}
                                    onClick={() => openAddEntryModal(new Date().getDay())}
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
                opened={addModalOpened}
                onClose={() => {
                    setAddModalOpened(false);
                    setEditingEntry(null);
                    setFormData({
                        title: '',
                        description: '',
                        sessionDefId: '',
                        startTime: '',
                        endTime: '',
                    });
                    setFormErrors({});
                }}
                title={editingEntry ? 'Edit Schedule Entry' : 'Add Schedule Entry'}
                size="md"
            >
                <Stack gap="md">
                    <TextInput
                        label="Title"
                        placeholder="Enter entry title"
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({...prev, title: e.target.value}))}
                        error={formErrors.title}
                        required
                    />

                    <Select
                        label="Session Definition"
                        placeholder="Select session type"
                        data={
                            sessionDefs?.map((def) => ({
                                value: def.id,
                                label: def.name,
                            })) || []
                        }
                        value={formData.sessionDefId}
                        onChange={(value) => setFormData((prev) => ({...prev, sessionDefId: value || ''}))}
                        error={formErrors.sessionDefId}
                        required
                    />

                    <Group grow>
                        <TextInput
                            label="Start Time"
                            placeholder="HH:MM"
                            value={formData.startTime}
                            onChange={(e) => setFormData((prev) => ({...prev, startTime: e.target.value}))}
                            error={formErrors.startTime}
                        />
                        <TextInput
                            label="End Time"
                            placeholder="HH:MM"
                            value={formData.endTime}
                            onChange={(e) => setFormData((prev) => ({...prev, endTime: e.target.value}))}
                            error={formErrors.endTime}
                        />
                    </Group>

                    <Textarea
                        label="Description"
                        placeholder="Enter description (optional)"
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({...prev, description: e.target.value}))}
                        rows={3}
                    />

                    <Group
                        justify="flex-end"
                        gap="sm"
                    >
                        <Button
                            variant="subtle"
                            onClick={() => {
                                setAddModalOpened(false);
                                setEditingEntry(null);
                                setFormData({
                                    title: '',
                                    description: '',
                                    sessionDefId: '',
                                    startTime: '',
                                    endTime: '',
                                });
                                setFormErrors({});
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleFormSubmit}
                            loading={createEntryMutation.isPending}
                        >
                            {editingEntry ? 'Update' : 'Add'} Entry
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </PagePaper>
    );
}
