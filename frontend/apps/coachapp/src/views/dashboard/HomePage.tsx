import {ActionIcon, Avatar, Card, Group, rem, SimpleGrid, Stack, Text, ThemeIcon} from '@mantine/core';
import {
    IconCalendar,
    IconChartBar,
    IconChevronRight,
    IconCoinRupee,
    IconMessage,
    IconPlus,
    IconUser,
    IconUsers,
} from '@tabler/icons-react';
import {useNavigate} from 'react-router';

export default function HomePage() {
    const navigate = useNavigate();

    const dashboardStats = [
        {
            color: 'blue',
            icon: IconCalendar,
            label: 'Programs',
            value: 12,
        },
        {
            color: 'orange',
            icon: IconUsers,
            label: 'clients Joined',
            value: 58,
        },
        {
            color: 'violet',
            icon: IconCoinRupee,
            label: 'Total Revenue',
            value: 10005550,
        },
        {
            color: 'cyan',
            icon: IconChartBar,
            label: 'Growth',
            value: '38%',
        },
    ];

    const menuItems = [
        {icon: IconPlus, label: 'Create New Program', path: '/programs/create'},
        {icon: IconUsers, label: 'Review Client Progress', path: '/clients'},
        {icon: IconCalendar, label: 'Schedule Sessions', path: '/sessions'},
        {icon: IconMessage, label: 'Chat with client', path: '/chat'},
    ];

    const recentClients = [
        {joinedDays: 2, name: 'Sarah Johnson', program: 'Weight Loss Program'},
        {joinedDays: 5, name: 'Mike Chen', program: 'Strength Training'},
        {joinedDays: 7, name: 'Emma Davis', program: 'Cardio Fitness'},
        {joinedDays: 10, name: 'Alex Rodriguez', program: 'Nutrition Plan'},
        {joinedDays: 12, name: 'Lisa Williams', program: 'Yoga Basics'},
    ];

    return (
        <Stack
            gap="lg"
            style={{
                minHeight: '100vh',
                padding: rem(20),
                // background: '#f8f9fa',
                // background:
                //     'linear-gradient(180deg, rgba(59, 148, 255, .6) 0%, rgba(59, 148, 255, .6) 15%, #f8f9fa 15%, #f8f9fa 100%)',
            }}
        >
            <Group
                mb="md"
                top={0}
                wrap="nowrap"
            >
                <ActionIcon
                    aria-label="View profile"
                    onClick={() => navigate('/profile')}
                    radius="xl"
                    size="xl"
                    variant="subtle"
                >
                    <Avatar
                        color="yellow"
                        radius="xl"
                        size="lg"
                        variant="light"
                    />
                </ActionIcon>
                <Stack gap={4}>
                    <Text size="xxl">Hello, Navraj</Text>
                    <Text
                        c="dark"
                        size="lg"
                    >
                        Welcome back!
                    </Text>
                </Stack>
            </Group>

            {/* Stats Cards Grid */}
            <SimpleGrid
                cols={{base: 2, md: 4, sm: 2, xs: 2}}
                mb="xl"
                spacing="md"
            >
                {dashboardStats.map((stat, index) => (
                    <Card
                        key={index}
                        p="lg"
                        radius="lg"
                        style={{
                            background: 'rgb(255, 255, 255)',
                            minHeight: rem(100),
                        }}
                        withBorder
                    >
                        <Stack
                            align="flex-start"
                            gap="xs"
                        >
                            <ThemeIcon
                                color={stat.color}
                                radius="md"
                                size="lg"
                                variant="light"
                            >
                                <stat.icon size={18} />
                            </ThemeIcon>
                            <Text
                                c="dark"
                                fw={700}
                                size="xxl"
                            >
                                {stat.value}
                            </Text>
                            <Text
                                c="dimmed"
                                size="lg"
                            >
                                {stat.label}
                            </Text>
                        </Stack>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Menu Items */}
            <Card
                p="md"
                radius="lg"
                style={{
                    background: 'rgb(255, 255, 255)',
                }}
                withBorder
            >
                <Stack gap="xs">
                    <Group
                        justify="space-between"
                        mb="md"
                    >
                        <Text
                            c="dimmed"
                            fw={600}
                            size="sm"
                            tt="uppercase"
                        >
                            Quick Actions
                        </Text>
                    </Group>
                    {menuItems.map((item, index) => (
                        <Group
                            justify="space-between"
                            key={index}
                            onClick={() => navigate(item.path)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            p="md"
                            style={{
                                borderRadius: rem(8),
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease',
                            }}
                        >
                            <Group gap="md">
                                <ThemeIcon
                                    color="gray"
                                    radius="md"
                                    size="sm"
                                    variant="light"
                                >
                                    <item.icon size={16} />
                                </ThemeIcon>
                                <Text
                                    c="dark"
                                    fw={500}
                                >
                                    {item.label}
                                </Text>
                            </Group>
                            <IconChevronRight
                                color="#999"
                                size={16}
                            />
                        </Group>
                    ))}
                </Stack>
            </Card>

            {/* Recent clients Section */}
            <Card
                p="md"
                radius="lg"
                style={{
                    background: 'rgb(255, 255, 255)',
                }}
                withBorder
            >
                <Group
                    justify="space-between"
                    mb="md"
                >
                    <Text
                        c="dimmed"
                        fw={600}
                        size="sm"
                        tt="uppercase"
                    >
                        Recent Clients
                    </Text>
                    <Text
                        c="blue"
                        onClick={() => navigate('/clients')}
                        size="sm"
                        style={{cursor: 'pointer'}}
                    >
                        See all
                    </Text>
                </Group>
                <Stack gap="xs">
                    {recentClients.map((client, index) => (
                        <Group
                            justify="space-between"
                            key={index}
                            onClick={() => navigate(`/clients/${index}`)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            p="md"
                            style={{
                                borderRadius: rem(8),
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease',
                            }}
                        >
                            <Group gap="md">
                                <Avatar
                                    c="blue"
                                    radius="xl"
                                    size="sm"
                                >
                                    <IconUser size={16} />
                                </Avatar>
                                <Stack gap={2}>
                                    <Text
                                        c="dark"
                                        fw={500}
                                        size="sm"
                                    >
                                        {client.name}
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        size="xs"
                                    >
                                        {client.program} • {client.joinedDays} days ago
                                    </Text>
                                </Stack>
                            </Group>
                            <IconChevronRight
                                color="#999"
                                size={16}
                            />
                        </Group>
                    ))}
                </Stack>
            </Card>
        </Stack>
    );
}
