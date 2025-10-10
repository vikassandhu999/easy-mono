import {ActionIcon, Badge, Box, Divider, Group, Stack, Text} from '@mantine/core';
import {ClockIcon, PencilIcon} from '@phosphor-icons/react';
import {useMemo} from 'react';

import {Session} from '@/api/sessions';

import {getSessionTypeConfig} from '../PlanBuilder/sessionTypes';
import SessionItemsManager from './SessionItemsManager';
import {workoutDefinitionToItems} from './utils';

interface SessionCardProps {
    isManagementMode?: boolean;
    onEdit?: () => void;
    onItemsUpdate?: () => void;
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
    const items = useMemo(() => {
        if (session.session_type === 'workout') {
            return workoutDefinitionToItems(session);
        }
        return [];
    }, [session]);
    const IconComponent = typeConfig.icon;
    const durationLabel =
        typeof session.duration_minutes === 'number' && session.duration_minutes > 0
            ? `${session.duration_minutes} min`
            : 'Flexible duration';

    // Get items sorted by display order
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
                            {durationLabel}
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
            {session.session_type === 'workout' && (
                <>
                    <Divider />
                    <SessionItemsManager
                        isEditable={isManagementMode}
                        items={items}
                        onItemsUpdate={onItemsUpdate}
                        session={session}
                        sessionType={session.session_type}
                    />
                </>
            )}
        </Stack>
    );
}
