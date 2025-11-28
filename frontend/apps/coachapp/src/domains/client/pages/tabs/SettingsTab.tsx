import {Button, Card, Group, Modal, Stack, Switch, Text, ThemeIcon} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {IconAlertTriangle, IconArchive, IconToggleLeft, IconTrash, IconUserEdit} from '@tabler/icons-react';
import {useNavigate} from 'react-router';

import {DRAWER_KEYS} from '@/configs';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {Client, useArchiveClient, useUpdateClientStatus} from '@/services/clients';
import {notifyError, notifySuccess} from '@/utils/notification';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'active':
            return 'green';
        case 'pending':
            return 'yellow';
        case 'inactive':
            return 'gray';
        case 'archived':
            return 'red';
        default:
            return 'gray';
    }
};

const SettingsTab = ({client}: {client: Client}) => {
    const navigate = useNavigate();
    const {openDrawer} = useParamsDrawer({});
    const [updateClientStatus, {isLoading: isUpdatingStatus}] = useUpdateClientStatus();
    const [archiveClient, {isLoading: isDeleting}] = useArchiveClient();
    const [deleteModalOpened, {open: openDeleteModal, close: closeDeleteModal}] = useDisclosure(false);

    const isInactive = client.status === 'inactive';
    const isArchived = client.status === 'archived';

    const handleEditProfile = () => {
        openDrawer(DRAWER_KEYS.CLIENT_EDIT, {client_id: client.id});
    };

    const handleInactiveToggle = async (checked: boolean) => {
        try {
            await updateClientStatus({
                clientId: client.id,
                status: checked ? 'inactive' : 'active',
            }).unwrap();
            notifySuccess(`Client ${checked ? 'set to inactive' : 'activated'} successfully`);
        } catch (error) {
            console.error('Failed to update client status:', error);
            notifyError('Failed to update client status');
        }
    };

    const handleArchivedToggle = async (checked: boolean) => {
        try {
            await updateClientStatus({
                clientId: client.id,
                status: checked ? 'archived' : 'active',
            }).unwrap();
            notifySuccess(`Client ${checked ? 'archived' : 'activated'} successfully`);
        } catch (error) {
            console.error('Failed to update client status:', error);
            notifyError('Failed to update client status');
        }
    };

    const handleDeleteClient = async () => {
        try {
            await archiveClient(client.id).unwrap();
            notifySuccess('Client deleted successfully');
            closeDeleteModal();
            navigate('/clients');
        } catch (error) {
            console.error('Failed to delete client:', error);
            notifyError('Failed to delete client');
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

                {/* Status Management Section */}
                <Card
                    padding="md"
                    radius="md"
                    withBorder
                >
                    <Stack gap="md">
                        <Group gap="xs">
                            <ThemeIcon
                                color="orange"
                                size="sm"
                                variant="light"
                            >
                                <IconToggleLeft size={14} />
                            </ThemeIcon>
                            <Text
                                fw={500}
                                size="sm"
                            >
                                Status Management
                            </Text>
                        </Group>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Current status:{' '}
                            <Text
                                c={getStatusColor(client.status)}
                                component="span"
                                fw={500}
                                tt="capitalize"
                            >
                                {client.status}
                            </Text>
                        </Text>

                        <Stack gap="sm">
                            <Group
                                justify="space-between"
                                wrap="nowrap"
                            >
                                <Group
                                    gap="xs"
                                    wrap="nowrap"
                                >
                                    <IconToggleLeft
                                        color="var(--mantine-color-orange-6)"
                                        size={18}
                                    />
                                    <Stack gap={0}>
                                        <Text size="sm">Set Inactive</Text>
                                        <Text
                                            c="dimmed"
                                            size="xs"
                                        >
                                            Temporarily pause this client
                                        </Text>
                                    </Stack>
                                </Group>
                                <Switch
                                    checked={isInactive}
                                    color="orange"
                                    disabled={isUpdatingStatus || isArchived}
                                    onChange={(e) => handleInactiveToggle(e.currentTarget.checked)}
                                />
                            </Group>

                            <Group
                                justify="space-between"
                                wrap="nowrap"
                            >
                                <Group
                                    gap="xs"
                                    wrap="nowrap"
                                >
                                    <IconArchive
                                        color="var(--mantine-color-cyan-6)"
                                        size={18}
                                    />
                                    <Stack gap={0}>
                                        <Text size="sm">Archive</Text>
                                        <Text
                                            c="dimmed"
                                            size="xs"
                                        >
                                            Move client to archive
                                        </Text>
                                    </Stack>
                                </Group>
                                <Switch
                                    checked={isArchived}
                                    color="cyan"
                                    disabled={isUpdatingStatus}
                                    onChange={(e) => handleArchivedToggle(e.currentTarget.checked)}
                                />
                            </Group>
                        </Stack>
                    </Stack>
                </Card>

                {/* Danger Zone */}
                <Card
                    bd="1px solid var(--mantine-color-red-3)"
                    bg="var(--mantine-color-red-0)"
                    padding="md"
                    radius="md"
                >
                    <Stack gap="md">
                        <Group gap="xs">
                            <ThemeIcon
                                color="red"
                                size="sm"
                                variant="light"
                            >
                                <IconAlertTriangle size={14} />
                            </ThemeIcon>
                            <Text
                                c="red"
                                fw={500}
                                size="sm"
                            >
                                Danger Zone
                            </Text>
                        </Group>
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Permanently delete this client and all associated data. This action cannot be undone.
                        </Text>
                        <Button
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            onClick={openDeleteModal}
                            radius="xl"
                            size="xs"
                            variant="outline"
                            w="max-content"
                        >
                            Delete Client
                        </Button>
                    </Stack>
                </Card>
            </Stack>

            {/* Delete Confirmation Modal */}
            <Modal
                centered
                onClose={closeDeleteModal}
                opened={deleteModalOpened}
                title="Delete Client"
            >
                <Stack gap="md">
                    <Text size="sm">
                        Are you sure you want to delete <strong>{client.full_name}</strong>? This action cannot be
                        undone and will remove all associated data.
                    </Text>
                    <Group
                        gap="sm"
                        justify="flex-end"
                    >
                        <Button
                            onClick={closeDeleteModal}
                            radius="xl"
                            size="sm"
                            variant="subtle"
                        >
                            Cancel
                        </Button>
                        <Button
                            color="red"
                            leftSection={<IconTrash size={16} />}
                            loading={isDeleting}
                            onClick={handleDeleteClient}
                            radius="xl"
                            size="sm"
                            variant="filled"
                        >
                            Delete Client
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
};

export default SettingsTab;
