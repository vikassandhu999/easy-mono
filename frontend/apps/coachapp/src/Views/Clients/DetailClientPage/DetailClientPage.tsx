import {useState} from 'react';
import {useParams} from 'react-router';
import {LoadingOverlay, Alert, Tabs, ScrollArea, Group, Text, Badge, Stack, Card} from '@mantine/core';
import {IconAlertCircle, IconCalendar, IconUser} from '@tabler/icons-react';
import {useClient} from '@/Hooks/useClientQueries';
import PaddingContainer from '@/Components/Containers/PaddingContainer';
import PagePaper from '@/Components/Containers/PagePaper';
import HeadingContainer from '@/Components/Containers/HeaderContainer';
import Header from '@/Components/layouts/Header';
import {useInViewport, useMediaQuery} from '@mantine/hooks';
import {useContentHeight} from '@easy/hooks';
import {Client} from '@/Api/Clients';

const DetailClientPage = () => {
    const {id} = useParams<{id: string}>();
    const [activeTab, setActiveTab] = useState<string>('info');

    const isMobile = useMediaQuery('(max-width: 768px)');
    const {data: client, isLoading, isError, error} = useClient(id!);
    const {ref: titleRef, inViewport: titleInViewport} = useInViewport<HTMLHeadingElement>();
    const {topHeight, useElementRef} = useContentHeight();
    const headerRef = useElementRef('top');

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
                    icon={<IconAlertCircle size={16} />}
                    title="Error"
                    color="red"
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
                withBorder={false}
                style={{
                    paddingInline: 'var(--ce-size-lg)',
                    paddingBlock: 'var(--ce-size-sm)',
                }}
            >
                <Header
                    title={titleInViewport ? '' : client.name}
                    onBack={() => window.history.back()}
                />
            </HeadingContainer>

            <PaddingContainer style={{padding: 'var(--ce-size-lg)'}}>
                <div ref={titleRef}>
                    <Text
                        size="xl"
                        fw={700}
                        mb="xs"
                        style={{
                            fontSize: 'var(--title1-font-size)',
                            fontWeight: 'var(--title1-font-weight)',
                            lineHeight: 'var(--title1-line-height)',
                        }}
                    >
                        {client.name}
                    </Text>
                    <Text
                        c="dimmed"
                        mb="md"
                    >
                        {client.invitation_email}
                    </Text>
                </div>
            </PaddingContainer>

            <Tabs
                value={activeTab}
                onChange={(value) => setActiveTab(value || 'info')}
                variant="default"
                styles={{
                    list: {
                        backgroundColor: 'var(--mantine-color-white)',
                        position: 'sticky',
                        top: topHeight,
                        zIndex: 10,
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    },
                    tab: {
                        fontSize: 'var(--body-font-size)',
                        fontWeight: 400,
                        padding: 'var(--ce-size-md)',
                        lineHeight: 'var(--label-line-height)',
                        whiteSpace: 'nowrap',
                        minWidth: 'auto',
                        '&:hover': {
                            backgroundColor: 'var(--mantine-color-gray-0)',
                        },
                        '&[data-active]': {
                            color: 'var(--mantine-color-blue-6)',
                            borderColor: 'var(--mantine-color-blue-6)',
                        },
                    },
                    panel: {
                        padding: 0,
                    },
                }}
            >
                <PaddingContainer style={{paddingBlock: 0, paddingInline: isMobile ? 0 : 'var(--ce-size-lg)'}}>
                    <ScrollArea
                        type={'never'}
                        scrollbars={'x'}
                        flex={1}
                        style={{width: '100%'}}
                    >
                        <Tabs.List flex={1}>
                            <Group wrap={'nowrap'}>
                                <Tabs.Tab
                                    value="info"
                                    leftSection={<IconUser size={16} />}
                                >
                                    Client Info
                                </Tabs.Tab>
                                <Tabs.Tab
                                    value="plans"
                                    leftSection={<IconCalendar size={16} />}
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

                    <Tabs.Panel value="plans">Hello</Tabs.Panel>
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
            case 'paused':
                return 'yellow';
            case 'cancelled':
                return 'red';
            default:
                return 'gray';
        }
    };

    return (
        <Stack gap="lg">
            <Card
                withBorder
                padding="lg"
                radius="md"
            >
                <Text
                    fw={600}
                    size="lg"
                    mb="md"
                >
                    Contact Information
                </Text>
                <Stack gap="sm">
                    <div>
                        <Text
                            span
                            fw={500}
                        >
                            Email:
                        </Text>{' '}
                        <Text span>{client.invitation_email || 'Not provided'}</Text>
                    </div>
                    <div>
                        <Text
                            span
                            fw={500}
                        >
                            Phone:
                        </Text>{' '}
                        <Text span>{client.invitation_phone || 'Not provided'}</Text>
                    </div>
                </Stack>
            </Card>

            <Card
                withBorder
                padding="lg"
                radius="md"
            >
                <Text
                    fw={600}
                    size="lg"
                    mb="md"
                >
                    Membership Details
                </Text>
                <Stack gap="sm">
                    <div>
                        <Text
                            span
                            fw={500}
                        >
                            Status:
                        </Text>{' '}
                        <Badge
                            color={getStatusColor(client.membership_status)}
                            variant="light"
                        >
                            {client.membership_status}
                        </Badge>
                    </div>
                    <div>
                        <Text
                            span
                            fw={500}
                        >
                            Start Date:
                        </Text>{' '}
                        <Text span>{new Date(client.membership_start_date).toLocaleDateString()}</Text>
                    </div>
                    {client.membership_end_date && (
                        <div>
                            <Text
                                span
                                fw={500}
                            >
                                End Date:
                            </Text>{' '}
                            <Text span>{new Date(client.membership_end_date).toLocaleDateString()}</Text>
                        </div>
                    )}
                    {client.assigned_coach && (
                        <div>
                            <Text
                                span
                                fw={500}
                            >
                                Assigned Coach:
                            </Text>{' '}
                            <Text span>{client.assigned_coach.name}</Text>
                        </div>
                    )}
                </Stack>
            </Card>

            {client.notes && (
                <Card
                    withBorder
                    padding="lg"
                    radius="md"
                >
                    <Text
                        fw={600}
                        size="lg"
                        mb="md"
                    >
                        Notes
                    </Text>
                    <Text c="dimmed">{client.notes}</Text>
                </Card>
            )}
        </Stack>
    );
};

export default DetailClientPage;
