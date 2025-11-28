import {ActionIcon, Button, Loader, Modal, NumberInput, Stack, Text} from '@mantine/core';
import {IconMinus, IconPlus, IconTrash} from '@tabler/icons-react';
import {useCallback, useEffect, useState} from 'react';

import {PlannedSet} from '@/services/workout_elements';

import classes from './styles.module.css';

type SetData = {
    position: number;
    reps_min: null | number;
    reps_max: null | number;
    rest_seconds: null | number;
};

interface SetConfigModalProps {
    opened: boolean;
    onClose: () => void;
    exerciseName: string;
    initialSets: PlannedSet[];
    onSave: (sets: SetData[]) => Promise<void>;
    onDelete: () => void;
}

const SetConfigModal = ({opened, onClose, exerciseName, initialSets, onSave, onDelete}: SetConfigModalProps) => {
    const [sets, setSets] = useState<SetData[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Reset sets when modal opens
    useEffect(() => {
        if (opened) {
            setSets(
                initialSets.map((s) => ({
                    position: s.position,
                    reps_min: s.reps_min,
                    reps_max: s.reps_max,
                    rest_seconds: s.rest_seconds,
                })),
            );
        }
    }, [opened, initialSets]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(sets);
        } finally {
            setIsSaving(false);
        }
    };

    const addSet = () => {
        const lastSet = sets[sets.length - 1];
        setSets([
            ...sets,
            {
                position: sets.length + 1,
                reps_min: lastSet?.reps_min ?? 8,
                reps_max: lastSet?.reps_max ?? 12,
                rest_seconds: lastSet?.rest_seconds ?? 60,
            },
        ]);
    };

    const removeSet = (index: number) => {
        if (sets.length <= 1) return;
        const newSets = sets.filter((_, i) => i !== index).map((s, i) => ({...s, position: i + 1}));
        setSets(newSets);
    };

    const updateSet = (index: number, field: keyof SetData, value: null | number) => {
        const newSets = [...sets];
        newSets[index] = {...newSets[index], [field]: value};
        setSets(newSets);
    };

    return (
        <Modal
            centered
            onClose={onClose}
            opened={opened}
            padding={0}
            radius="lg"
            size="md"
            title=""
            withCloseButton={false}
        >
            <div className={classes.setModal}>
                {/* Header */}
                <div className={classes.setModalHeader}>
                    <Text className={classes.setModalTitle}>{exerciseName}</Text>
                    <Text className={classes.setModalSubtitle}>Configure sets</Text>
                </div>

                {/* Sets List */}
                <Stack gap="sm">
                    {sets.map((set, index) => (
                        <div
                            className={classes.setRow}
                            key={index}
                        >
                            <div className={classes.setNumber}>{set.position}</div>
                            <div className={classes.setInputGroup}>
                                <div className={classes.setInput}>
                                    <Text className={classes.setInputLabel}>Min Reps</Text>
                                    <NumberInput
                                        disabled={isSaving}
                                        min={1}
                                        onChange={(val) => updateSet(index, 'reps_min', val === '' ? null : Number(val))}
                                        placeholder="8"
                                        size="xs"
                                        value={set.reps_min ?? ''}
                                    />
                                </div>
                                <div className={classes.setInput}>
                                    <Text className={classes.setInputLabel}>Max Reps</Text>
                                    <NumberInput
                                        disabled={isSaving}
                                        min={1}
                                        onChange={(val) => updateSet(index, 'reps_max', val === '' ? null : Number(val))}
                                        placeholder="12"
                                        size="xs"
                                        value={set.reps_max ?? ''}
                                    />
                                </div>
                                <div className={classes.setInput}>
                                    <Text className={classes.setInputLabel}>Rest (s)</Text>
                                    <NumberInput
                                        disabled={isSaving}
                                        min={0}
                                        onChange={(val) =>
                                            updateSet(index, 'rest_seconds', val === '' ? null : Number(val))
                                        }
                                        placeholder="60"
                                        size="xs"
                                        step={15}
                                        value={set.rest_seconds ?? ''}
                                    />
                                </div>
                            </div>
                            <ActionIcon
                                color="red"
                                disabled={sets.length <= 1 || isSaving}
                                onClick={() => removeSet(index)}
                                size="sm"
                                variant="subtle"
                            >
                                <IconMinus size={14} />
                            </ActionIcon>
                        </div>
                    ))}

                    {/* Add Set Button */}
                    <button
                        className={classes.addSetButton}
                        disabled={isSaving}
                        onClick={addSet}
                        type="button"
                    >
                        <IconPlus
                            color="var(--mantine-color-gray-5)"
                            size={16}
                        />
                        <Text
                            c="dimmed"
                            size="xs"
                        >
                            Add Set
                        </Text>
                    </button>
                </Stack>

                {/* Actions */}
                <div className={classes.setModalActions}>
                    <Button
                        className={classes.setModalRemove}
                        color="red"
                        disabled={isSaving}
                        leftSection={<IconTrash size={16} />}
                        onClick={() => {
                            onDelete();
                            onClose();
                        }}
                        size="md"
                        variant="subtle"
                    >
                        Remove
                    </Button>

                    <Button
                        color="brand"
                        disabled={isSaving || sets.length === 0}
                        onClick={handleSave}
                        radius="lg"
                        size="md"
                    >
                        {isSaving ? (
                            <Loader
                                color="white"
                                size="xs"
                            />
                        ) : (
                            'Save'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SetConfigModal;
