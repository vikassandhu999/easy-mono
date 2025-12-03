import {ActionIcon, Button, Drawer, Group, Loader, Modal, NumberInput, Select, Text, TextInput} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {CaretDownIcon, CopyIcon, PlusIcon, TrashIcon, XIcon} from '@phosphor-icons/react';
import {useEffect, useState} from 'react';

import {type LoadType, type SetType} from '@/services/training_plans/training_plans_definition';
import {PlannedSet} from '@/services/workout_elements';

import classes from './SetConfigModal.module.css';

type SetData = {
    position: number;
    target_reps: null | string; // "10", "8-12", "AMRAP"
    load_value: null | number;
    load_type: LoadType;
    intensity_target: null | string; // "RPE 8", "Zone 2"
    rest_seconds: null | number;
    set_type: SetType;
    notes: null | string;
    tempo: null | string;
    duration_seconds: null | number;
    distance_value: null | number;
    distance_unit: string;
};

// Options for load type dropdown
const LOAD_TYPE_OPTIONS = [
    {value: 'absolute_kg', label: 'kg'},
    {value: 'absolute_lbs', label: 'lbs'},
    {value: 'bodyweight', label: 'BW'},
    {value: 'percent_1rm', label: '% 1RM'},
    {value: 'rpe', label: 'RPE'},
    {value: 'none', label: '—'},
];

// Options for distance unit dropdown
const DISTANCE_UNIT_OPTIONS = [
    {value: 'm', label: 'm'},
    {value: 'km', label: 'km'},
    {value: 'yards', label: 'yds'},
    {value: 'miles', label: 'mi'},
    {value: 'none', label: '—'},
];

// Options for set type dropdown
const SET_TYPE_OPTIONS = [
    {value: 'working', label: 'Working'},
    {value: 'warmup', label: 'Warmup'},
    {value: 'dropset', label: 'Drop Set'},
    {value: 'backoff', label: 'Back-off'},
    {value: 'amrap', label: 'AMRAP'},
    {value: 'emom', label: 'EMOM'},
];

interface SetConfigModalProps {
    exerciseName: string;
    initialSets: PlannedSet[];
    onClose: () => void;
    onDelete: () => void;
    onSave: (sets: SetData[]) => Promise<void>;
    opened: boolean;
}

