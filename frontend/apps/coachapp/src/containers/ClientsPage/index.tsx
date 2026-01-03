import {Button, Group} from '@mantine/core';
import {IconPlus} from '@tabler/icons-react';

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
                    color={'var(--ce-bg-brand)'}
                    fz={'var(--ce-font-size-small)'}
                    leftSection={<IconPlus size={24} />}
                    onClick={() => openDrawer(DRAWER_KEYS.CLIENT_INVITE)}
                    size={'sm'}
                >
                    Invite
                </Button>
            </Group>
            <ClientsListWithFilters />
        </PageWrapper>
    );
};

export default ClientsPage;
