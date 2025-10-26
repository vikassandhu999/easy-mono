import {Button, Drawer} from '@mantine/core';
import {FC} from 'react';

import ClientProfileCard from '@/shared/ClientProfileCard';
import {FixedBottomBar} from '@/shared/containers/FixedBottomBar';
import HeadingContainer from '@/shared/containers/HeaderContainer';
import PaddingContainer from '@/shared/containers/PaddingContainer';
import Header from '@/shared/layouts/Header';
import {Client} from '@/store/services/clients';

type CopyToClientDrawerProps = {
    opened: boolean;
    open: () => void;
    close: () => void;
    client: Client | null;
    onCopy: (clientId: string, date: string) => void;
};

const CopyToClientDrawer: FC<CopyToClientDrawerProps> = ({opened, close, client, onCopy}) => {
    if (!client) {
        return null;
    }

    return (
        <Drawer
            onClose={close}
            opened={opened}
            withCloseButton={false}
        >
            <HeadingContainer>
                <Header
                    onBack={close}
                    title="Select plan starting date"
                />
            </HeadingContainer>
            <PaddingContainer>
                <ClientProfileCard client={client} />
            </PaddingContainer>
            <FixedBottomBar>
                <Button
                    fullWidth
                    size="xl"
                >
                    Assign Plan
                </Button>
            </FixedBottomBar>
        </Drawer>
    );
};

export default CopyToClientDrawer;
