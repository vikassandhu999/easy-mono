import {Button, Group, NumberInput, Stack, Switch, Textarea, TextInput} from '@mantine/core';
import {useState} from 'react';

import {SessionItemConfig} from '@/api/sessions';

interface EditableFieldsProps {
    item: SessionItemConfig;
    onCancel: () => void;
    onSave: (updatedItem: SessionItemConfig) => void;
}

export default function EditableFields({item, onCancel, onSave}: EditableFieldsProps) {
    const [editedItem, setEditedItem] = useState<SessionItemConfig>(item);

    const handleSave = () => {
        onSave(editedItem);
    };

    const updateField = (field: keyof SessionItemConfig, value: any) => {
        setEditedItem((prev) => ({...prev, [field]: value}));
    };

    return (
        <Stack gap={'sm'}>
            {editedItem.content?.type === 'exercise' && (
                <Group grow>
                    <NumberInput
                        label="Sets"
                        max={99}
                        min={0}
                        onChange={(value) => updateField('sets', Number(value) || 0)}
                        size="sm"
                        styles={{
                            label: {
                                color: 'var(--mantine-color-gray-8)',
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                            },
                        }}
                        value={editedItem.sets ?? 0}
                    />
                    <TextInput
                        label="Reps Target"
                        onChange={(e) => updateField('reps', e.currentTarget.value)}
                        placeholder="e.g. 8-12"
                        size="sm"
                        styles={{
                            label: {
                                color: 'var(--mantine-color-gray-8)',
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                            },
                        }}
                        value={editedItem.reps || ''}
                    />
                    <NumberInput
                        label="Weight Target"
                        min={0}
                        onChange={(value) => updateField('weight', Number(value) || 0)}
                        placeholder="e.g. 60"
                        size="sm"
                        styles={{
                            label: {
                                color: 'var(--mantine-color-gray-8)',
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                            },
                        }}
                        value={editedItem.weight ?? 0}
                    />
                    <NumberInput
                        label="Rest (seconds)"
                        max={3600}
                        min={0}
                        onChange={(value) => updateField('rest_seconds', Number(value) || 0)}
                        size="sm"
                        styles={{
                            label: {
                                color: 'var(--mantine-color-gray-8)',
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                            },
                        }}
                        value={editedItem.rest_seconds}
                    />
                </Group>
            )}

            {['food', 'recipe'].includes(editedItem.content?.type || '') && (
                <Group grow>
                    <NumberInput
                        label="Quantity"
                        max={10000}
                        min={0}
                        onChange={(value) => updateField('quantity', Number(value) || 0)}
                        size="sm"
                        styles={{
                            label: {
                                color: 'var(--mantine-color-gray-8)',
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                            },
                        }}
                        value={editedItem.quantity ?? 0}
                    />
                    <TextInput
                        label="Unit"
                        onChange={(e) => updateField('unit', e.currentTarget.value)}
                        placeholder="g / ml / cup"
                        size="sm"
                        styles={{
                            label: {
                                color: 'var(--mantine-color-gray-8)',
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                            },
                        }}
                        value={editedItem.unit || ''}
                    />
                </Group>
            )}

            <Switch
                checked={editedItem.is_optional || false}
                label="Optional Item"
                onChange={(e) => updateField('is_optional', e.currentTarget.checked)}
                size="sm"
            />

            <Textarea
                autosize
                label="Custom Instructions"
                maxRows={4}
                minRows={2}
                onChange={(event) => updateField('custom_instructions', event.target.value)}
                placeholder="Add specific instructions for this exercise..."
                size="sm"
                styles={{
                    label: {
                        color: 'var(--mantine-color-gray-8)',
                        fontWeight: 600,
                        marginBottom: 'var(--ce-size-2xs)',
                    },
                }}
                value={editedItem.custom_instructions || ''}
            />

            <Group
                gap={'xs'}
                justify="flex-end"
            >
                <Button
                    color="gray"
                    onClick={onCancel}
                    size="sm"
                    variant="subtle"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    size="sm"
                >
                    Save Changes
                </Button>
            </Group>
        </Stack>
    );
}
