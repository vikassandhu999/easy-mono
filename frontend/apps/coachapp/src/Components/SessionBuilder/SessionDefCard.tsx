import {SessionDef, SessionDefItemConfig} from '@/Api/SessionDefs';
import {Stack, Text, Group, Badge, Divider, Box, ActionIcon} from '@mantine/core';
import {ClockIcon, PencilIcon} from '@phosphor-icons/react';
import {SESSION_TYPE_CONFIG} from '../ScheduleBuilder/sessionTypeConfig';
import SessionItemsManager from './SessionItemsManager';

interface SessionDefCardProps {
    sessionDef: SessionDef;
    onEdit?: () => void;
    showEditButton?: boolean;
    isManagementMode?: boolean;
    onItemsUpdate?: (items: SessionDefItemConfig[]) => void;
}

export default function SessionDefCard({
    sessionDef,
    onEdit,
    showEditButton = false,
    isManagementMode = false,
    onItemsUpdate,
}: SessionDefCardProps) {
    const typeConfig = SESSION_TYPE_CONFIG[sessionDef.session_type] || SESSION_TYPE_CONFIG.other;
    const IconComponent = typeConfig.icon;

    // Get items sorted by display order
    const sortedItems = sessionDef.items ? [...sessionDef.items].sort((a, b) => a.display_order - b.display_order) : [];

    return (
        <Stack gap={'md'}>
            {/* Header */}
            <Group
                justify="space-between"
                align="flex-start"
            >
                <Stack
                    gap={'xs'}
                    style={{flex: 1}}
                >
                    <Group
                        gap={'sm'}
                        align="center"
                    >
                        <Box
                            style={{
                                backgroundColor: typeConfig.color,
                                padding: 8,
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <IconComponent
                                size={20}
                                color={typeConfig.iconColor}
                            />
                        </Box>
                        <Stack gap={2}>
                            <Text
                                fw={600}
                                size="lg"
                                style={{
                                    fontSize: 'var(--body-font-size)',
                                    lineHeight: 'var(--body-line-height)',
                                    color: 'var(--mantine-color-gray-9)',
                                }}
                            >
                                {sessionDef.name}
                            </Text>
                            <Badge
                                size="sm"
                                variant="light"
                                color={typeConfig.iconColor}
                                radius={'var(--body-offset)'}
                            >
                                {typeConfig.label}
                            </Badge>
                        </Stack>
                    </Group>

                    {sessionDef.description && (
                        <Text
                            size="sm"
                            c="dimmed"
                            lineClamp={2}
                            style={{
                                fontSize: 'var(--callout-font-size)',
                                lineHeight: 'var(--callout-line-height)',
                            }}
                        >
                            {sessionDef.description}
                        </Text>
                    )}
                </Stack>

                <Group gap={'xs'}>
                    <Group
                        gap={'xs'}
                        align="center"
                    >
                        <ClockIcon
                            size={16}
                            color="var(--mantine-color-gray-6)"
                        />
                        <Text
                            size="sm"
                            c="dimmed"
                            style={{
                                fontSize: 'var(--callout-font-size)',
                                lineHeight: 'var(--callout-line-height)',
                            }}
                        >
                            {sessionDef.duration_minutes} min
                        </Text>
                    </Group>

                    {showEditButton && onEdit && (
                        <ActionIcon
                            variant="light"
                            size="sm"
                            onClick={onEdit}
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
                    sessionDefId={sessionDef.id}
                    items={sortedItems}
                    itemContents={sessionDef.item_contents || []}
                    onItemsUpdate={onItemsUpdate}
                    isEditable={isManagementMode}
                />
            </>
        </Stack>
    );
}
