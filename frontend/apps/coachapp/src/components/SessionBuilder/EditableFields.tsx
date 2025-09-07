import {useState} from 'react';
import {Stack, Group, NumberInput, Textarea, Button, TextInput, Switch} from '@mantine/core';
import {SessionDefItemConfig} from '@/api/session_defs.ts';

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
            {editedItem.content?.type === 'exercise' && (
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
                    <TextInput
                        label="Reps Target"
                        placeholder="e.g. 8-12"
                        value={editedItem.reps_target || ''}
                        onChange={(e) => updateField('reps_target', e.currentTarget.value)}
                        size="sm"
                        styles={{
                            label: {
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                                color: 'var(--mantine-color-gray-8)',
                            },
                        }}
                    />
                    <TextInput
                        label="Weight Target"
                        placeholder="e.g. 60kg / bodyweight / 80%"
                        value={editedItem.weight_target || ''}
                        onChange={(e) => updateField('weight_target', e.currentTarget.value)}
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
            )}

            {['food', 'recipe'].includes(editedItem.content?.type || '') && (
                <Group grow>
                    <NumberInput
                        label="Quantity"
                        min={0}
                        max={10000}
                        value={editedItem.quantity}
                        onChange={(value) => updateField('quantity', Number(value) || 0)}
                        size="sm"
                        styles={{
                            label: {
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                                color: 'var(--mantine-color-gray-8)',
                            },
                        }}
                    />
                    <TextInput
                        label="Unit"
                        placeholder="g / ml / cup"
                        value={editedItem.unit || ''}
                        onChange={(e) => updateField('unit', e.currentTarget.value)}
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
            )}

            <Switch
                label="Optional Item"
                checked={editedItem.is_optional || false}
                onChange={(e) => updateField('is_optional', e.currentTarget.checked)}
                size="sm"
            />

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
