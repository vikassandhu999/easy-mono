import React from 'react';
import {Group, ActionIcon, Stack, Text, Badge, Menu, Card, Avatar} from '@mantine/core';
import {IconMail, IconPhone, IconCalendarTime} from '@tabler/icons-react';
import {Client, MembershipStatus} from '@/Api/Clients';
import {DotsThreeVerticalIcon, EyeIcon, PencilIcon, ChatIcon} from '@phosphor-icons/react';
import {format, parseISO} from 'date-fns';

function CaptionBadge({icon, text}: {icon: React.ComponentType<any>; text: string}) {
    const IconComponent = icon;
    return (
        <Group
            style={{gap: 'var(--ce-size-xs)'}}
            align={'center'}
        >
            <IconComponent
                size={16}
                color={'var(--mantine-color-gray-6)'}
            />
            <Text
                c="gray.6"
                style={{
                    wordBreak: 'break-word',
                    fontSize: 'var(--label-font-size)',
                    lineHeight: 'var(--label-line-height)',
                    fontWeight: 400,
                }}
            >
                {text}
            </Text>
        </Group>
    );
}

function getMembershipStatusColor(status: string): string {
    switch (status) {
        case MembershipStatus.ACTIVE:
            return 'green';
        case MembershipStatus.PAUSED:
            return 'yellow';
        case MembershipStatus.INACTIVE:
            return 'gray';
        case MembershipStatus.CANCELLED:
            return 'red';
        default:
            return 'gray';
    }
}

function getMembershipStatusLabel(status: string): string {
    switch (status) {
        case MembershipStatus.ACTIVE:
            return 'Active';
        case MembershipStatus.PAUSED:
            return 'Paused';
        case MembershipStatus.INACTIVE:
            return 'Inactive';
        case MembershipStatus.CANCELLED:
            return 'Cancelled';
        default:
            return status.charAt(0).toUpperCase() + status.slice(1);
    }
}

function getClientInitials(name: string): string {
    return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

interface Props {
    client: Client;
    onEdit: (id: string) => void;
    onView: (id: string) => void;
    onChat?: (id: string) => void;
}

const ListItem: React.FC<Props> = ({client, onEdit, onView, onChat}) => {
    const membershipStartDate = client.membership_start_date
        ? format(parseISO(client.membership_start_date), 'MMM d, yyyy')
        : 'Not set';

    return (
        <Card
            withBorder
            style={{
                cursor: 'pointer',
                paddingTop: 'var(--body-offset)',
                paddingInline: 'var(--ce-size-md)',
                paddingBottom: 'var(--ce-size-md)',
                borderRadius: 'var(--body-offset)',
            }}
            onClick={() => onView(client.id)}
        >
            <Group
                gap={'xs'}
                justify={'space-between'}
                align={'start'}
                wrap={'nowrap'}
            >
                <Group
                    gap={'md'}
                    style={{flex: 1}}
                    align={'start'}
                >
                    <Avatar
                        size="md"
                        radius="sm"
                        color="blue"
                        style={{flexShrink: 0}}
                    >
                        {getClientInitials(client.name)}
                    </Avatar>

                    <Stack
                        gap={'xs'}
                        style={{flex: 1}}
                    >
                        <Group
                            justify="space-between"
                            align="flex-start"
                            wrap="nowrap"
                            gap="sm"
                        >
                            <Stack
                                style={{flex: 1, marginBottom: 'var(--ce-size-xs)'}}
                                gap={'xs'}
                            >
                                <Text
                                    c={'dark.6'}
                                    style={{
                                        fontSize: 'var(--body-font-size)',
                                        lineHeight: 'var(--body-line-height)',
                                        fontWeight: 600,
                                    }}
                                >
                                    {client.name}
                                </Text>
                                <Badge
                                    color={getMembershipStatusColor(client.membership_status)}
                                    variant="light"
                                    size={'md'}
                                    tt={'capitalize'}
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
                    shadow={'lg'}
                    position={'bottom-end'}
                >
                    <Menu.Target>
                        <ActionIcon
                            title="More actions"
                            aria-label="More actions"
                            variant={'subtle'}
                            color={'dark'}
                            size={'xl'}
                            radius={9999}
                            onClick={(e) => e.stopPropagation()}
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
