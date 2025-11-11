import {ActionIcon, Avatar, Box, Group, Menu, rem, Text} from '@mantine/core';
import {CaretUpDownIcon} from '@phosphor-icons/react/dist/ssr';
import {IconLogout2, IconPaint, IconUser} from '@tabler/icons-react';

interface UserInfoProps {
    onLogout?: () => void;
}

export function UserInfo({ onLogout }: UserInfoProps) {
    return (
        <Box p="md">
            <Menu position="top-end">
                <Menu.Target>
                    <Box
                        component="button"
                        p="xs"
                        style={{
                            border: 'none',
                            background: 'transparent',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'left',
                            transition: 'background-color 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <Group
                            gap="sm"
                            wrap="nowrap"
                        >
                            <Avatar
                                size="sm"
                                radius="xl"
                                color="blue"
                            >
                                C
                            </Avatar>
                            <Box style={{flex: 1, overflow: 'hidden'}}>
                                <Text
                                    size="sm"
                                    fw={500}
                                    truncate
                                >
                                    Coach
                                </Text>
                                <Text
                                    size="xs"
                                    c="dimmed"
                                    truncate
                                >
                                    coach@example.com
                                </Text>
                            </Box>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="sm"
                            >
                                <CaretUpDownIcon size={16} />
                            </ActionIcon>
                        </Group>
                    </Box>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item leftSection={<IconUser style={{width: rem(16), height: rem(16)}} />}>
                        My Profile
                    </Menu.Item>
                    <Menu.Item leftSection={<IconPaint style={{width: rem(16), height: rem(16)}} />}>
                        Preferences
                    </Menu.Item>
                    <Menu.Item
                        leftSection={<IconLogout2 style={{width: rem(16), height: rem(16)}} />}
                        color="red"
                        onClick={onLogout}
                    >
                        Logout
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </Box>
    );
}
