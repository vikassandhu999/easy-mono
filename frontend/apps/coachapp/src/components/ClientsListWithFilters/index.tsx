import {SegmentedControl, TextInput} from '@mantine/core';
import {IconX} from '@tabler/icons-react';
import {useState} from 'react';

import ClientsList from '../ClientsList';

const STATUS_DATA: {label: string; value: string}[] = [
    {label: 'All', value: 'all'},
    {label: 'Active', value: 'active'},
    {label: 'Pending', value: 'pending'},
    {label: 'Inactive', value: 'inactive'},
];

const ClientsListWithFilters = () => {
    const [status, setStatus] = useState<string>();
    const [search, setSearch] = useState<string>('');
    return (
        <>
            <SegmentedControl
                data={STATUS_DATA}
                fullWidth
                mb={'xs'}
                mx={'2px'}
                onChange={setStatus}
                size="lg"
                value={status}
            />
            <TextInput
                mb={'md'}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search clients..."
                rightSection={
                    search ? (
                        <IconX
                            aria-label="Clear search"
                            onClick={() => setSearch('')}
                            size={24}
                            style={{cursor: 'pointer'}}
                        />
                    ) : null
                }
                size="md"
                value={search}
            />
            <ClientsList
                search={search}
                status={status}
            />
        </>
    );
};

export default ClientsListWithFilters;
