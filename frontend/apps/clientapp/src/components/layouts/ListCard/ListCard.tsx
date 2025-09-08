import React from 'react';
import {Card, Group, Stack, Text, Badge, ActionIcon, Menu, Box, useMantineTheme, type CardProps} from '@mantine/core';
import {DotsThreeVerticalIcon} from '@phosphor-icons/react';

export interface ListCardAction {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    color?: string;
    destructive?: boolean;
    disabled?: boolean;
}

export interface ListCardBadge {
    text: string;
    color?: string;
    variant?: 'filled' | 'light' | 'outline' | 'dot';
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

export interface ListCardProps extends Omit<CardProps, 'children'> {
    /** Main title text */
    title: string;

    /** Subtitle or description */
    subtitle?: string;

    /** Badge to display (typically status) */
    badge?: ListCardBadge;

    /** Additional badges to display */
    badges?: ListCardBadge[];

    /** Action items in the menu */
    actions?: ListCardAction[];

    /** Custom content to render in the card */
    children?: React.ReactNode;

    /** onClick handler for the card */
    onClick?: () => void;

    /** Whether the card is in a loading state */
    loading?: boolean;

    /** Whether to show the actions menu */
    showActions?: boolean;

    /** Custom metadata to display */
    metadata?: Array<{
        label: string;
        value: string;
        icon?: React.ReactNode;
    }>;

    /** Compact mode for smaller cards */
    compact?: boolean;

    /** Test id for testing */
    testId?: string;
}

export function ListCard({
    title,
    subtitle,
    badge,
    badges = [],
    actions = [],
    children,
    onClick,
    showActions = true,
    metadata = [],
    compact = false,
    testId,
    ...cardProps
}: ListCardProps) {
    const theme = useMantineTheme();

    const hasClickHandler = !!onClick;
    const hasActions = showActions && actions.length > 0;

    const handleCardClick = (e: React.MouseEvent) => {
        // Don't trigger card click if clicking on actions
        if (e.target !== e.currentTarget && (e.target as Element).closest('[data-card-action]')) {
            return;
        }
        onClick?.();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
        }
    };

