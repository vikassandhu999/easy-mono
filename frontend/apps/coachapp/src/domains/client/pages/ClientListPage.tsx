import {Button, Group, SegmentedControl, TextInput, Title, Stack} from '@mantine/core';
import {useDebouncedValue} from '@mantine/hooks';
import {IconPlus,  IconX} from '@tabler/icons-react';
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import ClientList from '@/shared/ClientList';
import PagePaper from '@/shared/containers/PagePaper';
import PaddingContainer from '@/shared/containers/PaddingContainer';

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
        <PagePaper bottomGutter>
            <PaddingContainer>
                <Stack gap="md">
                    {/* Header */}
                    <Group justify="space-between" pt="md">
                        <Title order={1}>Clients</Title>
                        <Button
                            onClick={() => openDrawer(DRAWER_KEYS.CLIENT_INVITE)}
                            rightSection={<IconPlus size={20} />}
                            radius="xl"
                            size="sm"
                        >
                            Invite
                        </Button>
                    </Group>

                    {/* Status Tabs */}
                    <SegmentedControl
                        value={activeTab}
                        onChange={handleTabChange}
                        data={STATUS_TABS}
                        radius="xl"
                        fullWidth
                    />

                    {/* Search Input */}
                    <TextInput
                        placeholder="Search clients..."
                        value={searchInput}
                        onChange={handleSearchChange}
                        rightSection={
                            searchInput ? (
                                <IconX
                                    size={14}
                                    style={{cursor: 'pointer'}}
                                    onClick={handleClearSearch}
                                    aria-label="Clear search"
                                />
                            ) : null
                        }
                        radius="xl"
                    />

                    {/* Client List */}
                    <ClientList
                        onClientClick={handleClientClick}
                        search={search}
                        status={activeTab === 'all' ? undefined : activeTab}
                    />
                </Stack>
            </PaddingContainer>
        </PagePaper>
    );
};

export default ClientListPage;
