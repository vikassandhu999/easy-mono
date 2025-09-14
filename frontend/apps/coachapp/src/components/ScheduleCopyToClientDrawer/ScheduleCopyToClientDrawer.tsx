import {Button, Group, Stack, Text, useDrawersStack} from '@mantine/core';
import {modals} from '@mantine/modals';
import {notifications} from '@mantine/notifications';
import {useMutation} from '@tanstack/react-query';
import {useNavigate} from 'react-router';

import {Client} from '@/api/clients';
import {SchedulesAPI} from '@/api/schedules';
import {useSchedule} from '@/hooks/useScheduleQueries';

import ClientSelect from '../ClientSelect';
import HeadingContainer from '../containers/HeaderContainer';
import PaddingContainer from '../containers/PaddingContainer';
import EasyDrawer from '../EasyDrawer/EasyDrawer';
import Header from '../layouts/Header';

type ScheduleAssignDrawerProps = {
    scheduleId: string;
    stack: ReturnType<typeof useDrawersStack<'copy-to-client' | any>>;
};

const ScheduleCopyToClientDrawer = ({stack, scheduleId}: ScheduleAssignDrawerProps) => {
    const navigate = useNavigate();
    const {data: schedule} = useSchedule(scheduleId, !!scheduleId);

    const copyToClient = useMutation({
        mutationFn: async (clientId: string) => {
            const result = await SchedulesAPI.copyToClient(scheduleId, {
                client_id: clientId,
            });
            if (result.isError) {
                throw result.getError();
            }
            return result.getValue();
        },
        onError: (error) => {
            notifications.show({
                color: 'red',
                message: error.message || 'Something went wrong',
                title: 'Failed to add entry',
            });
        },
        onSuccess: () => {
            notifications.show({
                color: 'green',
                message: 'Schedule copied to client.',
                title: 'Success',
            });
        },
    });

    const openConfirm = (client: Client) => {
        const modalId = 'copy-to-client-confirm';
        modals.open({
            modalId,
            centered: true,
            withCloseButton: false,
            children: (
                <Stack gap="md">
                    <PaddingContainer paddingY="xs">
                        <Text>
                            Copy <strong>{schedule?.name}</strong> to <strong>{client.name}</strong>?
                        </Text>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            You can copy as-is or jump straight into customizing it for the client.
                        </Text>
                    </PaddingContainer>
                    <Group
                        justify="space-between"
                        wrap="wrap"
                    >
                        <Button
                            color="gray"
                            onClick={() => modals.close(modalId)}
                            variant="subtle"
                        >
                            Cancel
                        </Button>
                        <Group>
                            <Button
                                loading={copyToClient.isPending}
                                onClick={async () => {
                                    try {
                                        await copyToClient.mutateAsync(client.id);
                                        modals.close(modalId);
                                        // Close the drawer and take coach back to the client profile
                                        stack.close('copy-to-client');
                                        navigate(`/clients/${client.id}`);
                                    } catch (e) {
                                        // Error toast is handled in onError
                                    }
                                }}
                                variant="default"
                            >
                                Copy
                            </Button>
                            <Button
                                color="blue"
                                loading={copyToClient.isPending}
                                onClick={async () => {
                                    try {
                                        const data = await copyToClient.mutateAsync(client.id);
                                        modals.close(modalId);
                                        stack.close('copy-to-client');
                                        // Go directly to the copied schedule for customization
                                        navigate(`/clients/${data.client_id}/schedules/${data.id}`);
                                    } catch (e) {
                                        // Error toast is handled in onError
                                    }
                                }}
                                variant="filled"
                            >
                                Copy and customize
                            </Button>
                        </Group>
                    </Group>
                </Stack>
            ),
        });
    };

    return (
        <EasyDrawer
            h="100%"
            header={
                schedule ? (
                    <HeadingContainer
                        style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            onBack={() => stack.close('copy-to-client')}
                            title={`Copy ${schedule.name}`}
                        />
                    </HeadingContainer>
                ) : null
            }
            withCloseButton={false}
            {...stack.register('copy-to-client')}
        >
            <PaddingContainer>
                <ClientSelect
                    multiple={true}
                    onComplete={(clients) => openConfirm(clients[0])}
                />
            </PaddingContainer>
        </EasyDrawer>
    );
};

export default ScheduleCopyToClientDrawer;
