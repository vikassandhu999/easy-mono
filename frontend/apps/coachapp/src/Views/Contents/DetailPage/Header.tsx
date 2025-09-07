import {Group, ActionIcon, Title, Button, Menu, Stack, Alert, Text, Badge} from '@mantine/core';
import {Content} from '@/Api/Contents';
import {CONTENT_TYPE_CONFIG} from '@/Components/Configs';
import {useNavigate} from 'react-router';
import {ArrowLeftIcon, DotsThreeVerticalIcon, EyeIcon, PencilIcon, TrashIcon} from '@phosphor-icons/react';
import {modals} from '@mantine/modals';
import {IconAlertCircle} from '@tabler/icons-react';

type Props = {
    content: Content;
    showTitle?: boolean;
    onEdit: (id: string) => void;
    onDelete: () => void;
    onTogglePublish: () => void;
};

export default function Header({content, showTitle = false, onEdit, onDelete, onTogglePublish}: Props) {
    const navigate = useNavigate();
    const contentConfig = CONTENT_TYPE_CONFIG[content.type];

    const handleBackClick = () => {
        navigate('/content');
    };

    const handleDelete = () => {
        modals.openConfirmModal({
            title: 'Delete Content',
            children: (
                <Stack gap="sm">
                    <Text size="sm">Are you sure you want to delete "{content.name}"?</Text>
                    <Alert
                        icon={<IconAlertCircle size={16} />}
                        color="red"
                    >
                        <Text size="sm">This action cannot be undone. The content will be permanently removed.</Text>
                    </Alert>
                </Stack>
            ),
            labels: {confirm: 'Delete', cancel: 'Cancel'},
            confirmProps: {color: 'red'},
            onConfirm: onDelete,
        });
    };

    const handleTogglePublish = () => {
        if (content.is_published) {
            modals.openConfirmModal({
                title: 'Unpublish Content',
                children: (
                    <Text size="sm">
                        Unpublishing "{content.name}" will make it unavailable to others. Are you sure you want to
                        continue?
                    </Text>
                ),
                labels: {confirm: 'Unpublish', cancel: 'Cancel'},
                confirmProps: {color: 'orange'},
                onConfirm: onTogglePublish,
            });
        } else {
            onTogglePublish();
        }
    };

    return (
        <Group
            style={{minWidth: 0, flex: 1}}
            wrap={'nowrap'}
            justify={'space-between'}
        >
            <Group
                gap={'xs'}
                flex={1}
                wrap={'nowrap'}
            >
                <ActionIcon
                    size={'xl'}
                    variant={'subtle'}
                    onClick={handleBackClick}
                    c={'dark'}
                    style={{borderRadius: 9999}}
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
                            variant="light"
                            size="sm"
                            leftSection={<contentConfig.icon size={12} />}
                            tt="capitalize"
                        >
                            {contentConfig.label}
                        </Badge>
                        <Title
                            order={6}
                            lineClamp={1}
                        >
                            {content.name}
                        </Title>
                    </Group>
                )}
            </Group>

            {!showTitle && (
                <Group
                    justify="space-between"
                    align="center"
                    gap={'sm'}
                >
                    {/* Primary Action */}
                    <Button
                        size="sm"
                        radius={9999}
                        variant={content.is_published ? 'subtle' : 'filled'}
                        leftSection={<EyeIcon size={16} />}
                        onClick={handleTogglePublish}
                    >
                        {content.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    {/* Content Actions Menu */}
                    <Menu
                        shadow="md"
                        position="bottom-end"
                    >
                        <Menu.Target>
                            <ActionIcon
                                variant={'subtle'}
                                color={'dark'}
                                size={'xl'}
                                radius={9999}
                                aria-label="Content actions"
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
                                leftSection={<TrashIcon size={20} />}
                                color="red"
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
