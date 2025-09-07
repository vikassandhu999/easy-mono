import {
    Stack,
    Group,
    Text,
    Title,
    Card,
    Badge,
    Button,
    Box,
    ActionIcon,
    SimpleGrid,
    Avatar,
    Progress,
    Alert,
    Input,
    Select,
    Divider,
    Anchor,
} from '@mantine/core';
import {
    IconPlus,
    IconSearch,
    IconFilter,
    IconUser,
    IconMail,
    IconPhone,
    IconCalendar,
    IconTrendingUp,
    IconTrendingDown,
    IconMinus,
    IconInfoCircle,
    IconUsers,
    IconCheck,
    IconClock,
} from '@tabler/icons-react';
import {Program} from '@/Api/Programs';
import PaddingContainer from '@/Components/Containers/PaddingContainer';

interface ClientsTabProps {
    programId: string;
    program: Program;
}

export default function ClientsTab({programId, program}: ClientsTabProps) {
    // Mock client data - in real app, fetch from API
    const programClients = [
        {
            id: '1',
            client: {
                id: 'cl1',
                first_name: 'Sarah',
                last_name: 'Johnson',
                email: 'sarah.johnson@email.com',
                phone: '+1 (555) 123-4567',
                avatar: null,
            },
            enrollment_date: '2024-01-15T10:00:00Z',
            status: 'active',
            progress: 75,
            completion_date: null,
            last_activity: '2024-01-20T14:30:00Z',
            schedule_adherence: 85,
            total_sessions: 12,
            completed_sessions: 9,
        },
        {
            id: '2',
            client: {
                id: 'cl2',
                first_name: 'Michael',
                last_name: 'Chen',
                email: 'michael.chen@email.com',
                phone: '+1 (555) 987-6543',
                avatar: null,
            },
            enrollment_date: '2024-01-10T09:00:00Z',
            status: 'completed',
            progress: 100,
            completion_date: '2024-01-19T16:00:00Z',
            last_activity: '2024-01-19T16:00:00Z',
            schedule_adherence: 92,
            total_sessions: 12,
            completed_sessions: 12,
        },
        {
            id: '3',
            client: {
                id: 'cl3',
                first_name: 'Emily',
                last_name: 'Rodriguez',
                email: 'emily.rodriguez@email.com',
                phone: '+1 (555) 456-7890',
                avatar: null,
            },
            enrollment_date: '2024-01-18T11:00:00Z',
            status: 'paused',
            progress: 40,
            completion_date: null,
            last_activity: '2024-01-18T15:45:00Z',
            schedule_adherence: 60,
            total_sessions: 12,
            completed_sessions: 5,
        },
        {
            id: '4',
            client: {
                id: 'cl4',
                first_name: 'David',
                last_name: 'Thompson',
                email: 'david.thompson@email.com',
                phone: '+1 (555) 321-0987',
                avatar: null,
            },
            enrollment_date: '2024-01-20T13:00:00Z',
            status: 'active',
            progress: 25,
            completion_date: null,
            last_activity: '2024-01-21T09:15:00Z',
            schedule_adherence: 75,
            total_sessions: 12,
            completed_sessions: 3,
        },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'green';
            case 'completed':
                return 'blue';
            case 'paused':
                return 'orange';
            case 'dropped':
                return 'red';
            default:
                return 'gray';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active':
                return 'Active';
            case 'completed':
                return 'Completed';
            case 'paused':
                return 'Paused';
            case 'dropped':
                return 'Dropped';
            default:
                return 'Unknown';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getProgressColor = (progress: number) => {
        if (progress >= 80) return 'green';
        if (progress >= 60) return 'yellow';
        if (progress >= 40) return 'orange';
        return 'red';
    };

    const calculateStats = () => {
        const total = programClients.length;
        const active = programClients.filter((client) => client.status === 'active').length;
        const completed = programClients.filter((client) => client.status === 'completed').length;
        const avgProgress = Math.round(programClients.reduce((sum, client) => sum + client.progress, 0) / total);
        const avgAdherence = Math.round(
            programClients.reduce((sum, client) => sum + client.schedule_adherence, 0) / total,
        );

        return {total, active, completed, avgProgress, avgAdherence};
    };

    const stats = calculateStats();

    return (
        <PaddingContainer>
            <Stack
                gap="xl"
                py="md"
            >
                {/* Header */}
                <Group
                    justify="space-between"
                    align="center"
                >
                    <Box>
                        <Title order={3}>Program Clients</Title>
                        <Text
                            size="sm"
                            c="dimmed"
                        >
                            Manage client enrollments and track their progress
                        </Text>
                    </Box>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={() => {
                            console.log('Enroll client in program:', programId);
                        }}
                        size={'xs'}
                    >
                        Enroll Client
                    </Button>
                </Group>

                {/* Stats Overview */}
                <Card
                    withBorder
                    p="lg"
                >
                    <Stack gap="md">
                        <Title order={4}>Client Statistics</Title>

                        <SimpleGrid
                            cols={{base: 2, sm: 5}}
                            spacing="lg"
                        >
                            <Box ta="center">
                                <Text
                                    size="xl"
                                    fw={700}
                                    c="blue"
                                >
                                    {stats.total}
                                </Text>
                                <Text
                                    size="sm"
                                    c="dimmed"
                                >
                                    Total Clients
                                </Text>
                            </Box>
                            <Box ta="center">
                                <Text
                                    size="xl"
                                    fw={700}
                                    c="green"
                                >
                                    {stats.active}
                                </Text>
                                <Text
                                    size="sm"
                                    c="dimmed"
                                >
                                    Active
                                </Text>
                            </Box>
                            <Box ta="center">
                                <Text
                                    size="xl"
                                    fw={700}
                                    c="blue"
                                >
                                    {stats.completed}
                                </Text>
                                <Text
                                    size="sm"
                                    c="dimmed"
                                >
                                    Completed
                                </Text>
                            </Box>
                            <Box ta="center">
                                <Text
                                    size="xl"
                                    fw={700}
                                    c="orange"
                                >
                                    {stats.avgProgress}%
                                </Text>
                                <Text
                                    size="sm"
                                    c="dimmed"
                                >
                                    Avg Progress
                                </Text>
                            </Box>
                            <Box ta="center">
                                <Text
                                    size="xl"
                                    fw={700}
                                    c="teal"
                                >
                                    {stats.avgAdherence}%
                                </Text>
                                <Text
                                    size="sm"
                                    c="dimmed"
                                >
                                    Avg Adherence
                                </Text>
                            </Box>
                        </SimpleGrid>
                    </Stack>
                </Card>

                {/* Filters and Search */}
                <Card
                    withBorder
                    p="md"
                >
                    <Group
                        align="end"
                        gap="md"
                    >
                        <Input
                            placeholder="Search clients..."
                            leftSection={<IconSearch size={16} />}
                            style={{flex: 1}}
                        />
                        <Select
                            placeholder="Filter by status"
                            leftSection={<IconFilter size={16} />}
                            data={[
                                {value: 'all', label: 'All Statuses'},
                                {value: 'active', label: 'Active'},
                                {value: 'completed', label: 'Completed'},
                                {value: 'paused', label: 'Paused'},
                                {value: 'dropped', label: 'Dropped'},
                            ]}
                            style={{minWidth: 160}}
                        />
                        <Button
                            variant="light"
                            leftSection={<IconFilter size={16} />}
                        >
                            More Filters
                        </Button>
                    </Group>
                </Card>

                {/* Client List */}
                {programClients.length === 0 ? (
                    <Alert
                        icon={<IconInfoCircle size={16} />}
                        title="No Clients Enrolled"
                        color="blue"
                        variant="light"
                    >
                        <Stack gap="sm">
                            <Text size="sm">
                                This program doesn't have any enrolled clients yet. Start by enrolling clients to track
                                their progress and engagement.
                            </Text>
                            <Button
                                leftSection={<IconPlus size={16} />}
                                variant="filled"
                                size="sm"
                                style={{alignSelf: 'flex-start'}}
                            >
                                Enroll First Client
                            </Button>
                        </Stack>
                    </Alert>
                ) : (
                    <Stack gap="sm">
                        {programClients.map((enrollment) => (
                            <Card
                                key={enrollment.id}
                                withBorder
                                p="lg"
                                style={{
                                    borderLeft: `4px solid var(--mantine-color-${getStatusColor(enrollment.status)}-4)`,
                                }}
                            >
                                <Stack gap="md">
                                    <Group
                                        justify="space-between"
                                        align="start"
                                    >
                                        <Group
                                            gap="md"
                                            style={{flex: 1}}
                                        >
                                            <Avatar
                                                src={enrollment.client.avatar}
                                                size="lg"
                                                color="blue"
                                            >
                                                <IconUser size={24} />
                                            </Avatar>

                                            <Box style={{flex: 1}}>
                                                <Group
                                                    gap="sm"
                                                    mb="xs"
                                                >
                                                    <Text
                                                        fw={600}
                                                        size="sm"
                                                    >
                                                        {enrollment.client.first_name} {enrollment.client.last_name}
                                                    </Text>
                                                    <Badge
                                                        color={getStatusColor(enrollment.status)}
                                                        variant="light"
                                                        size="xs"
                                                    >
                                                        {getStatusLabel(enrollment.status)}
                                                    </Badge>
                                                </Group>

                                                <Stack gap="xs">
                                                    <Group gap="sm">
                                                        <IconMail
                                                            size={14}
                                                            color="var(--mantine-color-gray-6)"
                                                        />
                                                        <Text
                                                            size="xs"
                                                            c="dimmed"
                                                        >
                                                            {enrollment.client.email}
                                                        </Text>
                                                    </Group>

                                                    {enrollment.client.phone && (
                                                        <Group gap="sm">
                                                            <IconPhone
                                                                size={14}
                                                                color="var(--mantine-color-gray-6)"
                                                            />
                                                            <Text
                                                                size="xs"
                                                                c="dimmed"
                                                            >
                                                                {enrollment.client.phone}
                                                            </Text>
                                                        </Group>
                                                    )}

                                                    <Group gap="sm">
                                                        <IconCalendar
                                                            size={14}
                                                            color="var(--mantine-color-gray-6)"
                                                        />
                                                        <Text
                                                            size="xs"
                                                            c="dimmed"
                                                        >
                                                            Enrolled {formatDate(enrollment.enrollment_date)}
                                                        </Text>
                                                    </Group>
                                                </Stack>
                                            </Box>
                                        </Group>

                                        <Group gap="xs">
                                            <ActionIcon
                                                variant="subtle"
                                                color="blue"
                                                onClick={() => {
                                                    console.log('View client details:', enrollment.client.id);
                                                }}
                                            >
                                                <IconUser size={16} />
                                            </ActionIcon>
                                            <ActionIcon
                                                variant="subtle"
                                                color="red"
                                                onClick={() => {
                                                    console.log('Unenroll client:', enrollment.id);
                                                }}
                                            >
                                                <IconMinus size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>

                                    <Divider />

                                    {/* Progress and Stats */}
                                    <SimpleGrid
                                        cols={{base: 1, sm: 3}}
                                        spacing="md"
                                    >
                                        <Box>
                                            <Group
                                                justify="space-between"
                                                mb="xs"
                                            >
                                                <Text
                                                    size="sm"
                                                    fw={500}
                                                >
                                                    Overall Progress
                                                </Text>
                                                <Text
                                                    size="sm"
                                                    fw={700}
                                                    c={getProgressColor(enrollment.progress)}
                                                >
                                                    {enrollment.progress}%
                                                </Text>
                                            </Group>
                                            <Progress
                                                value={enrollment.progress}
                                                color={getProgressColor(enrollment.progress)}
                                                size="sm"
                                            />
                                        </Box>

                                        <Box ta="center">
                                            <Text
                                                size="xs"
                                                c="dimmed"
                                                mb="xs"
                                            >
                                                Sessions
                                            </Text>
                                            <Group
                                                justify="center"
                                                gap="xs"
                                            >
                                                <IconCheck
                                                    size={14}
                                                    color="var(--mantine-color-green-6)"
                                                />
                                                <Text
                                                    size="sm"
                                                    fw={600}
                                                >
                                                    {enrollment.completed_sessions}/{enrollment.total_sessions}
                                                </Text>
                                            </Group>
                                        </Box>

                                        <Box ta="center">
                                            <Text
                                                size="xs"
                                                c="dimmed"
                                                mb="xs"
                                            >
                                                Schedule Adherence
                                            </Text>
                                            <Group
                                                justify="center"
                                                gap="xs"
                                            >
                                                {enrollment.schedule_adherence >= 80 ? (
                                                    <IconTrendingUp
                                                        size={14}
                                                        color="var(--mantine-color-green-6)"
                                                    />
                                                ) : (
                                                    <IconTrendingDown
                                                        size={14}
                                                        color="var(--mantine-color-red-6)"
                                                    />
                                                )}
                                                <Text
                                                    size="sm"
                                                    fw={600}
                                                    c={enrollment.schedule_adherence >= 80 ? 'green' : 'red'}
                                                >
                                                    {enrollment.schedule_adherence}%
                                                </Text>
                                            </Group>
                                        </Box>
                                    </SimpleGrid>

                                    {/* Last Activity */}
                                    <Group
                                        justify="space-between"
                                        align="center"
                                    >
                                        <Group gap="xs">
                                            <IconClock
                                                size={14}
                                                color="var(--mantine-color-gray-6)"
                                            />
                                            <Text
                                                size="xs"
                                                c="dimmed"
                                            >
                                                Last activity: {formatDate(enrollment.last_activity)}
                                            </Text>
                                        </Group>

                                        <Anchor
                                            size="xs"
                                            onClick={() => {
                                                console.log('View client progress details:', enrollment.id);
                                            }}
                                        >
                                            View Details
                                        </Anchor>
                                    </Group>
                                </Stack>
                            </Card>
                        ))}
                    </Stack>
                )}

                {/* Quick Actions */}
                <Card
                    withBorder
                    p="lg"
                    style={{backgroundColor: 'var(--mantine-color-blue-0)'}}
                >
                    <Stack gap="md">
                        <Group gap="sm">
                            <ActionIcon
                                variant="light"
                                color="blue"
                                size="lg"
                            >
                                <IconUsers size={20} />
                            </ActionIcon>
                            <Box>
                                <Text
                                    fw={600}
                                    size="sm"
                                >
                                    Client Management
                                </Text>
                                <Text
                                    size="xs"
                                    c="dimmed"
                                >
                                    Bulk actions and advanced management
                                </Text>
                            </Box>
                        </Group>

                        <Text
                            size="sm"
                            style={{lineHeight: 1.5}}
                        >
                            Need to manage multiple clients at once? Use bulk actions to send messages, update
                            schedules, or generate progress reports.
                        </Text>

                        <Group gap="sm">
                            <Button
                                variant="light"
                                size="sm"
                                onClick={() => {
                                    console.log('Bulk client actions');
                                }}
                            >
                                Bulk Actions
                            </Button>
                            <Anchor
                                size="sm"
                                onClick={() => {
                                    console.log('Export client data');
                                }}
                            >
                                Export Data
                            </Anchor>
                        </Group>
                    </Stack>
                </Card>
            </Stack>
        </PaddingContainer>
    );
}
