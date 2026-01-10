import {Button, SearchField, Tabs} from '@heroui/react';
import {IconPlus} from '@tabler/icons-react';
import {useState} from 'react';

import ClientsList from '@/components/ClientsList';
import PageWrapper, {PageSection} from '@/components/PageWrapper';
import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';

const STATUS_DATA: {label: string; value: string}[] = [
  {label: 'All', value: 'all'},
  {label: 'Active', value: 'active'},
  {label: 'Pending', value: 'pending'},
  {label: 'Inactive', value: 'inactive'},
];

const ClientsPage: React.FC = () => {
  const {openDrawer} = useParamsDrawer({});
  const [status, setStatus] = useState<string>();
  const [search, setSearch] = useState<string>('');
  return (
    <PageWrapper>
      <PageSection className="w-full flex-1 sticky top-0 bg-background z-10 mb-4 pt-4 md:pt-6 flex flex-col gap-2">
        <div className={'flex justify-between items-center'}>
          <h4 className={'text-2xl font-semibold m-0'}>Clients</h4>
          <Button
            onClick={() => openDrawer(DRAWER_KEYS.CLIENT_INVITE)}
            size={'md'}
          >
            <IconPlus size={24} />
            Invite
          </Button>
        </div>
        <Tabs
          className={'mb-2'}
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
      </PageSection>
      <PageSection>
        <ClientsList
          search={search}
          status={status}
        />
      </PageSection>
    </PageWrapper>
  );
};

export default ClientsPage;
