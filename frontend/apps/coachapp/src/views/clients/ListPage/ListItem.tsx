import {ActionIcon, Avatar, Badge, Card, Group, Menu, Stack, Text} from '@mantine/core';
import {ChatIcon, DotsThreeVerticalIcon, EyeIcon, PencilIcon} from '@phosphor-icons/react';
import {IconCalendarTime, IconMail, IconPhone} from '@tabler/icons-react';
import {format, parseISO} from 'date-fns';
import React from 'react';

import {Client, MembershipStatus} from '@/api/clients.ts';

interface Props {
    client: Client;
    onChat?: (id: string) => void;
    onEdit: (id: string) => void;
    onView: (id: string) => void;
}

function CaptionBadge({icon, text}: {icon: React.ComponentType<any>; text: string}) {
    const IconComponent = icon;
    return (
        <Group
            align={'center'}
            style={{gap: 'var(--ce-size-xs)'}}
        >
            <IconComponent
                color={'var(--mantine-color-gray-6)'}
                size={16}
            />
            <Text
                c="gray.6"
                style={{
                    fontSize: 'var(--label-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--label-line-height)',
                    wordBreak: 'break-word',
                }}
            >
                {text}
            </Text>
        </Group>
    );
}

function getClientInitials(name: string): string {
    return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function getMembershipStatusColor(status: string): string {
    switch (status) {
        case MembershipStatus.ACTIVE:
            return 'green';
        case MembershipStatus.CANCELLED:
            return 'red';
        case MembershipStatus.INACTIVE:
            return 'gray';
        case MembershipStatus.PAUSED:
            return 'yellow';
        default:
            return 'gray';
    }
}

function getMembershipStatusLabel(status: string): string {
    switch (status) {
        case MembershipStatus.ACTIVE:
            return 'Active';
        case MembershipStatus.CANCELLED:
            return 'Cancelled';
        case MembershipStatus.INACTIVE:
            return 'Inactive';
        case MembershipStatus.PAUSED:
            return 'Paused';
        default:
            return status?.charAt(0).toUpperCase() + status?.slice(1);
    }
}

const ListItem: React.FC<Props> = ({client, onChat, onEdit, onView}) => {
    const membershipStartDate = client.membership_start_date
        ? format(parseISO(client.membership_start_date), 'MMM d, yyyy')
        : 'Not set';

    return (
        <Card
            onClick={() => onView(client.id)}
            style={{
                borderRadius: 'var(--body-offset)',
                cursor: 'pointer',
                paddingBottom: 'var(--ce-size-md)',
                paddingInline: 'var(--ce-size-md)',
                paddingTop: 'var(--body-offset)',
            }}
            withBorder
        >
            <Group
                align={'start'}
                gap={'xs'}
                justify={'space-between'}
                wrap={'nowrap'}
            >
                <Group
                    align={'start'}
                    gap={'md'}
                    style={{flex: 1}}
                >
                    <Avatar
                        color="blue"
                        radius="sm"
                        size="md"
                        style={{flexShrink: 0}}
                    >
                        {getClientInitials(client.name)}
                    </Avatar>

                    <Stack
                        gap={'xs'}
                        style={{flex: 1}}
                    >
                        <Group
                            align="flex-start"
                            gap="sm"
                            justify="space-between"
                            wrap="nowrap"
                        >
                            <Stack
                                gap={'xs'}
                                style={{flex: 1, marginBottom: 'var(--ce-size-xs)'}}
                            >
                                <Text
                                    c={'dark.6'}
                                    style={{
                                        fontSize: 'var(--body-font-size)',
                                        fontWeight: 600,
                                        lineHeight: 'var(--body-line-height)',
                                    }}
                                >
                                    {client.name}
                                </Text>
                                <Badge
                                    color={getMembershipStatusColor(client.membership_status)}
                                    size={'md'}
                                    tt={'capitalize'}
                                    variant="light"
                                >
                                    {getMembershipStatusLabel(client.membership_status)}
                                </Badge>
                            </Stack>
                        </Group>

                        <Stack gap="sm">
                            {client.invitation_email && (
                                <CaptionBadge
                                    icon={IconMail}
                                    text={client.invitation_email}
                                />
                            )}
                            {client.invitation_phone && (
                                <CaptionBadge
                                    icon={IconPhone}
                                    text={client.invitation_phone}
                                />
                            )}
                            <CaptionBadge
                                icon={IconCalendarTime}
                                text={`Joined ${membershipStartDate}`}
                            />
                            {client.assigned_coach && (
                                <CaptionBadge
                                    icon={IconCalendarTime}
                                    text={`Assigned to ${client.assigned_coach.name}`}
                                />
                            )}
                        </Stack>
                    </Stack>
                </Group>

                <Menu
                    position={'bottom-end'}
                    shadow={'lg'}
                >
                    <Menu.Target>
                        <ActionIcon
                            aria-label="More actions"
                            color={'dark'}
                            onClick={(e) => e.stopPropagation()}
                            radius={9999}
                            size={'xl'}
                            title="More actions"
                            variant={'subtle'}
                        >
                            <DotsThreeVerticalIcon size={18} />
                        </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                        <Menu.Item
                            leftSection={<EyeIcon size={20} />}
                            onClick={() => {
                                onView(client.id);
                            }}
                        >
                            View Profile
                        </Menu.Item>
                        {onChat && (
                            <Menu.Item
                                leftSection={<ChatIcon size={20} />}
                                onClick={() => {
                                    onChat(client.id);
                                }}
                            >
                                Open Chat
                            </Menu.Item>
                        )}
                        <Menu.Item
                            leftSection={<PencilIcon size={20} />}
                            onClick={() => {
                                onEdit(client.id);
                            }}
                        >
                            Edit Client
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Card>
    );
};

export default ListItem;