const SetConfigModal = ({opened, onClose, exerciseName, initialSets, onSave, onDelete}: SetConfigModalProps) => {
    const [sets, setSets] = useState<SetData[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedSet, setExpandedSet] = useState<null | number>(null);
    const [globalUnit, setGlobalUnit] = useState<LoadType>('absolute_kg');
    const isDesktop = useMediaQuery('(min-width: 768px)');

    // Reset sets when modal opens
    useEffect(() => {
        if (opened) {
            const mappedSets = initialSets.map((s) => ({
                position: s.position,
                target_reps: s.target_reps,
                load_value: s.load_value,
                load_type: s.load_type || 'none',
                intensity_target: s.intensity_target,
                rest_seconds: s.rest_seconds,
                set_type: s.set_type || 'working',
                notes: s.notes,
                tempo: (s as any).tempo ?? null,
                duration_seconds: (s as any).duration_seconds ?? null,
                distance_value: (s as any).distance_value ?? null,
                distance_unit: (s as any).distance_unit ?? 'none',
            }));
            setSets(mappedSets);

            // Initialize global unit from first set if available
            if (mappedSets.length > 0 && mappedSets[0]?.load_type) {
                setGlobalUnit(mappedSets[0].load_type);
            }

            setExpandedSet(null);
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

    const handleGlobalUnitChange = (val: LoadType) => {
        setGlobalUnit(val);
        // Update all sets to use the new unit
        setSets((prev) => prev.map((s) => ({...s, load_type: val})));
    };

    const createDefaultSet = (position: number, copyFrom?: SetData): SetData => ({
        position,
        target_reps: copyFrom?.target_reps ?? '8-12',
        load_value: copyFrom?.load_value ?? null,
        load_type: globalUnit,
        intensity_target: copyFrom?.intensity_target ?? null,
        rest_seconds: copyFrom?.rest_seconds ?? 60,
        set_type: copyFrom?.set_type ?? 'working',
        notes: null,
        tempo: copyFrom?.tempo ?? null,
        duration_seconds: copyFrom?.duration_seconds ?? null,
        distance_value: copyFrom?.distance_value ?? null,
        distance_unit: copyFrom?.distance_unit ?? 'none',
    });

    const addSet = () => {
        const lastSet = sets[sets.length - 1];
        const newSet = createDefaultSet(sets.length + 1, lastSet);
        setSets([...sets, newSet]);
        // Don't auto-expand, as inline editing is available
    };

    const duplicateSet = (index: number) => {
        const setToCopy = sets[index];
        if (!setToCopy) return;

        const newSets = [...sets];
        const newSet = createDefaultSet(index + 2, setToCopy);
        newSets.splice(index + 1, 0, newSet);

        // Reposition all sets
        setSets(newSets.map((s, i) => ({...s, position: i + 1})));
    };

    const removeSet = (index: number) => {
        if (sets.length <= 1) return;
        const newSets = sets.filter((_, i) => i !== index).map((s, i) => ({...s, position: i + 1}));
        setSets(newSets);
        if (expandedSet === index) setExpandedSet(null);
    };

    const updateSet = <K extends keyof SetData>(index: number, field: K, value: SetData[K]) => {
        const newSets = [...sets];
        const currentSet = newSets[index];
        if (currentSet) {
            newSets[index] = {...currentSet, [field]: value};
            setSets(newSets);
        }
    };

    // Modal content - shared between Drawer and Modal
    const modalContent = (
        <>
            {/* Header */}
            <div className={classes.header}>
                <div className={classes.headerContent}>
                    <Text className={classes.title}>{exerciseName}</Text>
                    <Text className={classes.subtitle}>
                        {sets.length} {sets.length === 1 ? 'set' : 'sets'}
                    </Text>
                </div>
                <Group
                    gap="xs"
                    wrap="nowrap"
                >
                    <Select
                        allowDeselect={false}
                        data={LOAD_TYPE_OPTIONS}
                        onChange={(val) => handleGlobalUnitChange((val as LoadType) || 'none')}
                        size="xs"
                        value={globalUnit}
                        w={80}
                    />
                    <ActionIcon
                        aria-label="Delete Exercise"
                        color="red"
                        onClick={() => {
                            if (confirm('Are you sure you want to remove this exercise?')) {
                                onDelete();
                                onClose();
                            }
                        }}
                        radius="xl"
                        size="lg"
                        variant="subtle"
                    >
                        <TrashIcon size={20} />
                    </ActionIcon>
                    <div style={{width: 1, height: 24, background: 'var(--mantine-color-gray-3)'}} />
                    <ActionIcon
                        aria-label="Close"
                        onClick={onClose}
                        radius="xl"
                        size="lg"
                        variant="subtle"
                    >
                        <XIcon size={20} />
                    </ActionIcon>
                </Group>
            </div>

            {/* Scrollable Sets List */}
            <div className={classes.content}>
                <div className={classes.setsList}>
                    {sets.map((set, index) => {
                        const isExpanded = expandedSet === index;

                        return (
                            <div
                                className={`${classes.setCard} ${isExpanded ? classes.setCardExpanded : ''}`}
                                key={index}
                            >
                                {/* Set Row - Inline Editing */}
                                <div
                                    className={classes.setHeader}
                                    style={{cursor: 'default', padding: '12px'}}
                                >
                                    <div className={classes.setNumber}>{set.position}</div>

                                    <div style={{flex: 1, display: 'flex', gap: '8px', alignItems: 'center'}}>
                                        <TextInput
                                            disabled={isSaving}
                                            onChange={(e) => updateSet(index, 'target_reps', e.target.value || null)}
                                            placeholder="Reps"
                                            size="sm"
                                            style={{flex: 1}}
                                            value={set.target_reps ?? ''}
                                        />
                                        <Text
                                            c="dimmed"
                                            size="sm"
                                        >
                                            x
                                        </Text>
                                        <NumberInput
                                            disabled={isSaving || globalUnit === 'bodyweight' || globalUnit === 'none'}
                                            min={0}
                                            onChange={(val) =>
                                                updateSet(index, 'load_value', val === '' ? null : Number(val))
                                            }
                                            placeholder={globalUnit === 'bodyweight' ? 'BW' : 'Load'}
                                            rightSection={
                                                <Text
                                                    c="dimmed"
                                                    pr={4}
                                                    size="xs"
                                                >
                                                    {LOAD_TYPE_OPTIONS.find((o) => o.value === globalUnit)?.label}
                                                </Text>
                                            }
                                            rightSectionWidth={40}
                                            size="sm"
                                            style={{flex: 1}}
                                            value={set.load_value ?? ''}
                                        />
                                    </div>

                                    <ActionIcon
                                        color="gray"
                                        onClick={() => setExpandedSet(isExpanded ? null : index)}
                                        variant="subtle"
                                    >
                                        <CaretDownIcon
                                            className={`${classes.expandIcon} ${isExpanded ? classes.expandIconRotated : ''}`}
                                            size={18}
                                        />
                                    </ActionIcon>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className={classes.setBody}>
                                        {/* Secondary Row: Rest & Type */}
                                        <div className={classes.inputRow}>
                                            <div className={classes.inputField}>
                                                <Text className={classes.inputLabel}>Rest (seconds)</Text>
                                                <NumberInput
                                                    disabled={isSaving}
                                                    min={0}
                                                    onChange={(val) =>
                                                        updateSet(
                                                            index,
                                                            'rest_seconds',
                                                            val === '' ? null : Number(val),
                                                        )
                                                    }
                                                    placeholder="60"
                                                    size="md"
                                                    step={15}
                                                    value={set.rest_seconds ?? ''}
                                                />
                                            </div>
                                            <div className={classes.inputField}>
                                                <Text className={classes.inputLabel}>Set Type</Text>
                                                <Select
                                                    data={SET_TYPE_OPTIONS}
                                                    disabled={isSaving}
                                                    onChange={(val) =>
                                                        updateSet(index, 'set_type', (val as SetType) || 'working')
                                                    }
                                                    size="md"
                                                    value={set.set_type}
                                                />
                                            </div>
                                        </div>

                                        {/* Extra Row: Tempo & Intensity */}
                                        <div className={classes.inputRow}>
                                            <div className={classes.inputField}>
                                                <Text className={classes.inputLabel}>Tempo</Text>
                                                <TextInput
                                                    disabled={isSaving}
                                                    onChange={(e) => updateSet(index, 'tempo', e.target.value || null)}
                                                    placeholder="e.g. 3010"
                                                    size="md"
                                                    value={set.tempo ?? ''}
                                                />
                                            </div>
                                            <div className={classes.inputField}>
                                                <Text className={classes.inputLabel}>Intensity</Text>
                                                <TextInput
                                                    disabled={isSaving}
                                                    onChange={(e) =>
                                                        updateSet(index, 'intensity_target', e.target.value || null)
                                                    }
                                                    placeholder="e.g. RPE 8"
                                                    size="md"
                                                    value={set.intensity_target ?? ''}
                                                />
                                            </div>
                                        </div>

                                        {/* Extra Row: Duration & Distance */}
                                        <div className={classes.inputRow}>
                                            <div className={classes.inputField}>
                                                <Text className={classes.inputLabel}>Duration (sec)</Text>
                                                <NumberInput
                                                    disabled={isSaving}
                                                    min={0}
                                                    onChange={(val) =>
                                                        updateSet(
                                                            index,
                                                            'duration_seconds',
                                                            val === '' ? null : Number(val),
                                                        )
                                                    }
                                                    placeholder="Seconds"
                                                    size="md"
                                                    value={set.duration_seconds ?? ''}
                                                />
                                            </div>
                                            <div className={classes.inputField}>
                                                <Text className={classes.inputLabel}>Distance</Text>
                                                <div style={{display: 'flex', gap: 8}}>
                                                    <NumberInput
                                                        disabled={isSaving}
                                                        min={0}
                                                        onChange={(val) =>
                                                            updateSet(
                                                                index,
                                                                'distance_value',
                                                                val === '' ? null : Number(val),
                                                            )
                                                        }
                                                        placeholder="Dist"
                                                        size="md"
                                                        style={{flex: 1}}
                                                        value={set.distance_value ?? ''}
                                                    />
                                                    <Select
                                                        data={DISTANCE_UNIT_OPTIONS}
                                                        disabled={isSaving}
                                                        onChange={(val) =>
                                                            updateSet(index, 'distance_unit', val || 'none')
                                                        }
                                                        size="md"
                                                        style={{width: 80}}
                                                        value={set.distance_unit}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Set Actions */}
                                        <div className={classes.setActions}>
                                            <Button
                                                color="gray"
                                                disabled={isSaving}
                                                leftSection={<CopyIcon size={16} />}
                                                onClick={() => duplicateSet(index)}
                                                size="xs"
                                                variant="subtle"
                                            >
                                                Duplicate
                                            </Button>
                                            <Button
                                                color="red"
                                                disabled={sets.length <= 1 || isSaving}
                                                leftSection={<TrashIcon size={16} />}
                                                onClick={() => removeSet(index)}
                                                size="xs"
                                                variant="subtle"
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add Set Button */}
                    <button
                        className={classes.addSetButton}
                        disabled={isSaving}
                        onClick={addSet}
                        type="button"
                    >
                        <PlusIcon size={18} />
                        <span>Add Set</span>
                    </button>
                </div>
            </div>

            {/* Footer Actions */}
            <div className={classes.footer}>
                <Button
                    className={classes.saveButton}
                    color="brand"
                    disabled={isSaving || sets.length === 0}
                    fullWidth
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
                        'Save Changes'
                    )}
                </Button>
            </div>
        </>
    );

    // Desktop: Centered Modal
    if (isDesktop) {
        return (
            <Modal
                centered
                classNames={{
                    content: classes.modalContent,
                    body: classes.modalBody,
                }}
                onClose={onClose}
                opened={opened}
                padding={0}
                radius="lg"
                size="lg"
                withCloseButton={false}
            >
                {modalContent}
            </Modal>
        );
    }

    // Mobile: Bottom Sheet Drawer
    return (
        <Drawer
            classNames={{
                content: classes.drawerContent,
                body: classes.drawerBody,
            }}
            onClose={onClose}
            opened={opened}
            padding={0}
            position="bottom"
            radius="lg"
            size="auto"
            withCloseButton={false}
        >
            {modalContent}
        </Drawer>
    );
};

export default SetConfigModal;
