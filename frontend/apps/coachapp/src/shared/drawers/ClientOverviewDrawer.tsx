import {Button, Card, Group, Loader, Stack, Text, Textarea} from '@mantine/core';
import {IconCheck, IconPencil, IconPlus, IconX} from '@tabler/icons-react';
import {useState} from 'react';

import useParamsDrawer from '@/hooks/useParamDrawer';
import {useGetClient, useUpdateClient} from '@/services/clients';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {notifyError} from '@/utils/notification';

const ClientOverviewDrawer = () => {
    const {closeDrawer, getDrawerParams} = useParamsDrawer({});
    const {client_id} = getDrawerParams();

    const {data: client, isLoading: isLoadingClient} = useGetClient(client_id || '', {
        skip: !client_id,
    });

    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteValue, setNoteValue] = useState('');
    const [updateClient, {isLoading: isUpdating}] = useUpdateClient();

    if (isLoadingClient) {
        return (
            <AutoDrawer
                content={
                    <Stack
                        align="center"
                        justify="center"
                        py="xl"
                    >
                        <Loader size="sm" />
                        <Text
                            c="dimmed"
                            size="sm"
                        >
                            Loading client...
                        </Text>
                    </Stack>
                }
                onClose={closeDrawer}
                title="Client Overview"
            />
        );
    }

    if (!client) {
        return (
            <AutoDrawer
                content={
                    <Text
                        c="red"
                        size="sm"
                    >
                        Client not found
                    </Text>
                }
                onClose={closeDrawer}
                title="Client Overview"
            />
        );
    }

    const handleEditNote = () => {
        setNoteValue(client.notes ?? '');
        setIsEditingNote(true);
    };

    const handleCancelEdit = () => {
        setNoteValue(client.notes ?? '');
        setIsEditingNote(false);
    };

    const handleSaveNote = async () => {
        try {
            await updateClient({
                clientId: client.id,
                data: {notes: noteValue || undefined},
            }).unwrap();
            setIsEditingNote(false);
        } catch (error) {
            console.error('Failed to update note:', error);
            notifyError('Failed to save note');
        }
    };

    const hasExistingNote = !!client.notes;

    return (
        <AutoDrawer
            content={
                <Stack gap="md">
                    {/* Onboarding Answers */}
                    <Card
                        padding="md"
                        radius="md"
                        withBorder
                    >
                        <Stack gap="xs">
                            <Text
                                fw={500}
                                size="sm"
                            >
                                Onboarding Answers
                            </Text>
                            <Text
                                c="dimmed"
                                fs="italic"
                                size="sm"
                            >
                                {client.status === 'pending'
                                    ? 'Client has not joined yet.'
                                    : 'No onboarding answers available.'}
                            </Text>
                        </Stack>
                    </Card>

                    {/* Notes */}
                    <Card
                        padding="md"
                        radius="md"
                        withBorder
                    >
                        <Stack gap="sm">
                            <Text
                                fw={500}
                                size="sm"
                            >
                                Notes
                            </Text>

                            {isEditingNote ? (
                                <>
                                    <Textarea
                                        maxRows={6}
                                        minRows={3}
                                        onChange={(e) => setNoteValue(e.currentTarget.value)}
                                        placeholder="Add a note about this client..."
                                        value={noteValue}
                                    />
                                    <Group gap="xs">
                                        <Button
                                            disabled={isUpdating}
                                            leftSection={<IconX size={16} />}
                                            onClick={handleCancelEdit}
                                            radius="xl"
                                            size="xs"
                                            variant="subtle"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            leftSection={<IconCheck size={16} />}
                                            loading={isUpdating}
                                            onClick={handleSaveNote}
                                            radius="xl"
                                            size="xs"
                                            variant="filled"
                                        >
                                            Save
                                        </Button>
                                    </Group>
                                </>
                            ) : (
                                <>
                                    <Text
                                        c="dimmed"
                                        fs={client.notes ? undefined : 'italic'}
                                        size="sm"
                                    >
                                        {client.notes ?? 'No notes available'}
                                    </Text>
                                    <Button
                                        leftSection={
                                            hasExistingNote ? <IconPencil size={16} /> : <IconPlus size={16} />
                                        }
                                        onClick={handleEditNote}
                                        radius="xl"
                                        size="xs"
                                        variant="light"
                                        w="max-content"
                                    >
                                        {hasExistingNote ? 'Edit Note' : 'Add Note'}
                                    </Button>
                                </>
                            )}
                        </Stack>
                    </Card>
                </Stack>
            }
            onClose={closeDrawer}
            title="Client Overview"
        />
    );
};

export default ClientOverviewDrawer;
