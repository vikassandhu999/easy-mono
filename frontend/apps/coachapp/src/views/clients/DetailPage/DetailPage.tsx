import {useContentHeight} from '@easy/hooks';
import {
    Alert,
    Avatar,
    Badge,
    Box,
    Button,
    Card,
    Divider,
    Group,
    LoadingOverlay,
    Menu,
    ScrollArea,
    Stack,
    Tabs,
    Text,
    ThemeIcon,
    useDrawersStack,
    useMantineTheme,
} from '@mantine/core';
import {useInViewport, useMediaQuery} from '@mantine/hooks';
import {
    IconAlertCircle,
    IconCalendar,
    IconCalendarTime,
    IconChevronDown,
    IconClock,
    IconMail,
    IconNotes,
    IconPackage,
    IconPhone,
    IconTrendingUp,
    IconUser,
    IconUserCheck,
} from '@tabler/icons-react';
import {useState} from 'react';
import {useParams} from 'react-router';

import {Client} from '@/api/clients.ts';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {EmptyState} from '@/components/layouts/EmptyState';
import Header from '@/components/layouts/Header';
import RecordsList from '@/components/layouts/RecordsList';
import ScheduleBuilder from '@/components/ScheduleBuilder/ScheduleBuilder';
import {ScheduleCreateDrawer} from '@/components/ScheduleForm/ScheduleCreateDrawer';
import ScheduleListItem from '@/components/ScheduleListItem/ScheduleListItem';
import {useDrawerStackRouter} from '@/hooks/useDrawerStackRouter';
import {useGetClientQuery} from '@/store/services/clientsApi';
import {useAssignScheduleMutation, useListSchedulesInfiniteQuery} from '@/store/services/schedulesApi';

