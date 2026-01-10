import {SearchField, Tabs} from '@heroui/react';
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
      <Tabs
        className={'mb-4'}
        onSelectionChange={(selection) => setStatus(selection?.toString())}
        selectedKey={status}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Options">
            {STATUS_DATA.map((statusItem) => (
              <Tabs.Tab
                id={statusItem.value}
                key={statusItem.value}
              >
                {statusItem.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      <SearchField
        className={'mb-6'}
        name="search"
        onChange={(change) => setSearch(change)}
        value={search}
      >
        <SearchField.Group className={'h-10'}>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <ClientsList
        search={search}
        status={status}
      />
    </>
  );
};

export default ClientsListWithFilters;
