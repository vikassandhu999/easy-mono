import {
    Avatar,
    Box,
    Card,
    Group,
    LoadingOverlay,
    SimpleGrid,
    Stack,
    Text,
    ThemeIcon,
    Title,
    useMantineTheme,
} from '@mantine/core';
import {IconCalendar, IconChevronRight, IconPlus, IconTreadmill, IconUserPlus, IconUsers} from '@tabler/icons-react';
import {useNavigate} from 'react-router';

import {useUser} from '@/providers/UserProvider';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';

interface DashboardStat {
    color: string;
    icon: React.ComponentType<{size?: number | string}>;
    label: string;
    value: number | string;
}

interface QuickAction {
    action: () => void;
    icon: React.ComponentType<{size?: number | string}>;
    id: string;
    label: string;
}

interface StatCardProps {
    stat: DashboardStat;
}

function StatCard({stat}: StatCardProps) {
    return (
        <Card
            bg="gray.1"
            p="lg"
            radius="lg"
        >
            <Stack gap="xs">
                <ThemeIcon
                    color={stat.color}
                    radius="md"
                    size="lg"
                    variant="light"
                >
                    <stat.icon size={20} />
                </ThemeIcon>
                <div>
                    <Text
                        fw={700}
                        size="xl"
                    >
                        {stat.value}
                    </Text>
                    <Text
                        c="dimmed"
                        mt={4}
                        size="sm"
                    >
                        {stat.label}
                    </Text>
                </div>
            </Stack>
        </Card>
    );
}

interface QuickActionItemProps {
    action: QuickAction;
    theme: any;
}

function QuickActionItem({action, theme}: QuickActionItemProps) {
    return (
        <Box
            component="button"
            onClick={action.action}
            style={{
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
                width: '100%',
                border: 'none',
                color: theme.colors.gray[6],
            }}
            type="button"
        >
            <Group
                gap="md"
                justify="space-between"
                p="md"
                style={(themeObj) => ({
                    borderRadius: themeObj.radius.sm,
                    transition: 'background-color 150ms ease',
                })}
                styles={{
                    root: {
                        '&:hover': {
                            backgroundColor: 'var(--mantine-color-gray-0)',
                        },
                    },
                }}
                wrap="nowrap"
            >
                <Group
                    gap="md"
                    wrap="nowrap"
                >
                    <ThemeIcon
                        color="gray"
                        radius="md"
                        size="md"
                        variant="light"
                    >
                        <action.icon size={18} />
                    </ThemeIcon>
                    <Text
                        fw={500}
                        size="sm"
                    >
                        {action.label}
                    </Text>
                </Group>
                <IconChevronRight
                    color="var(--mantine-color-gray-6)"
                    size={18}
                />
            </Group>
        </Box>
    );
}

// TODO : Fetch Business stats

export default function HomePage() {
    const theme = useMantineTheme();
    const navigate = useNavigate();
    const {user, isLoading} = useUser();

    const dashboardStats = [
        {
            color: 'blue',
            icon: IconCalendar,
            label: 'Plans',
            value: 0,
        },
        {
            color: 'green',
            icon: IconUsers,
            label: 'Clients joined',
            value: 0,
        },
    ];
    const quickActions: QuickAction[] = [
        {
            id: 'create-plan',
            icon: IconPlus,
            label: 'Create new plan',
            action: () => navigate('/plans?selected_drawer=create-plan'),
        },
        {
            id: 'add-client',
            icon: IconUserPlus,
            label: 'Add a client',
            action: () => navigate('/clients'),
        },
        {
            id: 'create-content',
            icon: IconTreadmill,
            label: 'Create new content',
            action: () => navigate('/library'),
        },
    ];

    const coachFirstName = user.full_name ? user.full_name.split(' ')[0] : 'Coach';
    const coachNameInitial = coachFirstName[0];

    return (
        <PagePaper>
            <LoadingOverlay
                loaderProps={{
                    type: 'bars',
                }}
                visible={isLoading}
            />
            <PaddingContainer>
                <Stack gap="lg">
                    <Group
                        gap="md"
                        mt="md"
                        wrap="nowrap"
                    >
                        <Avatar
                            color="blue"
                            radius="xl"
                            size="lg"
                            // src={coach?.profile_picture_url}
                            variant="light"
                        >
                            {coachNameInitial}
                        </Avatar>
                        <Stack gap={4}>
                            <Title
                                order={2}
                                size="h5"
                            >
                                Hello, {coachFirstName}
                            </Title>
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Welcome back
                            </Text>
                        </Stack>
                    </Group>

                    <SimpleGrid
                        cols={{base: 2, md: 2, sm: 2}}
                        spacing="md"
                    >
                        {dashboardStats.map((stat) => (
                            <StatCard
                                key={stat.label}
                                stat={stat}
                            />
                        ))}
                    </SimpleGrid>

                    <Card p="md">
                        <Stack gap="xs">
                            <Text
                                c="dimmed"
                                fw={600}
                                mb="xs"
                                size="xs"
                                tt="uppercase"
                            >
                                Quick actions
                            </Text>

                            {quickActions.map((action) => (
                                <QuickActionItem
                                    action={action}
                                    key={action.id}
                                    theme={theme}
                                />
                            ))}
                        </Stack>
                    </Card>
                </Stack>
            </PaddingContainer>
        </PagePaper>
    );
}
