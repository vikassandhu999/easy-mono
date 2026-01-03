import {Button, Group, SegmentedControl, Stack, TextInput, Title} from '@mantine/core';
import {useDebouncedValue} from '@mantine/hooks';
import {IconPlus, IconX} from '@tabler/icons-react';
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router';

import {DRAWER_KEYS} from '@/configs';
import PageWrapper from '@/containers/PageWrapper';
import useParamsDrawer from '@/hooks/useParamDrawer';
import ClientList from '@/shared/ClientList';
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
        <PageWrapper>
            <PaddingContainer>
                <Stack gap={'sm'}>
                    <Group
                        align="center"
                        justify="space-between"
                    >
                        <Title order={3}>Clients</Title>
                        <Button
                            color={'var(--ce-bg-brand)'}
                            onClick={() => openDrawer(DRAWER_KEYS.CLIENT_INVITE)}
                            radius="xl"
                            rightSection={<IconPlus size={18} />}
                            size={'md'}
                        >
                            Invite
                        </Button>
                    </Group>

                    <SegmentedControl
                        data={STATUS_TABS}
                        onChange={handleTabChange}
                        size="lg"
                        value={activeTab}
                    />

                    <TextInput
                        onChange={handleSearchChange}
                        placeholder="Search clients..."
                        radius={99999}
                        rightSection={
                            searchInput ? (
                                <IconX
                                    aria-label="Clear search"
                                    onClick={handleClearSearch}
                                    size={24}
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
            </PaddingContainer>
        </PageWrapper>
    );
};

export default ClientListPage;
