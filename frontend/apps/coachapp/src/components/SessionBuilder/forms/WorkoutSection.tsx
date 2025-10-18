import {
    ActionIcon,
    Badge,
    Button,
    Collapse,
    Group,
    NumberInput,
    Paper,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {modals} from '@mantine/modals';
import {BarbellIcon, CaretDownIcon, CaretRightIcon, PlusIcon, TrashIcon} from '@phosphor-icons/react';
import {useState} from 'react';
import {Controller, useFieldArray, UseFormReturn} from 'react-hook-form';

import {Content} from '@/api/contents';

import ContentSelect from '../../ContentSelect';
import {SessionFormValues} from '../sessionForm';
import WorkoutExercise from './WorkoutExercise';

interface WorkoutSectionProps {
    contentsMap: Record<string, Content>;
    control: UseFormReturn<SessionFormValues>['control'];
    isExpanded: boolean;
    onExpand: () => void;
    onRemove: () => void;
    sectionIndex: number;
    setContentsMap: React.Dispatch<React.SetStateAction<Record<string, Content>>>;
}

/**
 * WorkoutSection - A section within a workout (e.g., Warm Up, Main Set, Cool Down)
 *
 * Features:
 * - Collapsible with summary view
 * - Section title and target rounds configuration
 * - List of exercises within the section
 * - Add/remove exercises
 * - Delete section
 * - Single-edit-mode: Only one exercise expanded at a time
 */
export default function WorkoutSection({
    control,
    sectionIndex,
    onRemove,
    isExpanded,
    onExpand,
    contentsMap,
    setContentsMap,
}: WorkoutSectionProps) {
    const [expandedExerciseIndex, setExpandedExerciseIndex] = useState<null | number>(0);
    const {
        fields: exercises,
        append: addExercise,
        remove: removeExercise,
    } = useFieldArray({
        control,
        name: `definition.sections.${sectionIndex}.exercises`,
    });

    // Get section data
    const sectionType = control._formValues.definition?.sections?.[sectionIndex]?.type;
    const isHiddenSection = sectionType === 'hidden';

    // Helper to get user-facing section type label
    // Future: Map different types to different labels (e.g., 'circuit' → 'Circuit', 'amrap' → 'AMRAP')
    const getSectionTypeLabel = (type?: string) => {
        if (type === 'hidden') return 'Section';
        // For now, all visible sections are supersets
        return 'Superset';
    };

    const sectionTypeLabel = getSectionTypeLabel(sectionType);
    const sectionTitle =
        control._formValues.definition?.sections?.[sectionIndex]?.title || `${sectionTypeLabel} ${sectionIndex + 1}`;
    const targetRounds = control._formValues.definition?.sections?.[sectionIndex]?.target_rounds || 0;

    // For hidden sections, render only the exercises without the section wrapper
    if (isHiddenSection) {
        // Don't render anything if there are no exercises
        if (exercises.length === 0) {
            return null;
        }

        return (
            <Stack gap="xs">
                {exercises.map((exercise, exerciseIndex) => (
                    <WorkoutExercise
                        contentsMap={contentsMap}
                        control={control}
                        exerciseIndex={exerciseIndex}
                        isExpanded={expandedExerciseIndex === exerciseIndex}
                        key={exercise.id}
                        onExpand={() => {
                            setExpandedExerciseIndex(expandedExerciseIndex === exerciseIndex ? null : exerciseIndex);
                        }}
                        onRemove={() => {
                            removeExercise(exerciseIndex);
                            if (expandedExerciseIndex === exerciseIndex) {
                                setExpandedExerciseIndex(Math.max(0, exerciseIndex - 1));
                            }
                        }}
                        sectionIndex={sectionIndex}
                        setContentsMap={setContentsMap}
                    />
                ))}
            </Stack>
        );
    }

    return (
        <Paper
            p={0}
            radius="xl"
            shadow="xs"
            style={{
                border: '1px solid var(--mantine-color-gray-3)',
                transition: 'all 0.2s ease',
                overflow: 'hidden',
            }}
        >
            {/* Section Header - Always Visible */}
            <Group
                align="center"
                gap="sm"
                justify="space-between"
                onClick={(e) => {
                    // Prevent collapse if clicking on menu or its children
                    if (!(e.target as HTMLElement).closest('[data-prevent-collapse]')) {
                        onExpand();
                    }
                }}
                p="xs"
                style={{
                    cursor: 'pointer',
                    backgroundColor: isExpanded ? 'var(--mantine-color-blue-0)' : 'var(--mantine-color-gray-0)',
                    borderBottom: isExpanded ? '1px solid var(--mantine-color-gray-3)' : 'none',
                    transition: 'background-color 0.2s ease',
                }}
                wrap="nowrap"
            >
                <Group
                    gap="sm"
                    style={{flex: 1, minWidth: 0}}
                >
                    {/* Expand/Collapse Icon */}
                    <ActionIcon
                        color={isExpanded ? 'blue' : 'gray'}
                        radius="xl"
                        size="sm"
                        variant="subtle"
                    >
                        {isExpanded ? <CaretDownIcon size={16} /> : <CaretRightIcon size={16} />}
                    </ActionIcon>

                    {/* Section Info */}
                    <div style={{flex: 1, minWidth: 0}}>
                        <Text
                            fw={600}
                            lineClamp={1}
                            size="sm"
                        >
                            {sectionTitle || `Untitled ${sectionTypeLabel}`}
                        </Text>
                        <Group
                            gap="xs"
                            mt={2}
                        >
                            <Badge
                                color="gray"
                                size="xs"
                                variant="dot"
                            >
                                {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
                            </Badge>
                            {targetRounds > 0 && (
                                <Badge
                                    color="blue"
                                    size="xs"
                                    variant="dot"
                                >
                                    {targetRounds} {targetRounds === 1 ? 'round' : 'rounds'}
                                </Badge>
                            )}
                        </Group>
                    </div>
                </Group>

                {/* Action Buttons */}
                <Group
                    gap="xs"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Tooltip label={`Delete ${sectionTypeLabel}`}>
                        <ActionIcon
                            color="red"
                            onClick={onRemove}
                            radius="xl"
                            size="sm"
                            variant="light"
                        >
                            <TrashIcon size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            {/* Section Content - Collapsible */}
            <Collapse in={isExpanded}>
                <Stack
                    gap="sm"
                    p="sm"
                    pt="md"
                >
                    {/* Section Configuration */}
                    <SimpleGrid
                        cols={{base: 1, sm: 2}}
                        spacing="xs"
                    >
                        <TextInput
                            {...control.register(`definition.sections.${sectionIndex}.title`)}
                            label="Title"
                            placeholder="e.g., Warm Up, Upper Body"
                            size="xs"
                        />
                        <Controller
                            control={control}
                            name={`definition.sections.${sectionIndex}.target_rounds`}
                            render={({field}) => (
                                <NumberInput
                                    label="Rounds"
                                    min={0}
                                    onBlur={field.onBlur}
                                    onChange={(value) => field.onChange(typeof value === 'number' ? value : undefined)}
                                    placeholder="0 = no limit"
                                    ref={field.ref}
                                    size="xs"
                                    value={field.value ?? undefined}
                                />
                            )}
                        />
                    </SimpleGrid>

                    {/* Exercises List */}
                    <Stack gap="sm">
                        {exercises.map((exercise, exerciseIndex) => (
                            <WorkoutExercise
                                contentsMap={contentsMap}
                                control={control}
                                exerciseIndex={exerciseIndex}
                                isExpanded={expandedExerciseIndex === exerciseIndex}
                                key={exercise.id}
                                onExpand={() => {
                                    // Toggle: if clicking on already expanded exercise, collapse it
                                    setExpandedExerciseIndex(
                                        expandedExerciseIndex === exerciseIndex ? null : exerciseIndex,
                                    );
                                }}
                                onRemove={() => {
                                    removeExercise(exerciseIndex);
                                    // If removing the expanded exercise, expand the previous one or first
                                    if (expandedExerciseIndex === exerciseIndex) {
                                        setExpandedExerciseIndex(Math.max(0, exerciseIndex - 1));
                                    }
                                }}
                                sectionIndex={sectionIndex}
                                setContentsMap={setContentsMap}
                            />
                        ))}

                        {exercises.length === 0 && (
                            <Paper
                                p="lg"
                                radius="xl"
                                style={{
                                    backgroundColor: 'var(--mantine-color-gray-0)',
                                    border: '2px dashed var(--mantine-color-gray-3)',
                                }}
                            >
                                <Stack
                                    align="center"
                                    gap="xs"
                                >
                                    <BarbellIcon
                                        size={32}
                                        style={{opacity: 0.25}}
                                        weight="duotone"
                                    />
                                    <Text
                                        c="dimmed"
                                        fw={500}
                                        size="xs"
                                        ta="center"
                                    >
                                        Add exercises
                                    </Text>
                                </Stack>
                            </Paper>
                        )}

                        {/* Add Exercise Button */}
                        <Button
                            fullWidth
                            leftSection={<PlusIcon size={14} />}
                            mt="sm"
                            onClick={() => {
                                modals.open({
                                    children: (
                                        <ContentSelect
                                            onComplete={(ids, selectedContents) => {
                                                if (ids.length && selectedContents) {
                                                    // Store the selected content details
                                                    const newContentsMap = {...contentsMap};
                                                    selectedContents.forEach((content) => {
                                                        newContentsMap[content.id] = content;
                                                    });
                                                    setContentsMap(newContentsMap);

                                                    addExercise({
                                                        content_id: ids[0],
                                                        each_side: false,
                                                        id: `exercise-${Date.now()}`,
                                                        sets: [],
                                                        tempo: '',
                                                    });
                                                    // Expand the newly added exercise
                                                    setExpandedExerciseIndex(exercises.length);
                                                }
                                                modals.closeAll();
                                            }}
                                        />
                                    ),
                                    centered: true,
                                    id: 'select-exercise',
                                    padding: 'lg',
                                    radius: 'md',
                                    size: 'xl',
                                    styles: {
                                        body: {
                                            height: '80vh',
                                            maxHeight: '800px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            padding: 0,
                                        },
                                        content: {
                                            height: 'auto',
                                        },
                                        header: {
                                            display: 'none',
                                        },
                                    },
                                    title: 'Select Exercise',
                                });
                            }}
                            radius="xl"
                            size="xs"
                            variant={exercises.length === 0 ? 'filled' : 'light'}
                        >
                            {exercises.length === 0 ? 'Add First Exercise' : 'Add Exercise'}
                        </Button>
                    </Stack>
                </Stack>
            </Collapse>
        </Paper>
    );
}
