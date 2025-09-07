import React from 'react';
import {Group, ActionIcon, Stack, Text, Badge, Menu, Card} from '@mantine/core';
import {IconUsers} from '@tabler/icons-react';
import {Program} from '@/Api/Programs';
import {DotsThreeVerticalIcon, EyeIcon, PencilIcon} from '@phosphor-icons/react';

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
                    fontSize: 'var(--body-font-size)',
                    lineHeight: 'var(--body-line-height)',
                    fontWeight: 400,
                }}
            >
                {text}
            </Text>
        </Group>
    );
}

interface Props {
    program: Program;
    onEdit: (id: string) => void;
    onView: (id: string) => void;
}

const ListItem: React.FC<Props> = ({program, onEdit, onView}) => {
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
            onClick={() => onView(program.id)}
        >
            <Group
                gap={'xs'}
                justify={'space-between'}
                align={'start'}
                wrap={'nowrap'}
            >
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
                                {program.name}
                            </Text>
                            <Badge
                                color={program.is_published ? 'green.6' : 'gray.5'}
                                variant="light"
                                size={'md'}
                                tt={'capitalize'}
                            >
                                {program.is_published ? 'Published' : 'Draft'}
                            </Badge>
                        </Stack>
                    </Group>

                    <CaptionBadge
                        icon={IconUsers}
                        text="123 Clients"
                    />
                </Stack>
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
                                onView(program.id);
                            }}
                        >
                            View
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<PencilIcon size={20} />}
                            onClick={() => {
                                onEdit(program.id);
                            }}
                        >
                            Edit
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Card>
    );
};

export default ListItem;
