import {humanizeError} from '@easy/error-parser';
import {Button, Group} from '@mantine/core';
import {useRef} from 'react';

import useParamsDrawer from '@/hooks/useParamDrawer';
import {InviteClientProps, useInviteClient} from '@/services/clients';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {ClientInviteForm, ClientInviteFormHandle} from '@/shared/ClientInviteForm/ClientInviteForm';
import {notifyError, notifySuccess} from '@/utils/notification';

const ClientInviteDrawer = () => {
    const {closeDrawer} = useParamsDrawer({});
    const [inviteClient, {isLoading}] = useInviteClient();
    const formRef = useRef<ClientInviteFormHandle>(null);

    const handleInvite = async (values: InviteClientProps) => {
        try {
            await inviteClient(values).unwrap();
            notifySuccess('Invitation sent successfully');
            closeDrawer();
        } catch (error) {
            const errMsg = humanizeError(error);
            notifyError(errMsg);
            throw error;
        }
    };

    const handleSaveClick = async () => {
        await formRef.current?.submit();
    };

    return (
        <AutoDrawer
            actions={
                <Group w="100%">
                    <Button
                        color="green"
                        flex={1}
                        loading={isLoading}
                        onClick={handleSaveClick}
                        radius="xl"
                        size="sm"
                        variant="solid"
                    >
                        Send Invitation
                    </Button>
                </Group>
            }
            content={
                <ClientInviteForm
                    onSubmit={handleInvite}
                    ref={formRef}
                />
            }
            onClose={closeDrawer}
            title="Invite Client"
        />
    );
};

export default ClientInviteDrawer;
