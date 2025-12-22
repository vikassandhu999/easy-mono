import {Button, Card, Group, Modal, Stack, Text, ThemeIcon} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import { IconArchive, IconArchiveOff, IconUserEdit} from '@tabler/icons-react';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {Client, useArchiveClient, useUpdateClientStatus} from '@/services/clients';
import {notifyError} from '@/utils/notification';

const SettingsTab = ({client}: {client: Client}) => {
    const {openDrawer} = useParamsDrawer({});
    const [updateClientStatus, {isLoading: isUpdatingStatus}] = useUpdateClientStatus();
    const [archiveClient, {isLoading: isArchiving}] = useArchiveClient();
    const [archiveModalOpened, {open: openArchiveModal, close: closeArchiveModal}] = useDisclosure(false);

    const isArchived = client.status === 'archived';

    const handleEditProfile = () => {
        openDrawer(DRAWER_KEYS.CLIENT_EDIT, {client_id: client.id});
    };

    const handleArchiveToggle = async () => {
        try {
            if (isArchived) {
                await updateClientStatus({
                    clientId: client.id,
                    status: 'active',
                }).unwrap();
            } else {
                await archiveClient(client.id).unwrap();
            }
            closeArchiveModal();
        } catch (error) {
            console.error('Failed to update client archive status:', error);
            notifyError('Failed to update client archive status');
        }
    };




    return (
        <>
            <Stack gap="lg">
                {/* Profile Section */}
                <Card
                    padding="md"
                    radius="md"
                    withBorder
                >
                    <Stack gap="md">
                        <Group gap="xs">
                            <ThemeIcon
                                color="blue"
                                size="sm"
                                variant="light"
                            >
                                <IconUserEdit size={14} />
                            </ThemeIcon>
                            <Text
                                fw={500}
                                size="sm"
                            >
                                Profile Settings
                            </Text>
                        </Group>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Update client profile information, contact details, and preferences.
                        </Text>
                        <Button
                            onClick={handleEditProfile}
                            radius="xl"
                            size="xs"
                            variant="light"
                            w="max-content"
                        >
                            Edit Profile
                        </Button>
                    </Stack>
                </Card>


                <Card
                    bd={isArchived ? "1px solid var(--mantine-color-green-3)" : "1px solid var(--mantine-color-orange-3)"}
                    bg={isArchived ? "var(--mantine-color-green-0)" : "var(--mantine-color-orange-0)"}
                    padding="md"
                    radius="md"
                >
                    <Stack gap="md">
                        <Group gap="xs">
                            <ThemeIcon
                                color={isArchived ? "green" : "orange"}
                                size="sm"
                                variant="light"
                            >
                                {isArchived ? <IconArchiveOff size={14} /> : <IconArchive size={14} />}
                            </ThemeIcon>
                            <Text
                                c={isArchived ? "green" : "orange"}
                                fw={500}
                                size="sm"
                            >
                                {isArchived ? 'Archived Client' : 'Archive Client'}
                            </Text>
                        </Group>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            {isArchived
                                ? 'This client is currently archived. Unarchive to restore access and make them active again.'
                                : 'Archive this client to hide them from your active client list. You can unarchive them later.'}
                        </Text>
                        <Button
                            color={isArchived ? "green" : "orange"}
                            leftSection={isArchived ? <IconArchiveOff size={16} /> : <IconArchive size={16} />}
                            onClick={openArchiveModal}
                            radius="xl"
                            size="xs"
                            variant="outline"
                            w="max-content"
                        >
                            {isArchived ? 'Unarchive Client' : 'Archive Client'}
                        </Button>
                    </Stack>
                </Card>
            </Stack>

            {/* Archive/Unarchive Confirmation Modal */}
            <Modal
                centered
                onClose={closeArchiveModal}
                opened={archiveModalOpened}
                title={isArchived ? 'Unarchive Client' : 'Archive Client'}
            >
                <Stack gap="md">
                    <Text size="sm">
                        {isArchived
                            ? <>Are you sure you want to unarchive <strong>{client.full_name}</strong>? They will be restored to your active client list.</>
                            : <>Are you sure you want to archive <strong>{client.full_name}</strong>? They will be hidden from your active client list but can be unarchived later.</>
                        }
                    </Text>
                    <Group
                        gap="sm"
                        justify="flex-end"
                    >
                        <Button
                            onClick={closeArchiveModal}
                            radius="xl"
                            size="sm"
                            variant="subtle"
                        >
                            Cancel
                        </Button>
                        <Button
                            color={isArchived ? "green" : "orange"}
                            leftSection={isArchived ? <IconArchiveOff size={16} /> : <IconArchive size={16} />}
                            loading={isArchiving || isUpdatingStatus}
                            onClick={handleArchiveToggle}
                            radius="xl"
                            size="sm"
                            variant="filled"
                        >
                            {isArchived ? 'Unarchive Client' : 'Archive Client'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
};

export default SettingsTab;
