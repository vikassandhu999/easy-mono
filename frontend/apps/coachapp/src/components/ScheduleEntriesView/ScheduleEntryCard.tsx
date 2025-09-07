import {useMemo} from 'react';
import {Group, Text, Card, Badge, ActionIcon, Box, Menu} from '@mantine/core';
import {DotsThreeIcon, PencilSimpleIcon, TrashIcon, UserPlusIcon} from '@phosphor-icons/react';
import {ScheduleEntry} from '@/api/schedule_entries.ts';
import {useSessionDef} from '@/hooks/useSessionDefsQueries';
import {SESSION_TYPE_CONFIG} from '@/components/ScheduleBuilder/sessionTypeConfig';
import {getTimeDisplay} from './utils';
import {IconClock, IconTimeDuration0} from '@tabler/icons-react';
import {modals} from '@mantine/modals';
import {UseMutationResult} from '@tanstack/react-query';

function CaptionBadge({icon, text}: {icon: React.ComponentType<any>; text: string}) {
    const IconComponent = icon;
    return (
        <Group
            style={{gap: 'var(--ce-size-xs)'}}
            align={'center'}
        >
            <IconComponent
                size={18}
                color={'var(--mantine-color-gray-6)'}
            />
            <Text
                c="gray.6"
                style={{
                    wordBreak: 'break-word',
                    fontSize: 'var(--callout-font-size)',
                    lineHeight: 'var(--callout-line-height)',
                    fontWeight: 400,
                }}
            >
                {text}
            </Text>
        </Group>
    );
}

interface ScheduleEntryCardProps {
    entry: ScheduleEntry;
    deleteEntry: UseMutationResult<void, Error, string, unknown>;
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

function ScheduleEntryCard({entry, deleteEntry}: ScheduleEntryCardProps) {
    const {data: sessionDef} = useSessionDef(entry.session_def_id);

    const timeDisplay = useMemo(() => getTimeDisplay(entry), [entry]);

    return (
        <Card
            withBorder
            shadow={'xxs'}
            role="button"
            tabIndex={0}
            aria-label={sessionDef ? `${sessionDef.name} session` : 'Session entry'}
            style={{
                cursor: 'pointer',
                paddingTop: 'var(--body-offset)',
                paddingInline: 'var(--ce-size-md)',
                paddingBottom: 'var(--ce-size-md)',
                borderRadius: 'var(--body-offset)',
            }}
        >
            {sessionDef && (
                <Group
                    gap={0}
                    align={'start'}
                >
                    <Box flex={1}>
                        <Group
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
                                {sessionDef.name}
                            </Text>
                            <Badge
                                variant="dot"
                                color={getSessionTypeColor(sessionDef.session_type)}
                                size={'md'}
                                tt={'capitalize'}
                                fw={600}
                            >
                                {getSessionTypeLabel(sessionDef.session_type)}
                            </Badge>
                        </Group>

                        {sessionDef.description && (
                            <Text
                                c="gray.6"
                                style={{
                                    marginBottom: 'var(--ce-size-xs)',
                                    fontSize: 'var(--callout-font-size)',
                                    lineHeight: 'var(--callout-line-height)',
                                }}
                            >
                                {sessionDef.description}
                            </Text>
                        )}

                        <Group
                            wrap={'nowrap'}
                            align={'center'}
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
                        justify="space-between"
                        align="center"
                    >
                        <Menu
                            shadow={'lg'}
                            position={'bottom-end'}
                        >
                            <Menu.Target>
                                <ActionIcon
                                    variant={'subtle'}
                                    color={'dark'}
                                    size={'xl'}
                                    radius={9999}
                                    aria-label="Session options"
                                    onClick={(e) => e.stopPropagation()}
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
                                    leftSection={<TrashIcon size={20} />}
                                    color="red"
                                    onClick={() => {
                                        modals.openConfirmModal({
                                            id: 'delete-session-modal',
                                            zIndex: 99999,
                                            title: (
                                                <Text
                                                    style={{
                                                        fontSize: 'var(--body-font-size)',
                                                        lineHeight: 'var(--body-line-height)',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Delete Session
                                                </Text>
                                            ),
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
                                            centered: true,
                                            labels: {
                                                confirm: 'Delete',
                                                cancel: 'Cancel',
                                            },
                                            confirmProps: {color: 'red', radius: 'lg', style: {flex: 1}},
                                            cancelProps: {variant: 'light', radius: 'lg', style: {flex: 1}},
                                            onCancel: () => modals.close('delete-session-modal'),
                                            onConfirm: async () => {
                                                await deleteEntry.mutateAsync(entry.id);
                                            },
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
