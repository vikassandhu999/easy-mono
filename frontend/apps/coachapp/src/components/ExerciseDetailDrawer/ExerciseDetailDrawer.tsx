import {
    Avatar,
    Badge,
    Box,
    Divider,
    Drawer,
    Group,
    ScrollArea,
    Stack,
    Text,
    Title,
    useDrawersStack,
} from '@mantine/core';
import {
    IconAlertTriangle,
    IconBarbell,
    IconClock,
    IconFlame,
    IconInfoCircle,
    IconTarget,
    IconTrendingUp,
} from '@tabler/icons-react';

import {Content} from '@/api/contents';
import HeadingContainer from '@/components/containers/HeaderContainer.tsx';
import PaddingContainer from '@/components/containers/PaddingContainer.tsx';
import PagePaper from '@/components/containers/PagePaper.tsx';

import Header from '../layouts/Header.tsx';

type ExerciseDetailDrawerProps = {
    exercise: Content | null;
    stack: ReturnType<typeof useDrawersStack<'exercise-detail' | any>>;
};

const LevelColors: Record<string, string> = {
    beginner: 'green',
    intermediate: 'yellow',
    advanced: 'red',
};

const getLevelColor = (level: string): string => {
    const normalizedLevel = level.toLowerCase();
    return LevelColors[normalizedLevel] || 'blue';
};

