import {Carousel} from '@mantine/carousel';
import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Button,
    Card,
    Drawer,
    Group,
    Image,
    Menu,
    ScrollArea,
    SimpleGrid,
    Stack,
    Table,
    Tabs,
    Text,
    Title,
    useDrawersStack,
} from '@mantine/core';
import '@mantine/carousel/styles.css';
import {
    IconAlertTriangle,
    IconArrowsLeftRight,
    IconBarbell,
    IconClock,
    IconCopy,
    IconDots,
    IconFlame,
    IconInfoCircle,
    IconMenu2,
    IconMessageCircle,
    IconPhoto,
    IconSearch,
    IconSettings,
    IconTarget,
    IconTrash,
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

const ExerciseOptionMenu = () => {
    return (
        <Menu
            shadow="md"
            width={200}
        >
            <Menu.Target>
                <IconDots />
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Item leftSection={<IconCopy size={14} />}>Duplicate</Menu.Item>
                <Menu.Item leftSection={<IconCopy size={14} />}>Edit and Duplicate</Menu.Item>
                <Menu.Item leftSection={<IconMessageCircle size={14} />}>Share</Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
};

const ExerciseSections = [
    {
        id: 'ce-section-summary',
        label: 'Summary',
        value: 'summary',
    },
    {
        id: 'ce-section-howto',
        label: 'How to',
        value: 'how_to',
    },
    {
        id: 'ce-section-advance',
        label: 'Advance',
        value: 'advance',
    },
];

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
                        style={{paddingBlock: 'var(--ce-size-sm)', paddingInline: 'var(--ce-size-xs)'}}
                        withBorder={false}
                    >
                        <Header
                            actions={<ExerciseOptionMenu />}
                            onBack={() => stack.close('exercise-detail')}
                            title={exercise.name}
                        />
                    </HeadingContainer>
                    <ScrollArea
                        h="calc(100vh - 80px)"
                        type="auto"
                    >
                        {/* Image Carousel Header */}

                        <Tabs defaultValue="about">
                            <Tabs.List>
                                <Tabs.Tab
                                    leftSection={<IconPhoto size={12} />}
                                    value="about"
                                >
                                    About
                                </Tabs.Tab>
                                <Tabs.Tab
                                    leftSection={<IconMessageCircle size={12} />}
                                    value="how_to"
                                >
                                    How to
                                </Tabs.Tab>
                                <Tabs.Tab
                                    leftSection={<IconSettings size={12} />}
                                    value="Advance"
                                >
                                    Advance
                                </Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel
                                pt="md"
                                value="about"
                            >
                                <PaddingContainer>
                                    <Stack gap="lg">
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
                                                        fallbackSrc="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fcdn.jefit.com%2Fassets%2Fimg%2Fexercises%2Fgifs%2F276.gif&f=1&nofb=1&ipt=7db4b4b0cd713f012f03233ac2ea8ca3727fc9fb2ddbc2e9d8fc039d4cd1ffbf"
                                                        fit="cover"
                                                        h={300}
                                                        radius="lg"
                                                        src={imageUrl}
                                                    />
                                                </Carousel.Slide>
                                            ))}
                                        </Carousel>
                                        <Title
                                            order={4}
                                            size="h6"
                                        >
                                            {exercise.name}
                                        </Title>

                                        <Table
                                            layout="fixed"
                                            radius="md"
                                            variant="vertical"
                                            withTableBorder
                                        >
                                            <Table.Tbody>
                                                <Table.Tr>
                                                    <Table.Th w={160}>Primary Muscle</Table.Th>
                                                    <Table.Td>
                                                        {exercise.exercise_metadata.primary_muscle
                                                            .join(',')
                                                            .toUpperCase()}
                                                    </Table.Td>
                                                </Table.Tr>
                                                <Table.Tr>
                                                    <Table.Th w={160}>Secondary Muscle</Table.Th>
                                                    <Table.Td>
                                                        {exercise.exercise_metadata.secondary_muscle
                                                            .join(',')
                                                            .toUpperCase()}
                                                    </Table.Td>
                                                </Table.Tr>

                                                <Table.Tr>
                                                    <Table.Th w={160}>Calories Per Minute</Table.Th>
                                                    <Table.Td>
                                                        {exercise.exercise_metadata.calories_burned_per_minute}
                                                    </Table.Td>
                                                </Table.Tr>

                                                <Table.Tr>
                                                    <Table.Th w={160}>Recommended Set</Table.Th>
                                                    <Table.Td>{exercise.exercise_metadata.default_sets}</Table.Td>
                                                </Table.Tr>

                                                <Table.Tr>
                                                    <Table.Th w={160}>Rest</Table.Th>
                                                    <Table.Td>
                                                        {exercise.exercise_metadata.rest_recommendation}
                                                    </Table.Td>
                                                </Table.Tr>

                                                <Table.Tr>
                                                    <Table.Th w={160}>Recommended Reps Ranges</Table.Th>
                                                    <Table.Td>
                                                        {exercise.exercise_metadata.common_rep_ranges
                                                            .join(',')
                                                            .toUpperCase()}
                                                    </Table.Td>
                                                </Table.Tr>
                                            </Table.Tbody>
                                        </Table>
                                    </Stack>
                                </PaddingContainer>
                            </Tabs.Panel>

                            <Tabs.Panel
                                pt="md"
                                value="how_to"
                            >
                                <PaddingContainer>
                                    {metadata?.instructions && metadata.instructions.length > 0 && (
                                        <Stack gap="md">
                                            <Title
                                                order={4}
                                                size="h6"
                                            >
                                                {exercise.name}
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
                                    )}
                                </PaddingContainer>
                            </Tabs.Panel>

                            <Tabs.Panel
                                pt="md"
                                value="advance"
                            >
                                <PaddingContainer>Advanced</PaddingContainer>
                            </Tabs.Panel>
                        </Tabs>
                    </ScrollArea>
                </PagePaper>
            </Drawer>
        </>
    );
}