    return (
        <Card
            {...cardProps}
            padding={compact ? 'sm' : 'md'}
            radius="md"
            withBorder
            onClick={hasClickHandler ? handleCardClick : undefined}
            onKeyDown={hasClickHandler ? handleKeyPress : undefined}
            tabIndex={hasClickHandler ? 0 : undefined}
            role={hasClickHandler ? 'button' : undefined}
            aria-label={hasClickHandler ? `View ${title}` : undefined}
            data-testid={testId}
            style={{
                cursor: hasClickHandler ? 'pointer' : 'default',
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                border: `1px solid ${theme.colors.gray[2]}`,
                backgroundColor: theme.white,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                position: 'relative',
                overflow: 'hidden',
                ...cardProps.style,
            }}
            styles={{
                root: {
                    '&:hover': hasClickHandler
                        ? {
                              backgroundColor: theme.colors.gray[0],
                              borderColor: theme.colors.gray[3],
                              transform: 'translateY(-2px)',
                              boxShadow: `0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)`,
                          }
                        : {},
                    '&:focus': hasClickHandler
                        ? {
                              outline: `2px solid ${theme.colors.blue[5]}`,
                              outlineOffset: '2px',
                              borderColor: theme.colors.blue[3],
                          }
                        : {},
                    '&:active': hasClickHandler
                        ? {
                              transform: 'translateY(-1px)',
                              boxShadow: `0 2px 8px rgba(0, 0, 0, 0.15)`,
                          }
                        : {},
                    '&:focus-visible': hasClickHandler
                        ? {
                              outline: `2px solid ${theme.colors.blue[5]}`,
                              outlineOffset: '2px',
                          }
                        : {},
                },
                ...cardProps.styles,
            }}
        >
            <Stack gap={compact ? 'xs' : 'sm'}>
                {/* Header with title, badge, and actions */}
                <Group
                    justify="space-between"
                    align="flex-start"
                    wrap="nowrap"
                    style={{minHeight: 'fit-content'}}
                >
                    <Box style={{flex: 1, minWidth: 0}}>
                        <Group
                            gap="sm"
                            align="flex-start"
                            wrap="nowrap"
                            mb={compact ? 'xs' : 'sm'}
                        >
                            <Box style={{flex: 1, minWidth: 0}}>
                                <Text
                                    fw={600}
                                    size={compact ? 'sm' : 'md'}
                                    lineClamp={2}
                                    c="dark.8"
                                    style={{
                                        lineHeight: 1.3,
                                        wordBreak: 'break-word',
                                        marginBottom: subtitle ? '4px' : 0,
                                    }}
                                >
                                    {title}
                                </Text>

                                {/* Subtitle */}
                                {subtitle && (
                                    <Text
                                        size={compact ? 'xs' : 'sm'}
                                        c="dimmed"
                                        lineClamp={compact ? 1 : 2}
                                        style={{
                                            lineHeight: 1.4,
                                            color: theme.colors.gray[6],
                                        }}
                                    >
                                        {subtitle}
                                    </Text>
                                )}
                            </Box>

                            {/* Main badge */}
                            {badge && (
                                <Box style={{flexShrink: 0}}>
                                    <Badge
                                        size={badge.size || (compact ? 'xs' : 'sm')}
                                        variant={badge.variant || 'light'}
                                        color={badge.color || 'blue'}
                                        radius="md"
                                        style={{
                                            fontWeight: 500,
                                            textTransform: 'capitalize',
                                        }}
                                    >
                                        {badge.text}
                                    </Badge>
                                </Box>
                            )}
                        </Group>
                    </Box>

                    {/* Actions Menu */}
                    {hasActions && (
                        <Box
                            data-card-action
                            style={{
                                flexShrink: 0,
                                marginLeft: theme.spacing.xs,
                            }}
                        >
                            <Menu
                                position="bottom-end"
                                withinPortal
                                shadow="md"
                                offset={8}
                            >
                                <Menu.Target>
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        size={compact ? 'sm' : 'md'}
                                        aria-label="More actions"
                                        style={{
                                            minHeight: '32px',
                                            minWidth: '32px',
                                            borderRadius: theme.radius.md,
                                            transition: 'all 150ms ease',
                                        }}
                                        styles={{
                                            root: {
                                                '&:hover': {
                                                    backgroundColor: theme.colors.gray[1],
                                                    color: theme.colors.gray[7],
                                                },
                                            },
                                        }}
                                    >
                                        <DotsThreeVerticalIcon size={16} />
                                    </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    {actions.map((action, index) => (
                                        <Menu.Item
                                            key={index}
                                            leftSection={action.icon}
                                            color={action.destructive ? 'red' : action.color}
                                            disabled={action.disabled}
                                            onClick={action.onClick}
                                            style={{
                                                fontSize: theme.fontSizes.sm,
                                                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                            }}
                                        >
                                            {action.label}
                                        </Menu.Item>
                                    ))}
                                </Menu.Dropdown>
                            </Menu>
                        </Box>
                    )}
                </Group>

                {/* Additional badges */}
                {badges.length > 0 && (
                    <Group
                        gap="xs"
                        wrap="wrap"
                        style={{marginTop: theme.spacing.xs}}
                    >
                        {badges.map((badgeItem, index) => (
                            <Badge
                                key={index}
                                size={badgeItem.size || 'xs'}
                                variant={badgeItem.variant || 'outline'}
                                color={badgeItem.color || 'gray'}
                                radius="md"
                                style={{
                                    fontWeight: 500,
                                    borderWidth: '1px',
                                }}
                            >
                                {badgeItem.text}
                            </Badge>
                        ))}
                    </Group>
                )}

                {/* taxonomy */}
                {metadata.length > 0 && (
                    <Group
                        gap="lg"
                        wrap="wrap"
                        style={{
                            marginTop: theme.spacing.xs,
                            paddingTop: theme.spacing.xs,
                            borderTop: `1px solid ${theme.colors.gray[1]}`,
                        }}
                    >
                        {metadata.map((item, index) => (
                            <Group
                                key={index}
                                gap="xs"
                                align="center"
                                style={{minWidth: 'fit-content'}}
                            >
                                {item.icon && (
                                    <Box
                                        style={{
                                            color: theme.colors.gray[6],
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        {item.icon}
                                    </Box>
                                )}
                                <Text
                                    size="xs"
                                    c="dimmed"
                                    fw={500}
                                    style={{
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        fontSize: '10px',
                                    }}
                                >
                                    {item.label}
                                </Text>
                                <Text
                                    size="xs"
                                    fw={600}
                                    c="dark.7"
                                    style={{fontSize: theme.fontSizes.xs}}
                                >
                                    {item.value}
                                </Text>
                            </Group>
                        ))}
                    </Group>
                )}

                {/* Custom content */}
                {children}
            </Stack>
        </Card>
    );
}
