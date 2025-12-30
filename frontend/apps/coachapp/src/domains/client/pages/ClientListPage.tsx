import {Box, Button, Container, Group, SegmentedControl, Stack, TextInput, Title} from '@mantine/core';
import {useDebouncedValue} from '@mantine/hooks';
import {IconPlus, IconX} from '@tabler/icons-react';
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import ClientList from '@/shared/ClientList';

type StatusTab = 'active' | 'all' | 'inactive' | 'pending';

const STATUS_TABS: {label: string; value: StatusTab}[] = [
    {label: 'All', value: 'all'},
    {label: 'Active', value: 'active'},
    {label: 'Pending', value: 'pending'},
    {label: 'Inactive', value: 'inactive'},
];

const ClientListPage = () => {
    const {openDrawer} = useParamsDrawer({});
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<StatusTab>('all');
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch] = useDebouncedValue(searchInput, 300);
    const [search, setSearch] = useState('');

    useEffect(() => {
        setSearch(debouncedSearch);
    }, [debouncedSearch]);

    const handleClientClick = (clientId: string) => {
        navigate(`/clients/${clientId}`);
    };

    const handleTabChange = (value: string) => {
        setActiveTab(value as StatusTab);
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(event.currentTarget.value);
    };

    const handleClearSearch = () => {
        setSearchInput('');
    };

    return (
        <Box
            bg="white"
            style={{
                minHeight: '100vh',
                paddingBottom: 'calc(var(--mantine-spacing-xl) + env(safe-area-inset-bottom))',
            }}
        >
            <Container
                px="md"
                size="md"
            >
                <Stack
                    gap="md"
                    pb="xl"
                    pt="md"
                >
                    {/* Header */}
                    <Group
                        align="center"
                        justify="space-between"
                    >
                        <Title
                            fw={600}
                            order={1}
                        >
                            Clients
                        </Title>
                        <Button
                            fw={600}
                            onClick={() => openDrawer(DRAWER_KEYS.CLIENT_INVITE)}
                            radius="xl"
                            rightSection={<IconPlus size={18} />}
                            size="sm"
                        >
                            Invite
                        </Button>
                    </Group>

                    {/* Status Tabs */}
                    <SegmentedControl
                        data={STATUS_TABS}
                        onChange={handleTabChange}
                        radius="xl"
                        size="xs"
                        value={activeTab}
                    />

                    {/* Search Input */}
                    <TextInput
                        onChange={handleSearchChange}
                        placeholder="Search clients..."
                        radius={'lg'}
                        rightSection={
                            searchInput ? (
                                <IconX
                                    aria-label="Clear search"
                                    onClick={handleClearSearch}
                                    size={16}
                                    style={{cursor: 'pointer'}}
                                />
                            ) : null
                        }
                        size="md"
                        value={searchInput}
                    />

                    <ClientList
                        onClientClick={handleClientClick}
                        search={search}
                        status={activeTab === 'all' ? undefined : activeTab}
                    />
                </Stack>
            </Container>
        </Box>
    );
};

export default ClientListPage;
