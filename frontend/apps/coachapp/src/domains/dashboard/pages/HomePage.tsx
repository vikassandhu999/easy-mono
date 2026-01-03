import {
    ActionIcon,
    Alert,
    Avatar,
    Box,
    Button,
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
import {useDisclosure} from '@mantine/hooks';
import {IconBell, IconBellOff, IconCalendar, IconChevronRight, IconUsers} from '@tabler/icons-react';
import {useMemo} from 'react';
import {useNavigate} from 'react-router';

import {useProfileQuery} from '@/services/auth';
import AutoDrawer from '@/shared/AutoDrawer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PageWrapper from '@/containers/PageWrapper';

import {QUICK_ACTIONS, QuickActionConfig} from '../config';

interface StatCardProps {
    color: string;
    icon: React.ComponentType<{size?: number | string}>;
    label: string;
    value: number | string;
}

interface QuickActionItemProps {
    action: QuickActionConfig;
    onNavigate: (path: string) => void;
    theme: any;
}

export default function HomePage() {
    const theme = useMantineTheme();
    const navigate = useNavigate();
    const {data: profile, isLoading: profileLoading, isError: profileErr, refetch} = useProfileQuery();
    const [notificationDrawerOpened, {open: openNotificationDrawer, close: closeNotificationDrawer}] =
        useDisclosure(false);

    const coachFirstName = profile ? profile.user.first_name : 'Coach';
    const coachNameInitial = coachFirstName[0];
    const isLoading = profileLoading;
    const isError = profileErr;

    const stats = useMemo(() => {
        const coachStats = profile?.coach?.stats;
        return [
            {
                color: 'blue',
                icon: IconCalendar,
                label: 'Total Plans',
                value: coachStats?.total_plans ?? 0,
            },
            {
                color: 'green',
                icon: IconUsers,
                label: 'Total Clients',
                value: coachStats?.total_clients ?? 0,
            },
        ];
    }, [profile?.coach?.stats]);

    return (
        <PageWrapper>
            <LoadingOverlay
                loaderProps={{
                    type: 'bars',
                }}
                visible={isLoading}
            />
            <PaddingContainer>
                {isError && (
                    <Alert
                        color="red"
                        radius="xl"
                        title="Something went wrong!"
                        variant="light"
                        withCloseButton={true}
                    >
                        <Group wrap="nowrap">
                            <Text flex={2}>Error while loading user profile. Please check internet connection.</Text>
                            <Button
                                color="red"
                                flex={1}
                                onClick={refetch}
                                size="compact-sm"
                                variant="light"
                            >
                                Retry
                            </Button>
                        </Group>
                    </Alert>
                )}
                <Stack gap="lg">
                    <Group
                        gap="md"
                        justify="space-between"
                        mt="md"
                        wrap="nowrap"
                    >
                        <Group>
                            <Avatar
                                color="blue"
                                radius="xl"
                                size="lg"
                                variant="outline"
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

                        <ActionIcon
                            color="cyan"
                            onClick={openNotificationDrawer}
                            size="xl"
                            variant="light"
                        >
                            <IconBell />
                        </ActionIcon>
                    </Group>

                    <SimpleGrid
                        cols={{base: 2, md: 2, sm: 2}}
                        spacing="md"
                    >
                        {stats.map((stat) => (
                            <StatCard
                                color={stat.color}
                                icon={stat.icon}
                                key={stat.label}
                                label={stat.label}
                                value={stat.value}
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

                            {QUICK_ACTIONS.map((action) => (
                                <QuickActionItem
                                    action={action}
                                    key={action.id}
                                    onNavigate={navigate}
                                    theme={theme}
                                />
                            ))}
                        </Stack>
                    </Card>
                </Stack>
            </PaddingContainer>

            {/* Notification Drawer */}
            {notificationDrawerOpened && (
                <AutoDrawer
                    content={
                        <Stack
                            align="center"
                            gap="md"
                            justify="center"
                            py="xl"
                        >
                            <ThemeIcon
                                color="gray"
                                radius="xl"
                                size={64}
                                variant="light"
                            >
                                <IconBellOff size={32} />
                            </ThemeIcon>
                            <Text
                                c="dimmed"
                                size="sm"
                                ta="center"
                            >
                                No notifications yet
                            </Text>
                            <Text
                                c="dimmed"
                                size="xs"
                                ta="center"
                            >
                                We'll notify you when something important happens.
                            </Text>
                        </Stack>
                    }
                    onClose={closeNotificationDrawer}
                    title="Notifications"
                />
            )}
        </PageWrapper>
    );
}

function StatCard({color, icon: Icon, label, value}: StatCardProps) {
    return (
        <Card
            p="lg"
            radius="lg"
        >
            <Stack gap="xs">
                <ThemeIcon
                    color={color}
                    radius="md"
                    size="lg"
                    variant="light"
                >
                    <Icon size={20} />
                </ThemeIcon>
                <div>
                    <Text
                        fw={700}
                        size="xl"
                    >
                        {value}
                    </Text>
                    <Text
                        c="dimmed"
                        mt={4}
                        size="sm"
                    >
                        {label}
                    </Text>
                </div>
            </Stack>
        </Card>
    );
}

function QuickActionItem({action, onNavigate, theme}: QuickActionItemProps) {
    return (
        <Box
            component="button"
            onClick={() => onNavigate(action.path)}
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
