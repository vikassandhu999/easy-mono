import React from 'react';
import {Image, Group, Badge, Text, Box, Stack, Card} from '@mantine/core';
import {IconVideo} from '@tabler/icons-react';
import {Content} from '@/Api/Contents';
import {ContentActions} from './ContentActions';

interface ContentCardProps {
    content: Content;
    onEdit: (id: string) => void;
    onDelete: (content: Content) => void;
    onDuplicate: (id: string) => void;
    onTogglePublish: (id: string) => void;
    onViewDetails: (id: string) => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({content, onViewDetails, ...actionProps}) => {
    const handleCardClick = (e: React.MouseEvent) => {
        // Prevent card click when clicking on action buttons
        if ((e.target as HTMLElement).closest('.content-actions')) {
            e.stopPropagation();
            return;
        }
        onViewDetails(content.id);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onViewDetails(content.id);
        }
    };

    return (
        <Card
            onClick={handleCardClick}
            onKeyDown={handleKeyPress}
            tabIndex={0}
            role="button"
            aria-label={`View details for ${content.name}`}
            data-testid={`content-card-${content.id}`}
            withBorder
            radius="sm"
            padding="md"
            style={{
                cursor: 'pointer',
                height: '100%',
                border: '1px solid var(--mantine-color-gray-2)',
                transition: 'all 150ms ease',
            }}
            styles={{
                root: {
                    '&:hover': {
                        backgroundColor: 'var(--mantine-color-gray-0)',
                        borderColor: 'var(--mantine-color-gray-3)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    },
                    '&:focus': {
                        outline: '2px solid var(--mantine-color-blue-5)',
                        outlineOffset: '2px',
                        backgroundColor: 'var(--mantine-color-gray-0)',
                    },
                    '&:active': {
                        transform: 'translateY(0px)',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                    },
                },
            }}
        >
            <Group
                gap="md"
                align="flex-start"
                wrap="nowrap"
            >
                {/* Thumbnail */}
                <Box
                    style={{
                        width: 88,
                        height: 66,
                        flexShrink: 0,
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid var(--mantine-color-gray-3)',
                        backgroundColor: 'var(--mantine-color-gray-0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {content.thumbnail_url ? (
                        <Image
                            src={content.thumbnail_url}
                            alt={`Thumbnail for ${content.name}`}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                            fallbackSrc="https://placehold.co/400x300?text=No+Image"
                        />
                    ) : (
                        <IconVideo
                            size={20}
                            style={{color: 'var(--mantine-color-gray-6)'}}
                            aria-hidden="true"
                        />
                    )}
                </Box>

                {/* Content info */}
                <Stack
                    gap="sm"
                    style={{flex: 1, minWidth: 0}}
                >
                    <Group
                        justify="space-between"
                        align="flex-start"
                        wrap="nowrap"
                        gap="sm"
                    >
                        <Text
                            fw={600}
                            size="md"
                            lineClamp={2}
                            c="gray.9"
                            style={{
                                flex: 1,
                                wordBreak: 'break-word',
                                lineHeight: 1.4,
                                fontSize: '0.875rem',
                                letterSpacing: '-0.01em',
                            }}
                        >
                            {content.name}
                        </Text>
                        <Box
                            className="content-actions"
                            style={{flexShrink: 0}}
                        >
                            <ContentActions
                                content={content}
                                onViewDetails={onViewDetails}
                                {...actionProps}
                            />
                        </Box>
                    </Group>

                    {content.tags && content.tags.length > 0 && (
                        <Group
                            gap="xs"
                            wrap="wrap"
                        >
                            {content.tags.slice(0, 2).map((tag) => (
                                <Badge
                                    key={tag.id}
                                    variant="light"
                                    size="sm"
                                    radius="sm"
                                    styles={{
                                        root: {
                                            backgroundColor: tag.color || 'var(--mantine-color-gray-1)',
                                            color: 'var(--mantine-color-gray-8)',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            height: '22px',
                                            border: '1px solid var(--mantine-color-gray-2)',
                                        },
                                    }}
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                            {content.tags.length > 2 && (
                                <Badge
                                    variant="outline"
                                    size="sm"
                                    radius="sm"
                                    c="gray.6"
                                    styles={{
                                        root: {
                                            fontSize: '0.75rem',
                                            height: '22px',
                                            borderColor: 'var(--mantine-color-gray-3)',
                                        },
                                    }}
                                >
                                    +{content.tags.length - 2}
                                </Badge>
                            )}
                        </Group>
                    )}
                </Stack>
            </Group>
        </Card>
    );
};
