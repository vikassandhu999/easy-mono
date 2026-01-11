import {Button, SearchField} from '@heroui/react';
import {IconPlus} from '@tabler/icons-react';
import {useState} from 'react';

import ClientsList from '@/components/ClientsList';
import ClientStatusFilter from '@/components/ClientsList/ClientStatusFilter';
import PageWrapper, {PageSection} from '@/components/PageWrapper';
import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {Client} from '@/services/clients';

const ClientsPage = () => {
  const {openDrawer} = useParamsDrawer({});
  const [status, setStatus] = useState<Client['status']>();
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
        <ClientStatusFilter
          className={'mb-2'}
          onStatusChange={setStatus}
          status={status}
        />
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
