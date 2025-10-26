import {ActionIcon, Badge, Box, Card, type CardProps, Group, Menu, Stack, Text, useMantineTheme} from '@mantine/core';
import {DotsThreeVerticalIcon} from '@phosphor-icons/react';
import React from 'react';

export interface ListCardAction {
    color?: string;
    destructive?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    label: string;
    onClick: () => void;
}

export interface ListCardBadge {
    color?: string;
    size?: 'lg' | 'md' | 'sm' | 'xs';
    text: string;
    variant?: 'dot' | 'filled' | 'light' | 'outline';
}

export interface ListCardProps extends Omit<CardProps, 'children'> {
    /** Action items in the menu */
    actions?: ListCardAction[];

    /** Badge to display (typically status) */
    badge?: ListCardBadge;

    /** Additional badges to display */
    badges?: ListCardBadge[];

    /** Custom content to render in the card */
    children?: React.ReactNode;

    /** Compact mode for smaller cards */
    compact?: boolean;

    /** Whether the card is in a loading state */
    loading?: boolean;

    /** Custom metadata to display */
    metadata?: Array<{
        icon?: React.ReactNode;
        label: string;
        value: string;
    }>;

    /** onClick handler for the card */
    onClick?: () => void;

    /** Whether to show the actions menu */
    showActions?: boolean;

    /** Subtitle or description */
    subtitle?: string;

    /** Test id for testing */
    testId?: string;

    /** Main title text */
    title: string;
}

export function ListCard({
    actions = [],
    badge,
    badges = [],
    children,
    compact = false,
    metadata = [],
    onClick,
    showActions = true,
    subtitle,
    testId,
    title,
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
            aria-label={hasClickHandler ? `View ${title}` : undefined}
            data-testid={testId}
            onClick={hasClickHandler ? handleCardClick : undefined}
            onKeyDown={hasClickHandler ? handleKeyPress : undefined}
            padding={compact ? 'sm' : 'md'}
            radius="xl"
            role={hasClickHandler ? 'button' : undefined}
            style={{
                backgroundColor: theme.white,
                border: `1px solid ${theme.colors.gray[2]}`,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                cursor: hasClickHandler ? 'pointer' : 'default',
                overflow: 'hidden',
                position: 'relative',
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                ...cardProps.style,
            }}
            styles={{
                root: {
                    '&:active': hasClickHandler
                        ? {
                              boxShadow: `0 2px 8px rgba(0, 0, 0, 0.15)`,
                              transform: 'translateY(-1px)',
                          }
                        : {},
                    '&:focus': hasClickHandler
                        ? {
                              borderColor: theme.colors.blue[3],
                              outline: `2px solid ${theme.colors.blue[5]}`,
                              outlineOffset: '2px',
                          }
                        : {},
                    '&:focus-visible': hasClickHandler
                        ? {
                              outline: `2px solid ${theme.colors.blue[5]}`,
                              outlineOffset: '2px',
                          }
                        : {},
                    '&:hover': hasClickHandler
                        ? {
                              backgroundColor: theme.colors.gray[0],
                              borderColor: theme.colors.gray[3],
                              boxShadow: `0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)`,
                              transform: 'translateY(-2px)',
                          }
                        : {},
                },
                ...cardProps.styles,
            }}
            tabIndex={hasClickHandler ? 0 : undefined}
            withBorder
        >
            <Stack gap={compact ? 'xs' : 'sm'}>
                {/* Header with title, badge, and actions */}
                <Group
                    align="flex-start"
                    justify="space-between"
                    style={{minHeight: 'fit-content'}}
                    wrap="nowrap"
                >
                    <Box style={{flex: 1, minWidth: 0}}>
                        <Group
                            align="flex-start"
                            gap="sm"
                            mb={compact ? 'xs' : 'sm'}
                            wrap="nowrap"
                        >
                            <Box style={{flex: 1, minWidth: 0}}>
                                <Text
                                    c="dark.8"
                                    fw={600}
                                    lineClamp={2}
                                    size={compact ? 'sm' : 'md'}
                                    style={{
                                        lineHeight: 1.3,
                                        marginBottom: subtitle ? '4px' : 0,
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {title}
                                </Text>

                                {/* Subtitle */}
                                {subtitle && (
                                    <Text
                                        c="dimmed"
                                        lineClamp={compact ? 1 : 2}
                                        size={compact ? 'xs' : 'sm'}
                                        style={{
                                            color: theme.colors.gray[6],
                                            lineHeight: 1.4,
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
                                        color={badge.color || 'blue'}
                                        radius="xl"
                                        size={badge.size || (compact ? 'xs' : 'sm')}
                                        style={{
                                            fontWeight: 500,
                                            textTransform: 'capitalize',
                                        }}
                                        variant={badge.variant || 'light'}
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
                                offset={8}
                                position="bottom-end"
                                shadow="md"
                                withinPortal
                            >
                                <Menu.Target>
                                    <ActionIcon
                                        aria-label="More actions"
                                        color="gray"
                                        size={compact ? 'sm' : 'md'}
                                        style={{
                                            borderRadius: theme.radius.md,
                                            minHeight: '32px',
                                            minWidth: '32px',
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
                                        variant="subtle"
                                    >
                                        <DotsThreeVerticalIcon size={16} />
                                    </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    {actions.map((action, index) => (
                                        <Menu.Item
                                            color={action.destructive ? 'red' : action.color}
                                            disabled={action.disabled}
                                            key={index}
                                            leftSection={action.icon}
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
                        style={{marginTop: theme.spacing.xs}}
                        wrap="wrap"
                    >
                        {badges.map((badgeItem, index) => (
                            <Badge
                                color={badgeItem.color || 'gray'}
                                key={index}
                                radius="xl"
                                size={badgeItem.size || 'xs'}
                                style={{
                                    borderWidth: '1px',
                                    fontWeight: 500,
                                }}
                                variant={badgeItem.variant || 'outline'}
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
                        style={{
                            borderTop: `1px solid ${theme.colors.gray[1]}`,
                            marginTop: theme.spacing.xs,
                            paddingTop: theme.spacing.xs,
                        }}
                        wrap="wrap"
                    >
                        {metadata.map((item, index) => (
                            <Group
                                align="center"
                                gap="xs"
                                key={index}
                                style={{minWidth: 'fit-content'}}
                            >
                                {item.icon && (
                                    <Box
                                        style={{
                                            alignItems: 'center',
                                            color: theme.colors.gray[6],
                                            display: 'flex',
                                        }}
                                    >
                                        {item.icon}
                                    </Box>
                                )}
                                <Text
                                    c="dimmed"
                                    fw={500}
                                    size="xs"
                                    style={{
                                        fontSize: '10px',
                                        letterSpacing: '0.5px',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {item.label}
                                </Text>
                                <Text
                                    c="dark.7"
                                    fw={600}
                                    size="xs"
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