const ClientDetailPage = () => {
    const {id} = useParams<{id: string}>();
    const [activeTab, setActiveTab] = useState<string>('info');

    const isMobile = useMediaQuery('(max-width: 768px)');
    const {data: client, error, isError, isLoading} = useGetClientQuery(id!, {skip: !id});
    const {inViewport: titleInViewport, ref: titleRef} = useInViewport<HTMLHeadingElement>();
    const {topHeight, useElementRef} = useContentHeight();
    const headerRef = useElementRef('top');
    const theme = useMantineTheme();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isSchedulesLoading,
    } = useListSchedulesInfiniteQuery({client_id: id!});

    const schedules = data?.pages?.flatMap((page) => page.records) || [];

    // Drawer stack for plan creation (select type -> create)
    const createStack = useDrawersStack(['select-plan-type', 'create-schedule']);
    const [assignSchedule] = useAssignScheduleMutation();

    const scheduleBuilderStack = useDrawerStackRouter({
        baseRoutePath: `/clients/${id}`,
        drawerIds: [
            'entries-view',
            'select-session',
            'select-session-type',
            'add-entry',
            'create-session',
            'edit-entry',
            'manage-content',
            'add-content-item',
            'session-form',
            'content-select',
        ],
    });

    if (isLoading) {
        return (
            <PaddingContainer>
                <LoadingOverlay visible />
            </PaddingContainer>
        );
    }

    if (isError || !client) {
        return (
            <PaddingContainer>
                <Alert
                    color="red"
                    icon={<IconAlertCircle size={16} />}
                    title="Error"
                >
                    {error?.message || 'Failed to load client'}
                </Alert>
            </PaddingContainer>
        );
    }

    return (
        <PagePaper>
            <HeadingContainer
                ref={headerRef}
                style={{
                    paddingBlock: 'var(--ce-size-sm)',
                    paddingInline: 'var(--ce-size-lg)',
                }}
                withBorder={false}
            >
                <Header
                    onBack={() => window.history.back()}
                    title={titleInViewport ? '' : client.name}
                />
            </HeadingContainer>

            <PaddingContainer style={{padding: 'var(--ce-size-lg)'}}>
                <div ref={titleRef}>
                    {/* Enhanced Client Header */}
                    <Card
                        padding="xl"
                        radius="lg"
                        style={{
                            background:
                                'linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-blue-7) 100%)',
                            color: 'white',
                            marginBottom: 'var(--ce-size-lg)',
                        }}
                        withBorder={false}
                    >
                        <Group
                            align="center"
                            gap="lg"
                            wrap="nowrap"
                        >
                            <Avatar
                                color="blue"
                                radius="xl"
                                size={80}
                                style={{
                                    border: '4px solid rgba(255, 255, 255, 0.3)',
                                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                                }}
                            >
                                <Text
                                    fw={700}
                                    size="xl"
                                    style={{color: 'white'}}
                                >
                                    {client.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()}
                                </Text>
                            </Avatar>

                            <Box style={{flex: 1}}>
                                <Text
                                    fw={700}
                                    size="xl"
                                    style={{
                                        fontSize: 'var(--title1-font-size)',
                                        fontWeight: 'var(--title1-font-weight)',
                                        lineHeight: 'var(--title1-line-height)',
                                        marginBottom: 'var(--ce-size-xs)',
                                    }}
                                >
                                    {client.name}
                                </Text>

                                <Group
                                    gap="xs"
                                    mb="sm"
                                >
                                    <Badge
                                        color={
                                            client.membership_status === 'active'
                                                ? 'green'
                                                : client.membership_status === 'inactive'
                                                  ? 'gray'
                                                  : client.membership_status === 'paused'
                                                    ? 'yellow'
                                                    : 'red'
                                        }
                                        leftSection={
                                            <ThemeIcon
                                                color={
                                                    client.membership_status === 'active'
                                                        ? 'green'
                                                        : client.membership_status === 'inactive'
                                                          ? 'gray'
                                                          : client.membership_status === 'paused'
                                                            ? 'yellow'
                                                            : 'red'
                                                }
                                                radius="xl"
                                                size={16}
                                                variant="filled"
                                            >
                                                <IconUserCheck size={10} />
                                            </ThemeIcon>
                                        }
                                        radius="xl"
                                        size="md"
                                        style={{
                                            textTransform: 'capitalize',
                                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                            color: 'white',
                                            border: '1px solid rgba(255, 255, 255, 0.3)',
                                        }}
                                        variant="light"
                                    >
                                        {client.membership_status}
                                    </Badge>

                                    {client.assigned_coach && (
                                        <Badge
                                            color="blue"
                                            leftSection={
                                                <ThemeIcon
                                                    color="blue"
                                                    radius="xl"
                                                    size={16}
                                                    variant="filled"
                                                >
                                                    <IconUser size={10} />
                                                </ThemeIcon>
                                            }
                                            radius="xl"
                                            size="md"
                                            style={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                color: 'white',
                                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                            }}
                                            variant="light"
                                        >
                                            Coach: {client.assigned_coach.name}
                                        </Badge>
                                    )}
                                </Group>

                                <Group gap="lg">
                                    {client.invitation_email && (
                                        <Group gap="xs">
                                            <IconMail
                                                size={16}
                                                style={{opacity: 0.8}}
                                            />
                                            <Text
                                                size="sm"
                                                style={{opacity: 0.9}}
                                            >
                                                {client.invitation_email}
                                            </Text>
                                        </Group>
                                    )}

                                    {client.invitation_phone && (
                                        <Group gap="xs">
                                            <IconPhone
                                                size={16}
                                                style={{opacity: 0.8}}
                                            />
                                            <Text
                                                size="sm"
                                                style={{opacity: 0.9}}
                                            >
                                                {client.invitation_phone}
                                            </Text>
                                        </Group>
                                    )}
                                </Group>
                            </Box>
                        </Group>
                    </Card>
                </div>
            </PaddingContainer>

            <Tabs
                onChange={(value) => setActiveTab(value || 'info')}
                styles={{
                    list: {
                        backgroundColor: 'var(--mantine-color-white)',
                        msOverflowStyle: 'none',
                        position: 'sticky',
                        scrollbarWidth: 'none',
                        top: topHeight,
                        zIndex: 10,
                    },
                    panel: {
                        padding: 0,
                    },
                    tab: {
                        '&:hover': {
                            backgroundColor: 'var(--mantine-color-gray-0)',
                        },
                        '&[data-active]': {
                            borderColor: 'var(--mantine-color-blue-6)',
                            color: 'var(--mantine-color-blue-6)',
                        },
                        fontSize: 'var(--body-font-size)',
                        fontWeight: 400,
                        lineHeight: 'var(--label-line-height)',
                        minWidth: 'auto',
                        padding: 'var(--ce-size-md)',
                        whiteSpace: 'nowrap',
                    },
                }}
                value={activeTab}
                variant="default"
            >
                <PaddingContainer style={{paddingBlock: 0, paddingInline: isMobile ? 0 : 'var(--ce-size-lg)'}}>
                    <ScrollArea
                        flex={1}
                        scrollbars={'x'}
                        style={{width: '100%'}}
                        type={'never'}
                    >
                        <Tabs.List flex={1}>
                            <Group wrap={'nowrap'}>
                                <Tabs.Tab
                                    leftSection={<IconUser size={16} />}
                                    value="info"
                                >
                                    Client Info
                                </Tabs.Tab>
                                <Tabs.Tab
                                    leftSection={<IconCalendar size={16} />}
                                    value="plans"
                                >
                                    Plans
                                </Tabs.Tab>
                            </Group>
                        </Tabs.List>
                    </ScrollArea>
                </PaddingContainer>

                <PaddingContainer style={{padding: 'var(--ce-size-lg)', paddingBlock: 'var(--title2-offset)'}}>
                    <Tabs.Panel value="info">
                        <ClientInfoTab client={client} />
                    </Tabs.Panel>
                    <Tabs.Panel value="plans">
                        <Group justify="flex-end">
                            <Menu
                                position="bottom-end"
                                radius="lg"
                                transitionProps={{transition: 'pop-top-right'}}
                                width={220}
                                withinPortal
                            >
                                <Menu.Target>
                                    <Button
                                        radius="xl"
                                        rightSection={
                                            <IconChevronDown
                                                size={18}
                                                stroke={1.5}
                                            />
                                        }
                                    >
                                        Add Plan
                                    </Button>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item
                                        leftSection={
                                            <IconPackage
                                                color={theme.colors.blue[6]}
                                                size={16}
                                                stroke={1.5}
                                            />
                                        }
                                    >
                                        Assign from existing
                                    </Menu.Item>

                                    <Menu.Item
                                        leftSection={
                                            <IconCalendar
                                                color={theme.colors.violet[6]}
                                                size={16}
                                                stroke={1.5}
                                            />
                                        }
                                    >
                                        Create new plan
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </Group>

                        <RecordsList
                            emptyState={
                                <EmptyState
                                    description={`No plans found for ${client.name}. Create the first plan to kickstart progress.`}
                                    icon={<IconTrendingUp size={32} />}
                                    iconColor="gray.5"
                                    iconSize="xl"
                                    title="No Plans Yet"
                                />
                            }
                            fetchNextPage={fetchNextPage}
                            gap="md"
                            hasNextPage={hasNextPage}
                            isFetchingNextPage={isFetchingNextPage}
                            isLoading={isSchedulesLoading}
                            itemKey={(item) => item.id}
                            loadMoreText="Load More Plans"
                            records={schedules}
                            renderItem={(schedule) => (
                                <ScheduleListItem
                                    key={schedule.id}
                                    onEdit={(id) => scheduleBuilderStack.openDrawer('entries-view', {scheduleId: id})}
                                    onView={(id) => scheduleBuilderStack.openDrawer('entries-view', {scheduleId: id})}
                                    schedule={schedule}
                                />
                            )}
                        />

                        {/* Create + assign to client flow */}
                        <ScheduleCreateDrawer
                            onCreated={async (newId) => {
                                try {
                                    await assignSchedule({
                                        scheduleId: newId,
                                        data: {client_id: id!, customize_now: true},
                                    });
                                    scheduleBuilderStack.openDrawer('entries-view', {scheduleId: newId});
                                } finally {
                                    createStack.close('create-schedule');
                                }
                            }}
                            stack={createStack}
                        />

                        <scheduleBuilderStack.Provider>
                            <ScheduleBuilder />
                        </scheduleBuilderStack.Provider>
                    </Tabs.Panel>
                </PaddingContainer>
            </Tabs>
        </PagePaper>
    );
};

