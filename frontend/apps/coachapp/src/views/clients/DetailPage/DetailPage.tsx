import {useContentHeight} from '@easy/hooks';
import {
    ActionIcon,
    Alert,
    Avatar,
    Badge,
    Box,
    Button,
    Card,
    Group,
    LoadingOverlay,
    Menu,
    Stack,
    Tabs,
    Text,
} from '@mantine/core';
import {useInViewport} from '@mantine/hooks';
import {ChatCircleDots, DotsThree, Envelope, Phone, UserCircle} from '@phosphor-icons/react';
import {format, parseISO} from 'date-fns';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router';

import {Client} from '@/api/clients.ts';
import {Plan} from '@/api/plans';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import {EmptyState} from '@/components/layouts/EmptyState';
import Header from '@/components/layouts/Header';
import RecordsList from '@/components/layouts/RecordsList';
import {PlanCreationDrawer, PlanCreationDrawerData} from '@/components/PlanForm/PlanCreateDrawer';
import PlanListItem from '@/components/PlanListItem/PlanListItem';
import {useGetClientQuery} from '@/store/services/clientsApi';
import {useListPlans} from '@/store/services/plans';

// Utility functions
const getClientInitials = (name: string): string => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const getMembershipStatusColor = (status: string): string => {
    switch (status) {
        case 'active':
            return 'green';
        case 'inactive':
            return 'gray';
        case 'paused':
            return 'yellow';
        case 'expired':
            return 'red';
        default:
            return 'gray';
    }
};

const getMembershipStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
};

const ClientDetailPageContent = ({clientId}: {clientId: string}) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<null | string>('overview');

    const [isPlanDrawerOpen, setPlanDrawerOpen] = useState(false);
    const [planDrawerData, setPlanDrawerData] = useState<null | PlanCreationDrawerData>(null);

    const {data: client, error, isError, isLoading} = useGetClientQuery(clientId, {skip: !clientId});
    const {inViewport: titleInViewport, ref: titleRef} = useInViewport<HTMLDivElement>();
    const {useElementRef} = useContentHeight();
    const headerRef = useElementRef('top');

    const handleClosePlanDrawer = useCallback(() => {
        setPlanDrawerOpen(false);
        setPlanDrawerData(null);
    }, []);

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
                    title="Error"
                >
                    {error?.message || 'Failed to load client'}
                </Alert>
            </PaddingContainer>
        );
    }

    const handleCreatePlan = () => {
        setPlanDrawerData({initialPlan: {client_id: clientId, kind: 'client_copy'}});
        setPlanDrawerOpen(true);
    };

    const handleChat = () => {
        navigate(`/clients/${clientId}/chat`);
    };

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
                <Stack gap="md">
                    {/* Profile Card */}
                    <Card
                        padding="md"
                        radius="md"
                        ref={titleRef}
                        withBorder
                    >
                        <Group
                            align="center"
                            justify="space-between"
                            wrap="nowrap"
                        >
                            <Group
                                align="center"
                                gap="md"
                                wrap="nowrap"
                            >
                                <Avatar
                                    color="blue"
                                    radius="md"
                                    size="lg"
                                >
                                    {getClientInitials(client.name)}
                                </Avatar>

                                <Box>
                                    <Group
                                        gap="xs"
                                        mb={4}
                                    >
                                        <Text
                                            fw={600}
                                            size="lg"
                                        >
                                            {client.name}
                                        </Text>
                                        <Badge
                                            color={getMembershipStatusColor(client.membership_status)}
                                            size="sm"
                                            variant="light"
                                        >
                                            {getMembershipStatusLabel(client.membership_status)}
                                        </Badge>
                                    </Group>

                                    <Stack gap={4}>
                                        {client.invitation_email && (
                                            <Group gap={6}>
                                                <Envelope
                                                    size={14}
                                                    weight="regular"
                                                />
                                                <Text
                                                    c="dimmed"
                                                    size="sm"
                                                >
                                                    {client.invitation_email}
                                                </Text>
                                            </Group>
                                        )}
                                        {client.invitation_phone && (
                                            <Group gap={6}>
                                                <Phone
                                                    size={14}
                                                    weight="regular"
                                                />
                                                <Text
                                                    c="dimmed"
                                                    size="sm"
                                                >
                                                    {client.invitation_phone}
                                                </Text>
                                            </Group>
                                        )}
                                    </Stack>
                                </Box>
                            </Group>

                            <Menu
                                position="bottom-end"
                                shadow="md"
                                width={180}
                            >
                                <Menu.Target>
                                    <ActionIcon
                                        color="gray"
                                        size="lg"
                                        variant="subtle"
                                    >
                                        <DotsThree
                                            size={20}
                                            weight="bold"
                                        />
                                    </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item
                                        leftSection={
                                            <ChatCircleDots
                                                size={16}
                                                weight="regular"
                                            />
                                        }
                                        onClick={handleChat}
                                    >
                                        Open Chat
                                    </Menu.Item>
                                    <Menu.Item
                                        leftSection={
                                            <UserCircle
                                                size={16}
                                                weight="regular"
                                            />
                                        }
                                        onClick={() => navigate(`/clients/${clientId}/edit`)}
                                    >
                                        Edit Profile
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </Group>
                    </Card>

                    {/* Tabs Section */}
                    <Tabs
                        onChange={setActiveTab}
                        value={activeTab}
                        variant="default"
                    >
                        <Tabs.List>
                            <Tabs.Tab value="overview">Overview</Tabs.Tab>
                            <Tabs.Tab value="plans">Plans</Tabs.Tab>
                        </Tabs.List>

                        <Box mt="md">
                            <Tabs.Panel value="overview">
                                <ClientOverviewTab client={client} />
                            </Tabs.Panel>

                            <Tabs.Panel value="plans">
                                <ClientPlansTab
                                    client={client}
                                    isPlanDrawerOpen={isPlanDrawerOpen}
                                    onClosePlanDrawer={handleClosePlanDrawer}
                                    onCreatePlan={handleCreatePlan}
                                    planDrawerData={planDrawerData}
                                />
                            </Tabs.Panel>
                        </Box>
                    </Tabs>
                </Stack>
            </PaddingContainer>
        </PagePaper>
    );
};

