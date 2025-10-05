import {Carousel} from '@mantine/carousel';
import {
    Avatar,
    Badge,
    Box,
    Card,
    Drawer,
    Group,
    Image,
    ScrollArea,
    SimpleGrid,
    Stack,
    Text,
    Title,
    useDrawersStack,
} from '@mantine/core';
import '@mantine/carousel/styles.css';
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

    // Prepare images to display
    const fallbackImages = [
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
        'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80',
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
    ];

    const imagesToShow = metadata?.images && metadata.images.length > 0 ? metadata.images : fallbackImages;

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
                        {/* Image Carousel Header */}
                        <Carousel
                            slideGap="md"
                            slideSize="100%"
                            withControls={false}
                            withIndicators
                        >
                            {imagesToShow.map((imageUrl, idx) => (
                                <Carousel.Slide key={idx}>
                                    <Image
                                        alt={`${exercise.name} - Image ${idx + 1}`}
                                        fallbackSrc="https://placehold.co/600x400/e9ecef/495057?text=Exercise+Image"
                                        fit="cover"
                                        h={300}
                                        radius="md"
                                        src={imageUrl}
                                    />
                                </Carousel.Slide>
                            ))}
                        </Carousel>

                        <PaddingContainer>
                            <Stack gap="xl">
                                {/* Title Section */}
                                <Box mt="lg">
                                    <Title
                                        order={1}
                                        size="h2"
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

                                    {/* Level & Tags */}
                                    <Group
                                        gap="xs"
                                        mt="md"
                                    >
                                        {metadata?.level && (
                                            <Badge
                                                color={getLevelColor(metadata.level)}
                                                leftSection={<IconTrendingUp size={14} />}
                                                radius="md"
                                                size="lg"
                                                tt="capitalize"
                                                variant="light"
                                            >
                                                {metadata.level}
                                            </Badge>
                                        )}
                                        {metadata?.mechanics && (
                                            <Badge
                                                color="blue"
                                                radius="md"
                                                size="lg"
                                                tt="capitalize"
                                                variant="light"
                                            >
                                                {metadata.mechanics}
                                            </Badge>
                                        )}
                                        {metadata?.force && (
                                            <Badge
                                                color="cyan"
                                                radius="md"
                                                size="lg"
                                                tt="capitalize"
                                                variant="light"
                                            >
                                                {metadata.force}
                                            </Badge>
                                        )}
                                    </Group>
                                </Box>

                                {/* Stats Cards */}
                                <SimpleGrid
                                    cols={3}
                                    spacing="sm"
                                >
                                    {metadata?.default_sets && (
                                        <Card
                                            padding="md"
                                            radius="lg"
                                            withBorder
                                        >
                                            <Stack
                                                align="center"
                                                gap="xs"
                                            >
                                                <IconTarget
                                                    color="var(--mantine-color-blue-6)"
                                                    size={24}
                                                />
                                                <Text
                                                    fw={700}
                                                    size="xl"
                                                >
                                                    {metadata.default_sets}
                                                </Text>
                                                <Text
                                                    c="dimmed"
                                                    size="xs"
                                                    ta="center"
                                                >
                                                    Sets
                                                </Text>
                                            </Stack>
                                        </Card>
                                    )}
                                    {metadata?.calories_burned_per_minute && (
                                        <Card
                                            padding="md"
                                            radius="lg"
                                            withBorder
                                        >
                                            <Stack
                                                align="center"
                                                gap="xs"
                                            >
                                                <IconFlame
                                                    color="var(--mantine-color-orange-6)"
                                                    size={24}
                                                />
                                                <Text
                                                    fw={700}
                                                    size="xl"
                                                >
                                                    {metadata.calories_burned_per_minute}
                                                </Text>
                                                <Text
                                                    c="dimmed"
                                                    size="xs"
                                                    ta="center"
                                                >
                                                    Cal/Min
                                                </Text>
                                            </Stack>
                                        </Card>
                                    )}
                                    {metadata?.rest_recommendation && (
                                        <Card
                                            padding="md"
                                            radius="lg"
                                            withBorder
                                        >
                                            <Stack
                                                align="center"
                                                gap="xs"
                                            >
                                                <IconClock
                                                    color="var(--mantine-color-violet-6)"
                                                    size={24}
                                                />
                                                <Text
                                                    fw={700}
                                                    size="sm"
                                                    ta="center"
                                                >
                                                    {metadata.rest_recommendation}
                                                </Text>
                                                <Text
                                                    c="dimmed"
                                                    size="xs"
                                                    ta="center"
                                                >
                                                    Rest
                                                </Text>
                                            </Stack>
                                        </Card>
                                    )}
                                </SimpleGrid>

                                {/* Muscle Groups Section */}
                                {(metadata?.primary_muscle || metadata?.secondary_muscle) && (
                                    <Card
                                        padding="md"
                                        radius="lg"
                                        withBorder
                                    >
                                        <Stack gap="md">
                                            <Title
                                                order={4}
                                                size="h6"
                                            >
                                                Target Muscles
                                            </Title>
                                            {metadata.primary_muscle && metadata.primary_muscle.length > 0 && (
                                                <Box>
                                                    <Text
                                                        c="dimmed"
                                                        mb="xs"
                                                        size="xs"
                                                        tt="uppercase"
                                                    >
                                                        Primary
                                                    </Text>
                                                    <Group gap={6}>
                                                        {metadata.primary_muscle.map((muscle, idx) => (
                                                            <Badge
                                                                color="red"
                                                                key={idx}
                                                                radius="md"
                                                                size="md"
                                                                tt="capitalize"
                                                                variant="dot"
                                                            >
                                                                {muscle}
                                                            </Badge>
                                                        ))}
                                                    </Group>
                                                </Box>
                                            )}
                                            {metadata.secondary_muscle && metadata.secondary_muscle.length > 0 && (
                                                <Box>
                                                    <Text
                                                        c="dimmed"
                                                        mb="xs"
                                                        size="xs"
                                                        tt="uppercase"
                                                    >
                                                        Secondary
                                                    </Text>
                                                    <Group gap={6}>
                                                        {metadata.secondary_muscle.map((muscle, idx) => (
                                                            <Badge
                                                                color="orange"
                                                                key={idx}
                                                                radius="md"
                                                                size="md"
                                                                tt="capitalize"
                                                                variant="dot"
                                                            >
                                                                {muscle}
                                                            </Badge>
                                                        ))}
                                                    </Group>
                                                </Box>
                                            )}
                                        </Stack>
                                    </Card>
                                )}

                                {/* Equipment Section */}
                                {metadata?.equipment && metadata.equipment.length > 0 && (
                                    <Card
                                        padding="md"
                                        radius="lg"
                                        withBorder
                                    >
                                        <Stack gap="sm">
                                            <Group gap="xs">
                                                <IconBarbell size={20} />
                                                <Title
                                                    order={4}
                                                    size="h6"
                                                >
                                                    Equipment Required
                                                </Title>
                                            </Group>
                                            <Group gap={6}>
                                                {metadata.equipment.map((item, idx) => (
                                                    <Badge
                                                        color="teal"
                                                        key={idx}
                                                        radius="md"
                                                        size="md"
                                                        tt="capitalize"
                                                        variant="light"
                                                    >
                                                        {item}
                                                    </Badge>
                                                ))}
                                            </Group>
                                        </Stack>
                                    </Card>
                                )}

                                {/* Rep Ranges */}
                                {metadata?.common_rep_ranges && metadata.common_rep_ranges.length > 0 && (
                                    <Card
                                        padding="md"
                                        radius="lg"
                                        withBorder
                                    >
                                        <Stack gap="sm">
                                            <Title
                                                order={4}
                                                size="h6"
                                            >
                                                Recommended Rep Ranges
                                            </Title>
                                            <Group gap={6}>
                                                {metadata.common_rep_ranges.map((range, idx) => (
                                                    <Badge
                                                        color="indigo"
                                                        key={idx}
                                                        radius="md"
                                                        size="lg"
                                                        variant="light"
                                                    >
                                                        {range} reps
                                                    </Badge>
                                                ))}
                                            </Group>
                                        </Stack>
                                    </Card>
                                )}

                                {/* Execution Details */}
                                {(metadata?.tempo || metadata?.range_of_motion) && (
                                    <Card
                                        padding="md"
                                        radius="lg"
                                        withBorder
                                    >
                                        <Stack gap="md">
                                            <Title
                                                order={4}
                                                size="h6"
                                            >
                                                Execution Details
                                            </Title>
                                            {metadata.tempo && (
                                                <Group
                                                    justify="space-between"
                                                    wrap="nowrap"
                                                >
                                                    <Text
                                                        c="dimmed"
                                                        size="sm"
                                                    >
                                                        Tempo
                                                    </Text>
                                                    <Badge
                                                        color="pink"
                                                        radius="md"
                                                        size="md"
                                                        variant="light"
                                                    >
                                                        {metadata.tempo}
                                                    </Badge>
                                                </Group>
                                            )}
                                            {metadata.range_of_motion && (
                                                <Group
                                                    justify="space-between"
                                                    wrap="nowrap"
                                                >
                                                    <Text
                                                        c="dimmed"
                                                        size="sm"
                                                    >
                                                        Range of Motion
                                                    </Text>
                                                    <Text
                                                        fw={500}
                                                        size="sm"
                                                        tt="capitalize"
                                                    >
                                                        {metadata.range_of_motion}
                                                    </Text>
                                                </Group>
                                            )}
                                        </Stack>
                                    </Card>
                                )}

                                {/* Instructions */}
                                {metadata?.instructions && metadata.instructions.length > 0 && (
                                    <Card
                                        padding="md"
                                        radius="lg"
                                        withBorder
                                    >
                                        <Stack gap="md">
                                            <Title
                                                order={4}
                                                size="h6"
                                            >
                                                How to Perform
                                            </Title>
                                            <Stack gap="md">
                                                {metadata.instructions.map((instruction, idx) => (
                                                    <Group
                                                        align="start"
                                                        key={idx}
                                                        wrap="nowrap"
                                                    >
                                                        <Avatar
                                                            color="blue"
                                                            radius="xl"
                                                            size="sm"
                                                            variant="filled"
                                                        >
                                                            {idx + 1}
                                                        </Avatar>
                                                        <Text
                                                            flex={1}
                                                            size="sm"
                                                        >
                                                            {instruction}
                                                        </Text>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        </Stack>
                                    </Card>
                                )}

                                {/* Form Cues */}
                                {metadata?.form_cues && metadata.form_cues.length > 0 && (
                                    <Card
                                        padding="md"
                                        radius="lg"
                                        withBorder
                                    >
                                        <Stack gap="md">
                                            <Group gap="xs">
                                                <IconInfoCircle size={20} />
                                                <Title
                                                    order={4}
                                                    size="h6"
                                                >
                                                    Form Cues
                                                </Title>
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
                                                        >
                                                            ✓
                                                        </Text>
                                                        <Text size="sm">{cue}</Text>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        </Stack>
                                    </Card>
                                )}

                                {/* Common Mistakes */}
                                {metadata?.common_mistakes && metadata.common_mistakes.length > 0 && (
                                    <Card
                                        padding="md"
                                        radius="lg"
                                        style={{
                                            borderColor: 'var(--mantine-color-yellow-3)',
                                        }}
                                        withBorder
                                    >
                                        <Stack gap="md">
                                            <Group gap="xs">
                                                <IconAlertTriangle
                                                    color="var(--mantine-color-yellow-6)"
                                                    size={20}
                                                />
                                                <Title
                                                    order={4}
                                                    size="h6"
                                                >
                                                    Common Mistakes
                                                </Title>
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
                                                        >
                                                            ⚠
                                                        </Text>
                                                        <Text size="sm">{mistake}</Text>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        </Stack>
                                    </Card>
                                )}

                                {/* Contraindications */}
                                {metadata?.contraindications && metadata.contraindications.length > 0 && (
                                    <Card
                                        padding="md"
                                        radius="lg"
                                        style={{
                                            borderColor: 'var(--mantine-color-red-3)',
                                        }}
                                        withBorder
                                    >
                                        <Stack gap="md">
                                            <Group gap="xs">
                                                <IconAlertTriangle
                                                    color="var(--mantine-color-red-6)"
                                                    size={20}
                                                />
                                                <Title
                                                    order={4}
                                                    size="h6"
                                                >
                                                    Contraindications
                                                </Title>
                                            </Group>
                                            <Text
                                                c="dimmed"
                                                size="xs"
                                            >
                                                Avoid this exercise if you have:
                                            </Text>
                                            <Group gap={6}>
                                                {metadata.contraindications.map((item, idx) => (
                                                    <Badge
                                                        color="red"
                                                        key={idx}
                                                        radius="md"
                                                        size="md"
                                                        tt="capitalize"
                                                        variant="light"
                                                    >
                                                        {item}
                                                    </Badge>
                                                ))}
                                            </Group>
                                        </Stack>
                                    </Card>
                                )}

                                {/* Bottom Spacing */}
                                <Box h={40} />
                            </Stack>
                        </PaddingContainer>
                    </ScrollArea>
                </PagePaper>
            </Drawer>
        </>
    );
}
