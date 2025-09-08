import {useContentHeight} from '@easy/hooks';
import {Alert, Badge, Card, Group, LoadingOverlay, ScrollArea, Stack, Tabs, Text} from '@mantine/core';
import {useInViewport, useMediaQuery} from '@mantine/hooks';
import {IconAlertCircle, IconCalendar, IconUser} from '@tabler/icons-react';
import {useState} from 'react';
import {useParams} from 'react-router';

import {Client} from '@/api/clients.ts';
import HeadingContainer from '@/components/containers/HeaderContainer';
import PaddingContainer from '@/components/containers/PaddingContainer';
import PagePaper from '@/components/containers/PagePaper';
import Header from '@/components/layouts/Header';
import {useClient} from '@/hooks/useClientQueries';

const DetailClientPage = () => {
    const {id} = useParams<{id: string}>();
    const [activeTab, setActiveTab] = useState<string>('info');

    const isMobile = useMediaQuery('(max-width: 768px)');
    const {data: client, error, isError, isLoading} = useClient(id!);
    const {inViewport: titleInViewport, ref: titleRef} = useInViewport<HTMLHeadingElement>();
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
                    <Text
                        fw={700}
                        mb="xs"
                        size="xl"
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
            case 'cancelled':
                return 'red';
            case 'paused':
                return 'yellow';
            default:
                return 'gray';
        }
    };

    return (
        <Stack gap="lg">
            <Card
                padding="lg"
                radius="md"
                withBorder
            >
                <Text
                    fw={600}
                    mb="md"
                    size="lg"
                >
                    Contact Information
                </Text>
                <Stack gap="sm">
                    <div>
                        <Text
                            fw={500}
                            span
                        >
                            Email:
                        </Text>{' '}
                        <Text span>{client.invitation_email || 'Not provided'}</Text>
                    </div>
                    <div>
                        <Text
                            fw={500}
                            span
                        >
                            Phone:
                        </Text>{' '}
                        <Text span>{client.invitation_phone || 'Not provided'}</Text>
                    </div>
                </Stack>
            </Card>

            <Card
                padding="lg"
                radius="md"
                withBorder
            >
                <Text
                    fw={600}
                    mb="md"
                    size="lg"
                >
                    Membership Details
                </Text>
                <Stack gap="sm">
                    <div>
                        <Text
                            fw={500}
                            span
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
                            fw={500}
                            span
                        >
                            Start Date:
                        </Text>{' '}
                        <Text span>{new Date(client.membership_start_date).toLocaleDateString()}</Text>
                    </div>
                    {client.membership_end_date && (
                        <div>
                            <Text
                                fw={500}
                                span
                            >
                                End Date:
                            </Text>{' '}
                            <Text span>{new Date(client.membership_end_date).toLocaleDateString()}</Text>
                        </div>
                    )}
                    {client.assigned_coach && (
                        <div>
                            <Text
                                fw={500}
                                span
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
                    padding="lg"
                    radius="md"
                    withBorder
                >
                    <Text
                        fw={600}
                        mb="md"
                        size="lg"
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
