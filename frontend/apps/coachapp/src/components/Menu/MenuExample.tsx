import {ActionIcon, Box, Group, Menu, Stack, Text, useMantineTheme} from '@mantine/core';
import {
    IconArchive,
    IconCopy,
    IconDotsVertical,
    IconDownload,
    IconEdit,
    IconMove,
    IconStar,
    IconTrash,
} from '@tabler/icons-react';
import React from 'react';

import {MenuItem, MenuDropdown} from './index';

/**
 * MenuExample Component
 *
 * Demonstrates all features of the improved MenuItem and MenuDropdown components.
 * Use this as a reference when implementing menus in your components.
 */
export function MenuExample() {
    const theme = useMantineTheme();

    const handleAction = (action: string) => {
        console.log(`Action: ${action}`);
    };

    return (
        <Stack gap="xl" p="md">
            <Box>
                <Text fw={600} mb="md" size="lg">
                    Menu Components Examples
                </Text>
            </Box>

            {/* Example 1: Basic Menu */}
            <Box
                p="md"
                style={{
                    border: `1px solid ${theme.colors.gray[2]}`,
                    borderRadius: theme.radius.md,
                }}
            >
                <Text fw={500} mb="md" size="sm">
                    Basic Menu
                </Text>
                <Menu position="bottom-end" shadow="md">
                    <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                        </ActionIcon>
                    </Menu.Target>
                    <MenuDropdown>
                        <MenuItem
                            icon={<IconEdit size={16} />}
                            label="Edit"
                            onClick={() => handleAction('edit')}
                        />
                        <MenuItem
                            icon={<IconCopy size={16} />}
                            label="Duplicate"
                            onClick={() => handleAction('duplicate')}
                        />
                        <Menu.Divider />
                        <MenuItem
                            destructive
                            icon={<IconTrash size={16} />}
                            label="Delete"
                            onClick={() => handleAction('delete')}
                        />
                    </MenuDropdown>
                </Menu>
            </Box>

            {/* Example 2: Menu with Shortcuts */}
            <Box
                p="md"
                style={{
                    border: `1px solid ${theme.colors.gray[2]}`,
                    borderRadius: theme.radius.md,
                }}
            >
                <Text fw={500} mb="md" size="sm">
                    Menu with Keyboard Shortcuts
                </Text>
                <Menu position="bottom-end" shadow="md">
                    <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                        </ActionIcon>
                    </Menu.Target>
                    <MenuDropdown>
                        <MenuItem label="Save" shortcut="⌘S" onClick={() => handleAction('save')} />
                        <MenuItem
                            icon={<IconEdit size={16} />}
                            label="Edit"
                            shortcut="⌘E"
                            onClick={() => handleAction('edit')}
                        />
                        <MenuItem
                            icon={<IconCopy size={16} />}
                            label="Duplicate"
                            shortcut="⌘D"
                            onClick={() => handleAction('duplicate')}
                        />
                    </MenuDropdown>
                </Menu>
            </Box>

            {/* Example 3: Size Variants */}
            <Box
                p="md"
                style={{
                    border: `1px solid ${theme.colors.gray[2]}`,
                    borderRadius: theme.radius.md,
                }}
            >
                <Text fw={500} mb="md" size="sm">
                    Size Variants
                </Text>
                <Group>
                    {/* Compact */}
                    <Menu position="bottom-end" shadow="md">
                        <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                                <IconDotsVertical size={16} />
                            </ActionIcon>
                        </Menu.Target>
                        <MenuDropdown>
                            <Text fw={500} size="xs" p="xs" c="dimmed">
                                Compact
                            </Text>
                            <MenuItem
                                icon={<IconEdit size={16} />}
                                label="Edit"
                                compact
                                onClick={() => handleAction('edit')}
                            />
                            <MenuItem
                                icon={<IconTrash size={16} />}
                                label="Delete"
                                compact
                                destructive
                                onClick={() => handleAction('delete')}
                            />
                        </MenuDropdown>
                    </Menu>

                    {/* Default */}
                    <Menu position="bottom-end" shadow="md">
                        <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                                <IconDotsVertical size={16} />
                            </ActionIcon>
                        </Menu.Target>
                        <MenuDropdown>
                            <Text fw={500} size="xs" p="xs" c="dimmed">
                                Default
                            </Text>
                            <MenuItem
                                icon={<IconEdit size={16} />}
                                label="Edit"
                                onClick={() => handleAction('edit')}
                            />
                            <MenuItem
                                icon={<IconTrash size={16} />}
                                label="Delete"
                                destructive
                                onClick={() => handleAction('delete')}
                            />
                        </MenuDropdown>
                    </Menu>

                    {/* Dense */}
                    <Menu position="bottom-end" shadow="md">
                        <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                                <IconDotsVertical size={16} />
                            </ActionIcon>
                        </Menu.Target>
                        <MenuDropdown>
                            <Text fw={500} size="xs" p="xs" c="dimmed">
                                Dense
                            </Text>
                            <MenuItem
                                icon={<IconEdit size={16} />}
                                label="Edit"
                                dense
                                onClick={() => handleAction('edit')}
                            />
                            <MenuItem
                                icon={<IconTrash size={16} />}
                                label="Delete"
                                dense
                                destructive
                                onClick={() => handleAction('delete')}
                            />
                        </MenuDropdown>
                    </Menu>
                </Group>
            </Box>

            {/* Example 4: Destructive Actions */}
            <Box
                p="md"
                style={{
                    border: `1px solid ${theme.colors.gray[2]}`,
                    borderRadius: theme.radius.md,
                }}
            >
                <Text fw={500} mb="md" size="sm">
                    Destructive Actions
                </Text>
                <Menu position="bottom-end" shadow="md">
                    <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                        </ActionIcon>
                    </Menu.Target>
                    <MenuDropdown>
                        <MenuItem
                            icon={<IconArchive size={16} />}
                            label="Archive"
                            onClick={() => handleAction('archive')}
                        />
                        <MenuItem
                            icon={<IconMove size={16} />}
                            label="Move"
                            onClick={() => handleAction('move')}
                        />
                        <Menu.Divider />
                        <MenuItem
                            destructive
                            icon={<IconTrash size={16} />}
                            label="Delete Permanently"
                            onClick={() => handleAction('delete')}
                        />
                    </MenuDropdown>
                </Menu>
            </Box>

            {/* Example 5: Disabled Items */}
            <Box
                p="md"
                style={{
                    border: `1px solid ${theme.colors.gray[2]}`,
                    borderRadius: theme.radius.md,
                }}
            >
                <Text fw={500} mb="md" size="sm">
                    Disabled Items
                </Text>
                <Menu position="bottom-end" shadow="md">
                    <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                        </ActionIcon>
                    </Menu.Target>
                    <MenuDropdown>
                        <MenuItem
                            icon={<IconEdit size={16} />}
                            label="Edit"
                            onClick={() => handleAction('edit')}
                        />
                        <MenuItem
                            icon={<IconDownload size={16} />}
                            label="Export"
                            disabled
                            onClick={() => handleAction('export')}
                        />
                        <MenuItem
                            icon={<IconStar size={16} />}
                            label="Favorite"
                            onClick={() => handleAction('favorite')}
                        />
                    </MenuDropdown>
                </Menu>
            </Box>

            {/* Example 6: Many Items (Dense Mode) */}
            <Box
                p="md"
                style={{
                    border: `1px solid ${theme.colors.gray[2]}`,
                    borderRadius: theme.radius.md,
                }}
            >
                <Text fw={500} mb="md" size="sm">
                    Many Items (Dense Mode)
                </Text>
                <Menu position="bottom-end" shadow="md">
                    <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                        </ActionIcon>
                    </Menu.Target>
                    <MenuDropdown>
                        {['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5'].map(
                            (option) => (
                                <MenuItem
                                    key={option}
                                    label={option}
                                    dense
                                    onClick={() => handleAction(option)}
                                />
                            ),
                        )}
                    </MenuDropdown>
                </Menu>
            </Box>

            {/* Example 7: With Badges */}
            <Box
                p="md"
                style={{
                    border: `1px solid ${theme.colors.gray[2]}`,
                    borderRadius: theme.radius.md,
                }}
            >
                <Text fw={500} mb="md" size="sm">
                    Menu Items with Badges
                </Text>
                <Menu position="bottom-end" shadow="md">
                    <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                        </ActionIcon>
                    </Menu.Target>
                    <MenuDropdown>
                        <MenuItem
                            icon={<IconEdit size={16} />}
                            label="Edit"
                            badge="new"
                            onClick={() => handleAction('edit')}
                        />
                        <MenuItem
                            icon={<IconCopy size={16} />}
                            label="Duplicate"
                            onClick={() => handleAction('duplicate')}
                        />
                        <MenuItem
                            icon={<IconDownload size={16} />}
                            label="Download"
                            onClick={() => handleAction('download')}
                        />
                    </MenuDropdown>
                </Menu>
            </Box>

            {/* Integration Example */}
            <Box
                p="md"
                style={{
                    border: `1px solid ${theme.colors.gray[2]}`,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.gray[0],
                }}
            >
                <Text fw={500} mb="md" size="sm">
                    Integration Pattern (ListCard, etc.)
                </Text>
                <Text c="dimmed" mb="md" size="sm">
                    This is how you would use MenuItem in components like ListCard or SimpleListItem:
                </Text>
                <pre
                    style={{
                        backgroundColor: theme.white,
                        border: `1px solid ${theme.colors.gray[2]}`,
                        borderRadius: theme.radius.md,
                        padding: theme.spacing.md,
                        fontSize: '12px',
                        overflow: 'auto',
                    }}
                >
                    {`{actions.map((action) => (
  <MenuItem
    key={action.id}
    icon={action.icon}
    label={action.label}
    destructive={action.destructive}
    disabled={action.disabled}
    onClick={action.onClick}
  />
))}`}
                </pre>
            </Box>
        </Stack>
    );
}
