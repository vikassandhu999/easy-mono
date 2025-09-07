import {Drawer, useDrawersStack} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import HeadingContainer from '../Containers/HeaderContainer';
import PagePaper from '../Containers/PagePaper';
import Header from '../layouts/Header';
import PaddingContainer from '../Containers/PaddingContainer';
import {InviteClientForm} from './InviteClientForm';
import {type Client} from '@/Api/Clients';
import {useCreateClient} from '@/Hooks/useClientQueries';

type InviteClientDrawerProps = {
    stack: ReturnType<typeof useDrawersStack<'invite-client' | any>>;
    onClientCreated?: (client: Client) => void;
};

export function InviteClientDrawer({stack, onClientCreated}: InviteClientDrawerProps) {
    const createClient = useCreateClient();

    return (
        <>
            <Drawer
                {...stack.register('invite-client')}
                withCloseButton={false}
            >
                <PagePaper>
                    <HeadingContainer
                        withBorder={false}
                        style={{paddingInline: 'var(--ce-size-xs)', paddingBlock: 'var(--ce-size-md)'}}
                    >
                        <Header
                            title="Invite Client"
                            onBack={() => stack.close('invite-client')}
                        />
                    </HeadingContainer>
                    <PaddingContainer>
                        <InviteClientForm
                            submitText="Send Invite"
                            onSubmit={async (data) => {
                                try {
                                    const client = await createClient.mutateAsync(data);

                                    notifications.show({
                                        title: 'Success',
                                        message: 'Client invited successfully!',
                                        color: 'green',
                                        position: 'top-center',
                                        autoClose: 3000,
                                    });

                                    // Call the callback with the created client
                                    if (onClientCreated) {
                                        onClientCreated(client);
                                    }

                                    stack.close('invite-client');
                                } catch (error: any) {
                                    notifications.show({
                                        title: 'Error',
                                        message: error.message || 'Failed to invite client',
                                        color: 'red',
                                        position: 'top-center',
                                        autoClose: 5000,
                                    });
                                }
                            }}
                        />
                    </PaddingContainer>
                </PagePaper>
            </Drawer>
        </>
    );
}
