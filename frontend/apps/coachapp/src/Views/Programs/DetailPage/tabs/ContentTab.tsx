import {Stack, Group, Text, Title, Card, Badge, Button, Box, ActionIcon, ThemeIcon, Alert} from '@mantine/core';
import {
    IconPlus,
    IconFileText,
    IconVideo,
    IconHeadphones,
    IconEdit,
    IconTrash,
    IconInfoCircle,
    IconClock,
    IconEye,
    IconLock,
    IconCheck,
    IconGripVertical,
} from '@tabler/icons-react';
import {Program} from '@/Api/Programs';
import PaddingContainer from '@/Components/Containers/PaddingContainer';

interface ContentTabProps {
    programId: string;
    program: Program;
}

export default function ContentTab({programId}: ContentTabProps) {
    // Mock content data - in real app, fetch from API
    const programContent = [
        {
            id: '1',
            content_item: {
                id: 'c1',
                title: 'Welcome to Your Weight Loss Journey',
                type: 'video',
                duration: 480, // seconds
                description: 'Introduction video explaining the program structure and goals.',
            },
            sort_order: 1,
            is_optional: false,
            is_locked: false,
            is_visible: true,
            estimated_duration: 480,
            completion_weight: 10,
        },
        {
            id: '2',
            content_item: {
                id: 'c2',
                title: 'Nutrition Fundamentals Guide',
                type: 'document',
                duration: 0,
                description: 'Comprehensive guide to understanding macronutrients and meal planning.',
            },
            sort_order: 2,
            is_optional: false,
            is_locked: false,
            is_visible: true,
            estimated_duration: 1200,
            completion_weight: 15,
        },
        {
            id: '3',
            content_item: {
                id: 'c3',
                title: 'Weekly Check-in Call',
                type: 'audio',
                duration: 1800,
                description: 'Guided meditation and reflection session for weekly progress review.',
            },
            sort_order: 3,
            is_optional: true,
            is_locked: true,
            is_visible: true,
            estimated_duration: 1800,
            completion_weight: 8,
        },
        {
            id: '4',
            content_item: {
                id: 'c4',
                title: 'Exercise Demonstration Videos',
                type: 'video',
                duration: 900,
                description: 'Step-by-step demonstrations of recommended exercises.',
            },
            sort_order: 4,
            is_optional: false,
            is_locked: false,
            is_visible: false,
            estimated_duration: 900,
            completion_weight: 12,
        },
    ];

    const getContentTypeIcon = (type: string) => {
        switch (type) {
            case 'video':
                return <IconVideo size={16} />;
            case 'audio':
                return <IconHeadphones size={16} />;
            case 'document':
                return <IconFileText size={16} />;
            default:
                return <IconFileText size={16} />;
        }
    };

    const getContentTypeColor = (type: string) => {
        switch (type) {
            case 'video':
                return 'red';
            case 'audio':
                return 'green';
            case 'document':
                return 'blue';
            default:
                return 'gray';
        }
    };

    const formatDuration = (seconds: number) => {
        if (seconds === 0) return 'Reading material';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes === 0) return `${remainingSeconds}s`;
        if (remainingSeconds === 0) return `${minutes}m`;
        return `${minutes}m ${remainingSeconds}s`;
    };

    return (
        <PaddingContainer>
            <Stack
                gap="xl"
                py="md"
            >
                {/* Header */}
                <Group
                    justify="space-between"
                    align="start"
                >
                    <Box>
                        <Title order={4}>Contents</Title>
                    </Box>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={() => {
                            console.log('Add content to program:', programId);
                        }}
                        size={'xs'}
                    >
                        Add Content
                    </Button>
                </Group>

                {/* Content List */}
                {programContent.length === 0 ? (
                    <Alert
                        icon={<IconInfoCircle size={16} />}
                        title="No Content Added"
                        color="blue"
                        variant="light"
                    >
                        <Stack gap="sm">
                            <Text size="sm">
                                This program doesn't have any content yet. Add videos, documents, audio files, or other
                                learning materials to create a comprehensive learning experience.
                            </Text>
                            <Button
                                leftSection={<IconPlus size={16} />}
                                variant="filled"
                                size="sm"
                                style={{alignSelf: 'flex-start'}}
                            >
                                Add First Content Item
                            </Button>
                        </Stack>
                    </Alert>
                ) : (
                    <Stack gap="sm">
                        {programContent
                            .sort((a, b) => a.sort_order - b.sort_order)
                            .map((item, index) => (
                                <Card
                                    key={item.id}
                                    withBorder
                                    p="sm"
                                    style={{
                                        opacity: item.is_visible ? 1 : 0.6,
                                        borderLeft: item.is_optional
                                            ? '4px solid var(--mantine-color-orange-4)'
                                            : '4px solid var(--mantine-color-blue-4)',
                                    }}
                                >
                                    <Stack gap="md">
                                        <Group
                                            justify="space-between"
                                            align="start"
                                        >
                                            <Group
                                                gap="sm"
                                                style={{flex: 1}}
                                            >
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="gray"
                                                    style={{cursor: 'grab'}}
                                                >
                                                    <IconGripVertical size={16} />
                                                </ActionIcon>

                                                <Box style={{flex: 1}}>
                                                    <Group
                                                        gap="sm"
                                                        mb="xs"
                                                    >
                                                        <Text
                                                            fw={600}
                                                            size="sm"
                                                        >
                                                            {index + 1}. {item.content_item.title}
                                                        </Text>

                                                        <ThemeIcon
                                                            variant="light"
                                                            color={getContentTypeColor(item.content_item.type)}
                                                            size="sm"
                                                        >
                                                            {getContentTypeIcon(item.content_item.type)}
                                                        </ThemeIcon>

                                                        {item.is_optional && (
                                                            <Badge
                                                                color="orange"
                                                                variant="light"
                                                                size="xs"
                                                            >
                                                                Optional
                                                            </Badge>
                                                        )}

                                                        {item.is_locked && (
                                                            <Badge
                                                                color="red"
                                                                variant="light"
                                                                size="xs"
                                                            >
                                                                <Group gap={4}>
                                                                    <IconLock size={10} />
                                                                    Locked
                                                                </Group>
                                                            </Badge>
                                                        )}

                                                        {!item.is_visible && (
                                                            <Badge
                                                                color="gray"
                                                                variant="light"
                                                                size="xs"
                                                            >
                                                                <Group gap={4}>
                                                                    <IconEye size={10} />
                                                                    Hidden
                                                                </Group>
                                                            </Badge>
                                                        )}
                                                    </Group>

                                                    {item.content_item.description && (
                                                        <Text
                                                            size="sm"
                                                            c="dimmed"
                                                            mb="sm"
                                                        >
                                                            {item.content_item.description}
                                                        </Text>
                                                    )}

                                                    <Group gap="md">
                                                        <Group gap="xs">
                                                            <IconClock
                                                                size={14}
                                                                color="var(--mantine-color-gray-6)"
                                                            />
                                                            <Text
                                                                size="xs"
                                                                c="dimmed"
                                                            >
                                                                {formatDuration(item.estimated_duration)}
                                                            </Text>
                                                        </Group>

                                                        <Group gap="xs">
                                                            <IconCheck
                                                                size={14}
                                                                color="var(--mantine-color-gray-6)"
                                                            />
                                                            <Text
                                                                size="xs"
                                                                c="dimmed"
                                                            >
                                                                Weight: {item.completion_weight}
                                                            </Text>
                                                        </Group>
                                                    </Group>
                                                </Box>
                                            </Group>

                                            <Group gap="xs">
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="gray"
                                                    onClick={() => {
                                                        console.log('Edit content:', item.id);
                                                    }}
                                                >
                                                    <IconEdit size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="red"
                                                    onClick={() => {
                                                        console.log('Remove content:', item.id);
                                                    }}
                                                >
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Group>
                                        </Group>
                                    </Stack>
                                </Card>
                            ))}
                    </Stack>
                )}
            </Stack>
        </PaddingContainer>
    );
}
