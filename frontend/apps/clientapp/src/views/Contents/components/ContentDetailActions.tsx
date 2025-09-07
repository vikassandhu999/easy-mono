import React from 'react';
import {Menu, Button, rem} from '@mantine/core';
import {IconEdit, IconTrash, IconCopy, IconEye, IconEyeOff, IconDots, IconShare} from '@tabler/icons-react';
import {Content} from '@/Api/Contents';

interface ContentDetailActionsProps {
    content: Content;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onTogglePublish: () => void;
    onShare: () => void;
    isDeleting?: boolean;
    isDuplicating?: boolean;
    isTogglingPublish?: boolean;
}

export const ContentDetailActions: React.FC<ContentDetailActionsProps> = ({
    content,
    onEdit,
    onDelete,
    onDuplicate,
    onTogglePublish,
    onShare,
    isDeleting = false,
    isDuplicating = false,
    isTogglingPublish = false,
}) => {
    return (
        <Menu
            shadow="md"
            width={200}
            position="bottom-end"
        >
            <Menu.Target>
                <Button
                    variant="light"
                    rightSection={<IconDots size={16} />}
                >
                    Actions
                </Button>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Item
                    leftSection={<IconEdit style={{width: rem(14), height: rem(14)}} />}
                    onClick={onEdit}
                >
                    Edit Content
                </Menu.Item>

                <Menu.Item
                    leftSection={<IconCopy style={{width: rem(14), height: rem(14)}} />}
                    onClick={onDuplicate}
                    disabled={isDuplicating}
                >
                    Duplicate
                </Menu.Item>

                <Menu.Item
                    leftSection={<IconShare style={{width: rem(14), height: rem(14)}} />}
                    onClick={onShare}
                >
                    Share
                </Menu.Item>

                <Menu.Item
                    leftSection={
                        content.is_published ? (
                            <IconEyeOff style={{width: rem(14), height: rem(14)}} />
                        ) : (
                            <IconEye style={{width: rem(14), height: rem(14)}} />
                        )
                    }
                    onClick={onTogglePublish}
                    disabled={isTogglingPublish}
                >
                    {content.is_published ? 'Unpublish' : 'Publish'}
                </Menu.Item>

                <Menu.Divider />

                <Menu.Item
                    color="red"
                    leftSection={<IconTrash style={{width: rem(14), height: rem(14)}} />}
                    onClick={onDelete}
                    disabled={isDeleting}
                >
                    Delete Content
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
};