export function ExerciseDetailDrawer({stack, exercise}: ExerciseDetailDrawerProps) {
    if (!exercise) return null;

    const metadata = exercise.exercise_metadata;

    return (
        <>
            <Drawer
                {...stack.register('exercise-detail')}
                position="right"
                size="lg"
                withCloseButton={false}
            >
                <PagePaper>
                    <HeadingContainer
                        style={{paddingBlock: 'var(--ce-size-md)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            onBack={() => stack.close('exercise-detail')}
                            title="Exercise Details"
                        />
                    </HeadingContainer>
                    <ScrollArea
                        h="calc(100vh - 80px)"
                        type="auto"
                    >
                        <PaddingContainer>
                            <Stack gap="lg">
                                {/* Header Section */}
                                <Group
                                    align="start"
                                    wrap="nowrap"
                                >
                                    <Avatar
                                        radius="md"
                                        size={80}
                                        src={exercise.thumbnail_url}
                                    >
                                        <IconBarbell size={40} />
                                    </Avatar>
                                    <Box flex={1}>
                                        <Title
                                            order={2}
                                            size="h3"
                                        >
                                            {exercise.name}
                                        </Title>
                                        {exercise.description && (
                                            <Text
                                                c="dimmed"
                                                mt="xs"
                                                size="sm"
                                            >
                                                {exercise.description}
                                            </Text>
                                        )}
                                    </Box>
                                </Group>

                                {/* Badges Section */}
                                <Group gap="xs">
                                    {metadata?.level && (
                                        <Badge
                                            color={getLevelColor(metadata.level)}
                                            leftSection={<IconTrendingUp size={14} />}
                                            size="lg"
                                            variant="light"
                                        >
                                            {metadata.level}
                                        </Badge>
                                    )}
                                    {metadata?.mechanics && (
                                        <Badge
                                            color="blue"
                                            size="lg"
                                            variant="light"
                                        >
                                            {metadata.mechanics}
                                        </Badge>
                                    )}
                                    {metadata?.category && (
                                        <Badge
                                            color="grape"
                                            size="lg"
                                            variant="light"
                                        >
                                            {metadata.category}
                                        </Badge>
                                    )}
                                </Group>

                                <Divider />

                                {/* Classification Section */}
                                <Box>
                                    <Title
                                        mb="sm"
                                        order={4}
                                    >
                                        Classification
                                    </Title>
                                    <Stack gap="sm">
                                        {metadata?.primary_muscle && metadata.primary_muscle.length > 0 && (
                                            <Group>
                                                <Text
                                                    fw={500}
                                                    size="sm"
                                                    w={120}
                                                >
                                                    Primary Muscle:
                                                </Text>
                                                <Group gap={4}>
                                                    {metadata.primary_muscle.map((muscle, idx) => (
                                                        <Badge
                                                            color="red"
                                                            key={idx}
                                                            size="sm"
                                                            variant="dot"
                                                        >
                                                            {muscle}
                                                        </Badge>
                                                    ))}
                                                </Group>
                                            </Group>
                                        )}
                                        {metadata?.secondary_muscle && metadata.secondary_muscle.length > 0 && (
                                            <Group>
                                                <Text
                                                    fw={500}
                                                    size="sm"
                                                    w={120}
                                                >
                                                    Secondary:
                                                </Text>
                                                <Group gap={4}>
                                                    {metadata.secondary_muscle.map((muscle, idx) => (
                                                        <Badge
                                                            color="orange"
                                                            key={idx}
                                                            size="sm"
                                                            variant="dot"
                                                        >
                                                            {muscle}
                                                        </Badge>
                                                    ))}
                                                </Group>
                                            </Group>
                                        )}
                                        {metadata?.force && (
                                            <Group>
                                                <Text
                                                    fw={500}
                                                    size="sm"
                                                    w={120}
                                                >
                                                    Force Type:
                                                </Text>
                                                <Badge
                                                    color="cyan"
                                                    size="sm"
                                                    variant="light"
                                                >
                                                    {metadata.force}
                                                </Badge>
                                            </Group>
                                        )}
                                    </Stack>
                                </Box>

                                <Divider />

                                {/* Equipment Section */}
                                {metadata?.equipment && metadata.equipment.length > 0 && (
                                    <>
                                        <Box>
                                            <Group
                                                gap="xs"
                                                mb="sm"
                                            >
                                                <IconBarbell size={20} />
                                                <Title order={4}>Equipment Required</Title>
                                            </Group>
                                            <Group gap="xs">
                                                {metadata.equipment.map((item, idx) => (
                                                    <Badge
                                                        color="teal"
                                                        key={idx}
                                                        size="md"
                                                        variant="light"
                                                    >
                                                        {item}
                                                    </Badge>
                                                ))}
                                            </Group>
                                        </Box>
                                        <Divider />
                                    </>
                                )}

                                {/* Programming Guidelines */}
                                <Box>
                                    <Group
                                        gap="xs"
                                        mb="sm"
                                    >
                                        <IconTarget size={20} />
                                        <Title order={4}>Programming Guidelines</Title>
                                    </Group>
                                    <Stack gap="sm">
                                        {metadata?.default_sets && (
                                            <Group>
                                                <Text
                                                    c="dimmed"
                                                    size="sm"
                                                    w={150}
                                                >
                                                    Recommended Sets:
                                                </Text>
                                                <Text
                                                    fw={500}
                                                    size="sm"
                                                >
                                                    {metadata.default_sets}
                                                </Text>
                                            </Group>
                                        )}
                                        {metadata?.common_rep_ranges && metadata.common_rep_ranges.length > 0 && (
                                            <Group>
                                                <Text
                                                    c="dimmed"
                                                    size="sm"
                                                    w={150}
                                                >
                                                    Rep Ranges:
                                                </Text>
                                                <Group gap={4}>
                                                    {metadata.common_rep_ranges.map((range, idx) => (
                                                        <Badge
                                                            color="indigo"
                                                            key={idx}
                                                            size="sm"
                                                            variant="light"
                                                        >
                                                            {range}
                                                        </Badge>
                                                    ))}
                                                </Group>
                                            </Group>
                                        )}
                                        {metadata?.rest_recommendation && (
                                            <Group>
                                                <Text
                                                    c="dimmed"
                                                    size="sm"
                                                    w={150}
                                                >
                                                    Rest Period:
                                                </Text>
                                                <Badge
                                                    color="violet"
                                                    leftSection={<IconClock size={14} />}
                                                    size="sm"
                                                    variant="light"
                                                >
                                                    {metadata.rest_recommendation}
                                                </Badge>
                                            </Group>
                                        )}
                                    </Stack>
                                </Box>

                                <Divider />

                                {/* Execution Characteristics */}
                                <Box>
                                    <Title
                                        mb="sm"
                                        order={4}
                                    >
                                        Execution Details
                                    </Title>
                                    <Stack gap="sm">
                                        {metadata?.calories_burned_per_minute && (
                                            <Group>
                                                <IconFlame
                                                    color="var(--mantine-color-orange-6)"
                                                    size={18}
                                                />
                                                <Text
                                                    c="dimmed"
                                                    size="sm"
                                                    w={130}
                                                >
                                                    Calories/Min:
                                                </Text>
                                                <Text
                                                    fw={500}
                                                    size="sm"
                                                >
                                                    {metadata.calories_burned_per_minute} cal
                                                </Text>
                                            </Group>
                                        )}
                                        {metadata?.tempo && (
                                            <Group>
                                                <Text
                                                    c="dimmed"
                                                    size="sm"
                                                    w={150}
                                                >
                                                    Tempo:
                                                </Text>
                                                <Badge
                                                    color="pink"
                                                    size="sm"
                                                    variant="light"
                                                >
                                                    {metadata.tempo}
                                                </Badge>
                                            </Group>
                                        )}
                                        {metadata?.range_of_motion && (
                                            <Group>
                                                <Text
                                                    c="dimmed"
                                                    size="sm"
                                                    w={150}
                                                >
                                                    Range of Motion:
                                                </Text>
                                                <Text
                                                    fw={500}
                                                    size="sm"
                                                >
                                                    {metadata.range_of_motion}
                                                </Text>
                                            </Group>
                                        )}
                                    </Stack>
                                </Box>

                                <Divider />

                                {/* Form Cues */}
                                {metadata?.form_cues && metadata.form_cues.length > 0 && (
                                    <>
                                        <Box>
                                            <Group
                                                gap="xs"
                                                mb="sm"
                                            >
                                                <IconInfoCircle size={20} />
                                                <Title order={4}>Form Cues</Title>
                                            </Group>
                                            <Stack gap="xs">
                                                {metadata.form_cues.map((cue, idx) => (
                                                    <Group
                                                        key={idx}
                                                        wrap="nowrap"
                                                    >
                                                        <Text
                                                            c="blue"
                                                            fw={700}
                                                            size="sm"
                                                        >
                                                            •
                                                        </Text>
                                                        <Text size="sm">{cue}</Text>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        </Box>
                                        <Divider />
                                    </>
                                )}

                                {/* Common Mistakes */}
                                {metadata?.common_mistakes && metadata.common_mistakes.length > 0 && (
                                    <>
                                        <Box>
                                            <Group
                                                gap="xs"
                                                mb="sm"
                                            >
                                                <IconAlertTriangle
                                                    color="var(--mantine-color-yellow-6)"
                                                    size={20}
                                                />
                                                <Title order={4}>Common Mistakes</Title>
                                            </Group>
                                            <Stack gap="xs">
                                                {metadata.common_mistakes.map((mistake, idx) => (
                                                    <Group
                                                        key={idx}
                                                        wrap="nowrap"
                                                    >
                                                        <Text
                                                            c="yellow"
                                                            fw={700}
                                                            size="sm"
                                                        >
                                                            ⚠
                                                        </Text>
                                                        <Text size="sm">{mistake}</Text>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        </Box>
                                        <Divider />
                                    </>
                                )}

                                {/* Contraindications */}
                                {metadata?.contraindications && metadata.contraindications.length > 0 && (
                                    <Box>
                                        <Group
                                            gap="xs"
                                            mb="sm"
                                        >
                                            <IconAlertTriangle
                                                color="var(--mantine-color-red-6)"
                                                size={20}
                                            />
                                            <Title order={4}>Contraindications</Title>
                                        </Group>
                                        <Stack gap="xs">
                                            {metadata.contraindications.map((item, idx) => (
                                                <Badge
                                                    color="red"
                                                    key={idx}
                                                    size="md"
                                                    variant="light"
                                                >
                                                    {item}
                                                </Badge>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                {/* Instructions */}
                                {metadata?.instructions && metadata.instructions.length > 0 && (
                                    <>
                                        <Divider />
                                        <Box>
                                            <Title
                                                mb="sm"
                                                order={4}
                                            >
                                                Instructions
                                            </Title>
                                            <Stack gap="sm">
                                                {metadata.instructions.map((instruction, idx) => (
                                                    <Group
                                                        align="start"
                                                        key={idx}
                                                        wrap="nowrap"
                                                    >
                                                        <Badge
                                                            circle
                                                            color="gray"
                                                            size="lg"
                                                            variant="filled"
                                                        >
                                                            {idx + 1}
                                                        </Badge>
                                                        <Text size="sm">{instruction}</Text>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        </Box>
                                    </>
                                )}
                            </Stack>
                        </PaddingContainer>
                    </ScrollArea>
                </PagePaper>
            </Drawer>
        </>
    );
}
