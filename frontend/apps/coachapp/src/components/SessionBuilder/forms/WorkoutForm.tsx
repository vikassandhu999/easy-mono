import {Button, Divider, Group, Paper, Stack, Text, Textarea, TextInput} from '@mantine/core';
import {modals} from '@mantine/modals';
import {ListBulletsIcon, PlusIcon} from '@phosphor-icons/react';
import {useState} from 'react';
import {Controller, useFieldArray, UseFormReturn} from 'react-hook-form';

import {Content} from '@/store/services/contents';

import ContentSelect from '../../ContentSelect';
import {SessionFormValues} from '../sessionForm';
import WorkoutSection from './WorkoutSection';

interface WorkoutFormProps {
    contentsMap: Record<string, Content>;
    form: UseFormReturn<SessionFormValues>;
    setContentsMap: React.Dispatch<React.SetStateAction<Record<string, Content>>>;
}

/**
 * WorkoutForm - Complete workout session form
 *
 * Manages:
 * - Session name and description
 * - Multiple workout sections
 * - Section and exercise CRUD operations
 * - Single-edit-mode: Only one section expanded at a time
 *
 * Structure:
 * WorkoutForm
 *   └─> WorkoutSection(s)
 *       └─> WorkoutExercise(s)
 *           └─> SetsTable
 */
