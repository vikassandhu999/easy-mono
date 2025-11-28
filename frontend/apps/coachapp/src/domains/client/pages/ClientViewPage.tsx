import {Avatar, Badge, Card, Group, Stack, Text} from '@mantine/core';
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import useScreenSize from '@/hooks/useScreenSize';
import {useGetClient} from '@/services/clients';
import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';
import Header from '@/shared/layouts/Header';

import classes from './styles.module.css';
import {OverviewTab, PlansTab, SettingsTab} from './tabs';

type TabValue = 'overview' | 'plans' | 'settings';

const TABS: {color: string; id: string; label: string; value: TabValue}[] = [
    {id: 'overview', label: 'Overview', value: 'overview', color: 'blue'},
    {id: 'plans', label: 'Plans', value: 'plans', color: 'green'},
    {id: 'settings', label: 'Settings', value: 'settings', color: 'orange'},
];

const getStatusColor = (status: string) => {
    switch (status) {
        case 'active':
            return 'green';
        case 'pending':
            return 'yellow';
        case 'inactive':
            return 'gray';
        case 'archived':
            return 'red';
        default:
            return 'gray';
    }
};

const getColorClass = (color: string, isActive: boolean) => {
    if (!isActive) return '';
    const colorMap: Record<string, string> = {
        blue: classes.chipBlue,
        green: classes.chipGreen,
        cyan: classes.chipCyan,
        orange: classes.chipOrange,
    };
    return colorMap[color] || '';
};

const ClientViewPage = () => {
    const {id} = useParams<{id: string}>();
    const navigate = useNavigate();
    const {isMobile} = useScreenSize();
    const {openDrawer} = useParamsDrawer({});
    const [activeTab, setActiveTab] = useState<TabValue>(TABS[0].value);

    const {
        data: client,
        isLoading,
        isError,
    } = useGetClient(id || '', {
        skip: !id,
    });

    if (isLoading) {
        return (
            <PagePaper bottomGutter>
                <PaddingContainer>
                    <Text>Loading...</Text>
                </PaddingContainer>
            </PagePaper>
        );
    }

    if (isError || !client) {
        return (
            <PagePaper bottomGutter>
                <PaddingContainer>
                    <Text c="red">Error loading client details</Text>
                </PaddingContainer>
            </PagePaper>
        );
    }

    const handleTabChange = (value: TabValue) => {
        setActiveTab(value);
    };

    const handleAddPlan = () => {
        openDrawer(DRAWER_KEYS.ASSIGN_PLAN, {client_id: id!});
    };

    return (
        <PagePaper bottomGutter>
            <HeadingContainer>
                <Header
                    onBack={() => navigate('/clients')}
                    title={client.full_name}
                />
            </HeadingContainer>

            <PaddingContainer>
                <Card
                    padding="lg"
                    radius="md"
                >
                    <Group
                        align="flex-start"
                        wrap="nowrap"
                    >
                        <Avatar
                            color="initials"
                            name={client.full_name}
                            radius="xl"
                            size="xl"
                        />
                        <Stack gap="xs">
                            <Group>
                                <Text
                                    fw={700}
                                    size="lg"
                                >
                                    {client.full_name}
                                </Text>
                                <Badge
                                    color={getStatusColor(client.status)}
                                    variant="light"
                                >
                                    {client.status}
                                </Badge>
                            </Group>

                            <Stack gap={4}>
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    Email: {client.email}
                                </Text>
                                {client.phone && (
                                    <Text
                                        c="dimmed"
                                        size="sm"
                                    >
                                        Phone: {client.phone}
                                    </Text>
                                )}
                            </Stack>
                        </Stack>
                    </Group>
                </Card>

                {/* Custom Styled Chips */}
                <div className={`${classes.chips} ${isMobile ? classes.chipsMobile : ''}`}>
                    {TABS.map(({id, label, value, color}) => {
                        const isActive = activeTab === value;
                        return (
                            <button
                                className={`${classes.chip} ${isActive ? classes.chipActive : ''} ${getColorClass(color, isActive)}`}
                                key={id}
                                onClick={() => handleTabChange(value)}
                                type="button"
                            >
                                <span className={classes.chipDot} />
                                {label}
                            </button>
                        );
                    })}
                </div>

                <Stack mt="xl">
                    {activeTab === 'overview' && <OverviewTab client={client} />}
                    {activeTab === 'plans' && (
                        <PlansTab
                            clientId={id!}
                            onAddPlan={handleAddPlan}
                        />
                    )}
                    {activeTab === 'settings' && <SettingsTab client={client} />}
                </Stack>
            </PaddingContainer>
        </PagePaper>
    );
};

export default ClientViewPage;
