import {ActionIcon, Badge, Box, Card, Group, Menu, Text} from '@mantine/core';
import {modals} from '@mantine/modals';
import {DotsThreeIcon, PencilSimpleIcon, TrashIcon, UserPlusIcon} from '@phosphor-icons/react';
import {IconClock, IconTimeDuration0} from '@tabler/icons-react';
import {UseMutationResult} from '@tanstack/react-query';
import {useMemo} from 'react';

import {ScheduleEntry} from '@/api/schedule_entries.ts';
import {SESSION_TYPE_CONFIG} from '@/components/ScheduleBuilder/sessionTypeConfig';
import {useGetSessionDefQuery} from '@/store/services/sessionDefsApi';

import {getTimeDisplay} from './utils';

interface ScheduleEntryCardProps {
    deleteEntry: UseMutationResult<void, Error, string, unknown>;
    entry: ScheduleEntry;
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
                size={18}
            />
            <Text
                c="gray.6"
                style={{
                    fontSize: 'var(--callout-font-size)',
                    fontWeight: 400,
                    lineHeight: 'var(--callout-line-height)',
                    wordBreak: 'break-word',
                }}
            >
                {text}
            </Text>
        </Group>
    );
}

export const getSessionTypeColor = (type: string): string => {
    const config = SESSION_TYPE_CONFIG[type];
    if (!config) return 'gray';

    const colorVar = config.color;
    return colorVar.replace('var(--mantine-color-', '').replace('-1)', '');
};

export const getSessionTypeLabel = (type: string): string => {
    return SESSION_TYPE_CONFIG[type]?.label || type.charAt(0).toUpperCase() + type.slice(1);
};

function ScheduleEntryCard({deleteEntry, entry}: ScheduleEntryCardProps) {
    const {data: sessionDef} = useGetSessionDefQuery({id: entry.session_def_id});

    const timeDisplay = useMemo(() => getTimeDisplay(entry), [entry]);

    return (
        <Card
            aria-label={sessionDef ? `${sessionDef.name} session` : 'Session entry'}
            role="button"
            shadow={'xxs'}
            style={{
                borderRadius: 'var(--body-offset)',
                cursor: 'pointer',
                paddingBottom: 'var(--ce-size-md)',
                paddingInline: 'var(--ce-size-md)',
                paddingTop: 'var(--body-offset)',
            }}
            tabIndex={0}
            withBorder
        >
            {sessionDef && (
                <Group
                    align={'start'}
                    gap={0}
                >
                    <Box flex={1}>
                        <Group
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
                                {sessionDef.name}
                            </Text>
                            <Badge
                                color={getSessionTypeColor(sessionDef.session_type)}
                                fw={600}
                                size={'md'}
                                tt={'capitalize'}
                                variant="dot"
                            >
                                {getSessionTypeLabel(sessionDef.session_type)}
                            </Badge>
                        </Group>

                        {sessionDef.description && (
                            <Text
                                c="gray.6"
                                style={{
                                    fontSize: 'var(--callout-font-size)',
                                    lineHeight: 'var(--callout-line-height)',
                                    marginBottom: 'var(--ce-size-xs)',
                                }}
                            >
                                {sessionDef.description}
                            </Text>
                        )}

                        <Group
                            align={'center'}
                            wrap={'nowrap'}
                        >
                            <CaptionBadge
                                icon={IconClock}
                                text={timeDisplay}
                            />
                            <CaptionBadge
                                icon={IconTimeDuration0}
                                text={`${sessionDef.duration_minutes} min`}
                            />
                        </Group>
                    </Box>

                    <Group
                        align="center"
                        justify="space-between"
                    >
                        <Menu
                            position={'bottom-end'}
                            shadow={'lg'}
                        >
                            <Menu.Target>
                                <ActionIcon
                                    aria-label="Session options"
                                    color={'dark'}
                                    onClick={(e) => e.stopPropagation()}
                                    radius={9999}
                                    size={'xl'}
                                    variant={'subtle'}
                                >
                                    <DotsThreeIcon size={18} />
                                </ActionIcon>
                            </Menu.Target>

                            <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                                <Menu.Item
                                    leftSection={<UserPlusIcon size={20} />}
                                    onClick={() => {
                                        console.log('Assign session:', entry.id);
                                    }}
                                >
                                    Assign to Clients
                                </Menu.Item>

                                <Menu.Item
                                    leftSection={<PencilSimpleIcon size={20} />}
                                    onClick={() => {
                                        console.log('Edit session:', entry.id);
                                    }}
                                >
                                    Edit Session
                                </Menu.Item>

                                <Menu.Divider />

                                <Menu.Item
                                    color="red"
                                    leftSection={<TrashIcon size={20} />}
                                    onClick={() => {
                                        modals.openConfirmModal({
                                            cancelProps: {radius: 'lg', style: {flex: 1}, variant: 'light'},
                                            centered: true,
                                            children: (
                                                <Text
                                                    style={{
                                                        fontSize: 'var(--body-font-size)',
                                                        lineHeight: 'var(--body-line-height)',
                                                        marginBottom: 'var(--ce-size-sm)',
                                                    }}
                                                >
                                                    Are you sure you want to delete <b>{sessionDef.name}</b> &nbsp;
                                                    session?
                                                </Text>
                                            ),
                                            confirmProps: {color: 'red', radius: 'lg', style: {flex: 1}},
                                            id: 'delete-session-modal',
                                            labels: {
                                                cancel: 'Cancel',
                                                confirm: 'Delete',
                                            },
                                            onCancel: () => modals.close('delete-session-modal'),
                                            onConfirm: async () => {
                                                await deleteEntry.mutateAsync(entry.id);
                                            },
                                            title: (
                                                <Text
                                                    style={{
                                                        fontSize: 'var(--body-font-size)',
                                                        fontWeight: 600,
                                                        lineHeight: 'var(--body-line-height)',
                                                    }}
                                                >
                                                    Delete Session
                                                </Text>
                                            ),
                                            zIndex: 99999,
                                        });
                                    }}
                                >
                                    Delete Session
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            )}
        </Card>
    );
}

export default ScheduleEntryCard;
