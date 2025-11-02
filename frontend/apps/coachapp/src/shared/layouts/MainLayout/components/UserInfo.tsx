import {ActionIcon, Avatar, Box, Group, Menu, rem, Text, useMantineTheme} from '@mantine/core';
import {CaretUpDownIcon} from '@phosphor-icons/react/dist/ssr';
import {IconLogout2, IconPaint, IconUser} from '@tabler/icons-react';

import {useAuth} from '@/providers/AuthProvider';
import {useGetCoachQuery} from '@/services/coach';

export function UserInfo() {
    const {logout} = useAuth();
    const {data} = useGetCoachQuery();
    const theme = useMantineTheme();

    return (
        <Box p="md">
            <Menu position="top-end">
                <Menu.Target>
                    <Box
                        component="div"
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.currentTarget.click();
                            }
                        }}
                        px="sm"
                        py="xs"
                        role="button"
                        style={{
                            backgroundColor: theme.colors.gray[1],
                            borderRadius: theme.radius.xl,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background-color 0.2s ease',
                            width: '100%',
                        }}
                        tabIndex={0}
                    >
                        <Group
                            gap="sm"
                            wrap="nowrap"
                        >
                            <Avatar
                                color="blue"
                                radius="xl"
                                size="sm"
                            >
                                {data?.name[0] ?? 'C'}
                            </Avatar>
                            <Box style={{flex: 1, overflow: 'hidden'}}>
                                <Text
                                    fw={500}
                                    size="sm"
                                    truncate
                                >
                                    {data?.name ?? 'NA'}
                                </Text>
                                <Text
                                    c="dimmed"
                                    size="xs"
                                    truncate
                                >
                                    {data?.email ?? 'NA'}
                                </Text>
                            </Box>
                            <ActionIcon
                                color="gray"
                                component="div"
                                size="sm"
                                variant="subtle"
                            >
                                <CaretUpDownIcon size={16} />
                            </ActionIcon>
                        </Group>
                    </Box>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item leftSection={<IconUser style={{height: rem(16), width: rem(16)}} />}>
                        My Profile
                    </Menu.Item>
                    <Menu.Item leftSection={<IconPaint style={{height: rem(16), width: rem(16)}} />}>
                        Preferences
                    </Menu.Item>
                    <Menu.Item
                        color="red"
                        leftSection={<IconLogout2 style={{height: rem(16), width: rem(16)}} />}
                        onClick={() => logout()}
                    >
                        Logout
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </Box>
    );
}