// Client Info Tab Component
const ClientInfoTab = ({client}: {client: Client}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'green';
            case 'cancelled':
                return 'red';
            case 'paused':
                return 'yellow';
            default:
                return 'gray';
        }
    };

    return (
        <Stack gap="xl">
            {/* Contact Information Card */}
            <Card
                padding="lg"
                radius="lg"
                shadow="sm"
                style={{
                    background:
                        'linear-gradient(135deg, var(--mantine-color-gray-0) 0%, var(--mantine-color-white) 100%)',
                    border: '1px solid var(--mantine-color-gray-2)',
                }}
                withBorder
            >
                <Group
                    align="center"
                    gap="md"
                    mb="lg"
                >
                    <ThemeIcon
                        color="blue"
                        radius="xl"
                        size={48}
                        variant="light"
                    >
                        <IconMail size={24} />
                    </ThemeIcon>
                    <div>
                        <Text
                            fw={600}
                            size="lg"
                            style={{color: 'var(--mantine-color-gray-9)'}}
                        >
                            Contact Information
                        </Text>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Client's contact details and communication info
                        </Text>
                    </div>
                </Group>

                <Stack gap="md">
                    <Group
                        align="center"
                        gap="md"
                    >
                        <ThemeIcon
                            color="blue"
                            radius="xl"
                            size={36}
                            variant="light"
                        >
                            <IconMail size={18} />
                        </ThemeIcon>
                        <Box style={{flex: 1}}>
                            <Text
                                fw={500}
                                size="sm"
                                style={{color: 'var(--mantine-color-gray-6)'}}
                            >
                                Email Address
                            </Text>
                            <Text
                                fw={500}
                                size="md"
                                style={{color: 'var(--mantine-color-gray-9)'}}
                            >
                                {client.invitation_email || 'Not provided'}
                            </Text>
                        </Box>
                    </Group>

                    <Divider />

                    <Group
                        align="center"
                        gap="md"
                    >
                        <ThemeIcon
                            color="green"
                            radius="xl"
                            size={36}
                            variant="light"
                        >
                            <IconPhone size={18} />
                        </ThemeIcon>
                        <Box style={{flex: 1}}>
                            <Text
                                fw={500}
                                size="sm"
                                style={{color: 'var(--mantine-color-gray-6)'}}
                            >
                                Phone Number
                            </Text>
                            <Text
                                fw={500}
                                size="md"
                                style={{color: 'var(--mantine-color-gray-9)'}}
                            >
                                {client.invitation_phone || 'Not provided'}
                            </Text>
                        </Box>
                    </Group>
                </Stack>
            </Card>

            {/* Membership Details Card */}
            <Card
                padding="lg"
                radius="lg"
                shadow="sm"
                style={{
                    background:
                        'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-white) 100%)',
                    border: '1px solid var(--mantine-color-blue-2)',
                }}
                withBorder
            >
                <Group
                    align="center"
                    gap="md"
                    mb="lg"
                >
                    <ThemeIcon
                        color="blue"
                        radius="xl"
                        size={48}
                        variant="light"
                    >
                        <IconUserCheck size={24} />
                    </ThemeIcon>
                    <div>
                        <Text
                            fw={600}
                            size="lg"
                            style={{color: 'var(--mantine-color-gray-9)'}}
                        >
                            Membership Details
                        </Text>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Current membership status and subscription info
                        </Text>
                    </div>
                </Group>

                <Stack gap="md">
                    <Group
                        align="center"
                        gap="md"
                    >
                        <ThemeIcon
                            color={getStatusColor(client.membership_status)}
                            radius="xl"
                            size={36}
                            variant="light"
                        >
                            <IconUserCheck size={18} />
                        </ThemeIcon>
                        <Box style={{flex: 1}}>
                            <Text
                                fw={500}
                                size="sm"
                                style={{color: 'var(--mantine-color-gray-6)'}}
                            >
                                Membership Status
                            </Text>
                            <Badge
                                color={getStatusColor(client.membership_status)}
                                leftSection={
                                    <ThemeIcon
                                        color={getStatusColor(client.membership_status)}
                                        radius="xl"
                                        size={16}
                                        variant="filled"
                                    >
                                        <IconUserCheck size={10} />
                                    </ThemeIcon>
                                }
                                radius="xl"
                                size="md"
                                style={{textTransform: 'capitalize'}}
                                variant="light"
                            >
                                {client.membership_status}
                            </Badge>
                        </Box>
                    </Group>

                    <Divider />

                    <Group
                        align="center"
                        gap="md"
                    >
                        <ThemeIcon
                            color="blue"
                            radius="xl"
                            size={36}
                            variant="light"
                        >
                            <IconCalendarTime size={18} />
                        </ThemeIcon>
                        <Box style={{flex: 1}}>
                            <Text
                                fw={500}
                                size="sm"
                                style={{color: 'var(--mantine-color-gray-6)'}}
                            >
                                Start Date
                            </Text>
                            <Text
                                fw={500}
                                size="md"
                                style={{color: 'var(--mantine-color-gray-9)'}}
                            >
                                {new Date(client.membership_start_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </Text>
                        </Box>
                    </Group>

                    {client.membership_end_date && (
                        <>
                            <Divider />
                            <Group
                                align="center"
                                gap="md"
                            >
                                <ThemeIcon
                                    color="orange"
                                    radius="xl"
                                    size={36}
                                    variant="light"
                                >
                                    <IconClock size={18} />
                                </ThemeIcon>
                                <Box style={{flex: 1}}>
                                    <Text
                                        fw={500}
                                        size="sm"
                                        style={{color: 'var(--mantine-color-gray-6)'}}
                                    >
                                        End Date
                                    </Text>
                                    <Text
                                        fw={500}
                                        size="md"
                                        style={{color: 'var(--mantine-color-gray-9)'}}
                                    >
                                        {new Date(client.membership_end_date).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </Text>
                                </Box>
                            </Group>
                        </>
                    )}

                    {client.assigned_coach && (
                        <>
                            <Divider />
                            <Group
                                align="center"
                                gap="md"
                            >
                                <ThemeIcon
                                    color="purple"
                                    radius="xl"
                                    size={36}
                                    variant="light"
                                >
                                    <IconUser size={18} />
                                </ThemeIcon>
                                <Box style={{flex: 1}}>
                                    <Text
                                        fw={500}
                                        size="sm"
                                        style={{color: 'var(--mantine-color-gray-6)'}}
                                    >
                                        Assigned Coach
                                    </Text>
                                    <Text
                                        fw={500}
                                        size="md"
                                        style={{color: 'var(--mantine-color-gray-9)'}}
                                    >
                                        {client.assigned_coach.name}
                                    </Text>
                                </Box>
                            </Group>
                        </>
                    )}
                </Stack>
            </Card>

            {/* Notes Card */}
            {client.notes && (
                <Card
                    padding="lg"
                    radius="lg"
                    shadow="sm"
                    style={{
                        background:
                            'linear-gradient(135deg, var(--mantine-color-yellow-0) 0%, var(--mantine-color-white) 100%)',
                        border: '1px solid var(--mantine-color-yellow-2)',
                    }}
                    withBorder
                >
                    <Group
                        align="center"
                        gap="md"
                        mb="lg"
                    >
                        <ThemeIcon
                            color="orange"
                            radius="xl"
                            size={48}
                            variant="light"
                        >
                            <IconNotes size={24} />
                        </ThemeIcon>
                        <div>
                            <Text
                                fw={600}
                                size="lg"
                                style={{color: 'var(--mantine-color-gray-9)'}}
                            >
                                Notes
                            </Text>
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Additional information about the client
                            </Text>
                        </div>
                    </Group>

                    <Text
                        style={{
                            color: 'var(--mantine-color-gray-8)',
                            lineHeight: 1.6,
                            fontSize: 'var(--mantine-fontSizes-md)',
                        }}
                    >
                        {client.notes}
                    </Text>
                </Card>
            )}
        </Stack>
    );
};

export default ClientDetailPage;
