import React from 'react';
import {Menu, ActionIcon, rem} from '@mantine/core';
import {IconDots, IconEdit, IconTrash, IconEye, IconEyeOff, IconCopy, IconWorldUpload} from '@tabler/icons-react';
import {Content} from '@/Api/Contents';

interface ContentActionsProps {
    content: Content;
    onEdit: (id: string) => void;
    onDelete: (content: Content) => void;
    onDuplicate: (id: string) => void;
    onTogglePublish: (id: string) => void;
    onViewDetails: (id: string) => void;
}

export const ContentActions: React.FC<ContentActionsProps> = ({
    content,
    onEdit,
    onDelete,
    onDuplicate,
    onTogglePublish,
    onViewDetails,
}) => {
    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    return (
        <Menu
            shadow="md"
            width={180}
            position="bottom-end"
            withinPortal
            radius="sm"
            styles={{
                dropdown: {
                    backgroundColor: 'var(--mantine-color-white)',
                    border: '1px solid var(--mantine-color-gray-3)',
                    padding: rem(4),
                },
                item: {
                    borderRadius: rem(4),
                    fontSize: rem(14),
                    padding: `${rem(8)} ${rem(12)}`,
                    color: 'var(--mantine-color-gray-8)',
                    fontWeight: 500,
                    transition: 'all 150ms ease',
                    '&:hover': {
                        backgroundColor: 'var(--mantine-color-gray-0)',
                    },
                    '&[data-danger="true"]': {
                        color: 'var(--mantine-color-red-6)',
                        '&:hover': {
                            backgroundColor: 'var(--mantine-color-red-0)',
                        },
                    },
                },
            }}
        >
            <Menu.Target>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    radius="sm"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Actions for ${content.name}`}
                    style={{
                        transition: 'all 150ms ease',
                        color: 'var(--mantine-color-gray-6)',
                    }}
                    styles={{
                        root: {
                            '&:hover': {
                                backgroundColor: 'var(--mantine-color-gray-1)',
                                color: 'var(--mantine-color-gray-8)',
                                transform: 'scale(1.05)',
                            },
                            '&:active': {
                                transform: 'scale(0.95)',
                            },
                        },
                    }}
                >
                    <IconDots size={16} />
                </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Item
                    leftSection={<IconEye size={16} />}
                    onClick={(e) => handleActionClick(e, () => onViewDetails(content.id))}
                >
                    View Details
                </Menu.Item>

                <Menu.Item
                    leftSection={<IconEdit size={16} />}
                    onClick={(e) => handleActionClick(e, () => onEdit(content.id))}
                >
                    Edit Content
                </Menu.Item>

                <Menu.Item
                    leftSection={<IconCopy size={16} />}
                    onClick={(e) => handleActionClick(e, () => onDuplicate(content.id))}
                >
                    Duplicate
                </Menu.Item>

                <Menu.Item
                    leftSection={content.is_published ? <IconEyeOff size={16} /> : <IconWorldUpload size={16} />}
                    onClick={(e) => handleActionClick(e, () => onTogglePublish(content.id))}
                >
                    {content.is_published ? 'Unpublish' : 'Publish'}
                </Menu.Item>

                <Menu.Divider
                    style={{
                        margin: `${rem(4)} 0`,
                        borderColor: 'var(--mantine-color-gray-2)',
                    }}
                />

                <Menu.Item
                    leftSection={<IconTrash size={16} />}
                    onClick={(e) => handleActionClick(e, () => onDelete(content))}
                    data-danger="true"
                >
                    Delete
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
};
