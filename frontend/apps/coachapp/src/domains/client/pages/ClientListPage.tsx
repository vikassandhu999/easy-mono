import {Button} from '@mantine/core';
import {useDebouncedValue} from '@mantine/hooks';
import {IconPlus, IconSearch, IconX} from '@tabler/icons-react';
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import ClientList from '@/shared/ClientList';
import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import PagePaper from '@/shared/containers/PagePaper';
import Header from '@/shared/layouts/Header';

import classes from './styles.module.css';

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

    const handleTabChange = (value: StatusTab) => {
        setActiveTab(value);
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(event.currentTarget.value);
    };

    const handleClearSearch = () => {
        setSearchInput('');
    };

    return (
        <PagePaper bottomGutter>
            <HeadingContainer>
                <Header
                    actions={
                        <Button
                            onClick={() => openDrawer(DRAWER_KEYS.CLIENT_INVITE)}
                            radius="xl"
                            rightSection={<IconPlus size="18" />}
                            size="sm"
                        >
                            Invite a client
                        </Button>
                    }
                    description="Manage your client roster, invite new clients, and track their progress"
                    title="Clients"
                />
            </HeadingContainer>

            <PaddingContainer>
                <div className={classes.container}>
                    {/* Status Tabs */}
                    <div className={classes.statusTabs}>
                        {STATUS_TABS.map((tab) => (
                            <button
                                className={`${classes.statusTab} ${
                                    activeTab === tab.value ? classes.statusTabActive : ''
                                }`}
                                key={tab.value}
                                onClick={() => handleTabChange(tab.value)}
                                type="button"
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className={classes.searchWrapper}>
                        <IconSearch
                            className={classes.searchIcon}
                            size={16}
                        />
                        <input
                            className={classes.searchInput}
                            onChange={handleSearchChange}
                            placeholder="Search clients..."
                            type="text"
                            value={searchInput}
                        />
                        {searchInput && (
                            <button
                                aria-label="Clear search"
                                className={classes.clearButton}
                                onClick={handleClearSearch}
                                type="button"
                            >
                                <IconX size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <ClientList
                    onClientClick={handleClientClick}
                    search={search}
                    status={activeTab === 'all' ? undefined : activeTab}
                />
            </PaddingContainer>
        </PagePaper>
    );
};

export default ClientListPage;
