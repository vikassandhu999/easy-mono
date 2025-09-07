import React from 'react';
import {Group, Stack, Text, Box, ActionIcon, Menu, useMantineTheme} from '@mantine/core';
import {DotsThreeVerticalIcon} from '@phosphor-icons/react';
import type {ListCardAction} from '../ListCard';

export interface SimpleListItemProps {
    /** Main title text */
    title: string;

    /** Subtitle or description */
    subtitle?: string;

    /** Right side content (badges, metadata, etc.) */
    rightContent?: React.ReactNode;

    /** Left side icon or avatar */
    leftContent?: React.ReactNode;

    /** Action items in the menu */
    actions?: ListCardAction[];

    /** onClick handler for the item */
    onClick?: () => void;

    /** Whether to show the actions menu */
    showActions?: boolean;

    /** Compact mode for smaller items */
    compact?: boolean;

    /** Test id for testing */
    testId?: string;

    /** Additional CSS class */
    className?: string;
}

export function SimpleListItem({
    title,
    subtitle,
    rightContent,
    leftContent,
    actions = [],
    onClick,
    showActions = true,
    compact = false,
    testId,
    className,
}: SimpleListItemProps) {
    const theme = useMantineTheme();

    const hasClickHandler = !!onClick;
    const hasActions = showActions && actions.length > 0;

    const handleItemClick = (e: React.MouseEvent) => {
        // Don't trigger item click if clicking on actions
        if (e.target !== e.currentTarget && (e.target as Element).closest('[data-item-action]')) {
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
        <Box
            onClick={hasClickHandler ? handleItemClick : undefined}
            onKeyDown={hasClickHandler ? handleKeyPress : undefined}
            tabIndex={hasClickHandler ? 0 : undefined}
            role={hasClickHandler ? 'button' : undefined}
            aria-label={hasClickHandler ? `View ${title}` : undefined}
            data-testid={testId}
            className={className}
            py={compact ? 'xs' : 'sm'}
            px="md"
            style={{
                cursor: hasClickHandler ? 'pointer' : 'default',
                borderRadius: theme.radius.md,
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                minHeight: compact ? '48px' : '56px',
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                backgroundColor: 'transparent',
                border: '1px solid transparent',
                ...(hasClickHandler && {
                    '&:hover': {
                        backgroundColor: theme.colors.gray[0],
                        borderColor: theme.colors.gray[2],
                    },
                    '&:focus': {
                        outline: `2px solid ${theme.colors.blue[5]}`,
                        outlineOffset: '2px',
                        backgroundColor: theme.colors.blue[0],
                        borderColor: theme.colors.blue[3],
                    },
                    '&:active': {
                        backgroundColor: theme.colors.gray[1],
                    },
                    '&:focus-visible': {
                        outline: `2px solid ${theme.colors.blue[5]}`,
                        outlineOffset: '2px',
                    },
                }),
            }}
        >
            <Group
                justify="space-between"
                align="center"
                wrap="nowrap"
                style={{width: '100%', minHeight: 'inherit'}}
            >
                {/* Left side with optional icon/avatar */}
                <Group
                    gap="md"
                    align="center"
                    wrap="nowrap"
                    style={{flex: 1, minWidth: 0}}
                >
                    {leftContent && (
                        <Box
                            style={{
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {leftContent}
                        </Box>
                    )}

                    <Stack
                        gap={compact ? 2 : 4}
                        style={{flex: 1, minWidth: 0}}
                        justify="center"
                    >
                        <Text
                            fw={500}
                            size={compact ? 'sm' : 'md'}
                            lineClamp={1}
                            c="dark.8"
                            style={{
                                lineHeight: 1.3,
                                fontSize: compact ? theme.fontSizes.sm : theme.fontSizes.md,
                            }}
                        >
                            {title}
                        </Text>

                        {subtitle && (
                            <Text
                                size={compact ? 'xs' : 'sm'}
                                c="dimmed"
                                lineClamp={compact ? 1 : 2}
                                style={{
                                    lineHeight: 1.4,
                                    color: theme.colors.gray[6],
                                    fontSize: compact ? '11px' : theme.fontSizes.sm,
                                }}
                            >
                                {subtitle}
                            </Text>
                        )}
                    </Stack>
                </Group>

                {/* Right side with content and actions */}
                <Group
                    gap="sm"
                    align="center"
                    wrap="nowrap"
                    style={{flexShrink: 0}}
                >
                    {rightContent && (
                        <Box
                            style={{
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: theme.spacing.xs,
                            }}
                        >
                            {rightContent}
                        </Box>
                    )}

                    {/* Actions Menu */}
                    {hasActions && (
                        <Box data-item-action>
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
            </Group>
        </Box>
    );
}
