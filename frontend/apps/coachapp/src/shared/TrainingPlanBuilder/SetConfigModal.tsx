import {ActionIcon, Button, Drawer, Group, Loader, Modal, NumberInput, Select, Text, TextInput} from '@mantine/core';
import {useMediaQuery} from '@mantine/hooks';
import {CaretDownIcon, CopyIcon, PlusIcon, TrashIcon, XIcon} from '@phosphor-icons/react';
import {useEffect, useState} from 'react';
import {Controller, useFieldArray, useForm} from 'react-hook-form';

import {type DistanceUnit, type LoadUnit, type SetType} from '@/services/training_plans/training_plans_definition';
import {PlannedSet} from '@/services/workout_elements';

import classes from './SetConfigModal.module.css';

type SetData = {
    target_reps: null | string;
    load_value: null | number;
    load_unit: LoadUnit;
    intensity_target: null | string;
    rest_seconds: null | number;
    notes: null | string;
    tempo: null | string;
    duration_seconds: null | number;
    distance_value: null | number;
    distance_unit: DistanceUnit;
    set_type: SetType;
};

type FormValues = {
    sets: SetData[];
    globalUnit: LoadUnit;
};

// Options for load type dropdown
const load_unit_OPTIONS = [
    {value: 'kg', label: 'kg'},
    {value: 'lbs', label: 'lbs'},
    {value: 'bodyweight', label: 'BW'},
    {value: 'percent_1rm', label: '% 1RM'},
    {value: 'rpe', label: 'RPE'},
    {value: 'none', label: '—'},
];

// Options for distance unit dropdown
const DISTANCE_UNIT_OPTIONS = [
    {value: 'meters', label: 'm'},
    {value: 'km', label: 'km'},
    {value: 'yards', label: 'yds'},
    {value: 'miles', label: 'mi'},
    {value: 'none', label: '—'},
];

const createDefaultSet = (globalUnit: LoadUnit, copyFrom?: SetData): SetData => ({
    target_reps: copyFrom?.target_reps ?? '12',
    load_value: copyFrom?.load_value ?? null,
    load_unit: globalUnit,
    intensity_target: copyFrom?.intensity_target ?? null,
    rest_seconds: copyFrom?.rest_seconds ?? 60,
    notes: copyFrom?.notes ?? null,
    tempo: copyFrom?.tempo ?? null,
    duration_seconds: copyFrom?.duration_seconds ?? null,
    distance_value: copyFrom?.distance_value ?? null,
    distance_unit: copyFrom?.distance_unit ?? 'none',
    set_type: copyFrom?.set_type ?? 'working',
});

interface SetConfigModalProps {
    exerciseName: string;
    initialSets: PlannedSet[];
    onClose: () => void;
    onDelete: () => void;
    onSave: (sets: SetData[]) => Promise<void>;
    opened: boolean;
}

