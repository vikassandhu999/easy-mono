import {Avatar, Badge, Card, Group, Stack, Text, useMantineTheme} from '@mantine/core';
import {IconChevronRight} from '@tabler/icons-react';
import React from 'react';

import {Client} from '@/store/services/clients';
import {assignColorByToken, getInitials, getMembershipStatusColor, getMembershipStatusLabel} from '@/utils/ui';

interface Props {
    client: Client;
    onSelect: (id: string) => void;
    withArrow?: boolean;
}

export const ClientListItem: React.FC<Props> = ({client, onSelect: onView, withArrow = true}) => {
    const theme = useMantineTheme();

    // Handle keyboard interactions
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onView(client.id);
        }
    };

    return (
        <Card
            onClick={() => onView(client.id)}
            onKeyDown={handleKeyDown}
            padding={0}
            radius={0}
            role="button"
            style={{
                cursor: 'pointer',
                borderBottom: `1px solid ${theme.colors.gray[3]}`,
                transition: 'all 0.15s ease',
            }}
            styles={{
                root: {
                    paddingBlock: 'var(--mantine-spacing-lg)',
                    paddingInline: 'var(--mantine-spacing-lg)',
                    '&:hover': {
                        backgroundColor: theme.colors.gray[0],
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    },
                    '&:active': {
                        transform: 'translateY(0)',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                    },
                    '&:focus-visible': {
                        outline: '2px solid var(--mantine-color-brand-6)',
                        outlineOffset: '2px',
                    },
                },
            }}
            tabIndex={0}
        >
            <Group
                justify="space-between"
                wrap="nowrap"
            >
                <Group
                    gap="md"
                    style={{flex: 1, minWidth: 0}}
                >
                    <Avatar
                        color={assignColorByToken(client.id)}
                        radius="xl"
                        size="md"
                        variant="light"
                    >
                        {getInitials(client.name)}
                    </Avatar>

                    <Stack
                        gap={4}
                        style={{flex: 1, minWidth: 0}}
                    >
                        <Group
                            gap="xs"
                            wrap="nowrap"
                        >
                            <Text
                                fw={600}
                                lineClamp={1}
                                size="md"
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flex: 1,
                                }}
                            >
                                {client.name}
                            </Text>

                            {/* Membership Status Badge */}
                            <Badge
                                color={getMembershipStatusColor(client.membership_status)}
                                radius="xl"
                                size="xs"
                                variant="light"
                            >
                                {getMembershipStatusLabel(client.membership_status)}
                            </Badge>
                        </Group>

                        {/* Email */}
                        {client.invitation_email && (
                            <Text
                                c="dimmed"
                                lineClamp={1}
                                size="sm"
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {client.invitation_email}
                            </Text>
                        )}
                    </Stack>
                </Group>
                {withArrow && (
                    <IconChevronRight
                        color={theme.colors.gray[6]}
                        size={20}
                        style={{flexShrink: 0}}
                    />
                )}
            </Group>
        </Card>
    );
};
