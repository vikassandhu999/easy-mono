import {Button, Group, NumberInput, Stack, Switch, Textarea, TextInput} from '@mantine/core';
import {useState} from 'react';

import {SessionDefItemConfig} from '@/api/session_defs.ts';

interface EditableFieldsProps {
    item: SessionDefItemConfig;
    onCancel: () => void;
    onSave: (updatedItem: SessionDefItemConfig) => void;
}

export default function EditableFields({item, onCancel, onSave}: EditableFieldsProps) {
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
                        max={99}
                        min={0}
                        onChange={(value) => updateField('sets_count', Number(value) || 0)}
                        size="sm"
                        styles={{
                            label: {
                                color: 'var(--mantine-color-gray-8)',
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                            },
                        }}
                        value={editedItem.sets_count}
                    />
                    <TextInput
                        label="Reps Target"
                        onChange={(e) => updateField('reps_target', e.currentTarget.value)}
                        placeholder="e.g. 8-12"
                        size="sm"
                        styles={{
                            label: {
                                color: 'var(--mantine-color-gray-8)',
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                            },
                        }}
                        value={editedItem.reps_target || ''}
                    />
                    <TextInput
                        label="Weight Target"
                        onChange={(e) => updateField('weight_target', e.currentTarget.value)}
                        placeholder="e.g. 60kg / bodyweight / 80%"
                        size="sm"
                        styles={{
                            label: {
                                color: 'var(--mantine-color-gray-8)',
                                fontWeight: 600,
                                marginBottom: 'var(--ce-size-2xs)',
                            },
                        }}
                        value={editedItem.weight_target || ''}
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
                        value={editedItem.quantity}
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
