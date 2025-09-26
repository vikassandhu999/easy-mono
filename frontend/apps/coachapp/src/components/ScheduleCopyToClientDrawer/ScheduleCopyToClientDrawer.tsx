import {Button, Group, Stack, Text, useDrawersStack} from '@mantine/core';
import {modals} from '@mantine/modals';
import {notifications} from '@mantine/notifications';
import {useNavigate} from 'react-router';

import {Client} from '@/api/clients';
import {useCopyScheduleToClientMutation, useGetScheduleQuery} from '@/store/services/schedulesApi';

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
    const {data: schedule} = useGetScheduleQuery(scheduleId, {skip: !scheduleId});

    const [copyToClient, {isLoading: iscopying}] = useCopyScheduleToClientMutation();

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
                                loading={iscopying}
                                onClick={async () => {
                                    try {
                                        await copyToClient({
                                            scheduleId,
                                            data: {client_id: client.id},
                                        });
                                        modals.close(modalId);
                                        // Close the drawer and take coach back to the client profile
                                        stack.close('copy-to-client');
                                        navigate(`/clients/${client.id}`);
                                        notifications.show({
                                            color: 'green',
                                            message: 'Schedule copied to client.',
                                            title: 'Success',
                                        });
                                    } catch (e) {
                                        notifications.show({
                                            color: 'red',
                                            message: 'Failed to copy schedule',
                                            title: 'Error',
                                        });
                                    }
                                }}
                                variant="default"
                            >
                                Copy
                            </Button>
                            <Button
                                color="blue"
                                loading={iscopying}
                                onClick={async () => {
                                    try {
                                        const result = await copyToClient({
                                            scheduleId,
                                            data: {client_id: client.id},
                                        });
                                        modals.close(modalId);
                                        stack.close('copy-to-client');
                                        // Go directly to the copied schedule for customization
                                        if ('data' in result) {
                                            navigate(`/clients/${client.id}/schedules/${result.data.id}`);
                                        }
                                        notifications.show({
                                            color: 'green',
                                            message: 'Schedule copied to client.',
                                            title: 'Success',
                                        });
                                    } catch (e) {
                                        notifications.show({
                                            color: 'red',
                                            message: 'Failed to copy schedule',
                                            title: 'Error',
                                        });
                                    }
                                }}
                            >
                                Copy & Customize
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
