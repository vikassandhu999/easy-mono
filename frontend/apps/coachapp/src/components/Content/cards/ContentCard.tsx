import {Avatar, Badge, Group, Stack, Text} from '@mantine/core';
import {FC} from 'react';

import {Content} from '@/api/contents';

import {getContentDisplayInfo} from '../types/contentTypes';

interface ContentCardProps {
    content: Content;
    onClick?: () => void;
}

/**
 * ContentCard - Unified card component for all content types
 *
 * Displays exercise or recipe content with appropriate metadata
 * Uses discriminated unions to type-safely access content-specific fields
 */
export const ContentCard: FC<ContentCardProps> = ({content, onClick}) => {
    const displayInfo = getContentDisplayInfo(content);

    return (
        <Group
            align="start"
            onClick={onClick}
            onKeyDown={(e) => {
                if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClick();
                }
            }}
            onMouseEnter={(e) => {
                if (onClick) {
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                }
            }}
            onMouseLeave={(e) => {
                if (onClick) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                }
            }}
            py="sm"
            role={onClick ? 'button' : undefined}
            style={{
                borderBottom: '1px dashed var(--mantine-color-gray-3)',
                borderRadius: '8px',
                cursor: onClick ? 'pointer' : 'default',
                marginLeft: '-8px',
                marginRight: '-8px',
                paddingLeft: '8px',
                paddingRight: '8px',
                transition: 'all 0.2s ease',
            }}
            tabIndex={onClick ? 0 : undefined}
            wrap="nowrap"
        >
            <Avatar
                radius="md"
                size={50}
                src={content.thumbnail_url || undefined}
            />

            <Stack
                flex={1}
                gap="xs"
            >
                <Group
                    gap="sm"
                    wrap="nowrap"
                >
                    <Text
                        fw={500}
                        fz="lg"
                        style={{flex: 1}}
                    >
                        {content.name}
                    </Text>
                    {displayInfo.badges.map((badge, idx) => (
                        <Badge
                            color={badge.color}
                            key={idx}
                            size="xs"
                            style={{textTransform: 'capitalize'}}
                            variant="light"
                        >
                            {badge.label}
                        </Badge>
                    ))}
                </Group>

                {displayInfo.subtitle && (
                    <Text
                        c="dimmed"
                        size="sm"
                        style={{textTransform: 'capitalize'}}
                    >
                        {displayInfo.subtitle}
                    </Text>
                )}

                {displayInfo.secondaryInfo.length > 0 && (
                    <Group
                        gap="xs"
                        wrap="wrap"
                    >
                        {displayInfo.secondaryInfo.map((info, idx) => (
                            <Text
                                c="dimmed"
                                key={idx}
                                size="sm"
                            >
                                {info}
                            </Text>
                        ))}
                    </Group>
                )}

                {displayInfo.description && (
                    <Text
                        c="dimmed"
                        lineClamp={2}
                        size="sm"
                    >
                        {displayInfo.description}
                    </Text>
                )}
            </Stack>
        </Group>
    );
};
