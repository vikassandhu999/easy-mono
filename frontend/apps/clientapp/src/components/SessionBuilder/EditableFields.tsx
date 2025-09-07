import {useState} from 'react';
import {Stack, Group, NumberInput, Textarea, Button} from '@mantine/core';
import {SessionDefItemConfig} from '@/Api/SessionDefs';

interface EditableFieldsProps {
    item: SessionDefItemConfig;
    onSave: (updatedItem: SessionDefItemConfig) => void;
    onCancel: () => void;
}

export default function EditableFields({item, onSave, onCancel}: EditableFieldsProps) {
    const [editedItem, setEditedItem] = useState<SessionDefItemConfig>(item);

    const handleSave = () => {
        onSave(editedItem);
    };

    const updateField = (field: keyof SessionDefItemConfig, value: any) => {
        setEditedItem((prev) => ({...prev, [field]: value}));
    };

    return (
        <Stack gap={'sm'}>
            <Group grow>
                <NumberInput
                    label="Sets"
                    min={0}
                    max={99}
                    value={editedItem.sets_count}
                    onChange={(value) => updateField('sets_count', Number(value) || 0)}
                    size="sm"
                    styles={{
                        label: {
                            fontWeight: 600,
                            marginBottom: 'var(--ce-size-2xs)',
                            color: 'var(--mantine-color-gray-8)',
                        },
                    }}
                />
                <NumberInput
                    label="Rest (seconds)"
                    min={0}
                    max={3600}
                    value={editedItem.rest_seconds}
                    onChange={(value) => updateField('rest_seconds', Number(value) || 0)}
                    size="sm"
                    styles={{
                        label: {
                            fontWeight: 600,
                            marginBottom: 'var(--ce-size-2xs)',
                            color: 'var(--mantine-color-gray-8)',
                        },
                    }}
                />
            </Group>

            <Textarea
                label="Custom Instructions"
                placeholder="Add specific instructions for this exercise..."
                value={editedItem.custom_instructions || ''}
                onChange={(event) => updateField('custom_instructions', event.target.value)}
                autosize
                minRows={2}
                maxRows={4}
                size="sm"
                styles={{
                    label: {
                        fontWeight: 600,
                        marginBottom: 'var(--ce-size-2xs)',
                        color: 'var(--mantine-color-gray-8)',
                    },
                }}
            />

            <Group
                justify="flex-end"
                gap={'xs'}
            >
                <Button
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button
                    size="sm"
                    onClick={handleSave}
                >
                    Save Changes
                </Button>
            </Group>
        </Stack>
    );
}
