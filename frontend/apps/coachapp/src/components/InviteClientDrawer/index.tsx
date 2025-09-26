import {Drawer, useDrawersStack} from '@mantine/core';
import {notifications} from '@mantine/notifications';

import {type Client} from '@/api/clients.ts';
import HeadingContainer from '@/components/containers/HeaderContainer.tsx';
import PaddingContainer from '@/components/containers/PaddingContainer.tsx';
import PagePaper from '@/components/containers/PagePaper.tsx';
import {InviteClientForm} from '@/components/InviteClientForm';
import {useCreateClientMutation} from '@/store/services/clientsApi';

import Header from '../layouts/Header.tsx';

type InviteClientDrawerProps = {
    onClientCreated?: (client: Client) => void;
    stack: ReturnType<typeof useDrawersStack<'invite-client' | any>>;
};

export function InviteClientDrawer({onClientCreated, stack}: InviteClientDrawerProps) {
    const [createClient] = useCreateClientMutation();

    return (
        <>
            <Drawer
                {...stack.register('invite-client')}
                withCloseButton={false}
            >
                <PagePaper>
                    <HeadingContainer
                        style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            onBack={() => stack.close('invite-client')}
                            title="Invite Client"
                        />
                    </HeadingContainer>
                    <PaddingContainer>
                        <InviteClientForm
                            onSubmit={async (data) => {
                                try {
                                    const client = await createClient(data).unwrap();

                                    notifications.show({
                                        autoClose: 3000,
                                        color: 'green',
                                        message: 'Client invited successfully!',
                                        position: 'top-center',
                                        title: 'Success',
                                    });

                                    // Call the callback with the created client
                                    if (onClientCreated) {
                                        onClientCreated(client);
                                    }

                                    stack.close('invite-client');
                                } catch (error: any) {
                                    notifications.show({
                                        autoClose: 5000,
                                        color: 'red',
                                        message: error.message || 'Failed to invite client',
                                        position: 'top-center',
                                        title: 'Error',
                                    });
                                }
                            }}
                            submitText="Send Invite"
                        />
                    </PaddingContainer>
                </PagePaper>
            </Drawer>
        </>
    );
}
