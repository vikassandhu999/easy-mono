import {Group, Avatar, Text, ActionIcon, Stack, SimpleGrid, Card, rem, ThemeIcon} from '@mantine/core';
import {useNavigate} from 'react-router';
import {
    IconCalendar,
    IconUsers,
    IconPlus,
    IconUser,
    IconChevronRight,
    IconMessage,
    IconChartBar,
    IconCoinRupee,
} from '@tabler/icons-react';

export default function HomePage() {
    const navigate = useNavigate();

    const dashboardStats = [
        {
            icon: IconCalendar,
            value: 12,
            label: 'Programs',
            color: 'blue',
        },
        {
            icon: IconUsers,
            value: 58,
            label: 'Clients Joined',
            color: 'orange',
        },
        {
            icon: IconCoinRupee,
            value: 10005550,
            label: 'Total Revenue',
            color: 'violet',
        },
        {
            icon: IconChartBar,
            value: '38%',
            label: 'Growth',
            color: 'cyan',
        },
    ];

    const menuItems = [
        {icon: IconPlus, label: 'Create New Program', path: '/programs/create'},
        {icon: IconUsers, label: 'Review Client Progress', path: '/clients'},
        {icon: IconCalendar, label: 'Schedule Sessions', path: '/sessions'},
        {icon: IconMessage, label: 'Chat with client', path: '/chat'},
    ];

    const recentClients = [
        {name: 'Sarah Johnson', program: 'Weight Loss Program', joinedDays: 2},
        {name: 'Mike Chen', program: 'Strength Training', joinedDays: 5},
        {name: 'Emma Davis', program: 'Cardio Fitness', joinedDays: 7},
        {name: 'Alex Rodriguez', program: 'Nutrition Plan', joinedDays: 10},
        {name: 'Lisa Williams', program: 'Yoga Basics', joinedDays: 12},
    ];

    return (
        <Stack
            gap="lg"
            style={{
                padding: rem(20),
                minHeight: '100vh',
                // background: '#f8f9fa',
                // background:
                //     'linear-gradient(180deg, rgba(59, 148, 255, .6) 0%, rgba(59, 148, 255, .6) 15%, #f8f9fa 15%, #f8f9fa 100%)',
            }}
        >
            <Group
                wrap="nowrap"
                mb="md"
                top={0}
            >
                <ActionIcon
                    variant="subtle"
                    size="xl"
                    radius="xl"
                    onClick={() => navigate('/profile')}
                    aria-label="View profile"
                >
                    <Avatar
                        size="lg"
                        radius="xl"
                        variant="light"
                        color="yellow"
                    />
                </ActionIcon>
                <Stack gap={4}>
                    <Text size="xxl">Hello, Navraj</Text>
                    <Text
                        size="lg"
                        c="dark"
                    >
                        Welcome back!
                    </Text>
                </Stack>
            </Group>

            {/* Stats Cards Grid */}
            <SimpleGrid
                cols={{base: 2, xs: 2, sm: 2, md: 4}}
                spacing="md"
                mb="xl"
            >
                {dashboardStats.map((stat, index) => (
                    <Card
                        key={index}
                        radius="lg"
                        p="lg"
                        withBorder
                        style={{
                            background: 'rgb(255, 255, 255)',
                            minHeight: rem(100),
                        }}
                    >
                        <Stack
                            gap="xs"
                            align="flex-start"
                        >
                            <ThemeIcon
                                size="lg"
                                radius="md"
                                variant="light"
                                color={stat.color}
                            >
                                <stat.icon size={18} />
                            </ThemeIcon>
                            <Text
                                fw={700}
                                size="xxl"
                                c="dark"
                            >
                                {stat.value}
                            </Text>
                            <Text
                                size="lg"
                                c="dimmed"
                            >
                                {stat.label}
                            </Text>
                        </Stack>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Menu Items */}
            <Card
                radius="lg"
                p="md"
                withBorder
                style={{
                    background: 'rgb(255, 255, 255)',
                }}
            >
                <Stack gap="xs">
                    <Group
                        justify="space-between"
                        mb="md"
                    >
                        <Text
                            fw={600}
                            c="dimmed"
                            size="sm"
                            tt="uppercase"
                        >
                            Quick Actions
                        </Text>
                    </Group>
                    {menuItems.map((item, index) => (
                        <Group
                            key={index}
                            justify="space-between"
                            p="md"
                            style={{
                                cursor: 'pointer',
                                borderRadius: rem(8),
                                transition: 'background-color 0.2s ease',
                            }}
                            onClick={() => navigate(item.path)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <Group gap="md">
                                <ThemeIcon
                                    size="sm"
                                    radius="md"
                                    variant="light"
                                    color="gray"
                                >
                                    <item.icon size={16} />
                                </ThemeIcon>
                                <Text
                                    fw={500}
                                    c="dark"
                                >
                                    {item.label}
                                </Text>
                            </Group>
                            <IconChevronRight
                                size={16}
                                color="#999"
                            />
                        </Group>
                    ))}
                </Stack>
            </Card>

            {/* Recent Clients Section */}
            <Card
                radius="lg"
                p="md"
                withBorder
                style={{
                    background: 'rgb(255, 255, 255)',
                }}
            >
                <Group
                    justify="space-between"
                    mb="md"
                >
                    <Text
                        fw={600}
                        c="dimmed"
                        size="sm"
                        tt="uppercase"
                    >
                        Recent Clients
                    </Text>
                    <Text
                        size="sm"
                        c="blue"
                        style={{cursor: 'pointer'}}
                        onClick={() => navigate('/clients')}
                    >
                        See all
                    </Text>
                </Group>
                <Stack gap="xs">
                    {recentClients.map((client, index) => (
                        <Group
                            key={index}
                            justify="space-between"
                            p="md"
                            style={{
                                cursor: 'pointer',
                                borderRadius: rem(8),
                                transition: 'background-color 0.2s ease',
                            }}
                            onClick={() => navigate(`/clients/${index}`)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <Group gap="md">
                                <Avatar
                                    size="sm"
                                    radius="xl"
                                    c="blue"
                                >
                                    <IconUser size={16} />
                                </Avatar>
                                <Stack gap={2}>
                                    <Text
                                        fw={500}
                                        c="dark"
                                        size="sm"
                                    >
                                        {client.name}
                                    </Text>
                                    <Text
                                        size="xs"
                                        c="dimmed"
                                    >
                                        {client.program} • {client.joinedDays} days ago
                                    </Text>
                                </Stack>
                            </Group>
                            <IconChevronRight
                                size={16}
                                color="#999"
                            />
                        </Group>
                    ))}
                </Stack>
            </Card>
        </Stack>
    );
}
