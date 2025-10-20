import {Container, Drawer, Stack, useDrawersStack} from '@mantine/core';
import {notifications} from '@mantine/notifications';

import {InviteClientForm} from '@/components/InviteClientForm';
import Header from '@/components/layouts/Header';
import {type Client} from '@/store/services/clients';
import {useCreateClientMutation} from '@/store/services/clients';

type InviteClientDrawerProps = {
    onClientCreated?: (client: Client) => void;
    stack: ReturnType<typeof useDrawersStack<'invite-client' | any>>;
};

export function InviteClientDrawer({onClientCreated, stack}: InviteClientDrawerProps) {
    const [createClient] = useCreateClientMutation();

    return (
        <Drawer
            {...stack.register('invite-client')}
            position="right"
            size="100%"
            styles={{
                body: {
                    padding: 0,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                },
                content: {
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
            withCloseButton={false}
        >
            <Stack
                align="center"
                gap="md"
                h="100%"
            >
                {/* Header - Constrained Width */}
                <Container
                    p="md"
                    size={560}
                    w="100%"
                >
                    <Header
                        onBack={() => stack.close('invite-client')}
                        title="Invite client"
                    />
                </Container>

                {/* Content Area - Scrollable, Constrained Width */}
                <Container
                    bg="gray.0"
                    p="lg"
                    size={560}
                    style={{
                        flex: 1,
                        overflow: 'auto',
                    }}
                    w="100%"
                >
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
                        submitText="Send invitation"
                    />
                </Container>
            </Stack>
        </Drawer>
    );
}
