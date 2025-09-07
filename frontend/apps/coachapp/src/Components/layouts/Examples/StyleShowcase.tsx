import {useState} from 'react';
import {Stack, Group, Button, Text, Badge, Avatar, Switch, Paper, Title, Divider} from '@mantine/core';
import {
    IconUsers,
    IconClock,
    IconEye,
    IconEdit,
    IconTrash,
    IconLayoutCards,
    IconList,
    IconLayoutGrid,
} from '@tabler/icons-react';
import {ListCard, SimpleListItem, EnhancedRecordsList, type ListLayout} from '..';

// Sample data
const samplePrograms = [
    {
        id: '1',
        name: 'Morning Yoga Flow',
        description: 'A gentle 30-minute yoga sequence to start your day with mindfulness and energy',
        status: 'active' as const,
        clientCount: 24,
        duration: 4,
        createdAt: '2024-01-15',
    },
    {
        id: '2',
        name: 'HIIT Strength Training',
        description: 'High-intensity interval training focused on building strength and endurance',
        status: 'active' as const,
        clientCount: 18,
        duration: 8,
        createdAt: '2024-01-10',
    },
    {
        id: '3',
        name: 'Flexibility & Recovery',
        description: 'Comprehensive stretching and mobility program for athletes',
        status: 'draft' as const,
        clientCount: 0,
        duration: 6,
        createdAt: '2024-01-20',
    },
];

const sampleClients = [
    {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@email.com',
        avatar: undefined,
        status: 'active' as const,
        lastSeen: '2 hours ago',
    },
    {
        id: '2',
        name: 'Michael Chen',
        email: 'michael.chen@email.com',
        avatar: undefined,
        status: 'active' as const,
        lastSeen: '1 day ago',
    },
    {
        id: '3',
        name: 'Emma Wilson',
        email: 'emma.wilson@email.com',
        avatar: undefined,
        status: 'inactive' as const,
        lastSeen: '1 week ago',
    },
];