const SetConfigModal = ({opened, onClose, exerciseName, initialSets, onSave, onDelete}: SetConfigModalProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const [expandedSet, setExpandedSet] = useState<null | number>(null);
    const isDesktop = useMediaQuery('(min-width: 768px)');

    const {control, handleSubmit, watch, setValue, reset} = useForm<FormValues>({
        defaultValues: {
            sets: [],
            globalUnit: 'kg',
        },
    });

    const {fields, append, insert, remove} = useFieldArray({
        control,
        name: 'sets',
    });

    const globalUnit = watch('globalUnit');
    const sets = watch('sets');

    // Reset form when modal opens
    useEffect(() => {
        if (opened) {
            const initialGlobalUnit = initialSets[0]?.load_unit || 'kg';
            const mappedSets: SetData[] = initialSets.map((s) => ({
                target_reps: s.target_reps,
                load_value: s.load_value,
                load_unit: s.load_unit || initialGlobalUnit,
                intensity_target: s.intensity_target,
                rest_seconds: s.rest_seconds,
                set_type: s.set_type || 'working',
                notes: s.notes,
                tempo: s.tempo ?? null,
                duration_seconds: s.duration_seconds ?? null,
                distance_value: s.distance_value ?? null,
                distance_unit: s.distance_unit ?? 'none',
            }));

            reset({
                sets: mappedSets,
                globalUnit: initialGlobalUnit,
            });

            setExpandedSet(null);
        }
    }, [opened, initialSets, reset]);

    const onSubmit = async (data: FormValues) => {
        setIsSaving(true);
        try {
            await onSave(data.sets);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGlobalUnitChange = (val: LoadUnit) => {
        setValue('globalUnit', val);
        // Update all sets to use the new unit
        sets.forEach((_, index) => {
            setValue(`sets.${index}.load_unit`, val);
        });
    };

    const addSet = () => {
        const lastSet = sets[sets.length - 1];
        const newSet = createDefaultSet(globalUnit, lastSet);
        append(newSet);
    };

    const duplicateSet = (index: number) => {
        const setToCopy = sets[index];
        if (!setToCopy) return;
        const newSet = createDefaultSet(globalUnit, setToCopy);
        insert(index + 1, newSet);
    };

    const removeSet = (index: number) => {
        if (fields.length <= 1) return;
        remove(index);
        if (expandedSet === index) setExpandedSet(null);
    };

    // Modal content - shared between Drawer and Modal
    const modalContent = (
        <form onSubmit={handleSubmit(onSubmit)}>
            {/* Header */}
            <div className={classes.header}>
                <div className={classes.headerContent}>
                    <Text className={classes.title}>{exerciseName}</Text>
                    <Text className={classes.subtitle}>
                        {fields.length} {fields.length === 1 ? 'set' : 'sets'}
                    </Text>
                </div>
                <Group
                    gap="xs"
                    wrap="nowrap"
                >
                    <Select
                        allowDeselect={false}
                        data={load_unit_OPTIONS}
                        onChange={(val) => handleGlobalUnitChange((val as LoadUnit) || 'none')}
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
                    {fields.map((field, index) => {
                        const isExpanded = expandedSet === index;

                        return (
                            <div
                                className={`${classes.setCard} ${isExpanded ? classes.setCardExpanded : ''}`}
                                key={field.id}
                            >
                                {/* Set Row - Inline Editing */}
                                <div
                                    className={classes.setHeader}
                                    style={{cursor: 'default', padding: '12px'}}
                                >
                                    <div className={classes.setNumber}>{index + 1}</div>

                                    <div style={{flex: 1, display: 'flex', gap: '8px', alignItems: 'center'}}>
                                        <Controller
                                            control={control}
                                            name={`sets.${index}.target_reps`}
                                            render={({field: {value, onChange}}) => (
                                                <TextInput
                                                    disabled={isSaving}
                                                    onChange={(e) => onChange(e.target.value || null)}
                                                    placeholder="Reps"
                                                    size="sm"
                                                    style={{flex: 1}}
                                                    value={value ?? ''}
                                                />
                                            )}
                                        />
                                        <Text
                                            c="dimmed"
                                            size="sm"
                                        >
                                            x
                                        </Text>
                                        <Controller
                                            control={control}
                                            name={`sets.${index}.load_value`}
                                            render={({field: {value, onChange}}) => (
                                                <NumberInput
                                                    disabled={
                                                        isSaving || globalUnit === 'bodyweight' || globalUnit === 'none'
                                                    }
                                                    min={0}
                                                    onChange={(val) => onChange(val === '' ? null : Number(val))}
                                                    placeholder={globalUnit === 'bodyweight' ? 'BW' : 'Load'}
                                                    rightSection={
                                                        <Text
                                                            c="dimmed"
                                                            pr={4}
                                                            size="xs"
                                                        >
                                                            {
                                                                load_unit_OPTIONS.find((o) => o.value === globalUnit)
                                                                    ?.label
                                                            }
                                                        </Text>
                                                    }
                                                    rightSectionWidth={40}
                                                    size="sm"
                                                    style={{flex: 1}}
                                                    value={value ?? ''}
                                                />
                                            )}
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
                                        {/* Secondary Row: Rest */}
                                        <div className={classes.inputRow}>
                                            <div className={classes.inputField}>
                                                <Text className={classes.inputLabel}>Rest (seconds)</Text>
                                                <Controller
                                                    control={control}
                                                    name={`sets.${index}.rest_seconds`}
                                                    render={({field: {value, onChange}}) => (
                                                        <NumberInput
                                                            disabled={isSaving}
                                                            min={0}
                                                            onChange={(val) =>
                                                                onChange(val === '' ? null : Number(val))
                                                            }
                                                            placeholder="60"
                                                            size="md"
                                                            step={15}
                                                            value={value ?? ''}
                                                        />
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Extra Row: Tempo & Intensity */}
                                        <div className={classes.inputRow}>
                                            <div className={classes.inputField}>
                                                <Text className={classes.inputLabel}>Tempo</Text>
                                                <Controller
                                                    control={control}
                                                    name={`sets.${index}.tempo`}
                                                    render={({field: {value, onChange}}) => (
                                                        <TextInput
                                                            disabled={isSaving}
                                                            onChange={(e) => onChange(e.target.value || null)}
                                                            placeholder="e.g. 3010"
                                                            size="md"
                                                            value={value ?? ''}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div className={classes.inputField}>
                                                <Text className={classes.inputLabel}>Intensity</Text>
                                                <Controller
                                                    control={control}
                                                    name={`sets.${index}.intensity_target`}
                                                    render={({field: {value, onChange}}) => (
                                                        <TextInput
                                                            disabled={isSaving}
                                                            onChange={(e) => onChange(e.target.value || null)}
                                                            placeholder="e.g. RPE 8"
                                                            size="md"
                                                            value={value ?? ''}
                                                        />
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {/* Extra Row: Duration & Distance */}
                                        <div className={classes.inputRow}>
                                            <div className={classes.inputField}>
                                                <Text className={classes.inputLabel}>Duration (sec)</Text>
                                                <Controller
                                                    control={control}
                                                    name={`sets.${index}.duration_seconds`}
                                                    render={({field: {value, onChange}}) => (
                                                        <NumberInput
                                                            disabled={isSaving}
                                                            min={0}
                                                            onChange={(val) =>
                                                                onChange(val === '' ? null : Number(val))
                                                            }
                                                            placeholder="Seconds"
                                                            size="md"
                                                            value={value ?? ''}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div className={classes.inputField}>
                                                <Text className={classes.inputLabel}>Distance</Text>
                                                <div style={{display: 'flex', gap: 8}}>
                                                    <Controller
                                                        control={control}
                                                        name={`sets.${index}.distance_value`}
                                                        render={({field: {value, onChange}}) => (
                                                            <NumberInput
                                                                disabled={isSaving}
                                                                min={0}
                                                                onChange={(val) =>
                                                                    onChange(val === '' ? null : Number(val))
                                                                }
                                                                placeholder="Dist"
                                                                size="md"
                                                                style={{flex: 1}}
                                                                value={value ?? ''}
                                                            />
                                                        )}
                                                    />
                                                    <Controller
                                                        control={control}
                                                        name={`sets.${index}.distance_unit`}
                                                        render={({field: {value, onChange}}) => (
                                                            <Select
                                                                data={DISTANCE_UNIT_OPTIONS}
                                                                disabled={isSaving}
                                                                onChange={(val) =>
                                                                    onChange((val as DistanceUnit) || 'none')
                                                                }
                                                                size="md"
                                                                style={{width: 80}}
                                                                value={value}
                                                            />
                                                        )}
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
                                                type="button"
                                                variant="subtle"
                                            >
                                                Duplicate
                                            </Button>
                                            <Button
                                                color="red"
                                                disabled={fields.length <= 1 || isSaving}
                                                leftSection={<TrashIcon size={16} />}
                                                onClick={() => removeSet(index)}
                                                size="xs"
                                                type="button"
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
                    disabled={isSaving || fields.length === 0}
                    fullWidth
                    radius="lg"
                    size="md"
                    type="submit"
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
        </form>
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
