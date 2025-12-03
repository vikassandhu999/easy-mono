import {capitalizeWords, humanizeError} from '@easy/error-parser';
import {Carousel} from '@mantine/carousel';
import {ActionIcon, Badge, Box, Button, Divider, Group, Image, Loader, Stack, Text, Title} from '@mantine/core';
import {modals} from '@mantine/modals';
import {IconCopy, IconEdit, IconTrash} from '@tabler/icons-react';
import '@mantine/carousel/styles.css';

import {DRAWER_KEYS} from '@/configs/drawer';
import useParamsDrawer from '@/hooks/useParamDrawer';
import {isSystemExercise, useDeleteExercise, useDuplicateExercise, useGetExercise} from '@/services/exercises';
import AutoDrawer from '@/shared/AutoDrawer/AutoDrawer';
import {notifyError} from '@/utils/notification';

const ExerciseViewDrawer = () => {
    const {closeDrawer, openDrawer, getDrawerParams} = useParamsDrawer({});
    const {exercise_id} = getDrawerParams();
    const exerciseId = exercise_id;

    const {data: exercise, isLoading} = useGetExercise(exerciseId ?? '', {
        skip: !exerciseId,
    });

    const [deleteExercise, {isLoading: isDeleting}] = useDeleteExercise();
    const [duplicateExercise, {isLoading: isDuplicating}] = useDuplicateExercise();

    const isSystem = exercise ? isSystemExercise(exercise) : false;

    const handleEdit = () => {
        openDrawer(DRAWER_KEYS.EXERCISE_EDIT, {
            exercise_id: exerciseId,
        });
    };

    const handleDuplicate = async () => {
        if (!exerciseId) return;

        try {
            const duplicatedExercise = await duplicateExercise({
                id: exerciseId,
            }).unwrap();

            // Open the duplicated exercise in view mode
            openDrawer(DRAWER_KEYS.EXERCISE_VIEW, {
                exercise_id: duplicatedExercise.id,
            });
        } catch (error) {
            const errMsg = humanizeError(error);
            notifyError(errMsg);
        }
    };

    const handleDelete = () => {
        modals.openConfirmModal({
            title: 'Delete Exercise',
            children: (
                <Text size="sm">Are you sure you want to delete this exercise? This action cannot be undone.</Text>
            ),
            labels: {confirm: 'Delete', cancel: 'Cancel'},
            confirmProps: {color: 'red'},
            cancelProps: {variant: 'light'},
            centered: true,
            onConfirm: async () => {
                try {
                    await deleteExercise(exerciseId!).unwrap();
                    closeDrawer();
                } catch (error) {
                    notifyError('Failed to delete exercise');
                }
            },
        });
    };

    if (isLoading) {
        return (
            <AutoDrawer
                content={
                    <Stack
                        align="center"
                        p="xl"
                    >
                        <Loader />
                    </Stack>
                }
                onClose={closeDrawer}
                title="Exercise Details"
            />
        );
    }

    if (!exercise) {
        return (
            <AutoDrawer
                content={<Text p="xl">Exercise not found</Text>}
                onClose={closeDrawer}
                title="Exercise Details"
            />
        );
    }

    // Render actions based on whether exercise is system-level or business-owned
    const renderActions = () => {
        if (isSystem) {
            // System exercise: Show only Duplicate button (no Edit, no Delete)
            return (
                <Button
                    color="blue"
                    fullWidth
                    leftSection={<IconCopy size={16} />}
                    loading={isDuplicating}
                    onClick={handleDuplicate}
                    radius="xl"
                    size="sm"
                    variant="light"
                >
                    Duplicate
                </Button>
            );
        }

        // Business-owned exercise: Show Edit and Delete buttons
        return (
            <Group w="100%">
                <Button
                    color="blue"
                    flex={1}
                    leftSection={<IconEdit size={16} />}
                    onClick={handleEdit}
                    radius="xl"
                    size="sm"
                    variant="light"
                >
                    Edit
                </Button>
                <ActionIcon
                    color="red"
                    loading={isDeleting}
                    onClick={handleDelete}
                    radius="xl"
                    size="lg"
                    variant="light"
                >
                    <IconTrash size={18} />
                </ActionIcon>
            </Group>
        );
    };

    return (
        <AutoDrawer
            actions={renderActions()}
            content={
                <Stack
                    gap="lg"
                    p="md"
                >
                    {/* Image Carousel */}
                    {exercise.images && exercise.images.length > 0 && (
                        <Box>
                            <Carousel
                                emblaOptions={{loop: true}}
                                slideGap="md"
                                slideSize="100%"
                                withControls={false}
                                withIndicators={exercise.images.length > 1}
                            >
                                {exercise.images.map((imageUrl, index) => (
                                    <Carousel.Slide key={index}>
                                        <Image
                                            alt={`${exercise.name} - Image ${index + 1}`}
                                            fit="contain"
                                            h={200}
                                            radius="lg"
                                            src={imageUrl}
                                            style={{objectPosition: 'top'}}
                                        />
                                    </Carousel.Slide>
                                ))}
                            </Carousel>
                        </Box>
                    )}

                    <Stack gap="xs">
                        <Group
                            align="center"
                            gap="sm"
                        >
                            <Title order={3}>{capitalizeWords(exercise.name)}</Title>
                        </Group>
                        <Text c="dimmed">{exercise.description || 'No description available'}</Text>
                    </Stack>
                    <Divider />
                    <Group grow>
                        <Stack gap="xs">
                            <Text fw={500}>Mechanics</Text>
                            {exercise.mechanics ? (
                                <Badge
                                    color="blue"
                                    variant="light"
                                >
                                    {capitalizeWords(exercise.mechanics)}
                                </Badge>
                            ) : (
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    Not available
                                </Text>
                            )}
                        </Stack>
                        <Stack gap="xs">
                            <Text fw={500}>Force</Text>
                            {exercise.force ? (
                                <Badge
                                    color="grape"
                                    variant="light"
                                >
                                    {capitalizeWords(exercise.force)}
                                </Badge>
                            ) : (
                                <Text
                                    c="dimmed"
                                    size="sm"
                                >
                                    Not available
                                </Text>
                            )}
                        </Stack>
                    </Group>
                    <Divider />
                    <Stack gap="xs">
                        <Text fw={500}>Muscles</Text>
                        {exercise.muscles && exercise.muscles.length > 0 ? (
                            <Group gap="xs">
                                {exercise.muscles.map((m) => (
                                    <Badge
                                        key={m.id}
                                        variant="dot"
                                    >
                                        {capitalizeWords(m.name)}
                                    </Badge>
                                ))}
                            </Group>
                        ) : (
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Not available
                            </Text>
                        )}
                    </Stack>
                    <Divider />
                    <Stack gap="xs">
                        <Text fw={500}>Equipment</Text>
                        {exercise.equipment && exercise.equipment.length > 0 ? (
                            <Group gap="xs">
                                {exercise.equipment.map((e) => (
                                    <Badge
                                        color="gray"
                                        key={e.id}
                                        variant="outline"
                                    >
                                        {capitalizeWords(e.name)}
                                    </Badge>
                                ))}
                            </Group>
                        ) : (
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Not available
                            </Text>
                        )}
                    </Stack>
                    <Divider />
                    <Stack gap="xs">
                        <Text fw={500}>Instructions</Text>
                        {exercise.instructions ? (
                            <Text style={{whiteSpace: 'pre-wrap'}}>{exercise.instructions}</Text>
                        ) : (
                            <Text
                                c="dimmed"
                                size="sm"
                            >
                                Not available
                            </Text>
                        )}
                    </Stack>

                    {isSystem && (
                        <Text
                            c="dimmed"
                            fs="italic"
                            size="xs"
                        >
                            Note : This is a system exercise and cannot be edited. Duplicate it to create your own
                            customizable version.
                        </Text>
                    )}
                </Stack>
            }
            onClose={closeDrawer}
            title="Exercise Details"
        />
    );
};

export default ExerciseViewDrawer;