export function StyleShowcase() {
    const [layout, setLayout] = useState<ListLayout>('card');
    const [showDividers, setShowDividers] = useState(true);

    const renderProgram = (program: (typeof samplePrograms)[0], _index: number, currentLayout: ListLayout) => {
        if (currentLayout === 'card') {
            return (
                <ListCard
                    title={program.name}
                    subtitle={program.description}
                    badge={{
                        text: program.status,
                        color: program.status === 'active' ? 'green' : 'yellow',
                        variant: 'light',
                    }}
                    badges={[
                        {
                            text: `${program.clientCount} clients`,
                            color: 'blue',
                            variant: 'outline',
                            size: 'xs',
                        },
                        {
                            text: `${program.duration} weeks`,
                            color: 'gray',
                            variant: 'outline',
                            size: 'xs',
                        },
                    ]}
                    actions={[
                        {
                            label: 'View',
                            icon: <IconEye size={16} />,
                            onClick: () => console.log('View program'),
                        },
                        {
                            label: 'Edit',
                            icon: <IconEdit size={16} />,
                            onClick: () => console.log('Edit program'),
                        },
                        {
                            label: 'Delete',
                            icon: <IconTrash size={16} />,
                            onClick: () => console.log('Delete program'),
                            destructive: true,
                        },
                    ]}
                    metadata={[
                        {
                            label: 'Clients',
                            value: program.clientCount.toString(),
                            icon: <IconUsers size={14} />,
                        },
                        {
                            label: 'Duration',
                            value: `${program.duration} weeks`,
                            icon: <IconClock size={14} />,
                        },
                    ]}
                    onClick={() => console.log('Program clicked')}
                />
            );
        }

        return (
            <SimpleListItem
                title={program.name}
                subtitle={currentLayout === 'compact' ? undefined : program.description}
                rightContent={
                    <Group
                        gap="xs"
                        align="center"
                    >
                        <Badge
                            size="xs"
                            color={program.status === 'active' ? 'green' : 'yellow'}
                            variant="light"
                            radius="md"
                            style={{
                                fontWeight: 500,
                                textTransform: 'capitalize',
                            }}
                        >
                            {program.status}
                        </Badge>
                        <Text
                            size="xs"
                            c="dimmed"
                            style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {program.clientCount} clients
                        </Text>
                    </Group>
                }
                actions={[
                    {
                        label: 'View',
                        icon: <IconEye size={16} />,
                        onClick: () => console.log('View program'),
                    },
                    {
                        label: 'Edit',
                        icon: <IconEdit size={16} />,
                        onClick: () => console.log('Edit program'),
                    },
                ]}
                onClick={() => console.log('Program clicked')}
                compact={currentLayout === 'compact'}
            />
        );
    };

    const renderClient = (client: (typeof sampleClients)[0], _index: number, currentLayout: ListLayout) => (
        <SimpleListItem
            title={client.name}
            subtitle={currentLayout === 'compact' ? undefined : client.email}
            leftContent={
                <Avatar
                    size={currentLayout === 'compact' ? 'sm' : 'md'}
                    name={client.name}
                >
                    {client.name.charAt(0).toUpperCase()}
                </Avatar>
            }
            rightContent={
                <Group
                    gap="xs"
                    align="center"
                >
                    <Badge
                        size="xs"
                        color={client.status === 'active' ? 'green' : 'gray'}
                        variant="dot"
                        radius="md"
                        style={{
                            fontWeight: 500,
                            textTransform: 'capitalize',
                        }}
                    >
                        {client.status}
                    </Badge>
                    {currentLayout !== 'compact' && (
                        <Text
                            size="xs"
                            c="dimmed"
                            style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {client.lastSeen}
                        </Text>
                    )}
                </Group>
            }
            actions={[
                {
                    label: 'View Profile',
                    icon: <IconEye size={16} />,
                    onClick: () => console.log('View client'),
                },
                {
                    label: 'Edit',
                    icon: <IconEdit size={16} />,
                    onClick: () => console.log('Edit client'),
                },
            ]}
            onClick={() => console.log('Client clicked')}
            compact={currentLayout === 'compact'}
        />
    );

    return (
        <Stack
            gap="xl"
            p="md"
            style={{maxWidth: '800px', margin: '0 auto'}}
        >
            <Paper
                p="md"
                radius="md"
                withBorder
                style={{
                    backgroundColor: '#f8f9fa',
                    borderColor: '#e9ecef',
                }}
            >
                <Title
                    order={2}
                    size="h3"
                    mb="md"
                    c="dark.8"
                >
                    Enhanced Listing Components Showcase
                </Title>
                <Text
                    size="sm"
                    c="dimmed"
                    mb="lg"
                >
                    These components follow UX best practices with proper spacing, visual hierarchy, and mobile-first
                    design.
                </Text>

                {/* Layout Controls */}
                <Group
                    gap="md"
                    mb="lg"
                >
                    <Group gap="xs">
                        <Text
                            size="sm"
                            fw={500}
                            c="dark.7"
                        >
                            Layout:
                        </Text>
                        <Button.Group>
                            <Button
                                variant={layout === 'card' ? 'filled' : 'light'}
                                size="xs"
                                leftSection={<IconLayoutCards size={14} />}
                                onClick={() => setLayout('card')}
                            >
                                Card
                            </Button>
                            <Button
                                variant={layout === 'simple' ? 'filled' : 'light'}
                                size="xs"
                                leftSection={<IconList size={14} />}
                                onClick={() => setLayout('simple')}
                            >
                                Simple
                            </Button>
                            <Button
                                variant={layout === 'compact' ? 'filled' : 'light'}
                                size="xs"
                                leftSection={<IconLayoutGrid size={14} />}
                                onClick={() => setLayout('compact')}
                            >
                                Compact
                            </Button>
                        </Button.Group>
                    </Group>

                    {layout === 'simple' && (
                        <Group gap="xs">
                            <Text
                                size="sm"
                                fw={500}
                                c="dark.7"
                            >
                                Dividers:
                            </Text>
                            <Switch
                                size="sm"
                                checked={showDividers}
                                onChange={(event) => setShowDividers(event.currentTarget.checked)}
                            />
                        </Group>
                    )}
                </Group>
            </Paper>

            {/* Programs Section */}
            <Stack gap="md">
                <Group
                    justify="space-between"
                    align="center"
                >
                    <Title
                        order={3}
                        size="h4"
                        c="dark.8"
                    >
                        Training Programs
                    </Title>
                    <Badge
                        size="sm"
                        variant="light"
                        color="blue"
                    >
                        {layout} layout
                    </Badge>
                </Group>

                <EnhancedRecordsList
                    records={samplePrograms}
                    renderItem={renderProgram}
                    itemKey={(program) => program.id}
                    layout={layout}
                    showDividers={layout === 'simple' && showDividers}
                    emptyState={
                        <Text
                            ta="center"
                            c="dimmed"
                            py="xl"
                        >
                            No programs found
                        </Text>
                    }
                    hasNextPage={false}
                    fetchNextPage={() => {}}
                    showItemCount
                />
            </Stack>

            <Divider my="xl" />

            {/* Clients Section */}
            <Stack gap="md">
                <Group
                    justify="space-between"
                    align="center"
                >
                    <Title
                        order={3}
                        size="h4"
                        c="dark.8"
                    >
                        Clients
                    </Title>
                    <Badge
                        size="sm"
                        variant="light"
                        color="green"
                    >
                        Simple items
                    </Badge>
                </Group>

                <EnhancedRecordsList
                    records={sampleClients}
                    renderItem={renderClient}
                    itemKey={(client) => client.id}
                    layout={layout === 'card' ? 'simple' : layout}
                    showDividers={layout === 'simple' && showDividers}
                    emptyState={
                        <Text
                            ta="center"
                            c="dimmed"
                            py="xl"
                        >
                            No clients found
                        </Text>
                    }
                    hasNextPage={false}
                    fetchNextPage={() => {}}
                    showItemCount
                />
            </Stack>

            {/* UX Principles Applied */}
            <Paper
                p="md"
                radius="md"
                withBorder
                style={{backgroundColor: '#f1f3f4'}}
            >
                <Title
                    order={4}
                    size="h5"
                    mb="sm"
                    c="dark.8"
                >
                    UX Principles Applied
                </Title>
                <Stack gap="xs">
                    <Text
                        size="sm"
                        c="dark.7"
                    >
                        ✅ <strong>48pt minimum touch targets</strong> for mobile accessibility
                    </Text>
                    <Text
                        size="sm"
                        c="dark.7"
                    >
                        ✅ <strong>Visual hierarchy</strong> through typography, spacing, and color
                    </Text>
                    <Text
                        size="sm"
                        c="dark.7"
                    >
                        ✅ <strong>Generous white space</strong> to reduce cognitive load
                    </Text>
                    <Text
                        size="sm"
                        c="dark.7"
                    >
                        ✅ <strong>Consistent patterns</strong> across all interaction states
                    </Text>
                    <Text
                        size="sm"
                        c="dark.7"
                    >
                        ✅ <strong>Clear grouping</strong> of related information
                    </Text>
                    <Text
                        size="sm"
                        c="dark.7"
                    >
                        ✅ <strong>Smooth animations</strong> with proper easing curves
                    </Text>
                </Stack>
            </Paper>
        </Stack>
    );
}