export default function WorkoutForm({form, contentsMap, setContentsMap}: WorkoutFormProps) {
    const {control} = form;
    const [expandedSectionIndex, setExpandedSectionIndex] = useState<null | number>(0);

    const {
        fields: sections,
        append: addSection,
        remove: removeSection,
    } = useFieldArray({
        control,
        name: 'definition.sections',
    });

    // Helper to open exercise picker and add to hidden section
    const addTopLevelExercise = () => {
        modals.open({
            title: 'Select Exercise',
            centered: true,
            size: 'xl',
            styles: {
                body: {
                    height: '80vh',
                    maxHeight: '800px',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                },
                header: {
                    display: 'none',
                },
            },
            children: (
                <ContentSelect
                    contentType="exercise"
                    onComplete={(selectedIds, selectedContents) => {
                        // Update contents map first
                        if (selectedContents) {
                            const newMap = {...contentsMap};
                            selectedContents.forEach((content) => {
                                newMap[content.id] = content;
                            });
                            setContentsMap(newMap);
                        }

                        // Find or create hidden section at the end
                        let targetSectionIndex = sections.length - 1;
                        const lastSection = control._formValues.definition?.sections?.[targetSectionIndex];
                        const isLastHidden = lastSection?.type === 'hidden' && targetSectionIndex >= 0;

                        // If last section is not hidden, create a new hidden section
                        if (!isLastHidden || sections.length === 0) {
                            addSection({
                                format: 'straight',
                                id: `section-hidden-${Date.now()}`,
                                type: 'hidden',
                                title: '',
                                note: '',
                                target_duration_seconds: 0,
                                target_rounds: 0,
                                exercises: selectedIds.map((contentId) => ({
                                    id: `exercise-${Date.now()}-${Math.random()}`,
                                    content_id: contentId,
                                    each_side: false,
                                    tempo: '',
                                    sets: [],
                                })),
                            });
                            targetSectionIndex = sections.length;
                        } else {
                            // Add to existing hidden section
                            const currentExercises = lastSection?.exercises || [];
                            const newExercises = selectedIds.map((contentId) => ({
                                id: `exercise-${Date.now()}-${Math.random()}`,
                                content_id: contentId,
                                each_side: false,
                                tempo: '',
                                sets: [],
                            }));
                            form.setValue(`definition.sections.${targetSectionIndex}.exercises`, [
                                ...currentExercises,
                                ...newExercises,
                            ]);
                        }

                        // Expand the section where exercises were added
                        setExpandedSectionIndex(targetSectionIndex);
                        modals.closeAll();
                    }}
                />
            ),
        });
    };

    return (
        <Stack gap="md">
            {/* Hidden session type field */}
            <Controller
                control={control}
                name="session_type"
                render={({field}) => (
                    <input
                        {...field}
                        type="hidden"
                        value={field.value}
                    />
                )}
            />

            {/* Session Name */}
            <Controller
                control={control}
                name="name"
                render={({field, fieldState}) => (
                    <TextInput
                        {...field}
                        error={fieldState.error?.message}
                        label="Name"
                        placeholder="Workout name"
                        required
                        size="sm"
                    />
                )}
            />

            {/* Session Description */}
            <Controller
                control={control}
                name="description"
                render={({field, fieldState}) => (
                    <Textarea
                        {...field}
                        autosize
                        error={fieldState.error?.message}
                        label="Description"
                        maxRows={3}
                        minRows={2}
                        placeholder="Optional description"
                        size="sm"
                        value={field.value ?? ''}
                    />
                )}
            />

            <Divider
                label={
                    <Group gap="xs">
                        <ListBulletsIcon
                            size={16}
                            weight="duotone"
                        />
                        <Text
                            fw={600}
                            size="xs"
                            tt="uppercase"
                        >
                            Exercises & Sections
                        </Text>
                    </Group>
                }
                labelPosition="left"
                mt="lg"
            />

            {/* Unified List: Sections and Exercises */}
            <Stack gap="xs">
                {sections.map((section, sectionIndex) => (
                    <WorkoutSection
                        contentsMap={contentsMap}
                        control={control}
                        isExpanded={expandedSectionIndex === sectionIndex}
                        key={section.id}
                        onExpand={() => {
                            setExpandedSectionIndex(expandedSectionIndex === sectionIndex ? null : sectionIndex);
                        }}
                        onRemove={() => {
                            removeSection(sectionIndex);
                            if (expandedSectionIndex === sectionIndex) {
                                setExpandedSectionIndex(Math.max(0, sectionIndex - 1));
                            }
                        }}
                        sectionIndex={sectionIndex}
                        setContentsMap={setContentsMap}
                    />
                ))}

                {/* Empty State */}
                {sections.length === 0 && (
                    <Paper
                        p="xl"
                        radius="xl"
                        style={{
                            backgroundColor: 'var(--mantine-color-gray-0)',
                            border: '2px dashed var(--mantine-color-gray-3)',
                            marginBlock: 'var(--ce-size-lg)',
                        }}
                    >
                        <Stack
                            align="center"
                            gap="md"
                        >
                            <ListBulletsIcon
                                color="var(--mantine-color-gray-5)"
                                size={56}
                                weight="duotone"
                            />
                            <Stack
                                align="center"
                                gap="xs"
                            >
                                <Text
                                    c="dark.6"
                                    fw={600}
                                    size="md"
                                    ta="center"
                                >
                                    Build your workout
                                </Text>
                                <Text
                                    c="dimmed"
                                    maw={300}
                                    size="sm"
                                    ta="center"
                                >
                                    Get started by adding exercises or creating supersets to organize your workout
                                </Text>
                            </Stack>
                        </Stack>
                    </Paper>
                )}

                {/* Action Buttons Row */}
                <Group
                    gap="xs"
                    grow
                    mt={sections.length === 0 ? 'md' : 'sm'}
                >
                    {/* Add Exercise Button - Creates hidden section */}
                    <Button
                        leftSection={<PlusIcon size={14} />}
                        onClick={addTopLevelExercise}
                        radius="xl"
                        size={sections.length === 0 ? 'sm' : 'xs'}
                        variant={sections.length === 0 ? 'light' : 'light'}
                    >
                        Add Exercise
                    </Button>

                    {/* Add Section Button */}
                    <Button
                        color="blue"
                        leftSection={<PlusIcon size={14} />}
                        onClick={() => {
                            addSection({
                                format: 'straight',
                                id: `section-${Date.now()}`,
                                type: 'workout',
                                title: '',
                                note: '',
                                target_duration_seconds: 0,
                                target_rounds: 0,
                                exercises: [],
                            });
                            // Expand the newly added section
                            setExpandedSectionIndex(sections.length);
                        }}
                        radius="xl"
                        size={sections.length === 0 ? 'sm' : 'xs'}
                        variant={sections.length === 0 ? 'filled' : 'light'}
                    >
                        Add Superset
                    </Button>
                </Group>
            </Stack>
        </Stack>
    );
}
