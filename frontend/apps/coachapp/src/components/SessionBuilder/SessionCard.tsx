import {ActionIcon, Badge, Box, Divider, Group, Stack, Text} from '@mantine/core';
import {ClockIcon, PencilIcon} from '@phosphor-icons/react';

import {Session, SessionItemConfig} from '@/api/sessions';

import {getSessionTypeConfig} from '../PlanBuilder/sessionTypes';
import SessionItemsManager from './SessionItemsManager';

interface SessionCardProps {
    isManagementMode?: boolean;
    onEdit?: () => void;
    onItemsUpdate?: (items: SessionItemConfig[]) => void;
    session: Session;
    showEditButton?: boolean;
}

export default function SessionCard({
    isManagementMode = false,
    onEdit,
    onItemsUpdate,
    session,
    showEditButton = false,
}: SessionCardProps) {
    const typeConfig = getSessionTypeConfig(session.session_type);
    const IconComponent = typeConfig.icon;

    // Get items sorted by display order
    const sortedItems = session.items ? [...session.items].sort((a, b) => a.display_order - b.display_order) : [];

    return (
        <Stack gap={'md'}>
            {/* Header */}
            <Group
                align="flex-start"
                justify="space-between"
            >
                <Stack
                    gap={'xs'}
                    style={{flex: 1}}
                >
                    <Group
                        align="center"
                        gap={'sm'}
                    >
                        <Box
                            style={{
                                alignItems: 'center',
                                backgroundColor: typeConfig.color,
                                borderRadius: 8,
                                display: 'flex',
                                justifyContent: 'center',
                                padding: 8,
                            }}
                        >
                            <IconComponent
                                color={typeConfig.iconColor}
                                size={20}
                            />
                        </Box>
                        <Stack gap={2}>
                            <Text
                                fw={600}
                                size="lg"
                                style={{
                                    color: 'var(--mantine-color-gray-9)',
                                    fontSize: 'var(--body-font-size)',
                                    lineHeight: 'var(--body-line-height)',
                                }}
                            >
                                {session.name}
                            </Text>
                            <Badge
                                color={typeConfig.badgeColor}
                                radius={'var(--body-offset)'}
                                size="sm"
                                variant="light"
                            >
                                {typeConfig.label}
                            </Badge>
                        </Stack>
                    </Group>

                    {session.description && (
                        <Text
                            c="dimmed"
                            lineClamp={2}
                            size="sm"
                            style={{
                                fontSize: 'var(--callout-font-size)',
                                lineHeight: 'var(--callout-line-height)',
                            }}
                        >
                            {session.description}
                        </Text>
                    )}
                </Stack>

                <Group gap={'xs'}>
                    <Group
                        align="center"
                        gap={'xs'}
                    >
                        <ClockIcon
                            color="var(--mantine-color-gray-6)"
                            size={16}
                        />
                        <Text
                            c="dimmed"
                            size="sm"
                            style={{
                                fontSize: 'var(--callout-font-size)',
                                lineHeight: 'var(--callout-line-height)',
                            }}
                        >
                            {session.duration_minutes} min
                        </Text>
                    </Group>

                    {showEditButton && onEdit && (
                        <ActionIcon
                            onClick={onEdit}
                            size="sm"
                            variant="light"
                        >
                            <PencilIcon size={16} />
                        </ActionIcon>
                    )}
                </Group>
            </Group>

            {/* Items Section */}
            <>
                <Divider />
                <SessionItemsManager
                    isEditable={isManagementMode}
                    itemContents={session.item_contents || []}
                    items={sortedItems}
                    onItemsUpdate={onItemsUpdate}
                    sessionId={session.id}
                />
            </>
        </Stack>
    );
}
