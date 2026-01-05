import {Button, Group} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';
import {Link} from 'react-router';

import ClientsListWithFilters from '@/components/ClientsListWithFilters';
import PageTitle from '@/components/PageTitle';
import PageWrapper from '@/components/PageWrapper';
import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';

const ClientsPage: React.FC = () => {
  const {openDrawer} = useParamsDrawer({});
  return (
    <PageWrapper>
      <Group
        justify={'space-between'}
        mb={'md'}
      >
        <PageTitle>Clients</PageTitle>
        <Button
          color={'red'}
          component={Link}
          leftSection={<IconPlus size={20} />}
          onClick={() => openDrawer(DRAWER_KEYS.CLIENT_INVITE)}
          size={'md'}
          td={'underline'}
          to="/invite"
          variant={'white'}
        >
          Invite
        </Button>
      </Group>
      <ClientsListWithFilters />
    </PageWrapper>
  );
};

export default ClientsPage;
