import {useContentHeight} from '@easy/hooks';
import {
    Alert,
    Box,
    Button,
    Card,
    Center,
    LoadingOverlay,
    Modal,
    SegmentedControl,
    Stack,
    Text,
    useMantineTheme,
} from '@mantine/core';
import {IconCalendar, IconMessageCircle, IconSwitchHorizontal, IconUser} from '@tabler/icons-react';
import {useCallback, useState} from 'react';
import {useNavigate, useParams} from 'react-router';

import {Client} from '@/api/clients';
import {PlanDiscipline} from '@/api/plans';
import ClientSelect from '@/components/ClientSelect/ClientSelect';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import Header from '@/components/layouts/Header';
import {PlanCreationDrawerData} from '@/components/PlanForm/PlanCreateDrawer';
import {useGetClientQuery} from '@/store/services/clientsApi';

import ProfileCard from './ProfileCard';
import {ClientOverviewTab} from './tabs/OverviewTab';
import {ClientPlansTab} from './tabs/PlansTab';

const ClientDetailPageContent = ({clientId}: {clientId: string}) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<null | string>('overview');

    const [isPlanDrawerOpen, setPlanDrawerOpen] = useState(false);
    const [planDrawerData, setPlanDrawerData] = useState<null | PlanCreationDrawerData>(null);
    const [isClientSelectOpen, setClientSelectOpen] = useState(false);

    const {data: client, error, isError, isLoading} = useGetClientQuery(clientId, {skip: !clientId});
    const {useElementRef} = useContentHeight();
    const headerRef = useElementRef('top');

    const theme = useMantineTheme();

    const handleClosePlanDrawer = useCallback(() => {
        setPlanDrawerOpen(false);
    }, []);

    const handleOpenPlanDrawer = useCallback(
        (discipline: PlanDiscipline) => {
            setPlanDrawerData({
                initialDiscipline: discipline,
                initialPlan: {client_id: clientId, kind: 'client_copy'},
            });
            setPlanDrawerOpen(true);
        },
        [clientId],
    );

    const handleClientSelect = useCallback(
        (clients: Client[]) => {
            if (clients.length > 0) {
                navigate(`/clients/${clients[0].id}`);
                setClientSelectOpen(false);
            }
        },
        [navigate],
    );

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
                    actions={
                        <Button
                            leftSection={<IconSwitchHorizontal size={14} />}
                            onClick={() => setClientSelectOpen(true)}
                            radius="xl"
                            size="compact-xs"
                            variant="light"
                        >
                            Change client{' '}
                        </Button>
                    }
                    onBack={() => window.history.back()}
                    title={client.name}
                />
            </HeadingContainer>

            <PaddingContainer style={{padding: 'var(--ce-size-lg)'}}>
                <Stack gap="md">
                    <ProfileCard client={client} />

                    <SegmentedControl
                        data={[
                            {
                                label: (
                                    <Center style={{gap: 8}}>
                                        <IconUser size={16} />
                                        <span>Overview</span>
                                    </Center>
                                ),
                                value: 'overview',
                            },
                            {
                                label: (
                                    <Center style={{gap: 8}}>
                                        <IconCalendar size={16} />
                                        <span>Plans</span>
                                    </Center>
                                ),
                                value: 'plans',
                            },
                            {
                                label: (
                                    <Center style={{gap: 8}}>
                                        <IconMessageCircle size={16} />
                                        <span>Chat</span>
                                    </Center>
                                ),
                                value: 'chat',
                            },
                        ]}
                        fullWidth
                        onChange={setActiveTab}
                        radius="xl"
                        size="md"
                        value={activeTab}
                    />

                    {/* Content Sections */}
                    <Box mt="md">
                        {activeTab === 'overview' && <ClientOverviewTab client={client} />}

                        {activeTab === 'plans' && (
                            <ClientPlansTab
                                client={client}
                                isPlanDrawerOpen={isPlanDrawerOpen}
                                onClosePlanDrawer={handleClosePlanDrawer}
                                onOpenPlanDrawer={handleOpenPlanDrawer}
                                planDrawerData={planDrawerData}
                            />
                        )}

                        {activeTab === 'chat' && (
                            <Card
                                padding="xl"
                                radius="xl"
                                withBorder
                            >
                                <Stack
                                    align="center"
                                    gap="md"
                                >
                                    <IconMessageCircle
                                        color="var(--mantine-color-blue-6)"
                                        size={48}
                                    />
                                    <Text
                                        fw={600}
                                        size="lg"
                                        ta="center"
                                    >
                                        Chat Coming Soon
                                    </Text>
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                        ta="center"
                                    >
                                        Chat functionality will be available in the next version. You'll be able to
                                        message your clients directly from here.
                                    </Text>
                                </Stack>
                            </Card>
                        )}
                    </Box>
                </Stack>
            </PaddingContainer>

            <Modal
                onClose={() => setClientSelectOpen(false)}
                opened={isClientSelectOpen}
                padding="md"
                radius="xl"
                size="xl"
                title="Select Client"
            >
                <PaddingContainer
                    style={{
                        paddingLeft: theme.spacing.xs,
                        paddingRight: theme.spacing.xs,
                    }}
                >
                    <ClientSelect
                        multiple={false}
                        onComplete={handleClientSelect}
                    />
                </PaddingContainer>
            </Modal>
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

export default ClientDetailPage;
