import {ActionIcon, Alert, Badge, Button, Group, Menu, Stack, Text, Title} from '@mantine/core';
import {modals} from '@mantine/modals';
import {ArrowLeftIcon, DotsThreeVerticalIcon, EyeIcon, PencilIcon, TrashIcon} from '@phosphor-icons/react';
import {IconAlertCircle} from '@tabler/icons-react';
import {useNavigate} from 'react-router';

import {Content} from '@/api/contents.ts';
import {CONTENT_TYPE_CONFIG} from '@/components/Configs';

type Props = {
    content: Content;
    onDelete: () => void;
    onEdit: (id: string) => void;
    onTogglePublish: () => void;
    showTitle?: boolean;
};

export default function Header({content, onDelete, onEdit, onTogglePublish, showTitle = false}: Props) {
    const navigate = useNavigate();
    const contentConfig = CONTENT_TYPE_CONFIG[content.type];

    const handleBackClick = () => {
        navigate('/content');
    };

    const handleDelete = () => {
        modals.openConfirmModal({
            children: (
                <Stack gap="sm">
                    <Text size="sm">Are you sure you want to delete "{content.name}"?</Text>
                    <Alert
                        color="red"
                        icon={<IconAlertCircle size={16} />}
                    >
                        <Text size="sm">This action cannot be undone. The content will be permanently removed.</Text>
                    </Alert>
                </Stack>
            ),
            confirmProps: {color: 'red'},
            labels: {cancel: 'Cancel', confirm: 'Delete'},
            onConfirm: onDelete,
            title: 'Delete Content',
        });
    };

    const handleTogglePublish = () => {
        if (content.is_published) {
            modals.openConfirmModal({
                children: (
                    <Text size="sm">
                        Unpublishing "{content.name}" will make it unavailable to others. Are you sure you want to
                        continue?
                    </Text>
                ),
                confirmProps: {color: 'orange'},
                labels: {cancel: 'Cancel', confirm: 'Unpublish'},
                onConfirm: onTogglePublish,
                title: 'Unpublish Content',
            });
        } else {
            onTogglePublish();
        }
    };

    return (
        <Group
            justify={'space-between'}
            style={{flex: 1, minWidth: 0}}
            wrap={'nowrap'}
        >
            <Group
                flex={1}
                gap={'xs'}
                wrap={'nowrap'}
            >
                <ActionIcon
                    c={'dark'}
                    onClick={handleBackClick}
                    size={'xl'}
                    style={{borderRadius: 9999}}
                    variant={'subtle'}
                >
                    <ArrowLeftIcon size={24} />
                </ActionIcon>
                {showTitle && (
                    <Group
                        gap="sm"
                        wrap="nowrap"
                    >
                        <Badge
                            color={contentConfig.iconColor}
                            leftSection={<contentConfig.icon size={12} />}
                            size="sm"
                            tt="capitalize"
                            variant="light"
                        >
                            {contentConfig.label}
                        </Badge>
                        <Title
                            lineClamp={1}
                            order={6}
                        >
                            {content.name}
                        </Title>
                    </Group>
                )}
            </Group>

            {!showTitle && (
                <Group
                    align="center"
                    gap={'sm'}
                    justify="space-between"
                >
                    {/* Primary Action */}
                    <Button
                        leftSection={<EyeIcon size={16} />}
                        onClick={handleTogglePublish}
                        radius={9999}
                        size="sm"
                        variant={content.is_published ? 'subtle' : 'filled'}
                    >
                        {content.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    {/* Content Actions Menu */}
                    <Menu
                        position="bottom-end"
                        shadow="md"
                    >
                        <Menu.Target>
                            <ActionIcon
                                aria-label="Content actions"
                                color={'dark'}
                                radius={9999}
                                size={'xl'}
                                variant={'subtle'}
                            >
                                <DotsThreeVerticalIcon size={24} />
                            </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown>
                            <Menu.Item
                                leftSection={<PencilIcon size={20} />}
                                onClick={() => onEdit(content.id)}
                            >
                                Edit Content
                            </Menu.Item>

                            <Menu.Divider />

                            <Menu.Item
                                color="red"
                                leftSection={<TrashIcon size={20} />}
                                onClick={handleDelete}
                            >
                                Delete Content
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            )}
        </Group>
    );
}