const ClientDetailPage = () => {
    const {id} = useParams<{id: string}>();

    if (!id) {
        return null;
    }

    return <ClientDetailPageContent clientId={id} />;
};

// Client Overview Tab Component
const ClientOverviewTab = ({client}: {client: Client}) => {
    return (
        <Stack gap="md">
            {/* Membership Card */}
            <Card
                padding="md"
                radius="md"
                withBorder
            >
                <Text
                    fw={600}
                    mb="sm"
                    size="sm"
                >
                    Membership
                </Text>
                <Stack gap="xs">
                    <Group justify="space-between">
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Status
                        </Text>
                        <Badge
                            color={getMembershipStatusColor(client.membership_status)}
                            size="sm"
                            variant="light"
                        >
                            {getMembershipStatusLabel(client.membership_status)}
                        </Badge>
                    </Group>
                    {client.membership_start_date && (
                        <Group justify="space-between">
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Start Date
                            </Text>
                            <Text size="sm">{format(parseISO(client.membership_start_date), 'MMM dd, yyyy')}</Text>
                        </Group>
                    )}
                    {client.membership_end_date && (
                        <Group justify="space-between">
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                End Date
                            </Text>
                            <Text size="sm">{format(parseISO(client.membership_end_date), 'MMM dd, yyyy')}</Text>
                        </Group>
                    )}
                </Stack>
            </Card>

            {/* Coach Card */}
            {client.assigned_coach && (
                <Card
                    padding="md"
                    radius="md"
                    withBorder
                >
                    <Text
                        fw={600}
                        mb="sm"
                        size="sm"
                    >
                        Coach
                    </Text>
                    <Group justify="space-between">
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Assigned Coach
                        </Text>
                        <Text size="sm">{client.assigned_coach.name}</Text>
                    </Group>
                </Card>
            )}

            {/* Notes Card */}
            {client.notes && (
                <Card
                    padding="md"
                    radius="md"
                    withBorder
                >
                    <Text
                        fw={600}
                        mb="sm"
                        size="sm"
                    >
                        Notes
                    </Text>
                    <Text
                        c="dimmed"
                        size="sm"
                        style={{whiteSpace: 'pre-wrap'}}
                    >
                        {client.notes}
                    </Text>
                </Card>
            )}
        </Stack>
    );
};

// Client Plans Tab Component
const ClientPlansTab = ({
    client,
    isPlanDrawerOpen,
    onClosePlanDrawer,
    onCreatePlan,
    planDrawerData,
}: {
    client: Client;
    isPlanDrawerOpen: boolean;
    onClosePlanDrawer: () => void;
    onCreatePlan: () => void;
    planDrawerData: null | PlanCreationDrawerData;
}) => {
    const navigate = useNavigate();

    const {
        data: plansData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isPlansLoading,
        refetch: refetchPlans,
    } = useListPlans({client_id: client.id});

    const plans = plansData?.pages?.flatMap((page) => page.records) ?? [];

    const navigateRef = useRef(navigate);
    const refetchPlansRef = useRef(refetchPlans);

    useEffect(() => {
        navigateRef.current = navigate;
    }, [navigate]);

    useEffect(() => {
        refetchPlansRef.current = refetchPlans;
    }, [refetchPlans]);

    const handlePlanCreated = useCallback(async (newId: string) => {
        await refetchPlansRef.current();
        navigateRef.current(`/plans/${newId}/edit`);
    }, []);

    return (
        <Stack gap="md">
            <Group justify="flex-end">
                <Button
                    onClick={onCreatePlan}
                    size="sm"
                >
                    Create Plan
                </Button>
            </Group>

            <RecordsList<Plan>
                emptyState={
                    <EmptyState
                        description={`No plans found for ${client.name}. Create the first plan to kickstart progress.`}
                        title="No Plans Yet"
                    />
                }
                fetchNextPage={fetchNextPage}
                gap="md"
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                isLoading={isPlansLoading}
                itemKey={(item) => item.id}
                loadMoreText="Load More Plans"
                records={plans}
                renderItem={(plan) => (
                    <PlanListItem
                        key={plan.id}
                        onEdit={(planId) => navigate(`/plans/${planId}/edit`)}
                        onView={(planId) => navigate(`/plans/${planId}`)}
                        plan={plan}
                    />
                )}
            />

            <PlanCreationDrawer
                initialDiscipline={planDrawerData?.initialDiscipline}
                initialPlan={planDrawerData?.initialPlan}
                onClose={onClosePlanDrawer}
                onPlanCreated={handlePlanCreated}
                opened={isPlanDrawerOpen}
            />
        </Stack>
    );
};

export default ClientDetailPage;
