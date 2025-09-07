import React from 'react';
import {Card, Stack, Text, Group, Badge, Button, Grid, ThemeIcon} from '@mantine/core';
import {IconEdit, IconCopy, IconEye, IconEyeOff, IconUser} from '@tabler/icons-react';
import {Content} from '@/Api/Contents';

interface ContentSidebarProps {
    content: Content;
    onEdit: () => void;
    onDuplicate: () => void;
    onTogglePublish: () => void;
    isDuplicating?: boolean;
    isTogglingPublish?: boolean;
}

export const ContentSidebar: React.FC<ContentSidebarProps> = ({
    content,
    onEdit,
    onDuplicate,
    onTogglePublish,
    isDuplicating = false,
    isTogglingPublish = false,
}) => {
    return (
        <Stack gap="md">
            {/* Content Info */}
            <Card withBorder>
                <Stack gap="md">
                    <Text
                        fw={500}
                        size="lg"
                    >
                        Content Information
                    </Text>

                    <Stack gap="sm">
                        <Group justify="space-between">
                            <Text
                                size="sm"
                                c="dimmed"
                            >
                                Status
                            </Text>
                            <Badge
                                variant="light"
                                color={content.is_published ? 'green' : 'gray'}
                            >
                                {content.is_published ? 'Published' : 'Draft'}
                            </Badge>
                        </Group>

                        <Group justify="space-between">
                            <Text
                                size="sm"
                                c="dimmed"
                            >
                                Category
                            </Text>
                            <Text
                                size="sm"
                                fw={500}
                            >
                                {content.category?.name || 'Uncategorized'}
                            </Text>
                        </Group>

                        {content.duration && (
                            <Group justify="space-between">
                                <Text
                                    size="sm"
                                    c="dimmed"
                                >
                                    Duration
                                </Text>
                                <Text
                                    size="sm"
                                    fw={500}
                                >
                                    {content.duration} minutes
                                </Text>
                            </Group>
                        )}

                        <Group justify="space-between">
                            <Text
                                size="sm"
                                c="dimmed"
                            >
                                Created
                            </Text>
                            <Text
                                size="sm"
                                fw={500}
                            >
                                {new Date(content.created_at).toLocaleDateString()}
                            </Text>
                        </Group>

                        <Group justify="space-between">
                            <Text
                                size="sm"
                                c="dimmed"
                            >
                                Updated
                            </Text>
                            <Text
                                size="sm"
                                fw={500}
                            >
                                {new Date(content.updated_at).toLocaleDateString()}
                            </Text>
                        </Group>
                    </Stack>
                </Stack>
            </Card>

            {/* Creator Info */}
            {content.created_by && (
                <Card withBorder>
                    <Stack gap="md">
                        <Text
                            fw={500}
                            size="lg"
                        >
                            Created By
                        </Text>
                        <Group>
                            <Stack gap={0}>
                                <Text
                                    fw={500}
                                    size="sm"
                                >
                                    {content.created_by?.name}
                                </Text>
                                <Text
                                    size="xs"
                                    c="dimmed"
                                >
                                    Content Creator
                                </Text>
                            </Stack>
                        </Group>
                    </Stack>
                </Card>
            )}

            {/* Quick Actions */}
            <Card withBorder>
                <Stack gap="md">
                    <Text
                        fw={500}
                        size="lg"
                    >
                        Quick Actions
                    </Text>

                    <Stack gap="xs">
                        <Button
                            variant="light"
                            fullWidth
                            leftSection={<IconEdit size={16} />}
                            onClick={onEdit}
                        >
                            Edit Content
                        </Button>

                        <Button
                            variant="light"
                            fullWidth
                            leftSection={<IconCopy size={16} />}
                            onClick={onDuplicate}
                            loading={isDuplicating}
                        >
                            Duplicate
                        </Button>

                        <Button
                            variant="light"
                            fullWidth
                            color={content.is_published ? 'orange' : 'green'}
                            leftSection={content.is_published ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                            onClick={onTogglePublish}
                            loading={isTogglingPublish}
                        >
                            {content.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                    </Stack>
                </Stack>
            </Card>

            {/* Usage Stats */}
            <Card withBorder>
                <Stack gap="md">
                    <Text
                        fw={500}
                        size="lg"
                    >
                        Usage Statistics
                    </Text>

                    <Grid>
                        <Grid.Col span={6}>
                            <Stack
                                align="center"
                                gap="xs"
                            >
                                <ThemeIcon
                                    variant="light"
                                    color="blue"
                                >
                                    <IconEye size={16} />
                                </ThemeIcon>
                                <Text
                                    fw={700}
                                    size="lg"
                                >
                                    0
                                </Text>
                                <Text
                                    size="xs"
                                    c="dimmed"
                                    ta="center"
                                >
                                    Views
                                </Text>
                            </Stack>
                        </Grid.Col>

                        <Grid.Col span={6}>
                            <Stack
                                align="center"
                                gap="xs"
                            >
                                <ThemeIcon
                                    variant="light"
                                    color="green"
                                >
                                    <IconUser size={16} />
                                </ThemeIcon>
                                <Text
                                    fw={700}
                                    size="lg"
                                >
                                    0
                                </Text>
                                <Text
                                    size="xs"
                                    c="dimmed"
                                    ta="center"
                                >
                                    In Programs
                                </Text>
                            </Stack>
                        </Grid.Col>
                    </Grid>
                </Stack>
            </Card>
        </Stack>
    );
};
