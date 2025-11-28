import {Button, Card, Group, Stack, Text, Textarea} from '@mantine/core';
import {IconCheck, IconPencil, IconPlus, IconX} from '@tabler/icons-react';
import {useState} from 'react';

import {Client, useUpdateClient} from '@/services/clients';

interface OverviewTabProps {
    client: Client;
}

const OverviewTab = ({client}: OverviewTabProps) => {
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteValue, setNoteValue] = useState(client.notes ?? '');

    const [updateClient, {isLoading: isUpdating}] = useUpdateClient();

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
        }
    };

    const hasExistingNote = !!client.notes;

    return (
        <Stack>
            <Card withBorder>
                <Stack>
                    <Text size="md">Onboarding Answers</Text>
                    <Text
                        c="dimmed"
                        fs="italic"
                    >
                        {client.status === 'pending' && 'Client has not been joined yet.'}
                    </Text>
                </Stack>
            </Card>
            <Card withBorder>
                <Stack>
                    <Text size="md">Note</Text>

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
                                    leftSection={<IconX size="18" />}
                                    onClick={handleCancelEdit}
                                    radius="xl"
                                    size="sm"
                                    variant="subtle"
                                    w="max-content"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    leftSection={<IconCheck size="18" />}
                                    loading={isUpdating}
                                    onClick={handleSaveNote}
                                    radius="xl"
                                    size="sm"
                                    variant="filled"
                                    w="max-content"
                                >
                                    Save Note
                                </Button>
                            </Group>
                        </>
                    ) : (
                        <>
                            <Text
                                c="dimmed"
                                fs={client.notes ? undefined : 'italic'}
                            >
                                {client.notes ?? 'No notes available'}
                            </Text>
                            <Button
                                leftSection={hasExistingNote ? <IconPencil size="18" /> : <IconPlus size="18" />}
                                onClick={handleEditNote}
                                radius="xl"
                                size="sm"
                                variant="outline"
                                w="max-content"
                            >
                                {hasExistingNote ? 'Edit Note' : 'Add Note'}
                            </Button>
                        </>
                    )}
                </Stack>
            </Card>
        </Stack>
    );
};

export default OverviewTab;
